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

  /** Cycle start dates. Private. The partner only ever sees the forecast summary, and only if shared. */
  tendCycleStarts: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    /** Local calendar day as YYYY-MM-DD. */
    day: v.string(),
    createdAt: v.number(),
  }).index("by_owner_day", ["ownerId", "day"]),

  /** Optional sleep hours per day. Private. */
  tendSleep: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    hours: v.number(),
    createdAt: v.number(),
  }).index("by_owner_day", ["ownerId", "day"]),

  /**
   * A Repair conversation. Shared between the two, but each person's
   * writing stays hidden from the other until both have submitted, and the
   * reveal happens at the same time for both.
   */
  tendRepairs: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    partnerId: v.id("profiles"),
    status: v.union(v.literal("invited"), v.literal("later"), v.literal("writing"), v.literal("revealed"), v.literal("closed")),
    laterAt: v.optional(v.number()),
    entries: v.array(
      v.object({
        profileId: v.id("profiles"),
        happened: v.string(),
        felt: v.string(),
        needed: v.string(),
        submittedAt: v.number(),
        heard: v.optional(v.string()),
        own: v.optional(v.string()),
        nextTime: v.optional(v.string()),
        gesture: v.optional(v.string()),
      }),
    ),
    revealedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_time", ["ownerId", "updatedAt"]),

  /** "I saw you" appreciation notes. Shared. */
  tendNotes: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    toProfileId: v.id("profiles"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_to_time", ["toProfileId", "createdAt"]),

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
  // ---------------------------------------------------------------------
  // Re-Centered (module id "re-centered"). One person's own room. The first
  // to open it claims it; every row is private and there is no share switch.
  // See docs/kept-word-spec.md.
  // ---------------------------------------------------------------------

  /** Which person a single-person room belongs to. One row per module id. */
  moduleOwners: defineTable({
    moduleId: v.string(),
    ownerId: v.id("profiles"),
    claimedAt: v.number(),
  }).index("by_module", ["moduleId"]),

  /** Whose is this? Something landed, sorted: mine / theirs / not mine. */
  rcSorts: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    whose: v.union(v.literal("mine"), v.literal("theirs"), v.literal("ours"), v.literal("notMine"), v.literal("unsure")),
    myPart: v.optional(v.string()),
    theirPart: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** The pause before rescuing: four answers and how it ended. */
  rcPauses: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    ifNothing: v.string(),
    landsOn: v.string(),
    afraid: v.string(),
    need: v.string(),
    ending: v.union(v.literal("stepIn"), v.literal("letItLand"), v.literal("notYet")),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Let it land: a time I didn't fix or manage it, in my words. */
  rcLandings: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    after: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Where my security is sitting today. One per day; the latest tap wins. */
  rcSecurityTaps: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    where: v.union(v.literal("partner"), v.literal("others"), v.literal("self"), v.literal("mixed")),
    createdAt: v.number(),
  }).index("by_owner_day", ["ownerId", "day"]),

  /** My own life: an area that is mine, and one way back into it. */
  rcOwnLife: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    area: v.string(),
    wayBackIn: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Kept, by me: a time I did what I said I'd do for myself. */
  rcKeptByMe: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),
  // ---------------------------------------------------------------------
  // Kept Word (module id "kept-word"). Shared by nature. A word is one
  // thing a person said they would do; only the giver closes it. See
  // docs/kept-word-spec.md.
  // ---------------------------------------------------------------------

  kwWords: defineTable({
    /** The giver: the person whose word it is. */
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    /** A plain area tag so repeated words can be named per area. */
    area: v.string(),
    forWhom: v.union(v.literal("partner"), v.literal("me"), v.literal("us")),
    /** "YYYY-MM-DD" in the giver's time zone, or none for ongoing. */
    dueDay: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("kept"), v.literal("notYet"), v.literal("didnt"), v.literal("renegotiated")),
    reason: v.optional(v.union(v.literal("forgot"), v.literal("overcommitted"), v.literal("avoided"), v.literal("changedMind"), v.literal("outsideControl"))),
    whatNow: v.optional(v.union(v.literal("smaller"), v.literal("notHappening"), v.literal("askedHelp"))),
    note: v.optional(v.string()),
    /** Set on a renegotiated word: the new word that replaced it. */
    replacedBy: v.optional(v.id("kwWords")),
    /** Set on a word that replaced an earlier one. */
    replaces: v.optional(v.id("kwWords")),
    /** Set when the word began as the partner's "I heard you say". */
    heardId: v.optional(v.id("kwHeard")),
    /** Set when the word began as an ask. */
    askId: v.optional(v.id("kwAsks")),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    sentToEveryBoxAt: v.optional(v.number()),
  })
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_owner_time", ["ownerId", "createdAt"]),

  /** "I heard you say": the receiver's draft, a word only once the giver confirms it. */
  kwHeard: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    aboutProfileId: v.id("profiles"),
    text: v.string(),
    dueDay: v.optional(v.string()),
    status: v.union(v.literal("waiting"), v.literal("confirmed"), v.literal("declined")),
    wordId: v.optional(v.id("kwWords")),
    createdAt: v.number(),
  })
    .index("by_about_status", ["aboutProfileId", "status"])
    .index("by_owner_time", ["ownerId", "createdAt"]),

  /** An ask, written once. The answer goes on the record either way. */
  kwAsks: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    toProfileId: v.id("profiles"),
    text: v.string(),
    answer: v.optional(v.union(v.literal("word"), v.literal("notNow"), v.literal("talk"))),
    answeredAt: v.optional(v.number()),
    wordId: v.optional(v.id("kwWords")),
    createdAt: v.number(),
  })
    .index("by_to_time", ["toProfileId", "createdAt"])
    .index("by_owner_time", ["ownerId", "createdAt"]),
  // ---------------------------------------------------------------------
  // Seasons (module id "seasons"): the pattern report. "mine" is private to
  // its owner; "ours" is shared, identical for both, deleted for both by
  // either. See docs/kept-word-spec.md.
  // ---------------------------------------------------------------------

  seasonReports: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    kind: v.union(v.literal("mine"), v.literal("ours")),
    interval: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("now")),
    periodStart: v.string(),
    periodEnd: v.string(),
    title: v.string(),
    body: v.string(),
    /** The counts the coach was given, kept so the report can be checked against them. */
    facts: v.any(),
    createdAt: v.number(),
  })
    .index("by_owner_time", ["ownerId", "createdAt"])
    .index("by_kind_period", ["kind", "interval", "periodStart"]),
  // ---------------------------------------------------------------------
  // The Well (module id "the-well"): tending a relationship with Jesus.
  // Private by default; marks and weekly answers are shared on purpose.
  // See docs/app-ideas.md (faith app) until its own spec lands.
  // ---------------------------------------------------------------------

  /** Talking with him: prayer in the person's own words. */
  wellPrayers: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    answeredAt: v.optional(v.number()),
    answerNote: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Remembering: a time he showed up. Tend's Anchor reads these too. */
  wellRemembering: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    happenedOn: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** A personal lie card with the truth found. */
  wellLies: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    lie: v.string(),
    truth: v.string(),
    ref: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Untangle: what I was taught, beside what Jesus actually did. */
  wellUntangle: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    taught: v.string(),
    jesusDid: v.optional(v.string()),
    ref: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** A passage one person marked for the other, with a note. Shared. */
  wellMarks: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    toProfileId: v.id("profiles"),
    book: v.string(),
    chapter: v.number(),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_to_time", ["toProfileId", "createdAt"]),

  /** One answer to the week's question. Shared once written. */
  wellAnswers: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    weekKey: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_owner_week", ["ownerId", "weekKey"]),
  // ---------------------------------------------------------------------
  // Metamorphosis (module id "metamorphosis"): one man's own room, claimed
  // by him. Every row private, no share switch. See docs/metamorphose-spec.md.
  // ---------------------------------------------------------------------

  /** The Character Sheet: one answer per question key, in his words. */
  mmSheet: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    key: v.string(),
    text: v.string(),
    /** He chooses which parts the coach may read. */
    coachAllowed: v.boolean(),
    updatedAt: v.number(),
  }).index("by_owner_key", ["ownerId", "key"]),

  /** The Mirror: a check-in, survival first. */
  mmMirror: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    survival: v.boolean(),
    feeling: v.optional(v.string()),
    under: v.optional(v.string()),
    body: v.optional(v.string()),
    want: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** The Map: one zoom-out, level by level. */
  mmMaps: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    levels: v.array(v.object({ key: v.string(), text: v.string() })),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),
});
