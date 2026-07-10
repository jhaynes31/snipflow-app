import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Public mutations callable from the Next.js API route (ConvexHttpClient)
export const updateProcessStatus = mutation({
  args: {
    id: v.id("contentPacks"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const completeProcessing = mutation({
  args: {
    id: v.id("contentPacks"),
    moments: v.array(
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
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      moments: args.moments,
      status: "completed"
    });
    
    // Check if all packs in batch are done
    const pack = await ctx.db.get(args.id);
    if (pack?.batchId) {
        const batchPacks = await ctx.db
            .query("contentPacks")
            .withIndex("by_batch", (q) => q.eq("batchId", pack.batchId))
            .collect();
        
        if (batchPacks.every(p => p.status === "completed" || p.status === "failed")) {
            await ctx.db.patch(pack.batchId, { status: "completed" });
        }
    }
  },
});

// Internal versions for scheduler/action use (keeping for backward compat)
export const updateStatus = internalMutation({
  args: {
    id: v.id("contentPacks"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const updateMoments = internalMutation({
  args: {
    id: v.id("contentPacks"),
    moments: v.array(
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
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      moments: args.moments,
      status: "completed"
    });
    
    // Check if all packs in batch are done
    const pack = await ctx.db.get(args.id);
    if (pack?.batchId) {
        const batchPacks = await ctx.db
            .query("contentPacks")
            .withIndex("by_batch", (q) => q.eq("batchId", pack.batchId))
            .collect();
        
        if (batchPacks.every(p => p.status === "completed" || p.status === "failed")) {
            await ctx.db.patch(pack.batchId, { status: "completed" });
        }
    }
  },
});

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
    options: v.optional(v.object({
        twitterOnly: v.optional(v.boolean()),
    })),
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

    const packId = await ctx.db.insert("contentPacks", {
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

    // NOTE: Processing is now handled by the /api/process Next.js route,
    // which is called from the client after createContentPack resolves.
    // The old scheduler-based Convex action (internal.actions.processVideo)
    // is no longer used because yt-dlp/ffmpeg aren't available in the Convex runtime.
    if (args.videoUrl) {
        // The client-side code (app/app/page.tsx) will call /api/process
        // after we return the packId
    }

    return packId;
  },
});

export const updateContentPack = mutation({
  args: {
    id: v.id("contentPacks"),
    status: v.optional(v.string()),
    audioStorageId: v.optional(v.string()),
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
    options: v.optional(v.object({
        twitterOnly: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const { id, options, ...fields } = args;
    await ctx.db.patch(id, fields);

    if (fields.audioStorageId) {
        // NOTE: Processing is now handled by /api/process (called from /api/upload after extracting audio).
        // The old scheduler-based Convex action is no longer used because yt-dlp/ffmpeg
        // aren't available in the Convex runtime.
    }
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

export const getPackInternal = query({
  args: { id: v.id("contentPacks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getPack = query({
  args: { id: v.id("contentPacks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
