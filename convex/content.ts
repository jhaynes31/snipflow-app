import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createBatch = mutation({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db.insert("batches", {
      userId: userId ?? undefined,
      anonymousId: args.anonymousId,
      status: "processing",
      createdAt: Date.now(),
    });
  },
});

export const getBatch = query({
  args: { id: v.id("batches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.id);
    if (!batch) return null;
    
    const packs = await ctx.db
      .query("contentPacks")
      .withIndex("by_batch", (q) => q.eq("batchId", args.id))
      .collect();
      
    return { ...batch, packs };
  },
});

export const updateBatchStatus = mutation({
  args: {
    id: v.id("batches"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const createContentPack = mutation({
  args: {
    videoTitle: v.string(),
    videoUrl: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    batchId: v.optional(v.id("batches")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    let isPaid = false;
    let isFreeTrial = false;
    
    if (userId) {
      const user = await ctx.db.get(userId);
      if (!user) throw new Error("User not found");

      // --- Referral Reward Logic ---
      const existingPacks = await ctx.db
        .query("contentPacks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!existingPacks && user.referredBy) {
        const referrer = await ctx.db.get(user.referredBy);
        if (referrer) {
          const newQualifiedCount = (referrer.qualifiedReferrals ?? 0) + 1;
          const referrerPatch: any = { qualifiedReferrals: newQualifiedCount };

          // Reward every 3 referrals
          if (newQualifiedCount % 3 === 0) {
            if (referrer.plan === "monthly") {
              referrerPatch.bonusPacks = (referrer.bonusPacks ?? 0) + 5;
            } else if (referrer.plan !== "lifetime") {
              referrerPatch.plan = "lifetime";
            }
          }
          await ctx.db.patch(referrer._id, referrerPatch);
        }
      }
      // ------------------------------

      if (user.plan === "monthly") {
        let usageCount = user.usageCount ?? 0;
        const now = Date.now();
        
        // Reset usage if the reset period has passed
        if (user.usageResetAt && now > user.usageResetAt) {
          usageCount = 0;
          await ctx.db.patch(userId, {
            usageCount: 0,
            usageResetAt: now + 30 * 24 * 60 * 60 * 1000,
          });
        }

        if (usageCount < 5) {
          isPaid = true;
          await ctx.db.patch(userId, {
            usageCount: usageCount + 1,
          });
        } else if ((user.bonusPacks ?? 0) > 0) {
          isPaid = true;
          await ctx.db.patch(userId, {
            bonusPacks: user.bonusPacks! - 1,
          });
        }
      } else if (user.plan === "lifetime") {
        isPaid = true;
      } else if (!user.hasUsedFreeTrial) {
        // First pack is free for new authenticated users
        isPaid = true;
        isFreeTrial = true;
        await ctx.db.patch(userId, { hasUsedFreeTrial: true });
      }
    }

    return await ctx.db.insert("contentPacks", {
      userId: userId ?? undefined,
      anonymousId: args.anonymousId,
      batchId: args.batchId,
      videoTitle: args.videoTitle,
      videoUrl: args.videoUrl,
      status: "processing",
      moments: [],
      isPaid: isPaid,
      isFreeTrial: isFreeTrial,
    });
  },
});

export const updateContentPack = mutation({
  args: {
    id: v.id("contentPacks"),
    status: v.optional(v.string()),
    moments: v.optional(v.array(
      v.object({
        timestamp: v.string(),
        description: v.string(),
        linkedinPost: v.string(),
        twitterThread: v.array(v.string()),
        tiktokCaption: v.string(),
        linkedinCarousel: v.optional(v.array(v.object({
          slide: v.number(),
          content: v.string(),
          title: v.string(),
        }))),
      })
    )),
    isPaid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const markBatchAsPaid = mutation({
  args: {
    batchId: v.id("batches"),
  },
  handler: async (ctx, args) => {
    const packs = await ctx.db
      .query("contentPacks")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
      
    for (const pack of packs) {
      await ctx.db.patch(pack._id, { isPaid: true });
    }
  },
});

export const listMyPacks = query({
  args: { anonymousId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId) {
      return await ctx.db
        .query("contentPacks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }
    if (args.anonymousId) {
       return await ctx.db
        .query("contentPacks")
        .filter((q) => q.eq(q.field("anonymousId"), args.anonymousId))
        .collect();
    }
    return [];
  },
});

export const getPack = query({
  args: { id: v.id("contentPacks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
