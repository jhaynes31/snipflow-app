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
  v.literal("prayer"),
  v.literal("dontFixIt"),
);

export const weatherKind = v.union(
  v.literal("sunny"),
  v.literal("partlyCloudy"),
  v.literal("foggy"),
  v.literal("stormy"),
  v.literal("heavy"),
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
      /** Module ids this person pinned to their home screen as widgets. */
      pinned: v.optional(v.array(v.string())),
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
    /** Tend: the "what kind of hard" tiles the sender picked, for guidance cards. */
    kinds: v.optional(v.array(v.string())),
    checkInId: v.optional(v.id("checkIns")),
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

  /**
   * "How are you, really?" answers. Private. `answer` is the shell's
   * three-way summary; the rest is Tend's fuller check-in (phase 3).
   */
  checkIns: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    answer: checkInAnswer,
    note: v.optional(v.string()),
    weather: v.optional(weatherKind),
    /** 1 = running on empty … 5 = revved up. */
    energy: v.optional(v.number()),
    /** Tile keys from Tend's "what kind of hard" step. */
    kinds: v.optional(v.array(v.string())),
    need: v.optional(helpKind),
    /** "Just logging, I'm fine." */
    justLogging: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  // ---------------------------------------------------------------------
  // Tend (module id "tend"). See docs/support-app-spec.md.
  // ---------------------------------------------------------------------

  /**
   * "Love them well" guidance a person writes about themselves: what helps
   * when they're in a certain kind of hard. Shared, so the partner can read
   * it on a heads-up card. Each person edits only their own.
   */
  tendGuidance: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    /** "When I'm…" in the owner's words. */
    title: v.string(),
    /** Check-in tile keys this applies to; empty means always offered. */
    kinds: v.array(v.string()),
    do: v.string(),
    say: v.string(),
    skip: v.string(),
    pray: v.optional(v.string()),
    sortOrder: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId", "sortOrder"]),

  /** Small ways a person likes to be loved, in three columns. Shared. */
  tendLoveMenu: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    column: v.union(v.literal("practical"), v.literal("emotional"), v.literal("spiritual")),
    text: v.string(),
    sortOrder: v.number(),
  }).index("by_owner", ["ownerId", "column", "sortOrder"]),

  /**
   * One use of a Tend tool. Private. `helped` is the gentle close every tool
   * ends with; over time it decides which tools are offered first. `saved`
   * holds whatever the tool produced worth keeping (a kinder sentence, a
   * finish line, a first step, Story Check answers).
   */
  tendToolUses: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    tool: v.string(),
    helped: v.optional(v.union(v.literal("little"), v.literal("notReally"), v.literal("notAtAll"))),
    saved: v.optional(v.any()),
    checkInId: v.optional(v.id("checkIns")),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_owner_time", ["ownerId", "startedAt"])
    .index("by_owner_tool", ["ownerId", "tool", "startedAt"]),

  /** A Loop Breaker session: the dump, sorted into columns, one card to test. Private. */
  tendLoops: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    title: v.optional(v.string()),
    cards: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        column: v.union(v.literal("dump"), v.literal("now"), v.literal("later"), v.literal("cantThink")),
        parkedUntil: v.optional(v.number()),
      }),
    ),
    pickedCardId: v.optional(v.string()),
    testAction: v.optional(v.string()),
    decision: v.optional(
      v.object({
        defaultChoice: v.string(),
        deadline: v.number(),
        decidedAt: v.optional(v.number()),
        byDefault: v.optional(v.boolean()),
      }),
    ),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_time", ["ownerId", "updatedAt"]),

  /**
   * The Evidence Bank: real, specific things a person did well, logged by
   * either partner about either partner. Shared.
   */
  tendEvidence: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    aboutProfileId: v.id("profiles"),
    text: v.string(),
    showed: v.optional(v.string()),
    date: v.number(),
    createdAt: v.number(),
  }).index("by_about_time", ["aboutProfileId", "date"]),

  /**
   * A Project Thinker project: what done looks like, the big parts, what
   * each needs first, blockers, and the very first physical action. Private
   * until the person shares it for body-doubling.
   */
  tendProjects: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    title: v.string(),
    done: v.optional(v.string()),
    parts: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        needsFirst: v.optional(v.string()),
        blocker: v.optional(v.string()),
        planIfBlocked: v.optional(v.string()),
        steps: v.array(v.object({ id: v.string(), text: v.string(), done: v.boolean() })),
      }),
    ),
    firstAction: v.optional(v.string()),
    firstActionWhen: v.optional(v.string()),
    sentToEveryBoxAt: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("finished")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_time", ["ownerId", "updatedAt"]),

  /** A Focus Mode session. Shared only so the partner can body-double. */
  tendFocusSessions: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    task: v.string(),
    minutes: v.number(),
    startedAt: v.number(),
    endsAt: v.number(),
    status: v.union(v.literal("running"), v.literal("ended")),
    /** The person asked for company. */
    bodyDoubleWanted: v.boolean(),
    /** The partner who joined, if any. */
    joinedProfileId: v.optional(v.id("profiles")),
  }).index("by_owner_time", ["ownerId", "startedAt"]),

  /** A love-menu item the partner picked and did. Shared. Emits `loveAction.done`. */
  tendLoveActions: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    forProfileId: v.id("profiles"),
    itemText: v.string(),
    headsUpId: v.optional(v.id("headsUps")),
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

  // ---------------------------------------------------------------------
  // Every Box (module id "every-box"). Household-scoped, so shared by
  // definition; `visibility` is optional and reads as "shared" when missing.
  // Field names match the standalone Every Box app so its data moves over
  // as-is. See docs/every-box-migration-plan.md.
  // ---------------------------------------------------------------------

  /** The couple as a unit. Exactly one exists, created on first visit. */
  ebHouseholds: defineTable({
    name: v.string(),
    activeTheme: v.string(),
    unlockedThemes: v.array(v.string()),
    isPremium: v.boolean(),
    inviteCode: v.string(),
    /** Legacy: the standalone app stored a users id here. Unused in The Shire. */
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    lastReviewAt: v.optional(v.number()),
    visibility: v.optional(visibilityValidator),
  }).index("by_invite_code", ["inviteCode"]),

  /** Each person inside Every Box, linked to their Shire profile. */
  ebPartners: defineTable({
    householdId: v.id("ebHouseholds"),
    /** The Shire profile this partner is. Missing only on rows imported before linking. */
    profileId: v.optional(v.id("profiles")),
    /** Legacy: the standalone app's users id, kept as text for the import to match on. */
    legacyUserId: v.optional(v.string()),
    displayName: v.string(),
    joinedAt: v.number(),
    visibility: v.optional(visibilityValidator),
  })
    .index("by_profile", ["profileId"])
    .index("by_household", ["householdId"]),

  /** A recurring need. Fully custom per household. Never "completes". */
  ebCategories: defineTable({
    householdId: v.id("ebHouseholds"),
    name: v.string(),
    icon: v.string(),
    idealCadenceDays: v.number(),
    tenderId: v.optional(v.id("ebPartners")),
    tenderIds: v.optional(v.array(v.id("ebPartners"))),
    area: v.optional(v.string()),
    lastTendedAt: v.optional(v.number()),
    sortOrder: v.number(),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
    /** When `category.stuck` was last emitted for this box, so it fires once per dormant spell. */
    stuckNotifiedAt: v.optional(v.number()),
    visibility: v.optional(visibilityValidator),
  }).index("by_household", ["householdId"]),

  ebTendingEvents: defineTable({
    householdId: v.id("ebHouseholds"),
    categoryId: v.id("ebCategories"),
    partnerId: v.id("ebPartners"),
    tendedAt: v.number(),
    note: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
  })
    .index("by_category", ["categoryId", "tendedAt"])
    .index("by_household", ["householdId", "tendedAt"]),

  ebCategoryNotes: defineTable({
    householdId: v.id("ebHouseholds"),
    categoryId: v.id("ebCategories"),
    partnerId: v.id("ebPartners"),
    text: v.string(),
    createdAt: v.number(),
    visibility: v.optional(visibilityValidator),
  })
    .index("by_category", ["categoryId", "createdAt"])
    .index("by_household", ["householdId", "createdAt"]),

  ebWeeklyReviews: defineTable({
    householdId: v.id("ebHouseholds"),
    completedBy: v.id("ebPartners"),
    completedAt: v.number(),
    acknowledgements: v.array(
      v.object({
        categoryId: v.id("ebCategories"),
        answer: v.union(v.literal("yes"), v.literal("partial"), v.literal("no"), v.literal("skipped")),
        stageAtReview: v.number(),
      }),
    ),
    visibility: v.optional(visibilityValidator),
  }).index("by_household", ["householdId", "completedAt"]),

  ebCommitments: defineTable({
    householdId: v.id("ebHouseholds"),
    title: v.string(),
    proposedBy: v.id("ebPartners"),
    assignedTo: v.optional(v.id("ebPartners")),
    assignedToIds: v.optional(v.array(v.id("ebPartners"))),
    status: v.union(v.literal("proposed"), v.literal("agreed"), v.literal("active"), v.literal("done"), v.literal("declined")),
    createdAt: v.number(),
    agreedAt: v.optional(v.number()),
    activatedAt: v.optional(v.number()),
    doneAt: v.optional(v.number()),
    targetWindowDays: v.optional(v.number()),
    lastTendedAt: v.optional(v.number()),
    visibility: v.optional(visibilityValidator),
  })
    .index("by_household", ["householdId", "status"])
    .index("by_assignee", ["assignedTo", "status"]),
});
