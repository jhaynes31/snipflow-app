import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(), // for auth
    plan: v.optional(v.string()), // "free", "monthly", "lifetime"
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    usageCount: v.optional(v.number()), // For the 5 packs limit
    usageResetAt: v.optional(v.number()), // Next reset date
    referralCode: v.optional(v.string()),
    referredBy: v.optional(v.id("users")),
    qualifiedReferrals: v.optional(v.number()), // Number of referrals who processed a video
    bonusPacks: v.optional(v.number()), // Extra packs earned from referrals
    hasUsedFreeTrial: v.optional(v.boolean()),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_referral_code", ["referralCode"]),

  contentPacks: defineTable({
    userId: v.optional(v.id("users")),
    anonymousId: v.optional(v.string()),
    batchId: v.optional(v.id("batches")),
    videoTitle: v.string(),
    videoUrl: v.optional(v.string()),
    status: v.string(), // "processing", "completed", "failed"
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
    stripeSessionId: v.optional(v.string()),
    isPaid: v.boolean(),
    isFreeTrial: v.optional(v.boolean()),
  }).index("by_user", ["userId"])
    .index("by_batch", ["batchId"]),

  batches: defineTable({
    userId: v.optional(v.id("users")),
    anonymousId: v.optional(v.string()),
    status: v.string(), // "processing", "completed", "failed"
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  blogs: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.string(),
    author: v.string(),
    publishedAt: v.number(),
  }).index("by_slug", ["slug"]),
});
