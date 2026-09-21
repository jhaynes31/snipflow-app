"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Delivers one notification to every device a person added. The keys that
 * sign these live in the Convex environment (VAPID_*), written by the build
 * the first time it runs. A device that answers 404 or 410 is gone and is
 * dropped; any other failure is logged and skipped.
 */
export const deliver = internalAction({
  args: { profileId: v.id("profiles"), title: v.string(), body: v.string(), url: v.string(), tag: v.optional(v.string()), urgent: v.boolean() },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      console.error("Push: VAPID keys are not set on the Convex deployment.");
      return;
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://the-shire-lilac.vercel.app", publicKey, privateKey);
    const subs = await ctx.runQuery(internal.push.subscriptions.forProfile, { profileId: args.profileId });
    const payload = JSON.stringify({ title: args.title, body: args.body, url: args.url, tag: args.tag, urgent: args.urgent });
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: args.urgent ? 60 * 60 : 6 * 60 * 60,
          urgency: args.urgent ? "high" : "normal",
        });
        await ctx.runMutation(internal.push.subscriptions.touch, { id: s._id });
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await ctx.runMutation(internal.push.subscriptions.drop, { id: s._id });
        } else {
          console.error(`Push: could not reach ${s.label}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  },
});
