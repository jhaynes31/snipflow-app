import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { compareWaitlist, INCLUDED_HOURS_PER_CYCLE, planMemberBooking, sessionHours, slotsLeft } from "./rules";

/** Hosts are the emails in ADMIN_EMAILS (comma separated) on the Convex deployment. */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function currentUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

export async function currentMember(ctx: QueryCtx): Promise<Doc<"members"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function requireMember(ctx: QueryCtx): Promise<Doc<"members">> {
  const member = await currentMember(ctx);
  if (!member) throw new ConvexError("Please sign in first.");
  return member;
}

export async function requireAdmin(ctx: QueryCtx) {
  const user = await currentUser(ctx);
  if (!user || !isAdminEmail(user.email)) throw new ConvexError("Only hosts can do that.");
  return user;
}

export function includedLeft(member: Doc<"members">): number {
  if (member.membership !== "active") return 0;
  return Math.max(0, INCLUDED_HOURS_PER_CYCLE - member.includedHoursUsed);
}

/** A booking that holds a seat right now. */
export function holdsSeat(b: Doc<"bookings">, now: number): boolean {
  if (b.status === "confirmed") return true;
  return b.status === "pendingPayment" && (b.holdUntil ?? 0) > now;
}

export async function sessionBookings(ctx: QueryCtx, sessionId: Id<"sessions">) {
  return await ctx.db
    .query("bookings")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
}

/**
 * Seats taken and left. Comped (scholarship) seats count against member
 * seats, whether they went to a member or a guest.
 */
export function seatCounts(session: Doc<"sessions">, bookings: Doc<"bookings">[], now: number) {
  const holding = bookings.filter((b) => holdsSeat(b, now));
  const dropInsTaken = holding.filter((b) => b.kind === "dropIn" && b.paymentType !== "scholarship").length;
  const membersTaken = holding.length - dropInsTaken;
  const counts = {
    memberSlots: session.capacity - session.dropInSlots,
    dropInSlots: session.dropInSlots,
    membersTaken,
    dropInsTaken,
  };
  return { ...counts, left: slotsLeft(counts), waitlisted: bookings.filter((b) => b.status === "waitlisted").length };
}

export function publicSession(session: Doc<"sessions">, bookings: Doc<"bookings">[], now: number) {
  const seats = seatCounts(session, bookings, now);
  return {
    _id: session._id,
    title: session.title,
    startsAt: session.startsAt,
    hours: sessionHours(session.blocks),
    blocks: session.blocks,
    gameTitle: session.gameTitle,
    status: session.status,
    capacity: session.capacity,
    memberSeats: seats.memberSlots,
    dropInSeats: seats.dropInSlots,
    memberSeatsLeft: seats.left.members,
    dropInSeatsLeft: seats.left.dropIns,
    waitlisted: seats.waitlisted,
    full: seats.left.members === 0 && seats.left.dropIns === 0,
  };
}

export async function notify(
  ctx: MutationCtx,
  memberId: Id<"members">,
  kind: Doc<"notices">["kind"],
  bookingId?: Id<"bookings">,
) {
  await ctx.db.insert("notices", { memberId, kind, bookingId, createdAt: Date.now() });
}

/** Take hours for a member booking. Returns the booking fields, or null if they're short. */
export function takeHours(member: Doc<"members">, needed: number) {
  const plan = planMemberBooking({ includedLeft: includedLeft(member), extraHours: member.extraHours }, needed);
  if (!plan.ok) return null;
  const { fromIncluded, fromExtra } = plan;
  return {
    booking: {
      fromIncluded,
      fromExtra,
      cycleStart: member.cycleStart,
      paymentType: (fromIncluded && fromExtra ? "mixed" : fromIncluded ? "included" : "extra") as Doc<"bookings">["paymentType"],
    },
    member: {
      includedHoursUsed: member.includedHoursUsed + fromIncluded,
      extraHours: member.extraHours - fromExtra,
    },
  };
}

/** Give a canceled booking's hours back (included hours only if still the same cycle). */
export async function refundHours(ctx: MutationCtx, booking: Doc<"bookings">) {
  if (!booking.memberId) return;
  const member = await ctx.db.get(booking.memberId);
  if (!member) return;
  const sameCycle = booking.cycleStart !== undefined && booking.cycleStart === member.cycleStart;
  await ctx.db.patch(member._id, {
    includedHoursUsed: sameCycle
      ? Math.max(0, member.includedHoursUsed - (booking.fromIncluded ?? 0))
      : member.includedHoursUsed,
    extraHours: member.extraHours + (booking.fromExtra ?? 0),
  });
}

/**
 * A member seat opened: give it to the next person on the waitlist who has
 * the hours for it. Anyone without enough hours stays on the list and gets a
 * note, so they can top up.
 */
export async function fillFromWaitlist(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.status !== "scheduled" || session.startsAt <= Date.now()) return;
  const bookings = await sessionBookings(ctx, sessionId);
  let seats = seatCounts(session, bookings, Date.now()).left.members;
  if (seats <= 0) return;

  const waiting = bookings.filter((b) => b.status === "waitlisted" && b.memberId);
  const withMembers = [];
  for (const b of waiting) {
    const m = await ctx.db.get(b.memberId!);
    if (m) withMembers.push({ b, m });
  }
  withMembers.sort((x, y) =>
    compareWaitlist(
      { priorityPaused: x.m.priorityPaused, joinedAt: x.b.createdAt },
      { priorityPaused: y.m.priorityPaused, joinedAt: y.b.createdAt },
    ),
  );

  for (const { b, m } of withMembers) {
    if (seats <= 0) break;
    const taken = takeHours(m, b.hours);
    if (!taken) {
      const already = await ctx.db
        .query("notices")
        .withIndex("by_member", (q) => q.eq("memberId", m._id))
        .filter((q) => q.and(q.eq(q.field("bookingId"), b._id), q.eq(q.field("kind"), "waitlistSkipped")))
        .first();
      if (!already) await notify(ctx, m._id, "waitlistSkipped", b._id);
      continue;
    }
    await ctx.db.patch(m._id, taken.member);
    await ctx.db.patch(b._id, { status: "confirmed", ...taken.booking });
    await notify(ctx, m._id, "waitlistPromoted", b._id);
    seats -= 1;
  }
}
