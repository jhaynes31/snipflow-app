import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { visibilityValidator } from "./privacy";

/**
 * Hub foundation data model.
 *
 * `authTables` brings in Convex Auth's `users`, sessions and account tables.
 * Every table the Hub owns carries `ownerId` (a profile id) and `visibility`,
 * and every function that reads one goes through the checks in `lib.ts`.
 *
 * Modules keep their own tables in this same schema, prefixed with their
 * module id (Every Box uses `eb`), and follow the same two-column rule.
 */

/** The eight user-manual sections, in the order the profile screen shows them. */
export const MANUAL_SECTION_KEYS = [
  "struggles",
  "warningSigns",
  "whatHelps",
  "whatMakesItWorse",
  "howToLoveMe",
  "communication",
  "sensory",
  "faithAnchors",
] as const;

export const manualSectionKey = v.union(
  ...MANUAL_SECTION_KEYS.map((k) => v.literal(k)),
);

export const helpKind = v.union(
  v.literal("space"),
  v.literal("quietPresence"),
  v.literal("practicalHelp"),
  v.literal("words"),
  v.literal("dontFixIt"),
);

export const headsUpResponse = v.union(
  v.literal("onIt"),
  v.literal("hug"),
  v.literal("talkLater"),
);

export const checkInAnswer = v.union(
  v.literal("steady"),
  v.literal("tender"),
  v.literal("low"),
);

export default defineSchema({
  ...authTables,

  /**
   * One per account. Exactly two exist (see `auth.ts`), and each one's partner
   * is simply the other. Display name and photo are visible to the partner;
   * everything else on the profile is the person's own.
   */
  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    photoUrl: v.optional(v.string()),
    timeZone: v.string(),
    /** Secret capability for the person's calendar feed URL. */
    calendarToken: v.string(),
    reminders: v.object({
      /** Wall-clock time of the recurring daily check-in invite. */
      dailyCheckInHour: v.number(),
      dailyCheckInMinute: v.number(),
      /** Installed-app icon badge: open heads-ups only. */
      badgeEnabled: v.boolean(),
      /** Reserved for a later phase; push is off by default and not yet delivered. */
      pushEnabled: v.boolean(),
      quietHoursStart: v.optional(v.number()),
      quietHoursEnd: v.optional(v.number()),
    }),
    accessibility: v.object({
      textSize: v.union(v.literal("normal"), v.literal("large"), v.literal("larger")),
      highContrast: v.boolean(),
      quietVisuals: v.boolean(),
      theme: v.union(v.literal("system"), v.literal("light"), v.literal("dark")),
    }),
    modules: v.object({
      /** Always empty: every place is on for both people. Kept so existing rows still load. */
      disabled: v.array(v.string()),
      /** Tab order. Ids missing here fall back to registry order. */
      order: v.array(v.string()),
    }),
    /** Per-module settings, keyed by module id. Each module owns its own shape. */
    moduleSettings: v.record(v.string(), v.any()),
    /** True once the guided setup was finished or skipped. */
    setupDone: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_calendar_token", ["calendarToken"]),

  /** One row per filled-in user-manual section. Each has its own privacy setting. */
  userManualSections: defineTable({
    ownerId: v.id("profiles"),
    key: manualSectionKey,
    body: v.string(),
    /** Shown to the partner when visibility is `sharedSummary`. */
    summary: v.optional(v.string()),
    visibility: visibilityValidator,
    /** Whether the AI coach (a later phase) may read this section. */
    coachAllowed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_key", ["ownerId", "key"]),

  /** A card from one partner to the other. Always shared: sending it is the sharing. */
  headsUps: defineTable({
    ownerId: v.id("profiles"),
    receiverId: v.id("profiles"),
    visibility: visibilityValidator,
    status: v.union(v.literal("open"), v.literal("responded"), v.literal("closed")),
    statusLine: v.string(),
    help: helpKind,
    /** Snapshot of the Do / Say / Skip lines the sender chose to include. */
    suggestions: v.object({
      do: v.array(v.string()),
      say: v.array(v.string()),
      skip: v.array(v.string()),
    }),
    urgent: v.boolean(),
    addToCalendar: v.boolean(),
    /** Which module handed this to the Hub. `hub` when sent from the shell. */
    sourceModule: v.string(),
    response: v.optional(headsUpResponse),
    respondedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_receiver_status", ["receiverId", "status"])
    .index("by_owner", ["ownerId", "createdAt"]),

  /** Per person. The partner can see only whether it is on. */
  gentleModeState: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    on: v.boolean(),
    since: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  /** The cross-module event log. See `events.ts` and `moduleHooks.ts`. */
  events: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    name: v.string(),
    /** Module id that emitted it, or `hub`. */
    source: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  })
    .index("by_owner_time", ["ownerId", "createdAt"])
    .index("by_name", ["name", "createdAt"]),

  /** "How are you, really?" answers. Private. The Support module builds on this. */
  checkIns: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    answer: checkInAnswer,
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Reserved for phase 4 (AI coach). Private to the person; deletable. */
  coachConversations: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    module: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        at: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_time", ["ownerId", "updatedAt"]),

  /** Reserved for phase 4 (Need help now). Optionally shared with the partner. */
  safetyPlans: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    warningSigns: v.string(),
    whatCalmsMe: v.string(),
    peopleToCall: v.string(),
    reasonsToHoldOn: v.string(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
});
