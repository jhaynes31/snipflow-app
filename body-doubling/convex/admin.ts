import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { fillFromWaitlist, includedLeft, notify, refundHours, requireAdmin, seatCounts, sessionBookings } from "./lib";
import { compareWaitlist, HOUR_MS, noShowOutcome, sessionHours } from "./rules";

/** Host tools. Every function here checks ADMIN_EMAILS first. */

export const sessions = query({
  args: { includePast: v.optional(v.boolean()) },
  handler: async (ctx, { includePast }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const from = includePast ? now - 30 * 24 * HOUR_MS : now - 8 * HOUR_MS;
    const list = await ctx.db
      .query("sessions")
      .withIndex("by_start", (q) => q.gte("startsAt", from))
      .take(100);
    const out = [];
    for (const s of list) {
      const bookings = await sessionBookings(ctx, s._id);
      const seats = seatCounts(s, bookings, now);
      let flagged = 0;
      for (const b of bookings) {
        if (b.status !== "confirmed" || !b.memberId) continue;
        const m = await ctx.db.get(b.memberId);
        if (m && m.noShowCount > 0) flagged += 1;
      }
      const goals = await ctx.db
        .query("goalResponses")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();
      out.push({
        ...s,
        hours: sessionHours(s.blocks),
        seats,
        noShowFlags: flagged,
        goalsIn: goals.length,
        headcount: seats.membersTaken + seats.dropInsTaken,
      });
    }
    return out;
  },
});

export const roster = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const now = Date.now();
    const bookings = await sessionBookings(ctx, sessionId);
    const people = [];
    for (const b of bookings) {
      if (b.status === "canceled") continue;
      if (b.status === "pendingPayment" && (b.holdUntil ?? 0) <= now) continue;
      const m = b.memberId ? await ctx.db.get(b.memberId) : null;
      const goals = await ctx.db
        .query("goalResponses")
        .withIndex("by_booking", (q) => q.eq("bookingId", b._id))
        .unique();
      people.push({
        _id: b._id,
        name: m?.name ?? b.guestName ?? "Guest",
        email: m?.email ?? b.guestEmail ?? "",
        kind: b.kind,
        status: b.status,
        paymentType: b.paymentType,
        hours: b.hours,
        blockIndexes: b.blockIndexes,
        attendance: b.attendance,
        createdAt: b.createdAt,
        noShowCount: m?.noShowCount ?? 0,
        priorityPaused: m?.priorityPaused ?? false,
        scholarship: m?.scholarship ?? false,
        goals: goals?.answers ?? [],
      });
    }
    const seated = people.filter((p) => p.status !== "waitlisted");
    const waitlist = people
      .filter((p) => p.status === "waitlisted")
      .sort((a, b) => compareWaitlist({ priorityPaused: a.priorityPaused, joinedAt: a.createdAt }, { priorityPaused: b.priorityPaused, joinedAt: b.createdAt }));
    return { session: { ...session, hours: sessionHours(session.blocks) }, seats: seatCounts(session, bookings, now), seated, waitlist };
  },
});

/**
 * Mark someone present or missed. Missed sessions follow the policy in
 * `rules.noShowOutcome`; marking a mistake back to "attended" undoes it.
 */
export const markAttendance = mutation({
  args: { bookingId: v.id("bookings"), attendance: v.union(v.literal("unmarked"), v.literal("attended"), v.literal("noShow")) },
  handler: async (ctx, { bookingId, attendance }) => {
    await requireAdmin(ctx);
    const b = await ctx.db.get(bookingId);
    if (!b || b.status !== "confirmed") throw new ConvexError("Only seated people can be marked.");
    const delta = (attendance === "noShow" ? 1 : 0) - (b.attendance === "noShow" ? 1 : 0);
    await ctx.db.patch(bookingId, { attendance });
    if (!b.memberId || delta === 0) return;
    const m = await ctx.db.get(b.memberId);
    if (!m) return;
    const count = Math.max(0, m.noShowCount + delta);
    const outcome = noShowOutcome(count);
    const patch: Partial<Doc<"members">> = { noShowCount: count };
    if (delta > 0 && outcome === "gentleReminder") await notify(ctx, m._id, "gentleReminder", bookingId);
    if (delta > 0 && outcome === "pausePriority" && !m.priorityPaused) {
      patch.priorityPaused = true;
      await notify(ctx, m._id, "priorityPaused", bookingId);
    }
    if (delta < 0 && outcome !== "pausePriority") patch.priorityPaused = false;
    await ctx.db.patch(m._id, patch);
  },
});

export const setSessionStatus = mutation({
  args: { sessionId: v.id("sessions"), status: v.union(v.literal("scheduled"), v.literal("completed")) },
  handler: async (ctx, { sessionId, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(sessionId, { status });
  },
});

/** A host removes someone from a session. Member hours go back and the waitlist moves up. */
export const removeBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    await requireAdmin(ctx);
    const b = await ctx.db.get(bookingId);
    if (!b || b.status === "canceled") return;
    if (b.status === "confirmed" && b.kind === "member") await refundHours(ctx, b);
    await ctx.db.patch(bookingId, { status: "canceled" });
    if (b.status === "confirmed") await fillFromWaitlist(ctx, b.sessionId);
  },
});

/** Sliding scale: seat a member or a guest at no cost. Uses a member seat. */
export const compSeat = mutation({
  args: {
    sessionId: v.id("sessions"),
    memberId: v.optional(v.id("members")),
    guestName: v.optional(v.string()),
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get(a.sessionId);
    if (!session || session.status !== "scheduled") throw new ConvexError("That session isn't open.");
    const bookings = await sessionBookings(ctx, a.sessionId);
    if (seatCounts(session, bookings, Date.now()).left.members <= 0) throw new ConvexError("Member seats are full. Remove someone or raise the capacity first.");
    const hours = sessionHours(session.blocks);
    if (a.memberId) {
      const already = bookings.find((b) => b.memberId === a.memberId && (b.status === "confirmed" || b.status === "waitlisted"));
      if (already?.status === "confirmed") throw new ConvexError("They're already seated.");
      if (already) await ctx.db.patch(already._id, { status: "canceled" });
      await ctx.db.insert("bookings", {
        sessionId: a.sessionId,
        kind: "member",
        memberId: a.memberId,
        status: "confirmed",
        paymentType: "scholarship",
        hours,
        attendance: "unmarked",
        createdAt: Date.now(),
      });
      return;
    }
    if (!a.guestName?.trim()) throw new ConvexError("Add the guest's name.");
    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("bookings", {
      sessionId: a.sessionId,
      kind: "dropIn",
      guestName: a.guestName.trim(),
      guestEmail: a.guestEmail?.trim().toLowerCase() || undefined,
      token,
      status: "confirmed",
      paymentType: "scholarship",
      hours,
      attendance: "unmarked",
      createdAt: Date.now(),
    });
    return token;
  },
});

export const members = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("members").collect();
    return all
      .map((m) => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        membership: m.membership,
        cycleEnd: m.cycleEnd,
        includedLeft: includedLeft(m),
        extraHours: m.extraHours,
        noShowCount: m.noShowCount,
        priorityPaused: m.priorityPaused,
        scholarship: m.scholarship,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const updateMember = mutation({
  args: {
    memberId: v.id("members"),
    scholarship: v.optional(v.boolean()),
    resetNoShows: v.optional(v.boolean()),
    addExtraHours: v.optional(v.number()),
  },
  handler: async (ctx, { memberId, scholarship, resetNoShows, addExtraHours }) => {
    await requireAdmin(ctx);
    const m = await ctx.db.get(memberId);
    if (!m) throw new ConvexError("Member not found.");
    const patch: Partial<Doc<"members">> = {};
    if (scholarship !== undefined) patch.scholarship = scholarship;
    if (resetNoShows) {
      patch.noShowCount = 0;
      patch.priorityPaused = false;
    }
    if (addExtraHours) patch.extraHours = Math.max(0, m.extraHours + addExtraHours);
    await ctx.db.patch(memberId, patch);
  },
});
