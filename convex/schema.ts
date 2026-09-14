import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    // Convex Auth creates users without this; it must stay optional.
    tokenIdentifier: v.optional(v.string()),
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

  // ---------------------------------------------------------------------
  // Every Box — a shared, ambient freshness dashboard for couples.
  // Tables are namespaced with an `eb` prefix so they sit cleanly beside
  // the SnipFlow tables above. See convex/everybox/* for the functions.
  // ---------------------------------------------------------------------

  /** The couple as a unit. Owns the active theme and premium flag. */
  ebHouseholds: defineTable({
    name: v.string(),
    activeTheme: v.string(),
    /** Extra themes unlocked outside the premium flag (gifts, promos). */
    unlockedThemes: v.array(v.string()),
    /** Household-level subscription flag. Premium themes only; never functionality. */
    isPremium: v.boolean(),
    inviteCode: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    lastReviewAt: v.optional(v.number()),
  }).index("by_invite_code", ["inviteCode"]),

  /** Each person, linked to a household. One household per user for now. */
  ebPartners: defineTable({
    householdId: v.id("ebHouseholds"),
    userId: v.id("users"),
    displayName: v.string(),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_household", ["householdId"]),

  /** A recurring need. Fully custom per household. Never "completes". */
  ebCategories: defineTable({
    householdId: v.id("ebHouseholds"),
    name: v.string(),
    icon: v.string(),
    idealCadenceDays: v.number(),
    /** Only the tender can mark this category tended. */
    tenderId: v.id("ebPartners"),
    /** Denormalised from the latest tending event for cheap dashboards. */
    lastTendedAt: v.optional(v.number()),
    sortOrder: v.number(),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  }).index("by_household", ["householdId"]),

  /** A timestamped log entry against a category. */
  ebTendingEvents: defineTable({
    householdId: v.id("ebHouseholds"),
    categoryId: v.id("ebCategories"),
    partnerId: v.id("ebPartners"),
    tendedAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_category", ["categoryId", "tendedAt"])
    .index("by_household", ["householdId", "tendedAt"]),

  /**
   * A context note the *other* partner can leave on a category ("we actually
   * talked Tuesday"). Never changes freshness — shared visibility, not control.
   */
  ebCategoryNotes: defineTable({
    householdId: v.id("ebHouseholds"),
    categoryId: v.id("ebCategories"),
    partnerId: v.id("ebPartners"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_category", ["categoryId", "createdAt"])
    .index("by_household", ["householdId", "createdAt"]),

  /** A completed weekly review session and what was acknowledged. */
  ebWeeklyReviews: defineTable({
    householdId: v.id("ebHouseholds"),
    completedBy: v.id("ebPartners"),
    completedAt: v.number(),
    acknowledgements: v.array(
      v.object({
        categoryId: v.id("ebCategories"),
        /** yes / partial / no — a light check, never a score. `skipped` = not surfaced. */
        answer: v.union(
          v.literal("yes"),
          v.literal("partial"),
          v.literal("no"),
          v.literal("skipped"),
        ),
        /** Stage snapshot at review time, so the next review can surface changes. */
        stageAtReview: v.number(),
      }),
    ),
  }).index("by_household", ["householdId", "completedAt"]),

  /**
   * A discrete, finishable to-do. Proposed by either partner; only becomes
   * active once the assigned partner marks it agreed. Withers like a category
   * while active, but marking it done archives it for good.
   */
  ebCommitments: defineTable({
    householdId: v.id("ebHouseholds"),
    title: v.string(),
    proposedBy: v.id("ebPartners"),
    assignedTo: v.id("ebPartners"),
    status: v.union(
      v.literal("proposed"),
      v.literal("agreed"),
      v.literal("active"),
      v.literal("done"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    agreedAt: v.optional(v.number()),
    activatedAt: v.optional(v.number()),
    doneAt: v.optional(v.number()),
    /** Optional target window in days; doubles as the wither cadence. */
    targetWindowDays: v.optional(v.number()),
    /** Last time the assignee checked in on it while active. */
    lastTendedAt: v.optional(v.number()),
  })
    .index("by_household", ["householdId", "status"])
    .index("by_assignee", ["assignedTo", "status"]),
});
