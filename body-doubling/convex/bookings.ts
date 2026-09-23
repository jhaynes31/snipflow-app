import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  currentMember,
  fillFromWaitlist,
  includedLeft,
  notify,
  refundHours,
  requireMember,
  seatCounts,
  sessionBookings,
  takeHours,
} from "./lib";
import { checkInOpen, DROP_IN_HOLD_MS, dropInQuote, goalsDue, sessionHours } from "./rules";

// ── Reading ───────────────────────────────────────────────────────────────

/** Which work blocks a booking asks goals for: all of them, or an hourly drop-in's picks. */
function goalBlocks(session: Doc<"sessions">, booking: Doc<"bookings">) {
  return session.blocks
    .map((b, index) => ({ ...b, index }))
    .filter((b) => b.kind === "work" && (!booking.blockIndexes || booking.blockIndexes.includes(b.index)));
}

async function bookingView(ctx: QueryCtx, booking: Doc<"bookings">) {
  const session = await ctx.db.get(booking.sessionId);
  if (!session) return null;
  const goals = await ctx.db
    .query("goalResponses")
    .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
    .unique();
  const now = Date.now();
  const hours = sessionHours(session.blocks);
  return {
    _id: booking._id,
    status: booking.status,
    kind: booking.kind,
    paymentType: booking.paymentType,
    hours: booking.hours,
    attendance: booking.attendance,
    guestName: booking.guestName,
    session: {
      _id: session._id,
      title: session.title,
      startsAt: session.startsAt,
      hours,
      gameTitle: session.gameTitle,
      status: session.status,
      blocks: session.blocks,
    },
    goalBlocks: goalBlocks(session, booking),
    goals: goals?.answers ?? [],
    goalsOpen: booking.status === "confirmed" && now < session.startsAt,
    goalsNudge: booking.status === "confirmed" && goalsDue(session.startsAt, now) && !goals,
    canCheckIn: booking.status === "confirmed" && booking.attendance === "unmarked" && checkInOpen(session.startsAt, hours, now),
    canCancel: (booking.status === "confirmed" || booking.status === "waitlisted") && now < session.startsAt && booking.kind === "member",
  };
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const member = await currentMember(ctx);
    if (!member) return [];
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();
    const out = [];
    for (const b of bookings) {
      if (b.status === "canceled" || b.status === "pendingPayment") continue;
      const view = await bookingView(ctx, b);
      if (view && view.session.status !== "canceled") out.push(view);
    }
    return out.sort((a, b) => a.session.startsAt - b.session.startsAt);
  },
});

/** The signed-in member's booking for one session, if any. */
export const mineForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const member = await currentMember(ctx);
    if (!member) return null;
    const b = await activeBooking(ctx, sessionId, member._id);
    return b ? await bookingView(ctx, b) : null;
  },
});

/** A drop-in's private page, reached by the link in their confirmation. */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 16) return null;
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return b ? await bookingView(ctx, b) : null;
  },
});

async function activeBooking(ctx: QueryCtx, sessionId: Id<"sessions">, memberId: Id<"members">) {
  const all = await ctx.db
    .query("bookings")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  return all.find((b) => b.sessionId === sessionId && (b.status === "confirmed" || b.status === "waitlisted")) ?? null;
}

// ── Members booking ───────────────────────────────────────────────────────

async function openSession(ctx: QueryCtx, sessionId: Id<"sessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.status !== "scheduled") throw new ConvexError("This session isn't open for booking.");
  if (session.startsAt <= Date.now()) throw new ConvexError("This session has already started.");
  return session;
}

/**
 * Book a seat with included hours first, then purchased extra hours.
 * Returns `{ shortBy }` instead of booking when more hours are needed.
 */
export const bookAsMember = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const member = await requireMember(ctx);
    if (member.membership !== "active") throw new ConvexError("Booking with hours needs an active membership.");
    const session = await openSession(ctx, sessionId);
    if (await activeBooking(ctx, sessionId, member._id)) throw new ConvexError("You're already on this session.");

    const seats = seatCounts(session, await sessionBookings(ctx, sessionId), Date.now());
    if (seats.left.members <= 0) throw new ConvexError("Member seats are full. You can join the waitlist.");

    const hours = sessionHours(session.blocks);
    const taken = takeHours(member, hours);
    if (!taken) {
      const have = includedLeft(member) + Math.max(0, member.extraHours);
      return { booked: false as const, shortBy: Math.max(1, hours - have) };
    }
    await ctx.db.patch(member._id, taken.member);
    const bookingId = await ctx.db.insert("bookings", {
      sessionId,
      kind: "member",
      memberId: member._id,
      status: "confirmed",
      hours,
      ...taken.booking,
      attendance: "unmarked",
      createdAt: Date.now(),
    });
    if (goalsDue(session.startsAt, Date.now())) await requestGoals(ctx, bookingId);
    return { booked: true as const, bookingId };
  },
});

export const joinWaitlist = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const member = await requireMember(ctx);
    if (member.membership !== "active") throw new ConvexError("The waitlist is for members.");
    const session = await openSession(ctx, sessionId);
    if (await activeBooking(ctx, sessionId, member._id)) throw new ConvexError("You're already on this session.");
    await ctx.db.insert("bookings", {
      sessionId,
      kind: "member",
      memberId: member._id,
      status: "waitlisted",
      hours: sessionHours(session.blocks),
      attendance: "unmarked",
      createdAt: Date.now(),
    });
  },
});

/** Members cancel anytime before the start. Hours go back; the waitlist moves up. */
export const cancel = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const member = await requireMember(ctx);
    const b = await ctx.db.get(bookingId);
    if (!b || b.memberId !== member._id) throw new ConvexError("That booking isn't yours.");
    const session = await ctx.db.get(b.sessionId);
    if (!session || session.startsAt <= Date.now()) throw new ConvexError("This session has already started.");
    if (b.status === "confirmed") await refundHours(ctx, b);
    const wasSeated = b.status === "confirmed";
    await ctx.db.patch(bookingId, { status: "canceled" });
    if (wasSeated) await fillFromWaitlist(ctx, b.sessionId);
  },
});

// ── Check-in and goals ────────────────────────────────────────────────────

async function bookingFor(ctx: QueryCtx, ref: { bookingId?: Id<"bookings">; token?: string }) {
  if (ref.token) {
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_token", (q) => q.eq("token", ref.token))
      .unique();
    if (b) return b;
  } else if (ref.bookingId) {
    const member = await currentMember(ctx);
    const b = await ctx.db.get(ref.bookingId);
    if (b && member && b.memberId === member._id) return b;
  }
  throw new ConvexError("We couldn't find that booking.");
}

const ref = { bookingId: v.optional(v.id("bookings")), token: v.optional(v.string()) };

export const checkIn = mutation({
  args: ref,
  handler: async (ctx, args) => {
    const b = await bookingFor(ctx, args);
    const session = await ctx.db.get(b.sessionId);
    if (!session || b.status !== "confirmed") throw new ConvexError("That booking isn't active.");
    if (!checkInOpen(session.startsAt, sessionHours(session.blocks), Date.now())) {
      throw new ConvexError("Check-in opens 15 minutes before the session starts.");
    }
    if (b.attendance === "unmarked") await ctx.db.patch(b._id, { attendance: "attended" });
  },
});

export const saveGoals = mutation({
  args: { ...ref, answers: v.array(v.object({ blockIndex: v.number(), goal: v.string() })) },
  handler: async (ctx, { answers, ...r }) => {
    const b = await bookingFor(ctx, r);
    const session = await ctx.db.get(b.sessionId);
    if (!session || b.status !== "confirmed") throw new ConvexError("That booking isn't active.");
    if (Date.now() >= session.startsAt) throw new ConvexError("The session has started, so goals are closed. Bring them to the call!");
    const allowed = goalBlocks(session, b);
    const clean = allowed.map((block) => ({
      blockIndex: block.index,
      category: block.category,
      goal: (answers.find((a) => a.blockIndex === block.index)?.goal ?? "").trim().slice(0, 500),
    }));
    const existing = await ctx.db
      .query("goalResponses")
      .withIndex("by_booking", (q) => q.eq("bookingId", b._id))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { answers: clean, updatedAt: Date.now() });
    else await ctx.db.insert("goalResponses", { bookingId: b._id, sessionId: b.sessionId, answers: clean, updatedAt: Date.now() });
  },
});

/** Mark a booking's goals form as sent, and let a member know in their portal. */
export async function requestGoals(ctx: MutationCtx, bookingId: Id<"bookings">) {
  const b = await ctx.db.get(bookingId);
  if (!b || b.goalsRequestedAt) return;
  await ctx.db.patch(bookingId, { goalsRequestedAt: Date.now() });
  if (b.memberId) await notify(ctx, b.memberId, "goals", bookingId);
}

// ── Drop-ins (called by the Stripe actions) ───────────────────────────────

export const holdDropIn = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.string(),
    email: v.string(),
    choice: v.union(
      v.object({ kind: v.literal("full") }),
      v.object({ kind: v.literal("hourly"), blockIndexes: v.array(v.number()) }),
    ),
    token: v.string(),
  },
  handler: async (ctx, { sessionId, name, email, choice, token }) => {
    const session = await openSession(ctx, sessionId);
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) throw new ConvexError("Add your name and a working email.");
    const quote = dropInQuote(session.blocks, choice);
    if ("error" in quote) throw new ConvexError(quote.error);
    const seats = seatCounts(session, await sessionBookings(ctx, sessionId), Date.now());
    if (seats.left.dropIns <= 0) throw new ConvexError("Drop-in seats for this session are full.");
    const bookingId = await ctx.db.insert("bookings", {
      sessionId,
      kind: "dropIn",
      guestName: name.trim(),
      guestEmail: email.trim().toLowerCase(),
      token,
      status: "pendingPayment",
      paymentType: "dropIn",
      hours: quote.hours,
      blockIndexes: choice.kind === "hourly" ? [...new Set(choice.blockIndexes)].sort((a, b) => a - b) : undefined,
      amountCents: quote.cents,
      holdUntil: Date.now() + DROP_IN_HOLD_MS + 5 * 60_000,
      attendance: "unmarked",
      createdAt: Date.now(),
    });
    const label =
      choice.kind === "full"
        ? `${session.title} — full session`
        : `${session.title} — ${quote.hours} hr drop-in (work blocks)`;
    return { bookingId, cents: quote.cents, label, startsAt: session.startsAt };
  },
});

export const setCheckout = internalMutation({
  args: { bookingId: v.id("bookings"), checkoutId: v.string() },
  handler: async (ctx, { bookingId, checkoutId }) => {
    await ctx.db.patch(bookingId, { stripeCheckoutId: checkoutId });
  },
});

/** Drop the hold if making the checkout failed. */
export const releaseHold = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const b = await ctx.db.get(bookingId);
    if (b?.status === "pendingPayment") await ctx.db.patch(bookingId, { status: "canceled" });
  },
});
