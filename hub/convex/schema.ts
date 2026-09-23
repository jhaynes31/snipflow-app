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
      /** Notifications to the devices this person added (push/subscriptions.ts). */
      pushEnabled: v.boolean(),
      /** Quiet hours, 0-23 in the person's time zone; only urgent heads-ups get through. */
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
    helped: v.optional(v.union(v.literal("aLot"), v.literal("little"), v.literal("notReally"), v.literal("notAtAll"))),
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
    /** Several things can get in the way at once; `reason` keeps the first for older readers. */
    reasons: v.optional(v.array(v.union(v.literal("forgot"), v.literal("overcommitted"), v.literal("avoided"), v.literal("changedMind"), v.literal("outsideControl")))),
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
  /** The Scout: what I noticed, and what I did about it before anyone asked. */
  mmScout: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    noticed: v.string(),
    did: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Do It Tired: a thing done without the feeling. */
  mmTired: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Shield Down: a practice or a real one. */
  mmShield: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    threat: v.string(),
    truePart: v.string(),
    sentences: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Quest Log: one active main quest, side quests allowed. Abandoned, never failed. */
  mmQuests: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    title: v.string(),
    kind: v.union(v.literal("main"), v.literal("side")),
    status: v.union(v.literal("active"), v.literal("done"), v.literal("abandoned")),
    note: v.optional(v.string()),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
    sentToEveryBoxAt: v.optional(v.number()),
  }).index("by_owner_status", ["ownerId", "status"]),

  /** Iron: his word to himself. Asked by the room and only the room. */
  mmIron: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    dueDay: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("kept"), v.literal("didnt")),
    note: v.optional(v.string()),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
  }).index("by_owner_status", ["ownerId", "status"]),

  /** Iron, weekly: which older man did I talk to this week? */
  mmIronWeek: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    weekKey: v.string(),
    man: v.string(),
    createdAt: v.number(),
  }).index("by_owner_week", ["ownerId", "weekKey"]),

  /** The Compass: one thing I'll lead this week, and one decision I'll make myself. */
  mmCompass: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    weekKey: v.string(),
    lead: v.string(),
    decision: v.optional(v.string()),
    done: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_owner_week", ["ownerId", "weekKey"]),

  /** Seen: a small, chosen act of being seen, and how it went. */
  mmSeen: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    act: v.string(),
    after: v.optional(v.string()),
    done: v.boolean(),
    createdAt: v.number(),
    doneAt: v.optional(v.number()),
  }).index("by_owner_time", ["ownerId", "createdAt"]),
  /** Letters he writes and will not send, and letters the mentor writes him. */
  mmLetters: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    kind: v.union(v.literal("mine"), v.literal("mentor")),
    key: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    periodStart: v.optional(v.string()),
    createdAt: v.number(),
    openedAt: v.optional(v.number()),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** The Party: real men, and where he is with each. */
  mmParty: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    name: v.string(),
    where: v.optional(v.string()),
    lastTalked: v.optional(v.string()),
    nextStep: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** The Horizon: dreams, sketches, someday lists. Never tasks. */
  mmHorizon: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    prompt: v.optional(v.string()),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Small Ways done, in his words. */
  mmSmallWays: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    title: v.string(),
    note: v.optional(v.string()),
    day: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Present: one way I was here, one thing I fought for. */
  mmPresent: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    here: v.optional(v.string()),
    fought: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** The Builder: one business action a day. */
  mmBuilder: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    action: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Failure Check entries. */
  mmFailureChecks: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    answers: v.array(v.object({ key: v.string(), text: v.string() })),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** Therapist shares: a read-only link to chosen sections, with an expiry. */
  mmShares: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    token: v.string(),
    sections: v.array(v.string()),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_owner_time", ["ownerId", "createdAt"])
    .index("by_token", ["token"]),

  /** Blessings from the partner: sealed until the room's owner opens them. */
  mmBlessings: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    /** The room this is for; readable only by that room's owner. */
    roomId: v.string(),
    occasion: v.string(),
    body: v.string(),
    createdAt: v.number(),
    openedAt: v.optional(v.number()),
  }).index("by_room", ["roomId", "createdAt"]),

  // ---------------------------------------------------------------------
  // Renewed Mind (module id "renewed-mind"): beliefs rewritten in the
  // person's own words, rehearsed, and backed by lived evidence. Private;
  // a belief can be shared on purpose. See docs/renewed-mind-spec.md.
  // ---------------------------------------------------------------------
  rmBeliefs: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    oldLine: v.string(),
    origin: v.optional(v.string()),
    newLine: v.string(),
    verse: v.optional(v.string()),
    verseText: v.optional(v.string()),
    createdAt: v.number(),
    retiredAt: v.optional(v.number()),
  }).index("by_owner", ["ownerId"]),
  rmRehearsals: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    beliefId: v.id("rmBeliefs"),
    feltTrue: v.union(v.literal("notYet"), v.literal("aLittle"), v.literal("mostly")),
    day: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId", "createdAt"])
    .index("by_belief", ["beliefId"]),
  rmCaptures: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    thought: v.string(),
    feeling: v.optional(v.string()),
    isTrue: v.union(v.literal("yes"), v.literal("partly"), v.literal("no")),
    isKind: v.union(v.literal("yes"), v.literal("partly"), v.literal("no")),
    isNecessary: v.union(v.literal("yes"), v.literal("partly"), v.literal("no")),
    friendSays: v.optional(v.string()),
    beliefId: v.optional(v.id("rmBeliefs")),
    /** Several truer lines can answer one thought. */
    beliefIds: v.optional(v.array(v.id("rmBeliefs"))),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId", "createdAt"]),
  rmEvidence: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    beliefId: v.id("rmBeliefs"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_belief", ["beliefId"]),
  /** Live It: a practical step planned for a line, and what happened when it was tried. */
  rmSteps: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    beliefId: v.id("rmBeliefs"),
    text: v.string(),
    arena: v.optional(v.union(v.literal("marriage"), v.literal("outside"), v.literal("friends"), v.literal("work"), v.literal("faith"), v.literal("alone"))),
    source: v.union(v.literal("library"), v.literal("coach"), v.literal("own")),
    status: v.union(v.literal("planned"), v.literal("done"), v.literal("skipped")),
    /** What the old line predicted would happen, written before trying. */
    prediction: v.optional(v.string()),
    /** What actually happened. */
    happened: v.optional(v.string()),
    evidenceId: v.optional(v.id("rmEvidence")),
    createdAt: v.number(),
    doneAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_belief", ["beliefId"]),

  // ---------------------------------------------------------------------
  // The Orchard (module id "orchard"): friendships that grow slowly. People,
  // what they've shown, the story I'm telling myself, three checks, moves.
  // Each person's rows are their own; a person can be shared with the
  // partner (name, layer, and notes marked shared). See docs/orchard-spec.md.
  // ---------------------------------------------------------------------
  orPeople: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    name: v.string(),
    howMet: v.optional(v.string()),
    metDay: v.string(),
    /** 0 just met … 4 chosen family. */
    layer: v.number(),
    state: v.union(v.literal("growing"), v.literal("resting"), v.literal("released")),
    /** The story I'm telling myself, written at the start, to re-read later. */
    story: v.optional(v.string()),
    storyReadDay: v.optional(v.string()),
    /** What I'm holding back until it's earned. */
    pearls: v.array(v.string()),
    /** The initiation ledger: who reached out, when (last thirty kept). */
    contacts: v.optional(v.array(v.object({ by: v.union(v.literal("me"), v.literal("them")), day: v.string() }))),
    /** The quiet test: a window where I don't initiate, to see if they do. */
    quietUntil: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
  orNotes: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    personId: v.id("orPeople"),
    kind: v.union(v.literal("fact"), v.literal("story"), v.literal("green"), v.literal("flag"), v.literal("gave"), v.literal("showedUp"), v.literal("conflict")),
    text: v.string(),
    /** Which of my signals this sighting is (orchard/signals.ts key), for flags and conflicts. */
    signal: v.optional(v.string()),
    /** Several signals can show in one moment. */
    signals: v.optional(v.array(v.string())),
    day: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_person", ["personId"]),
  orChecks: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    personId: v.id("orPeople"),
    kind: v.union(v.literal("halo"), v.literal("safe"), v.literal("compass")),
    answers: v.any(),
    read: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_person", ["personId"]),
  /** The lonely hour: what I reached for instead of the old pattern. */
  orLonely: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    wanted: v.optional(v.string()),
    choice: v.union(v.literal("smallAsk"), v.literal("place"), v.literal("partner"), v.literal("god"), v.literal("alone"), v.literal("waited"), v.literal("reachedBack")),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId", "createdAt"]),
  /** Too long: a person, place or situation I knew was wrong, and how long I've stayed since knowing. */
  orStays: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    kind: v.union(v.literal("person"), v.literal("place"), v.literal("situation")),
    label: v.string(),
    personId: v.optional(v.id("orPeople")),
    firstKnewDay: v.string(),
    keepers: v.array(v.string()),
    changeSince: v.union(v.literal("none"), v.literal("some"), v.literal("real")),
    cost: v.optional(v.string()),
    status: v.union(v.literal("staying"), v.literal("leaving"), v.literal("left")),
    checks: v.array(v.object({ day: v.string(), changeSince: v.union(v.literal("none"), v.literal("some"), v.literal("real")), note: v.optional(v.string()) })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
  orMoves: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    personId: v.id("orPeople"),
    from: v.number(),
    to: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_person", ["personId"]),

  // ---------------------------------------------------------------------
  // The Apothecary (module id "apothecary"): body questions, the daily
  // line, patterns, the cabinet. Private to each person; nothing here is
  // ever shared. See docs/apothecary-spec.md.
  // ---------------------------------------------------------------------
  apEntries: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    area: v.string(),
    side: v.union(v.literal("left"), v.literal("right"), v.literal("both"), v.literal("n/a")),
    qualities: v.array(v.string()),
    severity: v.number(),
    onset: v.optional(v.string()),
    duration: v.optional(v.string()),
    text: v.string(),
    tried: v.optional(v.string()),
    helped: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId", "createdAt"]),
  apDays: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    day: v.string(),
    factors: v.array(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner_day", ["ownerId", "day"]),
  apCabinet: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    name: v.string(),
    kind: v.union(v.literal("herb"), v.literal("tincture"), v.literal("supplement"), v.literal("topical"), v.literal("tool"), v.literal("medication")),
    forWhat: v.optional(v.string()),
    amount: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  /**
   * Devices a person turned notifications on for: the browser's push
   * endpoint and keys, nothing else. See convex/push/subscriptions.ts.
   */
  pushSubscriptions: defineTable({
    ownerId: v.id("profiles"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    label: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_endpoint", ["endpoint"]),

  /** The Field Guide: links he kept from the feeds or added himself. His, private. */
  mmResources: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    title: v.string(),
    url: v.string(),
    note: v.optional(v.string()),
    source: v.union(v.literal("feed"), v.literal("own")),
    /** Pinned beside a quest, if he chose one. */
    questId: v.optional(v.id("mmQuests")),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  /**
   * The Field Guide's feed cache: public headlines (title, link, teaser,
   * date) from the sites in metamorphosis/rss.ts, refreshed daily. Not
   * owned by anyone; readable only from inside the room.
   */
  mmFeedItems: defineTable({
    feedKey: v.string(),
    title: v.string(),
    url: v.string(),
    teaser: v.string(),
    publishedAt: v.optional(v.number()),
    fetchedAt: v.number(),
  }).index("by_feed", ["feedKey"]),
  // ---------------------------------------------------------------------
  // The Storehouse (module id "storehouse"): household money. Shared by
  // nature; either person can edit. Only money worries are private.
  // See docs/app-ideas.md (The Storehouse) until its own spec lands.
  // ---------------------------------------------------------------------

  shDebts: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    name: v.string(),
    kind: v.union(v.literal("card"), v.literal("personal"), v.literal("auto"), v.literal("medical"), v.literal("student"), v.literal("other")),
    lender: v.optional(v.string()),
    balance: v.number(),
    apr: v.number(),
    minimum: v.number(),
    dueDay: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("paid")),
    hardship: v.union(v.literal("none"), v.literal("asked"), v.literal("enrolled"), v.literal("declined")),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  /** A call to a lender or agency about a debt, and what came of it. */
  shCalls: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    debtId: v.optional(v.id("shDebts")),
    who: v.string(),
    offered: v.optional(v.string()),
    accepted: v.optional(v.string()),
    note: v.optional(v.string()),
    at: v.number(),
  }).index("by_debt", ["debtId", "at"]),

  /** Money coming in, per month. */
  shIncome: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    month: v.string(),
    label: v.string(),
    amount: v.number(),
    expectedDay: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_month", ["month"]),

  /** Where the money goes, per month: one line per category. */
  shLines: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    month: v.string(),
    group: v.union(v.literal("giving"), v.literal("needs"), v.literal("debt"), v.literal("barns"), v.literal("savings"), v.literal("fun"), v.literal("buffer")),
    category: v.string(),
    planned: v.number(),
    note: v.optional(v.string()),
    debtId: v.optional(v.id("shDebts")),
    order: v.number(),
  }).index("by_month", ["month", "order"]),

  /** The Barns: sinking funds for the things that aren't monthly but always come. */
  shBarns: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    name: v.string(),
    target: v.optional(v.number()),
    balance: v.number(),
    monthly: v.number(),
    createdAt: v.number(),
  }),

  /** The Sit-Down, per month: the honest line, the strategy, and who agreed. */
  shSitDowns: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    month: v.string(),
    lastMonthLine: v.optional(v.string()),
    agreedBy: v.array(v.id("profiles")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_month", ["month"]),

  /** Household settings: one row. */
  shSettings: defineTable({
    strategy: v.union(v.literal("snowball"), v.literal("avalanche"), v.literal("blend"), v.literal("dmp")),
    extraMonthly: v.number(),
    giving: v.boolean(),
    pauseAmount: v.number(),
    updatedAt: v.number(),
  }),

  /** A money worry, said once. Private unless shared. */
  shWorries: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    text: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),
  // ---------------------------------------------------------------------
  // The Crossroads (module id "crossroads"): deciding where to live, and
  // the road there. Answers are each person's own but visible to both,
  // because the decision is joint. See docs/crossroads-spec.md.
  // ---------------------------------------------------------------------

  crAnswers: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    key: v.string(),
    importance: v.optional(v.number()),
    text: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_owner_key", ["ownerId", "key"]),

  /** A place either of them added, or a rating override on a built-in one. */
  crPlaces: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    key: v.string(),
    name: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("country"), v.literal("state"))),
    line: v.optional(v.string()),
    ratings: v.optional(v.any()),
    note: v.optional(v.string()),
    shortlisted: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_key", ["key"]),

  /** The Road: state per step, shared. */
  crSteps: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    key: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done"), v.literal("skip")),
    who: v.optional(v.id("profiles")),
    note: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  /** Household settings for the Crossroads: the chosen path and place. */
  crSettings: defineTable({
    path: v.union(v.literal("abroad"), v.literal("domestic"), v.literal("undecided")),
    chosenPlace: v.optional(v.string()),
    updatedAt: v.number(),
  }),

  /** What I know (The Hearth): lived wisdom by topic. Private unless she shares one. */
  hhKnow: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    topic: v.string(),
    title: v.string(),
    text: v.string(),
    ready: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),

  /** The girl and the teenager (The Hearth): letters and small notes. Always private. */
  hhLetters: defineTable({
    ownerId: v.id("profiles"),
    visibility: visibilityValidator,
    who: v.union(v.literal("girl"), v.literal("teen")),
    kind: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_owner_time", ["ownerId", "createdAt"]),
});
