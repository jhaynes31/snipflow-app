import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { cleanText, requireMe } from "../lib";

/**
 * One row per device a person turned notifications on for. The browser
 * hands us its push subscription (an endpoint and two keys); we keep only
 * that. Nothing is ever sent to a device its owner didn't add, and a
 * device that stops answering is dropped.
 */

/** The server's public push key, so the browser can subscribe. Null until the build has set it. */
export const publicKey = query({
  args: {},
  handler: async (ctx) => {
    await requireMe(ctx);
    return process.env.VAPID_PUBLIC_KEY ?? null;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("pushSubscriptions").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    return rows.map((r) => ({ _id: r._id, endpoint: r.endpoint, label: r.label, createdAt: r.createdAt, lastUsedAt: r.lastUsedAt }));
  },
});

export const save = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string(), label: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (!/^https:\/\//.test(args.endpoint)) throw new ConvexError("That doesn't look like a push address.");
    const existing = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint)).first();
    const label = cleanText(args.label, 60, "Device");
    if (existing) {
      // A device re-subscribing after a sign-in switch belongs to whoever is signed in now.
      await ctx.db.patch(existing._id, { ownerId: me.profile._id, p256dh: args.p256dh, auth: args.auth, label });
    } else {
      await ctx.db.insert("pushSubscriptions", { ownerId: me.profile._id, endpoint: args.endpoint, p256dh: args.p256dh, auth: args.auth, label, createdAt: Date.now() });
    }
    if (!me.profile.reminders.pushEnabled) await ctx.db.patch(me.profile._id, { reminders: { ...me.profile.reminders, pushEnabled: true } });
  },
});

export const remove = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint)).first();
    if (row && row.ownerId === me.profile._id) await ctx.db.delete(row._id);
  },
});

export const forProfile = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.query("pushSubscriptions").withIndex("by_owner", (q) => q.eq("ownerId", args.profileId)).collect();
  },
});

export const drop = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const touch = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (row) await ctx.db.patch(row._id, { lastUsedAt: Date.now() });
  },
});
