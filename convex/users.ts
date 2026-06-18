import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();
  },
});

export const updateSubscription = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.optional(v.string()),
    usageCount: v.optional(v.number()),
    usageResetAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    await ctx.db.patch(userId, fields);
  },
});

export const initUser = mutation({
  args: { referredByCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const patch: any = {};

    // 1. Generate referral code if missing
    if (!user.referralCode) {
      // Simple random code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      patch.referralCode = code;
    }

    // 2. Link referrer if provided and not already linked
    if (args.referredByCode && !user.referredBy && user.referralCode !== args.referredByCode) {
      const referrer = await ctx.db
        .query("users")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referredByCode))
        .unique();
      
      if (referrer && referrer._id !== userId) {
        patch.referredBy = referrer._id;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }

    return await ctx.db.get(userId);
  },
});

export const incrementUsage = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    
    await ctx.db.patch(args.userId, {
      usageCount: (user.usageCount ?? 0) + 1,
    });
  },
});

export const useFreeTrial = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.hasUsedFreeTrial) return;
    
    await ctx.db.patch(args.userId, {
      hasUsedFreeTrial: true,
    });
  },
});
