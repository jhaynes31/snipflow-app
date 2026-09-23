"use node";

import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { extraHoursPrice, FULL_SESSION_HOURS, PRICES } from "./rules";

/**
 * Everything that talks to Stripe. Prices come from `rules.ts` (no Price
 * objects to set up in the Stripe dashboard). Needs STRIPE_SECRET_KEY,
 * STRIPE_WEBHOOK_SECRET and SITE_URL on the Convex deployment.
 */

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConvexError("Payments aren't set up yet (STRIPE_SECRET_KEY is missing).");
  return new Stripe(key);
}

function site(path: string) {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

async function signedInMember(ctx: ActionCtx) {
  if (!(await getAuthUserId(ctx))) throw new ConvexError("Please sign in first.");
  const me = await ctx.runQuery(api.members.me, {});
  if (!me || me.needsProfile) throw new ConvexError("Please finish your profile first.");
  const memberId = me._id as Id<"members">;
  const details = await ctx.runQuery(internal.payments.memberForCheckout, { memberId });
  if (!details) throw new ConvexError("Please sign in first.");
  return { memberId, ...details };
}

function customerFields(m: { stripeCustomerId?: string; email: string }) {
  return m.stripeCustomerId ? { customer: m.stripeCustomerId } : { customer_email: m.email };
}

/** $50/month membership. */
export const startMembership = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const m = await signedInMember(ctx);
    if (m.membership === "active") throw new ConvexError("Your membership is already active.");
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      ...customerFields(m),
      client_reference_id: m.memberId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICES.membershipMonthly,
            recurring: { interval: "month" },
            product_data: { name: "Body Doubling Membership", description: "8 hours (two 4-hour sessions) every month" },
          },
        },
      ],
      subscription_data: { metadata: { memberId: m.memberId } },
      metadata: { type: "membership", memberId: m.memberId },
      success_url: site("/portal?welcome=1"),
      cancel_url: site("/portal"),
    });
    return session.url!;
  },
});

/** Extra member hours: a $40 four-hour pack, or $12 an hour. */
export const buyExtraHours = action({
  args: { hours: v.number() },
  handler: async (ctx, { hours }): Promise<string> => {
    if (!Number.isInteger(hours) || hours < 1 || hours > 16) throw new ConvexError("Choose between 1 and 16 hours.");
    const m = await signedInMember(ctx);
    if (m.membership !== "active") throw new ConvexError("Extra hours at the member rate need an active membership.");
    const price = extraHoursPrice(hours);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (price.packs) {
      lineItems.push({
        quantity: price.packs,
        price_data: {
          currency: "usd",
          unit_amount: PRICES.memberExtraSession,
          product_data: { name: `Extra session (${FULL_SESSION_HOURS} hours)` },
        },
      });
    }
    if (price.loose) {
      lineItems.push({
        quantity: price.loose,
        price_data: { currency: "usd", unit_amount: PRICES.memberExtraHour, product_data: { name: "Extra hour" } },
      });
    }
    const totalHours = price.packs * FULL_SESSION_HOURS + price.loose;
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      ...customerFields(m),
      client_reference_id: m.memberId,
      line_items: lineItems,
      metadata: { type: "extraHours", memberId: m.memberId, hours: String(totalHours) },
      success_url: site("/portal?hours=1"),
      cancel_url: site("/portal"),
    });
    return session.url!;
  },
});

/** Drop-ins: hold a seat for 30 minutes and send them to pay. No account needed. */
export const startDropIn = action({
  args: {
    sessionId: v.id("sessions"),
    name: v.string(),
    email: v.string(),
    choice: v.union(
      v.object({ kind: v.literal("full") }),
      v.object({ kind: v.literal("hourly"), blockIndexes: v.array(v.number()) }),
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const client = stripe();
    const token = randomBytes(18).toString("base64url");
    const hold = await ctx.runMutation(internal.bookings.holdDropIn, { ...args, token });
    try {
      const session = await client.checkout.sessions.create({
        mode: "payment",
        customer_email: args.email.trim(),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: hold.cents,
              product_data: { name: hold.label, description: new Date(hold.startsAt).toUTCString() },
            },
          },
        ],
        metadata: { type: "dropIn", bookingId: hold.bookingId },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: site(`/drop-in/${token}?paid=1`),
        cancel_url: site(`/sessions/${args.sessionId}`),
      });
      await ctx.runMutation(internal.bookings.setCheckout, { bookingId: hold.bookingId, checkoutId: session.id });
      return session.url!;
    } catch (err) {
      await ctx.runMutation(internal.bookings.releaseHold, { bookingId: hold.bookingId });
      throw err;
    }
  },
});

/** Stripe's own page for updating a card or canceling the membership. */
export const billingPortal = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const m = await signedInMember(ctx);
    if (!m.stripeCustomerId) throw new ConvexError("There's no billing account yet.");
    const portal = await stripe().billingPortal.sessions.create({ customer: m.stripeCustomerId, return_url: site("/portal") });
    return portal.url;
  },
});

function idOf(x: string | { id: string } | null | undefined): string | undefined {
  if (!x) return undefined;
  return typeof x === "string" ? x : x.id;
}

/** Called by the /stripe/webhook route with the raw body. */
export const handleWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, { payload, signature }) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
    const client = stripe();
    const event = client.webhooks.constructEvent(payload, signature, secret);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object;
        if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return;
        const type = s.metadata?.type;
        if (type === "membership") {
          const memberId = s.metadata!.memberId as Id<"members">;
          const customerId = idOf(s.customer);
          if (customerId) {
            await ctx.runMutation(internal.payments.linkCustomer, { memberId, customerId, subscriptionId: idOf(s.subscription) });
          }
        } else if (type === "extraHours") {
          await ctx.runMutation(internal.payments.extraHoursPaid, {
            memberId: s.metadata!.memberId as Id<"members">,
            hours: Number(s.metadata!.hours),
            amountCents: s.amount_total ?? 0,
            checkoutId: s.id,
          });
          const customerId = idOf(s.customer);
          if (customerId) {
            await ctx.runMutation(internal.payments.linkCustomer, { memberId: s.metadata!.memberId as Id<"members">, customerId });
          }
        } else if (type === "dropIn") {
          await ctx.runMutation(internal.payments.dropInPaid, {
            checkoutId: s.id,
            bookingId: s.metadata!.bookingId as Id<"bookings">,
            amountCents: s.amount_total ?? 0,
          });
        }
        return;
      }
      case "checkout.session.expired": {
        const s = event.data.object;
        if (s.metadata?.type === "dropIn") await ctx.runMutation(internal.payments.dropInExpired, { checkoutId: s.id });
        return;
      }
      case "invoice.paid": {
        const inv = event.data.object;
        const details = inv.parent?.subscription_details;
        const subscriptionId = idOf(details?.subscription);
        if (!subscriptionId) return;
        let memberId = details?.metadata?.memberId;
        if (!memberId) {
          const sub = await client.subscriptions.retrieve(subscriptionId);
          memberId = sub.metadata?.memberId;
        }
        const line = inv.lines.data[0];
        if (!memberId || !line) return;
        await ctx.runMutation(internal.payments.membershipPaid, {
          memberId: memberId as Id<"members">,
          customerId: idOf(inv.customer) ?? "",
          subscriptionId,
          periodStart: line.period.start * 1000,
          periodEnd: line.period.end * 1000,
          amountCents: inv.amount_paid,
          invoiceId: inv.id!,
        });
        return;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await ctx.runMutation(internal.payments.subscriptionStatus, {
          memberId: (sub.metadata?.memberId as Id<"members">) || undefined,
          subscriptionId: sub.id,
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        });
        return;
      }
    }
  },
});
