import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { requestGoals } from "./bookings";
import { goalsDue } from "./rules";

/**
 * What Stripe's webhook changes. Every handler is safe to run twice: Stripe
 * retries, and a payment is only recorded once per Stripe id.
 */

async function recordOnce(ctx: MutationCtx, row: Omit<Doc<"payments">, "_id" | "_creationTime" | "createdAt">) {
  const seen = await ctx.db
    .query("payments")
    .withIndex("by_stripe_id", (q) => q.eq("stripeId", row.stripeId))
    .first();
  if (seen) return false;
  await ctx.db.insert("payments", { ...row, createdAt: Date.now() });
  return true;
}

export const memberForCheckout = internalQuery({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const m = await ctx.db.get(memberId);
    return m ? { email: m.email, name: m.name, stripeCustomerId: m.stripeCustomerId, membership: m.membership } : null;
  },
});

export const linkCustomer = internalMutation({
  args: { memberId: v.id("members"), customerId: v.string(), subscriptionId: v.optional(v.string()) },
  handler: async (ctx, { memberId, customerId, subscriptionId }) => {
    await ctx.db.patch(memberId, { stripeCustomerId: customerId, ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}) });
  },
});

/** A membership invoice was paid: a new cycle starts and included hours reset. */
export const membershipPaid = internalMutation({
  args: {
    memberId: v.id("members"),
    customerId: v.string(),
    subscriptionId: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    amountCents: v.number(),
    invoiceId: v.string(),
  },
  handler: async (ctx, a) => {
    const m = await ctx.db.get(a.memberId);
    if (!m) return;
    const newCycle = m.cycleStart !== a.periodStart;
    await ctx.db.patch(m._id, {
      membership: "active",
      stripeCustomerId: a.customerId,
      stripeSubscriptionId: a.subscriptionId,
      cycleStart: a.periodStart,
      cycleEnd: a.periodEnd,
      ...(newCycle ? { includedHoursUsed: 0 } : {}),
    });
    await recordOnce(ctx, { kind: "membership", amountCents: a.amountCents, memberId: m._id, stripeId: a.invoiceId });
  },
});

export const subscriptionStatus = internalMutation({
  args: { memberId: v.optional(v.id("members")), subscriptionId: v.string(), status: v.string() },
  handler: async (ctx, { memberId, subscriptionId, status }) => {
    let m: Doc<"members"> | null = memberId ? await ctx.db.get(memberId) : null;
    if (!m) {
      m = (await ctx.db.query("members").collect()).find((x) => x.stripeSubscriptionId === subscriptionId) ?? null;
    }
    if (!m || (m.stripeSubscriptionId && m.stripeSubscriptionId !== subscriptionId)) return;
    const membership: Doc<"members">["membership"] =
      status === "active" || status === "trialing"
        ? "active"
        : status === "past_due" || status === "unpaid"
          ? "pastDue"
          : status === "canceled" || status === "incomplete_expired"
            ? "canceled"
            : m.membership;
    await ctx.db.patch(m._id, { membership });
  },
});

export const extraHoursPaid = internalMutation({
  args: { memberId: v.id("members"), hours: v.number(), amountCents: v.number(), checkoutId: v.string() },
  handler: async (ctx, { memberId, hours, amountCents, checkoutId }) => {
    const m = await ctx.db.get(memberId);
    if (!m) return;
    const fresh = await recordOnce(ctx, { kind: "extraHours", amountCents, memberId, stripeId: checkoutId });
    if (fresh) await ctx.db.patch(memberId, { extraHours: m.extraHours + hours });
  },
});

async function bookingByCheckout(ctx: MutationCtx, checkoutId: string) {
  return await ctx.db
    .query("bookings")
    .withIndex("by_checkout", (q) => q.eq("stripeCheckoutId", checkoutId))
    .unique();
}

/** A drop-in paid. Their seat is theirs even if the hold ran out while they were paying. */
export const dropInPaid = internalMutation({
  args: { checkoutId: v.string(), bookingId: v.optional(v.id("bookings")), amountCents: v.number() },
  handler: async (ctx, { checkoutId, bookingId, amountCents }) => {
    const b = (await bookingByCheckout(ctx, checkoutId)) ?? (bookingId ? await ctx.db.get(bookingId as Id<"bookings">) : null);
    if (!b) return;
    await recordOnce(ctx, { kind: "dropIn", amountCents, bookingId: b._id, stripeId: checkoutId });
    if (b.status === "confirmed") return;
    await ctx.db.patch(b._id, { status: "confirmed", amountCents, stripeCheckoutId: checkoutId, holdUntil: undefined });
    const session = await ctx.db.get(b.sessionId);
    if (session && goalsDue(session.startsAt, Date.now())) await requestGoals(ctx, b._id);
  },
});

export const dropInExpired = internalMutation({
  args: { checkoutId: v.string() },
  handler: async (ctx, { checkoutId }) => {
    const b = await bookingByCheckout(ctx, checkoutId);
    if (b?.status === "pendingPayment") await ctx.db.patch(b._id, { status: "canceled" });
  },
});
