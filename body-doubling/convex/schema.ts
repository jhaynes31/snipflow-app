import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const blockValidator = v.object({
  kind: v.union(v.literal("bookend"), v.literal("work")),
  category: v.string(),
  hours: v.number(),
});

export const paymentType = v.union(
  v.literal("included"), // from the member's 8 included hours
  v.literal("extra"), // from hours the member bought
  v.literal("mixed"), // some of each
  v.literal("dropIn"), // paid per session / per hour
  v.literal("scholarship"), // a comped seat, set by a host
);

export default defineSchema({
  ...authTables,

  members: defineTable({
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
    membership: v.union(v.literal("none"), v.literal("active"), v.literal("pastDue"), v.literal("canceled")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    /** The current billing cycle; included hours reset when it renews. */
    cycleStart: v.optional(v.number()),
    cycleEnd: v.optional(v.number()),
    includedHoursUsed: v.number(),
    /** Purchased extra hours on hand. They carry over between cycles. */
    extraHours: v.number(),
    noShowCount: v.number(),
    /** Repeated missed sessions: waitlist spot goes to the back of the line. */
    priorityPaused: v.boolean(),
    /** Internal only (sliding scale / scholarship). Never sent to the member. */
    scholarship: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_customer", ["stripeCustomerId"]),

  sessions: defineTable({
    title: v.string(),
    startsAt: v.number(),
    blocks: v.array(blockValidator),
    gameTitle: v.optional(v.string()),
    capacity: v.number(),
    dropInSlots: v.number(),
    status: v.union(v.literal("scheduled"), v.literal("completed"), v.literal("canceled")),
    createdAt: v.number(),
  }).index("by_start", ["startsAt"]),

  bookings: defineTable({
    sessionId: v.id("sessions"),
    kind: v.union(v.literal("member"), v.literal("dropIn")),
    memberId: v.optional(v.id("members")),
    /** Drop-ins (and comped guests) have no account: name, email and a private link token. */
    guestName: v.optional(v.string()),
    guestEmail: v.optional(v.string()),
    token: v.optional(v.string()),
    status: v.union(
      v.literal("pendingPayment"),
      v.literal("confirmed"),
      v.literal("waitlisted"),
      v.literal("canceled"),
    ),
    paymentType: v.optional(paymentType),
    hours: v.number(),
    /** How the hours were paid for, so a cancellation can give them back. */
    fromIncluded: v.optional(v.number()),
    fromExtra: v.optional(v.number()),
    /** The cycle the included hours came from. */
    cycleStart: v.optional(v.number()),
    /** Hourly drop-ins: which work blocks they're joining. */
    blockIndexes: v.optional(v.array(v.number())),
    amountCents: v.optional(v.number()),
    stripeCheckoutId: v.optional(v.string()),
    holdUntil: v.optional(v.number()),
    attendance: v.union(v.literal("unmarked"), v.literal("attended"), v.literal("noShow")),
    goalsRequestedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_member", ["memberId"])
    .index("by_token", ["token"])
    .index("by_checkout", ["stripeCheckoutId"])
    .index("by_status", ["status"]),

  goalResponses: defineTable({
    bookingId: v.id("bookings"),
    sessionId: v.id("sessions"),
    /** One answer per work block, keyed by block index. */
    answers: v.array(v.object({ blockIndex: v.number(), category: v.string(), goal: v.string() })),
    updatedAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_session", ["sessionId"]),

  /** In-portal messages to a member (goals ready, a friendly policy note, a waitlist spot). */
  notices: defineTable({
    memberId: v.id("members"),
    kind: v.union(
      v.literal("goals"),
      v.literal("gentleReminder"),
      v.literal("priorityPaused"),
      v.literal("waitlistPromoted"),
      v.literal("waitlistSkipped"),
    ),
    bookingId: v.optional(v.id("bookings")),
    createdAt: v.number(),
    dismissedAt: v.optional(v.number()),
  }).index("by_member", ["memberId"]),

  /** Every Stripe payment, for the revenue view. */
  payments: defineTable({
    kind: v.union(v.literal("membership"), v.literal("extraHours"), v.literal("dropIn")),
    amountCents: v.number(),
    memberId: v.optional(v.id("members")),
    bookingId: v.optional(v.id("bookings")),
    stripeId: v.string(),
    createdAt: v.number(),
  }).index("by_stripe_id", ["stripeId"]),
});
