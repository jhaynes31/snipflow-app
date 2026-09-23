import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/** Hands Stripe's raw request to the Node action, which checks the signature. */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  try {
    await ctx.runAction(internal.stripe.handleWebhook, { payload: await request.text(), signature });
    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Stripe webhook failed", err);
    return new Response("Webhook error", { status: 400 });
  }
});
