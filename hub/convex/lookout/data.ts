import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "../_generated/server";
import { cleanText, optionalText, requireMe, type Ctx, type Me } from "../lib";
import { roomOwnerOf } from "../rooms";
import { INTAKE } from "./intake";
import { BEFORE_APPLYING } from "./adminPure";
import { chooseSearch, missingExperience, remoteBoardFact, rescanFacts, seniorInText, SCAN_VERSION, dedupeKey, DEFAULT_REQUIREMENTS, DEFAULT_WEIGHTS, FACT_KEYS, FOLLOW_UP_DAYS, fingerprint, MANUAL_MOVES, mergeFacts, normalizeUrl, rank, scanListing, STATUSES, type FactKey, type Facts, type Status, type Verdict } from "./pure";
import { boardFromUrl, MANAGES_PEOPLE, REMOTE_ONLY, RETIRED_KINDS, titleFits, usFriendly, defaultSources, mergeNewDefaults, SOURCE_KIND_LABEL, SOURCES_VERSION, type Source, type SourceKind } from "./sources";
import { cleanConfig, cleanScreening, defaultInsurance, fitOf, INSURANCE_PRESET, insuranceSources, isBlocked, mergeWatchlist, payAsListed, type InsuranceConfig, type ScreeningAnswer } from "./insurance";
import { blocking, fillFromSaved, findDashes, isOpenAnswer, jobSpecific, joinAnswerPairs, parseAnswerPairs, profileText, questionKey, reviewDocument, scrubDashes } from "./writing";

/**
 * The Lookout: a personal recruiter for the person looking for work.
 *
 * Access. Each person can have one search, and either can start one for
 * the other. The partner sees and helps with a search by default (Jen,
 * 2026-10-29: she helps John with his); its owner can turn that off. A
 * helper sees and edits everything, with these exceptions that stay the
 * owner's: approving an application, confirming history and answers, the
 * privacy settings, and exporting or deleting the search. Every row's
 * ownerId is the search owner's, whoever wrote it.
 *
 * Truth. Facts about a job carry their source. Only a person's check marks
 * one "verified". Documents are drafted only from his confirmed history and
 * interview answers, and every saved document is scrubbed of dashes and
 * reviewed against that history before it can be approved.
 */
// Before searches were per person, the Lookout was a claimed room; that claim still counts as a search.
const ROOM = "lookout";

export interface Access {
  me: Me;
  ownerId: Id<"profiles">;
  role: "owner" | "helper";
}

async function settingsOf(ctx: Ctx, ownerId: Id<"profiles">): Promise<Doc<"loSettings"> | null> {
  return await ctx.db.query("loSettings").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first();
}

/** Whether this person has a search: a settings row, or the old room claim. */
async function hasSearch(ctx: Ctx, profileId: Id<"profiles">): Promise<boolean> {
  if (await settingsOf(ctx, profileId)) return true;
  const claim = await roomOwnerOf(ctx, ROOM);
  return claim?.ownerId === profileId;
}

/** The partner may see and help with a search unless its owner turned that off. On by default. */
export function partnerMayHelp(row: Doc<"loSettings"> | null): boolean {
  return row?.partnerAccess ?? true;
}

type Viewing = "self" | "partner";
function viewingOf(me: Me): Viewing | undefined {
  const v = (me.profile.moduleSettings as Record<string, { viewing?: Viewing } | undefined> | undefined)?.lookout?.viewing;
  return v === "self" || v === "partner" ? v : undefined;
}

/**
 * Which search the signed-in person is looking at, and as whom. Each person
 * can have a search of their own, and can help with the partner's. When
 * both are open to them, the last one they chose is shown.
 */
export async function lookoutAccess(ctx: Ctx): Promise<Access | null> {
  const me = await requireMe(ctx);
  const mine = await hasSearch(ctx, me.profile._id);
  const theirs = me.partner && (await hasSearch(ctx, me.partner._id)) && partnerMayHelp(await settingsOf(ctx, me.partner._id)) ? me.partner : null;
  const pick = chooseSearch({ mine, partnerOpen: !!theirs, want: viewingOf(me) });
  if (pick === "partner" && theirs) return { me, ownerId: theirs._id, role: "helper" };
  if (pick === "self") return { me, ownerId: me.profile._id, role: "owner" };
  return null;
}

export async function requireLookout(ctx: Ctx, ownerOnly = false): Promise<Access> {
  const a = await lookoutAccess(ctx);
  if (!a) throw new ConvexError("The Lookout isn't open to you.");
  if (ownerOnly && a.role !== "owner") throw new ConvexError("Only the person this search is for can do this.");
  return a;
}

async function ensureSettings(ctx: MutationCtx, ownerId: Id<"profiles">): Promise<Doc<"loSettings">> {
  const row = await settingsOf(ctx, ownerId);
  if (row) return row;
  const id = await ctx.db.insert("loSettings", {
    ownerId,
    visibility: "shared",
    partnerAccess: true,
    minHourly: DEFAULT_REQUIREMENTS.minHourly,
    maxHours: DEFAULT_REQUIREMENTS.maxHours,
    homeState: DEFAULT_REQUIREMENTS.homeState,
    weights: DEFAULT_WEIGHTS,
    frequency: "off",
    keywords: [],
    sources: defaultSources(),
    sourcesVersion: SOURCES_VERSION,
    allowHealthDisclosure: false,
    scanVersion: SCAN_VERSION,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

function settingsView(row: Doc<"loSettings"> | null) {
  return {
    partnerAccess: partnerMayHelp(row),
    minHourly: row?.minHourly ?? DEFAULT_REQUIREMENTS.minHourly,
    maxHours: row?.maxHours ?? DEFAULT_REQUIREMENTS.maxHours,
    homeState: row?.homeState ?? DEFAULT_REQUIREMENTS.homeState,
    weights: row?.weights ?? DEFAULT_WEIGHTS,
    frequency: row?.frequency ?? ("off" as const),
    keywords: row?.keywords ?? [],
    sources: row?.sources ?? defaultSources(),
    allowHealthDisclosure: row?.allowHealthDisclosure ?? false,
    requirePay: row?.requirePay ?? true,
    allowSenior: row?.allowSenior ?? false,
    allowDegree: row?.allowDegree ?? false,
    insurance: mergeWatchlist((row?.insurance as InsuranceConfig | undefined) ?? defaultInsurance()),
    // Only whether it's connected and the email; the key itself never leaves the server.
    usajobsEmail: row?.usajobs?.email ?? null,
    adzunaAppId: row?.adzuna?.appId ?? null,
    joobleConnected: !!row?.jooble,
    lastSearchAt: row?.lastSearchAt,
    lastSearchNote: row?.lastSearchNote,
    lastSearchSources: row?.lastSearchSources ?? [],
    searchLog: row?.searchLog ?? [],
  };
}

async function loadJob(ctx: Ctx, a: Access, id: Id<"loJobs">): Promise<Doc<"loJobs">> {
  const job = await ctx.db.get(id);
  if (!job || job.ownerId !== a.ownerId) throw new ConvexError("That job isn't here.");
  return job;
}

async function profileSource(ctx: Ctx, ownerId: Id<"profiles">): Promise<string> {
  const answers = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", ownerId)).collect();
  const roles = await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect();
  const text = (k: string) => INTAKE.find((q) => q.key === k)?.question ?? k;
  return profileText({
    answers: answers.filter((x) => x.confirmed && !["disclose"].includes(x.key)).map((x) => ({ question: text(x.key), answer: x.answer })),
    roles: roles.filter((r) => r.confirmed),
  });
}

/** Companies he said "not for me" to on an insurance job: their later jobs are marked and sorted lower. */
function passedEmployers(rows: Doc<"loJobs">[]): Set<string> {
  return new Set(rows.filter((j) => j.preset === INSURANCE_PRESET && j.status === "passed").map((j) => j.employer.toLowerCase()));
}

function rankJob(job: Doc<"loJobs">, s: ReturnType<typeof settingsView>, profile: string, passed: Set<string> = new Set()) {
  // A preset job (insurance sales) is judged by the preset's flags, not by the main search's hard checks, which would fail every sales job.
  if (job.preset === INSURANCE_PRESET) {
    const f = fitOf(job, s.insurance, (job.screening ?? []) as ScreeningAnswer[], { passedBefore: job.status !== "passed" && passed.has(job.employer.toLowerCase()), wv: (job.facts as Facts).wvEligible?.state ?? "unknown" });
    return { verdict: (f.badge === "strong" ? "eligible" : f.badge === "maybe" ? "check" : "rejected") as Verdict, checks: [], score: f.score, parts: [], strengths: f.green, gaps: f.red, uncertain: [] };
  }
  return rank(job.facts as Facts, { req: { minHourly: s.minHourly, maxHours: s.maxHours, homeState: s.homeState, allowDegree: s.allowDegree }, weights: s.weights, jobText: `${job.title}\n${job.description}`, profileText: profile });
}

/** The preset's view of a job, for the cards: the badge, the tags, state eligibility, and pay as listed. Null for jobs outside the preset. */
function presetView(job: Doc<"loJobs">, s: ReturnType<typeof settingsView>, passed: Set<string> = new Set()) {
  if (job.preset !== INSURANCE_PRESET) return null;
  const wv = (job.facts as Facts).wvEligible?.state ?? "unknown";
  const f = fitOf(job, s.insurance, (job.screening ?? []) as ScreeningAnswer[], { passedBefore: job.status !== "passed" && passed.has(job.employer.toLowerCase()), wv });
  return { badge: f.badge, green: f.green, red: f.red, blocked: f.blocked, why: f.why, wv, pay: payAsListed(job.description, job.discoveredAt) };
}

// ---------- Whose search ----------

export const status = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const a = await lookoutAccess(ctx);
    const mine = await hasSearch(ctx, me.profile._id);
    const partnerHas = me.partner ? await hasSearch(ctx, me.partner._id) : false;
    const partnerOpen = partnerHas && partnerMayHelp(me.partner ? await settingsOf(ctx, me.partner._id) : null);
    return {
      myName: me.profile.displayName,
      partnerName: me.partner?.displayName ?? null,
      mine,
      partnerHas,
      partnerOpen,
      viewing: a ? (a.role === "owner" ? ("self" as const) : ("partner" as const)) : null,
      ownerName: a ? (a.role === "owner" ? me.profile.displayName : me.partner?.displayName ?? "your partner") : null,
    };
  },
});

/** Start a search, for yourself or for your partner. A search for the partner is theirs from the start. */
export const start = mutation({
  args: { forWhom: v.union(v.literal("self"), v.literal("partner")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const target = args.forWhom === "self" ? me.profile._id : me.partner?._id;
    if (!target) throw new ConvexError("Your partner hasn't signed in yet. They need to sign in once first.");
    if (!(await settingsOf(ctx, target))) await ensureSettings(ctx, target);
    await setViewingFor(ctx, me, args.forWhom);
  },
});

async function setViewingFor(ctx: MutationCtx, me: Me, viewing: Viewing) {
  const settings = { ...((me.profile.moduleSettings as Record<string, unknown> | undefined) ?? {}) };
  settings.lookout = { ...((settings.lookout as Record<string, unknown> | undefined) ?? {}), viewing };
  await ctx.db.patch(me.profile._id, { moduleSettings: settings });
}

/** Switch between your own search and your partner's. */
export const setViewing = mutation({
  args: { viewing: v.union(v.literal("self"), v.literal("partner")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await setViewingFor(ctx, me, args.viewing);
  },
});

/** Every Lookout table. Deleting a search clears its rows from all of them. */
export const LOOKOUT_TABLES = ["loSettings", "loAnswers", "loRoles", "loJobs", "loDocs", "loApplications", "loEvents", "loImports", "loNotes", "loAdmin", "loAgencies", "loSavedAnswers", "loForgotten"] as const;

/** Delete the search you own and everything in it. Only its owner can. */
export const deleteMySearch = mutation({
  args: { confirm: v.literal("delete") },
  handler: async (ctx) => {
    const a = await requireLookout(ctx, true);
    for (const table of LOOKOUT_TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) if (row.ownerId === a.ownerId) await ctx.db.delete(row._id);
    }
    const claim = await roomOwnerOf(ctx, ROOM);
    if (claim && claim.ownerId === a.ownerId) await ctx.db.delete(claim._id);
  },
});

/**
 * Hand a search you own to your partner, with everything in it: for when it
 * was started on the wrong account. Only when the partner has none.
 */
export const giveToPartner = mutation({
  args: { confirm: v.literal("give") },
  handler: async (ctx) => {
    const a = await requireLookout(ctx, true);
    const partner = a.me.partner;
    if (!partner) throw new ConvexError("Your partner hasn't signed in yet.");
    if (await hasSearch(ctx, partner._id)) throw new ConvexError("Your partner already has a search of their own.");
    await ensureSettings(ctx, a.ownerId);
    for (const table of LOOKOUT_TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) if (row.ownerId === a.ownerId) await ctx.db.patch(row._id, { ownerId: partner._id });
    }
    const claim = await roomOwnerOf(ctx, ROOM);
    if (claim && claim.ownerId === a.ownerId) await ctx.db.delete(claim._id);
    // Answers and history move as written; the new owner confirms them.
    for (const r of await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", partner._id)).collect()) await ctx.db.patch(r._id, { confirmed: false });
    for (const r of await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", partner._id)).collect()) await ctx.db.patch(r._id, { confirmed: false });
    await setViewingFor(ctx, a.me, "partner");
  },
});

/** Read stored listings again when the reading rules have changed. Cheap no-op otherwise; the Overview calls it on open. */
export const refreshReadings = mutation({
  args: {},
  handler: async (ctx) => {
    const a = await lookoutAccess(ctx);
    if (!a) return 0;
    const existing = await settingsOf(ctx, a.ownerId);
    // Watchlist companies added since the preset was saved join it once.
    if (existing?.insurance && ((existing.insurance as InsuranceConfig).version ?? 1) < defaultInsurance().version!) {
      await ctx.db.patch(existing._id, { insurance: mergeWatchlist(existing.insurance as InsuranceConfig) });
    }
    // Sources added to the defaults since this search was made join its list once.
    if (existing && (existing.sourcesVersion ?? 1) < SOURCES_VERSION) {
      await ctx.db.patch(existing._id, { sources: mergeNewDefaults(existing.sources as Source[], existing.sourcesVersion ?? 1), sourcesVersion: SOURCES_VERSION });
      // Finds from a retired site that he hasn't saved move to Earlier finds; saved ones stay and point at the company.
      for (const j of await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId)).collect()) {
        if (RETIRED_KINDS.includes(j.sourceKind as SourceKind) && UNSAVED.includes(j.status) && !j.shelvedAt) await ctx.db.patch(j._id, { shelvedAt: Date.now() });
      }
    }
    // A search from before versions were kept has no number yet: read it again.
    const version = existing?.scanVersion ?? 1;
    if (version >= SCAN_VERSION) return 0;
    const row = await ensureSettings(ctx, a.ownerId);
    const jobs = await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId)).collect();
    const profile = await profileSource(ctx, a.ownerId);
    for (const j of jobs) {
      // Earlier finds that the tighter title and country checks would now leave out move out of the way.
      if (UNSAVED.includes(j.status) && !j.shelvedAt && j.sourceKind !== "manual" && (!titleFits(j.title, row.keywords, row.allowSenior ?? false) || !usFriendly(j.location) || MANAGES_PEOPLE.test(j.description) || (!(row.allowSenior ?? false) && seniorInText(j.description)) || missingExperience(j.description, profile))) await ctx.db.patch(j._id, { shelvedAt: Date.now() });
      const r = rescanFacts(j.facts as Facts, `${j.title}\n${j.location ?? ""}\n${j.description}`, row.homeState, REMOTE_ONLY[j.sourceKind]);
      await ctx.db.patch(j._id, { facts: r.facts, warnings: r.warnings });
    }
    if (row.requirePay ?? true) await shelveUnpaid(ctx, a.ownerId);
    await ctx.db.patch(row._id, { scanVersion: SCAN_VERSION });
    return jobs.length;
  },
});

// ---------- Settings ----------

export const settings = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    return { ...settingsView(await settingsOf(ctx, a.ownerId)), role: a.role };
  },
});

const weightsV = v.object({ schedule: v.number(), interaction: v.number(), location: v.number(), pay: v.number(), independent: v.number(), skills: v.number() });
const sourceV = v.object({ kind: v.string(), token: v.string(), name: v.string(), enabled: v.boolean() });

export const setSettings = mutation({
  args: {
    partnerAccess: v.optional(v.boolean()),
    allowHealthDisclosure: v.optional(v.boolean()),
    requirePay: v.optional(v.boolean()),
    allowSenior: v.optional(v.boolean()),
    allowDegree: v.optional(v.boolean()),
    minHourly: v.optional(v.number()),
    maxHours: v.optional(v.number()),
    homeState: v.optional(v.string()),
    weights: v.optional(weightsV),
    frequency: v.optional(v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))),
    keywords: v.optional(v.array(v.string())),
    sources: v.optional(v.array(sourceV)),
  },
  handler: async (ctx, args) => {
    const privacy = args.partnerAccess !== undefined || args.allowHealthDisclosure !== undefined;
    const a = await requireLookout(ctx, privacy);
    const row = await ensureSettings(ctx, a.ownerId);
    const patch: Partial<Doc<"loSettings">> = { updatedAt: Date.now() };
    if (args.partnerAccess !== undefined) patch.partnerAccess = args.partnerAccess;
    if (args.allowHealthDisclosure !== undefined) patch.allowHealthDisclosure = args.allowHealthDisclosure;
    if (args.allowDegree !== undefined) patch.allowDegree = args.allowDegree;
    if (args.allowSenior !== undefined) {
      patch.allowSenior = args.allowSenior;
      if (!args.allowSenior) await shelveTooSenior(ctx, a.ownerId, false, row.keywords);
    }
    if (args.requirePay !== undefined) {
      patch.requirePay = args.requirePay;
      if (args.requirePay) await shelveUnpaid(ctx, a.ownerId);
    }
    if (args.minHourly !== undefined) {
      if (!Number.isFinite(args.minHourly) || args.minHourly < 7.25 || args.minHourly > 500) throw new ConvexError("Minimum pay is dollars per hour, from 7.25 to 500.");
      patch.minHourly = Math.round(args.minHourly * 100) / 100;
    }
    if (args.maxHours !== undefined) {
      if (!Number.isFinite(args.maxHours) || args.maxHours < 5 || args.maxHours > 60) throw new ConvexError("Maximum hours is 5 to 60 a week.");
      patch.maxHours = Math.round(args.maxHours);
    }
    if (args.homeState !== undefined) patch.homeState = cleanText(args.homeState, 40, "Home state");
    if (args.weights !== undefined) {
      for (const n of Object.values(args.weights)) if (!Number.isFinite(n) || n < 0 || n > 100) throw new ConvexError("Each weight is 0 to 100.");
      patch.weights = args.weights;
    }
    if (args.frequency !== undefined) patch.frequency = args.frequency;
    if (args.keywords !== undefined) patch.keywords = args.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 30).map((k) => k.slice(0, 60));
    if (args.sources !== undefined) {
      if (args.sources.length > 60) throw new ConvexError("That's a lot of sources. Keep it to 60.");
      patch.sources = args.sources.map((s) => ({ kind: s.kind, token: cleanText(s.token, s.kind === "rss" ? 400 : 80, "Board name"), name: cleanText(s.name, 80, "Name"), enabled: s.enabled }));
    }
    await ctx.db.patch(row._id, patch);
  },
});

/** Connect USAJOBS: the free API key from developer.usajobs.gov and the email it was sent to. Blank clears it. */
export const setUsajobs = mutation({
  args: { email: v.string(), key: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const row = await ensureSettings(ctx, a.ownerId);
    const email = args.email.trim();
    const key = args.key.trim();
    if (!email && !key) {
      await ctx.db.patch(row._id, { usajobs: undefined, updatedAt: Date.now() });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ConvexError("Use the email address the key was sent to.");
    if (!/^[A-Za-z0-9+/=_-]{20,200}$/.test(key)) throw new ConvexError("That doesn't look like a USAJOBS key. Copy the whole key from the email, with no spaces.");
    await ctx.db.patch(row._id, { usajobs: { email: email.slice(0, 200), key }, updatedAt: Date.now() });
  },
});

/** Connect Adzuna: the app ID and key from developer.adzuna.com. Blank clears it. */
export const setAdzuna = mutation({
  args: { appId: v.string(), key: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const row = await ensureSettings(ctx, a.ownerId);
    const appId = args.appId.trim();
    const key = args.key.trim();
    if (!appId && !key) {
      await ctx.db.patch(row._id, { adzuna: undefined, updatedAt: Date.now() });
      return;
    }
    if (!/^[A-Za-z0-9]{4,40}$/.test(appId)) throw new ConvexError("That doesn't look like an Adzuna Application ID. It's a short code of letters and numbers.");
    if (!/^[A-Za-z0-9]{16,80}$/.test(key)) throw new ConvexError("That doesn't look like an Adzuna Application Key. Copy the whole key, with no spaces.");
    await ctx.db.patch(row._id, { adzuna: { appId, key }, updatedAt: Date.now() });
  },
});

/** Connect Jooble: the API key from jooble.org/api/about. Blank clears it. */
export const setJooble = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const row = await ensureSettings(ctx, a.ownerId);
    const key = args.key.trim();
    if (!key) {
      await ctx.db.patch(row._id, { jooble: undefined, updatedAt: Date.now() });
      return;
    }
    if (!/^[A-Za-z0-9-]{16,80}$/.test(key)) throw new ConvexError("That doesn't look like a Jooble key. Copy the whole key from the email or page, with no spaces.");
    await ctx.db.patch(row._id, { jooble: { key }, updatedAt: Date.now() });
  },
});

/** For the search only: the USAJOBS, Adzuna, and Jooble keys, server side. */
export const apiCreds = internalQuery({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const s = await settingsOf(ctx, args.ownerId);
    return { usajobs: s?.usajobs ?? null, adzuna: s?.adzuna ?? null, jooble: s?.jooble ?? null };
  },
});

/** Follow an employer's own job board, from a link to its careers page or one of its jobs. */
export const addBoard = mutation({
  args: { url: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const board = boardFromUrl(args.url);
    if (!board) throw new ConvexError("That link isn't on a job board the Lookout can read (Greenhouse, Lever, Ashby, Workday, Workable, SmartRecruiters, BambooHR, Breezy, or Recruitee). Add that company's jobs by hand instead.");
    const row = await ensureSettings(ctx, a.ownerId);
    const sources = row.sources as Source[];
    if (sources.some((x) => x.kind === board.kind && x.token.toLowerCase() === board.token.toLowerCase())) {
      await ctx.db.patch(row._id, { sources: sources.map((x) => (x.kind === board.kind && x.token.toLowerCase() === board.token.toLowerCase() ? { ...x, enabled: true } : x)), updatedAt: Date.now() });
      return { added: false, label: SOURCE_KIND_LABEL[board.kind] };
    }
    if (sources.length >= 60) throw new ConvexError("That's a lot of sources. Remove one first.");
    const name = optionalText(args.name, 80, "Name") ?? board.token.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    await ctx.db.patch(row._id, { sources: [...sources, { kind: board.kind, token: board.token, name, enabled: true }], updatedAt: Date.now() });
    return { added: true, label: SOURCE_KIND_LABEL[board.kind] };
  },
});

// ---------- The interview ----------

export const answers = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    return await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId)).collect();
  },
});

export const saveAnswer = mutation({
  args: { key: v.string(), answer: v.string(), skip: v.optional(v.boolean()), confirmed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    if (!INTAKE.some((q) => q.key === args.key)) throw new ConvexError("That isn't one of the questions.");
    // The privacy answer is his alone.
    if (args.key === "disclose" && a.role !== "owner") throw new ConvexError("Only the person looking for work can answer this one.");
    const answer = args.answer.trim();
    if (answer.length > 6000) throw new ConvexError("That answer is very long (max 6,000 characters).");
    const row = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId).eq("key", args.key)).first();
    // An answer a helper writes waits for his confirmation; his own answers count as confirmed.
    const confirmed = args.confirmed ?? (a.role === "owner" && answer.length > 0);
    const fields = { answer, skipped: args.skip ?? false, confirmed: a.role === "owner" ? confirmed : false, updatedAt: Date.now() };
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("loAnswers", { ownerId: a.ownerId, visibility: "private", key: args.key, ...fields });
  },
});

// ---------- Work history ----------

/** A month and year (2019-03), or a year alone (2019) when that's all a resume says. */
export const DATE_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const ym = (s: string | undefined, label: string) => {
  if (s === undefined || s.trim() === "") return undefined;
  const t = s.trim();
  if (!DATE_RE.test(t)) throw new ConvexError(`${label} is a year, or a month and year, like 2019 or 2019-03.`);
  return t;
};

export const roles = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const rows = await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
    return rows.sort((x, y) => (y.end ?? "9999").localeCompare(x.end ?? "9999") || y.start.localeCompare(x.start));
  },
});

const roleFields = {
  employer: v.string(),
  title: v.string(),
  start: v.string(),
  end: v.optional(v.string()),
  location: v.optional(v.string()),
  channels: v.array(v.string()),
  duties: v.string(),
  achievements: v.string(),
  tools: v.string(),
  leftNote: v.optional(v.string()),
  sales: v.boolean(),
};

function cleanRole(args: { employer: string; title: string; start: string; end?: string; location?: string; channels: string[]; duties: string; achievements: string; tools: string; leftNote?: string; sales: boolean }) {
  const start = ym(args.start, "Start");
  if (!start) throw new ConvexError("Add when the job started: a year, or a month and year.");
  const end = ym(args.end, "End");
  if (end && end < start) throw new ConvexError("The end is before the start.");
  return {
    employer: cleanText(args.employer, 120, "Employer"),
    title: cleanText(args.title, 120, "Job title"),
    start,
    end,
    location: optionalText(args.location, 120, "Location"),
    channels: args.channels.slice(0, 10).map((c) => c.slice(0, 40)),
    duties: args.duties.trim().slice(0, 6000),
    achievements: args.achievements.trim().slice(0, 6000),
    tools: args.tools.trim().slice(0, 2000),
    leftNote: optionalText(args.leftNote, 2000, "Why it ended"),
    sales: args.sales,
  };
}

export const addRole = mutation({
  args: roleFields,
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const now = Date.now();
    return await ctx.db.insert("loRoles", { ownerId: a.ownerId, visibility: "private", ...cleanRole(args), confirmed: a.role === "owner", createdAt: now, updatedAt: now });
  },
});

export const updateRole = mutation({
  args: { id: v.id("loRoles"), ...roleFields },
  handler: async (ctx, { id, ...args }) => {
    const a = await requireLookout(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.ownerId !== a.ownerId) throw new ConvexError("That job isn't here.");
    // Any change a helper makes goes back to waiting for his confirmation.
    await ctx.db.patch(id, { ...cleanRole(args), confirmed: a.role === "owner", updatedAt: Date.now() });
  },
});

export const confirmRole = mutation({
  args: { id: v.id("loRoles") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx, true);
    const row = await ctx.db.get(args.id);
    if (!row || row.ownerId !== a.ownerId) throw new ConvexError("That job isn't here.");
    if (!DATE_RE.test(row.start)) throw new ConvexError("Add when this job started before confirming it.");
    await ctx.db.patch(args.id, { confirmed: true, updatedAt: Date.now() });
  },
});

export const removeRole = mutation({
  args: { id: v.id("loRoles") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.ownerId !== a.ownerId) throw new ConvexError("That job isn't here.");
    await ctx.db.delete(args.id);
  },
});

// ---------- Jobs ----------

export const jobs = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const s = settingsView(await settingsOf(ctx, a.ownerId));
    const profile = await profileSource(ctx, a.ownerId);
    const rows = await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId)).collect();
    const events = await ctx.db.query("loEvents").withIndex("by_owner_at", (q) => q.eq("ownerId", a.ownerId)).collect();
    const passed = passedEmployers(rows);
    return {
      jobs: rows.map((j) => {
        const r = rankJob(j, s, profile, passed);
        const askApplied = BEFORE_APPLYING.includes(j.status) && !!j.applyOpenedAt && Date.now() - j.applyOpenedAt < 14 * 86400000 && (!j.applyAskDismissedAt || j.applyAskDismissedAt < j.applyOpenedAt);
        const fit = presetView(j, s, passed);
        return { _id: j._id, shelved: !!j.shelvedAt, askApplied, applyOpenedAt: j.applyOpenedAt, applyUrl: j.applyUrl, title: j.title, employer: j.employer, url: j.url, status: j.status as Status, statusAt: j.statusAt, sourceName: j.sourceName, sourceKind: j.sourceKind, preset: j.preset, fit, discoveredAt: j.discoveredAt, postedAt: j.postedAt, lastVerifiedAt: j.lastVerifiedAt, lastCheckedAt: j.lastCheckedAt, changedAt: j.changedAt, seen: !!j.seenAt, deadline: j.deadline, warnings: j.warnings, facts: j.facts as Facts, verdict: r.verdict, score: r.score, uncertain: r.uncertain.length, fails: r.checks.filter((c) => c.result === "fail").map((c) => c.why) };
      }),
      events: events.filter((e) => !e.done).map((e) => ({ ...e, jobTitle: rows.find((j) => j._id === e.jobId)?.title ?? "", employer: rows.find((j) => j._id === e.jobId)?.employer ?? "" })),
    };
  },
});

export const job = query({
  args: { id: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await ctx.db.get(args.id);
    if (!j || j.ownerId !== a.ownerId) return null;
    const s = settingsView(await settingsOf(ctx, a.ownerId));
    const profile = await profileSource(ctx, a.ownerId);
    const docs = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect();
    const application = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", j._id)).first();
    const events = await ctx.db.query("loEvents").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect();
    const passed = j.preset === INSURANCE_PRESET ? passedEmployers(await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId).eq("status", "passed")).collect()) : new Set<string>();
    return { job: j, rank: rankJob(j, s, profile, passed), fit: presetView(j, s, passed), docs, application, events: events.sort((x, y) => (x.at ?? x.createdAt) - (y.at ?? y.createdAt)), role: a.role };
  },
});

async function insertJob(
  ctx: MutationCtx,
  ownerId: Id<"profiles">,
  homeState: string,
  p: { title: string; employer: string; url: string; applyUrl?: string; location?: string; description: string; sourceKind: string; sourceName: string; sourceId?: string; postedAt?: number; deadline?: string; preset?: string },
  status: Status,
  blocklist: string[] = [],
): Promise<{ id: Id<"loJobs"> | null; duplicate: boolean; forgotten?: boolean }> {
  const key = dedupeKey(p.employer, p.title);
  const urlKey = normalizeUrl(p.url);
  // A job he removed or said "not for me" to doesn't come back when a search finds it again. (A job pasted by hand is always added: he asked for it.)
  if (p.sourceKind !== "manual") {
    const gone = (await ctx.db.query("loForgotten").withIndex("by_owner_url", (q) => q.eq("ownerId", ownerId).eq("urlKey", urlKey)).first()) ?? (await ctx.db.query("loForgotten").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", ownerId).eq("dedupeKey", key)).first());
    if (gone) return { id: null, duplicate: true, forgotten: true };
  }
  const byUrl = await ctx.db.query("loJobs").withIndex("by_owner_url", (q) => q.eq("ownerId", ownerId).eq("urlKey", urlKey)).first();
  const same = byUrl ?? (await ctx.db.query("loJobs").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", ownerId).eq("dedupeKey", key)).first());
  if (same) {
    if (!byUrl && !same.alsoAt.includes(p.url) && same.url !== p.url) await ctx.db.patch(same._id, { alsoAt: [...same.alsoAt, p.url].slice(-10) });
    return { id: same._id, duplicate: true };
  }
  const text = `${p.title}\n${p.location ?? ""}\n${p.description}`;
  const scan = scanListing(text, homeState);
  const board = REMOTE_ONLY[p.sourceKind];
  if (board && !scan.facts.remote) scan.facts.remote = remoteBoardFact(board);
  const now = Date.now();
  // A preset job from a blocklisted company is kept but hidden (Earlier finds), with the reason on it.
  const blocked = p.preset ? isBlocked(p.employer, blocklist) : null;
  if (blocked) scan.warnings = [...scan.warnings, `On your blocklist: ${blocked}. Hidden unless "show hidden" is on.`];
  const id = await ctx.db.insert("loJobs", {
    ownerId,
    visibility: "private",
    preset: p.preset,
    shelvedAt: blocked ? now : undefined,
    title: p.title.slice(0, 200),
    employer: p.employer.slice(0, 120) || "Unknown employer",
    url: p.url.slice(0, 1000),
    applyUrl: p.applyUrl?.slice(0, 1000),
    sourceKind: p.sourceKind,
    sourceName: p.sourceName,
    sourceId: p.sourceId,
    dedupeKey: key,
    urlKey,
    location: p.location?.slice(0, 300),
    description: p.description.slice(0, 40000),
    fingerprint: fingerprint(p.description),
    facts: { open: { state: "yes", source: "listing", note: "Listed when found." }, ...scan.facts },
    warnings: scan.warnings,
    status,
    statusAt: now,
    postedAt: p.postedAt,
    deadline: p.deadline,
    discoveredAt: now,
    lastCheckedAt: now,
    alsoAt: [],
  });
  return { id, duplicate: false };
}

/** A job found anywhere (Indeed, a friend, an email) pasted in by hand. It gets every check. */
export const addJob = mutation({
  args: { title: v.string(), employer: v.string(), url: v.string(), applyUrl: v.optional(v.string()), description: v.string(), deadline: v.optional(v.string()), location: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const s = settingsView(await settingsOf(ctx, a.ownerId));
    let url = args.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      new URL(url);
    } catch {
      throw new ConvexError("That link doesn't look like a web address.");
    }
    if (args.description.trim().length < 80) throw new ConvexError("Paste the whole listing so it can be checked properly.");
    const r = await insertJob(ctx, a.ownerId, s.homeState, { title: cleanText(args.title, 200, "Job title"), employer: cleanText(args.employer, 120, "Employer"), url, applyUrl: optionalText(args.applyUrl, 1000, "Application link"), description: args.description.trim(), location: optionalText(args.location, 300, "Location"), deadline: optionalText(args.deadline, 40, "Deadline"), sourceKind: "manual", sourceName: "Added by hand" }, "review");
    if (!r.id) throw new ConvexError("That job couldn't be added.");
    return { id: r.id, duplicate: r.duplicate };
  },
});

const factStateV = v.union(v.literal("yes"), v.literal("no"), v.literal("unknown"));

/** A person checked a fact: with the employer, a recruiter, the careers page, or a policy. Marks it verified. */
export const verifyFact = mutation({
  args: { jobId: v.id("loJobs"), key: v.string(), state: factStateV, value: v.optional(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (!(FACT_KEYS as readonly string[]).includes(args.key)) throw new ConvexError("That isn't a fact the Lookout tracks.");
    const facts = { ...(j.facts as Facts) };
    if (args.state === "unknown") delete facts[args.key as FactKey];
    else facts[args.key as FactKey] = { state: args.state, value: optionalText(args.value, 60, "Value"), source: "verified", note: optionalText(args.note, 500, "How you know") };
    await ctx.db.patch(j._id, { facts, lastVerifiedAt: Date.now() });
  },
});

export const setStatus = mutation({
  args: { jobId: v.id("loJobs"), status: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (!(STATUSES as readonly string[]).includes(args.status)) throw new ConvexError("That isn't a status.");
    const allowed = MANUAL_MOVES[j.status as Status] ?? [];
    if (!allowed.includes(args.status as Status)) throw new ConvexError("That step isn't available from here.");
    // Saving or working on a job brings it back from Earlier finds.
    await ctx.db.patch(j._id, { status: args.status, statusAt: Date.now(), ...(UNSAVED.includes(args.status) || args.status === "passed" ? {} : { shelvedAt: undefined }) });
    // "Not for me" also keeps the same listing from coming back under a new link.
    if (args.status === "passed") await forget(ctx, j, "passed");
    else if (j.status === "passed") for (const x of await ctx.db.query("loForgotten").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", j.ownerId).eq("dedupeKey", j.dedupeKey)).collect()) if (x.reason === "passed") await ctx.db.delete(x._id);
  },
});

export const markSeen = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (!j.seenAt || (j.changedAt && j.changedAt > j.seenAt)) await ctx.db.patch(j._id, { seenAt: Date.now() });
  },
});

export const setNotes = mutation({
  args: { jobId: v.id("loJobs"), notes: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await ctx.db.patch(j._id, { notes: optionalText(args.notes, 6000, "Notes") });
  },
});

/** Remember a job he doesn't want, so a search that finds it again drops it. */
async function forget(ctx: MutationCtx, j: Doc<"loJobs">, reason: "removed" | "passed"): Promise<void> {
  const seen = await ctx.db.query("loForgotten").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", j.ownerId).eq("dedupeKey", j.dedupeKey)).first();
  if (seen) return;
  await ctx.db.insert("loForgotten", { ownerId: j.ownerId, visibility: "private", dedupeKey: j.dedupeKey, urlKey: j.urlKey, employer: j.employer, title: j.title, reason, createdAt: Date.now() });
  for (const u of j.alsoAt) {
    const k = normalizeUrl(u);
    if (!(await ctx.db.query("loForgotten").withIndex("by_owner_url", (q) => q.eq("ownerId", j.ownerId).eq("urlKey", k)).first())) await ctx.db.insert("loForgotten", { ownerId: j.ownerId, visibility: "private", dedupeKey: j.dedupeKey, urlKey: k, employer: j.employer, title: j.title, reason, createdAt: Date.now() });
  }
}

/** The jobs he's told the Lookout to stop bringing back, newest first. */
export const forgotten = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const rows = await ctx.db.query("loForgotten").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", a.ownerId)).collect();
    const byKey = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!byKey.has(r.dedupeKey)) byKey.set(r.dedupeKey, r);
    return [...byKey.values()].sort((x, y) => y.createdAt - x.createdAt).map((r) => ({ _id: r._id, employer: r.employer, title: r.title, reason: r.reason, createdAt: r.createdAt }));
  },
});

/** Let one forgotten job come back if a search finds it again. */
export const unforget = mutation({
  args: { id: v.id("loForgotten") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || r.ownerId !== a.ownerId) throw new ConvexError("That isn't here.");
    for (const x of await ctx.db.query("loForgotten").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", a.ownerId).eq("dedupeKey", r.dedupeKey)).collect()) await ctx.db.delete(x._id);
  },
});

export const removeJob = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    const app = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", j._id)).first();
    if (app) throw new ConvexError("This job has an approved application on record, so it stays. Mark it closed instead.");
    // Removed means gone for good: a search that finds the same listing again drops it.
    if (j.sourceKind !== "manual") await forget(ctx, j, "removed");
    for (const d of await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect()) await ctx.db.delete(d._id);
    for (const e of await ctx.db.query("loEvents").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect()) await ctx.db.delete(e._id);
    await ctx.db.delete(j._id);
  },
});

// ---------- Documents ----------

/**
 * Answers a person wrote to application questions go in the answer bank,
 * one row per question, so the same question on another application is
 * answered for him. Drafted answers don't, until a person saves them.
 */
async function rememberAnswers(ctx: MutationCtx, ownerId: Id<"profiles">, job: Doc<"loJobs">, text: string) {
  const now = Date.now();
  const jobId = job._id;
  for (const p of parseAnswerPairs(text)) {
    if (!p.question || isOpenAnswer(p.answer)) continue;
    const base = questionKey(p.question);
    if (!base) continue;
    // An answer about one job is kept for that job alone; a general one is shared by all.
    const key = jobSpecific(p.question, job.employer) ? `${jobId}:${base}` : base;
    const row = await ctx.db.query("loSavedAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", ownerId).eq("key", key)).first();
    const fields = { question: p.question.slice(0, 500), answer: p.answer.slice(0, 4000), jobId, updatedAt: now };
    if (row) {
      if (row.answer !== fields.answer || row.question !== fields.question) await ctx.db.patch(row._id, fields);
    } else await ctx.db.insert("loSavedAnswers", { ownerId, visibility: "private", key, ...fields });
  }
}

async function savedAnswersOf(ctx: Ctx, ownerId: Id<"profiles">) {
  return await ctx.db.query("loSavedAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", ownerId)).collect();
}

async function writeDoc(ctx: MutationCtx, a: { ownerId: Id<"profiles"> }, job: Doc<"loJobs">, kind: "resume" | "letter" | "answers", raw: string, questions: string[], opts: { byPerson: boolean } = { byPerson: false }): Promise<Id<"loDocs">> {
  let text = scrubDashes(raw).slice(0, 30000);
  if (kind === "answers") {
    if (opts.byPerson) await rememberAnswers(ctx, a.ownerId, job, text);
    else {
      // A new draft keeps every answer he already gave for this job, and fills open ones he's answered on other applications.
      const saved = await savedAnswersOf(ctx, a.ownerId);
      text = joinAnswerPairs(fillFromSaved(parseAnswerPairs(text), saved.filter((x) => x.jobId === job._id), saved.filter((x) => x.jobId !== job._id), job.employer).pairs);
    }
  }
  const s = settingsView(await settingsOf(ctx, a.ownerId));
  const roles = await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
  const answers = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId)).collect();
  // The claim check reads his confirmed facts plus his contact lines, which are allowed on every document.
  // Answers he gave to application questions count too: they're his own words.
  const bank = kind === "answers" ? (await savedAnswersOf(ctx, a.ownerId)).map((x) => x.answer).join("\n") : "";
  const source = `${await profileSource(ctx, a.ownerId)}\n${answers.filter((x) => ["phone", "email", "cityLine", "link", "name"].includes(x.key)).map((x) => x.answer).join("\n")}\n${bank}`;
  const issues = reviewDocument(text, { sourceText: source, kind, employers: roles.filter((r) => r.confirmed).map((r) => r.employer), allowHealthDisclosure: s.allowHealthDisclosure, jobText: job.description });
  if (roles.some((r) => !r.confirmed)) issues.push({ level: "note", text: "Some work history is waiting for his confirmation and wasn't used." });
  const existing = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", job._id).eq("kind", kind)).first();
  const now = Date.now();
  const drafted = opts.byPerson ? {} : { draftedAt: now };
  if (existing) {
    await ctx.db.patch(existing._id, { text, questions, issues, updatedAt: now, ...drafted });
    return existing._id;
  }
  return await ctx.db.insert("loDocs", { ownerId: a.ownerId, visibility: "private", jobId: job._id, kind, text, questions, issues, createdAt: now, updatedAt: now, ...drafted });
}

/** Save a person's own edit of a document. It is scrubbed and reviewed again like any draft. */
export const saveDoc = mutation({
  args: { jobId: v.id("loJobs"), kind: v.union(v.literal("resume"), v.literal("letter"), v.literal("answers")), text: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (["approved", "submitted", "interview", "offer", "rejected", "closed"].includes(j.status)) throw new ConvexError("This application is approved; its documents are kept exactly as they were.");
    const existing = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id).eq("kind", args.kind)).first();
    return await writeDoc(ctx, a, j, args.kind, args.text, existing?.questions ?? [], { byPerson: true });
  },
});

/** The employer's application questions for this job, saved as they're pasted. */
export const saveApplicationQuestions = mutation({
  args: { jobId: v.id("loJobs"), text: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (args.text.length > 12000) throw new ConvexError("That's a lot of questions. Paste them in two parts.");
    await ctx.db.patch(j._id, { applicationQuestions: args.text.trim() ? args.text : undefined });
  },
});

/** His answers to application questions, kept across jobs. */
export const savedAnswers = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    return (await savedAnswersOf(ctx, a.ownerId)).sort((x, y) => y.updatedAt - x.updatedAt);
  },
});

export const updateSavedAnswer = mutation({
  args: { id: v.id("loSavedAnswers"), answer: v.optional(v.string()), remove: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.ownerId !== a.ownerId) throw new ConvexError("That answer isn't here.");
    if (args.remove) await ctx.db.delete(row._id);
    else if (args.answer !== undefined) await ctx.db.patch(row._id, { answer: cleanText(args.answer, 4000, "Answer"), updatedAt: Date.now() });
  },
});

// ---------- Approval and submission ----------

/**
 * He approves an application. Only he can, only when every mandatory
 * requirement has passed, and only when the resume has no blocking issue.
 * The exact texts are frozen here; later edits can't change what was sent.
 */
export const approve = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx, true);
    const j = await loadJob(ctx, a, args.jobId);
    if (j.status !== "ready" && j.status !== "preparing") throw new ConvexError("Get the documents ready first.");
    const s = settingsView(await settingsOf(ctx, a.ownerId));
    const r = rankJob(j, s, await profileSource(ctx, a.ownerId));
    if (r.verdict === "rejected") throw new ConvexError("This job fails a requirement, so it can't be approved.");
    if (r.verdict === "check") throw new ConvexError("Some requirements still need checking before this can be approved.");
    const docs = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect();
    const resume = docs.find((d) => d.kind === "resume");
    if (!resume) throw new ConvexError("There's no resume for this job yet.");
    for (const d of docs) {
      if (blocking(d.issues)) throw new ConvexError(`The ${d.kind === "answers" ? "application answers" : d.kind === "letter" ? "cover letter" : "resume"} still has something to fix.`);
      if (findDashes(d.text).length) throw new ConvexError("A document still has a dash in it.");
    }
    const letter = docs.find((d) => d.kind === "letter");
    const ans = docs.find((d) => d.kind === "answers");
    const prior = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", j._id)).first();
    if (prior?.submittedAt) throw new ConvexError("This one was already submitted.");
    if (prior) await ctx.db.delete(prior._id);
    await ctx.db.insert("loApplications", { ownerId: a.ownerId, visibility: "private", jobId: j._id, resume: resume.text, letter: letter?.text, answers: ans?.text, approvedAt: Date.now() });
    await ctx.db.patch(j._id, { status: "approved", statusAt: Date.now() });
  },
});

export const markReady = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (j.status !== "preparing") throw new ConvexError("Start preparing first.");
    const docs = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect();
    if (!docs.some((d) => d.kind === "resume")) throw new ConvexError("There's no resume for this job yet.");
    if (docs.some((d) => blocking(d.issues))) throw new ConvexError("A document still has something to fix.");
    await ctx.db.patch(j._id, { status: "ready", statusAt: Date.now() });
  },
});

export const HOW_KNOWN = { email: "A confirmation email came", page: "The site showed a confirmation", unsure: "Not sure it went through yet", other: "Other" } as const;
export type HowKnown = keyof typeof HOW_KNOWN;
const howKnownV = v.union(v.literal("email"), v.literal("page"), v.literal("unsure"), v.literal("other"));

/**
 * Record that he applied, on the employer's own site. Nothing is ever sent
 * from here. It works from any stage before submitted, because people often
 * apply straight from a listing (2026-10-30: John applied to two jobs that
 * were never marked). The documents on file at that moment are kept with
 * it, and the way it's known that it went through is recorded, "not sure
 * yet" included, so nothing is called confirmed that isn't. Returns what to
 * put back for an undo.
 */
export async function recordApplication(ctx: MutationCtx, a: Access, job: Doc<"loJobs">, how: HowKnown, note: string | undefined, at: number) {
  if (!BEFORE_APPLYING.includes(job.status)) throw new ConvexError("This one is already recorded as submitted.");
  const confirmation = `${HOW_KNOWN[how]}${note ? `: ${note}` : ""}`.slice(0, 500);
  const existing = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", job._id)).first();
  let appId: Id<"loApplications">;
  let created = false;
  if (existing) {
    await ctx.db.patch(existing._id, { submittedAt: at, confirmation, howKnown: how, recordedBy: a.me.profile._id });
    appId = existing._id;
  } else {
    const docs = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", job._id)).collect();
    appId = await ctx.db.insert("loApplications", { ownerId: a.ownerId, visibility: "private", jobId: job._id, resume: docs.find((d) => d.kind === "resume")?.text ?? "", letter: docs.find((d) => d.kind === "letter")?.text, answers: docs.find((d) => d.kind === "answers")?.text, submittedAt: at, confirmation, howKnown: how, recordedBy: a.me.profile._id });
    created = true;
  }
  const prevStatus = { status: job.status, statusAt: job.statusAt };
  await ctx.db.patch(job._id, { status: "submitted", statusAt: Date.now() });
  const followUp = await ctx.db.insert("loEvents", {
    ownerId: a.ownerId,
    visibility: "private",
    jobId: job._id,
    kind: "followUp",
    at: (how === "unsure" ? Date.now() + 86400000 : at + FOLLOW_UP_DAYS * 86400000),
    text: how === "unsure" ? "Check for a confirmation email from this employer (and the spam folder). If none came, the application may need to be sent again." : "A short, polite check in on the application, if nothing has come back.",
    done: false,
    createdAt: Date.now(),
  });
  return { appId, created, prevStatus, followUp };
}

/** Finds that haven't been saved or worked on: the ones "Refresh the list" moves to Earlier finds. */
const UNSAVED = ["new", "review"];

/** Whether a job states its pay: a guaranteed figure was read or verified. */
export function statesPay(facts: Facts): boolean {
  const f = facts.payMin;
  return !!f && f.state === "yes" && Number(f.value) > 0;
}

/** Found jobs above his level (management, or senior when that's off) move to Earlier finds. */
async function shelveTooSenior(ctx: MutationCtx, ownerId: Id<"profiles">, allowSenior: boolean, keywords: string[]): Promise<number> {
  let moved = 0;
  for (const status of UNSAVED) {
    for (const j of await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", ownerId).eq("status", status)).collect()) {
      if (j.shelvedAt || j.sourceKind === "manual") continue;
      if (titleFits(j.title, keywords, allowSenior) && !MANAGES_PEOPLE.test(j.description)) continue;
      await ctx.db.patch(j._id, { shelvedAt: Date.now() });
      moved++;
    }
  }
  return moved;
}

/** Found jobs that don't state their pay move to Earlier finds. Jobs added by hand, saved, or being worked on stay. */
async function shelveUnpaid(ctx: MutationCtx, ownerId: Id<"profiles">): Promise<number> {
  let moved = 0;
  for (const status of UNSAVED) {
    for (const j of await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", ownerId).eq("status", status)).collect()) {
      if (j.shelvedAt || j.sourceKind === "manual" || statesPay(j.facts as Facts)) continue;
      await ctx.db.patch(j._id, { shelvedAt: Date.now() });
      moved++;
    }
  }
  return moved;
}

/**
 * "Refresh the list": every find that hasn't been saved or worked on moves
 * to Earlier finds, so only new ones show. Nothing is deleted; anything
 * saved, being prepared, or applied to stays where it is.
 */
export const shelveFinds = mutation({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const now = Date.now();
    let moved = 0;
    for (const status of UNSAVED) {
      for (const j of await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId).eq("status", status)).collect()) {
        if (j.shelvedAt) continue;
        await ctx.db.patch(j._id, { shelvedAt: now });
        moved++;
      }
    }
    return moved;
  },
});

/** Hide one job from the lists (it stays under Earlier finds), or bring it back. */
export const setShelved = mutation({
  args: { jobId: v.id("loJobs"), shelved: v.boolean() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await ctx.db.patch(j._id, { shelvedAt: args.shelved ? Date.now() : undefined });
  },
});

/** The application page was opened from here: remember it, so the Lookout can ask whether he applied. */
export const noteApplyOpened = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (BEFORE_APPLYING.includes(j.status)) await ctx.db.patch(j._id, { applyOpenedAt: Date.now() });
  },
});

/** "Not yet": stop asking until the application page is opened again. */
export const dismissApplyAsk = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await ctx.db.patch(j._id, { applyAskDismissedAt: Date.now() });
  },
});

/** "I applied to this", from the job's page. */
export const markApplied = mutation({
  args: { jobId: v.id("loJobs"), how: howKnownV, note: v.optional(v.string()), appliedOn: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    let at = Date.now();
    if (args.appliedOn) {
      const t = Date.parse(`${args.appliedOn}T12:00:00`);
      if (!Number.isFinite(t) || t > Date.now() + 86400000) throw new ConvexError("That date doesn't look right.");
      at = t;
    }
    await recordApplication(ctx, a, j, args.how, optionalText(args.note, 400, "Note"), at);
  },
});

/** Kept for the approval flow: record a submission after approving. */
export const markSubmitted = mutation({
  args: { jobId: v.id("loJobs"), confirmation: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await recordApplication(ctx, a, j, "other", cleanText(args.confirmation, 400, "What confirms it was submitted"), Date.now());
  },
});

/** He hasn't really applied after all: put the job back where it was. Removes the record and its follow up. */
export const unmarkApplied = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (j.status !== "submitted") throw new ConvexError("Only a job marked submitted can be put back.");
    const app = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", j._id)).first();
    if (app?.approvedAt) await ctx.db.patch(app._id, { submittedAt: undefined, confirmation: undefined, howKnown: undefined });
    else if (app) await ctx.db.delete(app._id);
    for (const e of await ctx.db.query("loEvents").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect()) if (e.kind === "followUp" && !e.done) await ctx.db.delete(e._id);
    await ctx.db.patch(j._id, { status: app?.approvedAt ? "approved" : "saved", statusAt: Date.now() });
  },
});

// ---------- Interviews, follow ups, notes ----------

export const addEvent = mutation({
  args: { jobId: v.id("loJobs"), kind: v.union(v.literal("interview"), v.literal("followUp"), v.literal("note"), v.literal("feedback")), at: v.optional(v.number()), text: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await ctx.db.insert("loEvents", { ownerId: a.ownerId, visibility: "private", jobId: j._id, kind: args.kind, at: args.at, text: cleanText(args.text, 4000, "Text"), done: args.kind === "note" || args.kind === "feedback", createdAt: Date.now() });
    if (args.kind === "interview" && (j.status === "submitted" || j.status === "approved")) await ctx.db.patch(j._id, { status: "interview", statusAt: Date.now() });
  },
});

export const setEventDone = mutation({
  args: { id: v.id("loEvents"), done: v.boolean() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const e = await ctx.db.get(args.id);
    if (!e || e.ownerId !== a.ownerId) throw new ConvexError("That isn't here.");
    await ctx.db.patch(e._id, { done: args.done });
  },
});

export const removeEvent = mutation({
  args: { id: v.id("loEvents") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const e = await ctx.db.get(args.id);
    if (!e || e.ownerId !== a.ownerId) throw new ConvexError("That isn't here.");
    await ctx.db.delete(e._id);
  },
});

// ---------- His data ----------

/** Everything the Lookout holds about him, as one object he can save. Only he can take it. */
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx, true);
    const by = <T extends "loAnswers" | "loRoles" | "loJobs" | "loDocs" | "loApplications" | "loEvents" | "loImports" | "loNotes" | "loAdmin" | "loAgencies" | "loSavedAnswers">(table: T) => ctx.db.query(table).collect().then((rows) => rows.filter((r) => r.ownerId === a.ownerId));
    return {
      exportedAt: new Date().toISOString(),
      settings: settingsView(await settingsOf(ctx, a.ownerId)),
      interview: (await by("loAnswers")).map((x) => ({ question: INTAKE.find((q) => q.key === x.key)?.question ?? x.key, answer: x.answer, confirmed: x.confirmed })),
      history: await by("loRoles"),
      jobs: await by("loJobs"),
      documents: await by("loDocs"),
      applications: await by("loApplications"),
      events: await by("loEvents"),
      resumeImports: await by("loImports"),
      writerNotes: await by("loNotes"),
      assistant: await by("loAdmin"),
      agencies: await by("loAgencies"),
      savedAnswers: await by("loSavedAnswers"),
    };
  },
});

// ---------- For the actions (internal) ----------

export const whoFor = internalQuery({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    return { ownerId: a.ownerId, role: a.role };
  },
});

/** Everything a draft may use: confirmed history and answers, the job, his settings. Nothing unconfirmed. */
export const forDraft = internalQuery({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    const s = settingsView(await settingsOf(ctx, a.ownerId));
    const roles = (await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect()).filter((r) => r.confirmed);
    const answers = (await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId)).collect()).filter((x) => x.confirmed && x.answer);
    const docs = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect();
    const notes = await ctx.db.query("loNotes").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
    const saved = await savedAnswersOf(ctx, a.ownerId);
    return {
      notes: notes.map((n) => n.text),
      savedAnswers: saved.map((x) => ({ question: x.question, answer: x.answer })),
      applicationQuestions: j.applicationQuestions ?? "",
      job: { title: j.title, employer: j.employer, description: j.description, url: j.url, status: j.status },
      roles: roles.map((r) => ({ id: r._id as string, employer: r.employer, title: r.title, start: r.start, end: r.end, location: r.location, channels: r.channels, duties: r.duties, achievements: r.achievements, tools: r.tools, sales: r.sales })),
      // The disclosure answer is never sent to the writer; the setting decides.
      answers: answers.filter((x) => x.key !== "disclose").map((x) => ({ key: x.key, question: INTAKE.find((q) => q.key === x.key)?.question ?? x.key, answer: x.answer })),
      allowHealthDisclosure: s.allowHealthDisclosure,
      resume: docs.find((d) => d.kind === "resume")?.text ?? null,
    };
  },
});

export const saveDraft = internalMutation({
  args: { jobId: v.id("loJobs"), kind: v.union(v.literal("resume"), v.literal("letter"), v.literal("answers")), text: v.string(), questions: v.array(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (["approved", "submitted", "interview", "offer", "rejected", "closed"].includes(j.status)) throw new ConvexError("This application is approved; its documents are kept exactly as they were.");
    const id = await writeDoc(ctx, a, j, args.kind, args.text, args.questions.slice(0, 12).map((q) => q.slice(0, 400)));
    if (["new", "review", "saved"].includes(j.status)) await ctx.db.patch(j._id, { status: "preparing", statusAt: Date.now() });
    return id;
  },
});

const factV = v.object({ state: factStateV, value: v.optional(v.string()), source: v.union(v.literal("none"), v.literal("listing"), v.literal("ai"), v.literal("verified")), note: v.optional(v.string()) });

export const saveReadFacts = internalMutation({
  args: { jobId: v.id("loJobs"), facts: v.record(v.string(), factV) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    const clean: Facts = {};
    for (const [k, f] of Object.entries(args.facts)) if ((FACT_KEYS as readonly string[]).includes(k)) clean[k as FactKey] = { ...f, source: "ai", note: f.note?.slice(0, 500), value: f.value?.slice(0, 60) };
    await ctx.db.patch(j._id, { facts: mergeFacts(j.facts as Facts, clean) });
  },
});

/** For the daily search: whose room it is and what to search. */
export const searchPlan = internalQuery({
  args: { ownerId: v.optional(v.id("profiles")) },
  handler: async (ctx, args) => {
    let ownerId = args.ownerId;
    if (!ownerId) ownerId = (await requireLookout(ctx)).ownerId;
    if (!(await hasSearch(ctx, ownerId))) return null;
    const s = settingsView(await settingsOf(ctx, ownerId));
    return { ownerId, settings: s, profile: await profileSource(ctx, ownerId) };
  },
});

/** Everyone whose scheduled search is due. */
export const scheduledOwners = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("loSettings").collect();
    return rows
      .filter((s) => s.frequency !== "off")
      .filter((s) => !s.lastSearchAt || Date.now() - s.lastSearchAt >= (s.frequency === "daily" ? 20 * 3600000 : 6.5 * 86400000))
      .map((s) => s.ownerId);
  },
});

const postingV = v.object({ title: v.string(), employer: v.string(), url: v.string(), applyUrl: v.optional(v.string()), location: v.optional(v.string()), description: v.string(), sourceKind: v.string(), sourceName: v.string(), sourceId: v.optional(v.string()), postedAt: v.optional(v.number()), deadline: v.optional(v.string()), preset: v.optional(v.string()) });

/** Store what a search found. Duplicates are folded into the job already here. Returns how many were new. */
export const storeFound = internalMutation({
  args: { ownerId: v.id("profiles"), postings: v.array(postingV), note: v.string(), bySource: v.optional(v.array(v.object({ name: v.string(), found: v.number(), kept: v.number(), noPay: v.optional(v.number()), senior: v.optional(v.number()), experience: v.optional(v.number()), degree: v.optional(v.number()), state: v.optional(v.number()), problem: v.optional(v.string()) }))) },
  handler: async (ctx, args) => {
    const s = await ensureSettings(ctx, args.ownerId);
    const blocklist = (s.insurance as InsuranceConfig | undefined)?.blocklist ?? defaultInsurance().blocklist;
    let fresh = 0;
    for (const p of args.postings) {
      const r = await insertJob(ctx, args.ownerId, s.homeState, p, "new", blocklist);
      if (!r.duplicate) fresh++;
    }
    await growWatchlist(ctx, s, args.postings);
    const bySource = args.bySource?.slice(0, 60) ?? [];
    const entry = { at: Date.now(), found: bySource.reduce((n, x) => n + x.found, 0), kept: args.postings.length, fresh, sources: bySource };
    await ctx.db.patch(s._id, { lastSearchAt: Date.now(), lastSearchNote: args.note.slice(0, 1000), lastSearchSources: bySource, searchLog: [entry, ...(s.searchLog ?? [])].slice(0, 10) });
    return fresh;
  },
});

/** The jobs worth rechecking: saved or in progress, not checked in the last day. */
export const toRecheck = internalQuery({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", args.ownerId)).collect();
    const live = ["new", "review", "saved", "preparing", "ready", "approved"];
    return rows.filter((j) => live.includes(j.status) && !j.shelvedAt && (!j.lastCheckedAt || Date.now() - j.lastCheckedAt > 20 * 3600000)).slice(0, 40).map((j) => ({ id: j._id, url: j.url, sourceKind: j.sourceKind }));
  },
});

const checkV = v.object({ jobId: v.id("loJobs"), open: v.union(v.literal("yes"), v.literal("no"), v.literal("unknown")), fingerprint: v.optional(v.string()), note: v.string() });

/** Save the "still open?" answers from one round of checks, all in one write so the live job list reloads once. */
export const recordChecks = internalMutation({
  args: { checks: v.array(checkV) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const c of args.checks) {
      const j = await ctx.db.get(c.jobId);
      if (!j) continue;
      const facts = { ...(j.facts as Facts) };
      if (c.open !== "unknown" && facts.open?.source !== "verified") facts.open = { state: c.open, source: "listing", note: c.note };
      const patch: Partial<Doc<"loJobs">> = { lastCheckedAt: now, facts };
      if (c.fingerprint) {
        if (j.pageFingerprint && c.fingerprint !== j.pageFingerprint) patch.changedAt = now;
        patch.pageFingerprint = c.fingerprint;
      }
      if (c.open === "no" && ["new", "review", "saved", "preparing", "ready"].includes(j.status)) {
        patch.status = "closed";
        patch.statusAt = now;
      }
      await ctx.db.patch(j._id, patch);
    }
  },
});

/** One job to check by hand, for the "Is it still open?" button. */
export const oneToCheck = internalQuery({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    return { id: j._id, url: j.url, sourceKind: j.sourceKind };
  },
});

/** How many jobs found in the last day pass or nearly pass, with a strong score. For the quiet notice. */
export const strongNew = internalQuery({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const s = settingsView(await settingsOf(ctx, args.ownerId));
    const profile = await profileSource(ctx, args.ownerId);
    const rows = await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", args.ownerId).eq("status", "new")).collect();
    return rows.filter((j) => Date.now() - j.discoveredAt < 86400000).map((j) => rankJob(j, s, profile)).filter((r) => r.verdict !== "rejected" && (r.score ?? 0) >= 60).length;
  },
});

// ---------- Resume upload ----------

/** A one-time address to upload a resume PDF to. The file is read once and then deleted. */
export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireLookout(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Only a PDF uploaded in the last half hour is read (and then deleted), never another stored file. */
export const freshUpload = internalQuery({
  args: { id: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireLookout(ctx);
    const meta = await ctx.db.system.get(args.id);
    return !!meta && meta.contentType === "application/pdf" && Date.now() - meta._creationTime < 30 * 60000;
  },
});

export const imports = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    return (await ctx.db.query("loImports").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect()).sort((x, y) => y.importedAt - x.importedAt);
  },
});

const importedRoleV = v.object({ employer: v.string(), title: v.string(), start: v.string(), end: v.string(), location: v.string(), channels: v.array(v.string()), duties: v.array(v.string()), achievements: v.array(v.string()), tools: v.array(v.string()), sales: v.boolean() });

/**
 * What was read from an uploaded resume goes in as drafts: every job and
 * answer waits for the owner to check and confirm it, even when the owner
 * uploaded it, because reading a resume can misread one. Nothing already
 * there is overwritten: a job that's already in the history is skipped, and
 * only unanswered interview questions are filled in.
 */
export const saveImport = internalMutation({
  args: { fileName: v.string(), roles: v.array(importedRoleV), answers: v.array(v.object({ key: v.string(), answer: v.string() })), notes: v.array(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
    const same = (x: string, y: string) => x.trim().toLowerCase() === y.trim().toLowerCase();
    let rolesAdded = 0;
    const notes = [...args.notes];
    for (const r of args.roles.slice(0, 30)) {
      if (!r.employer.trim() || !r.title.trim()) continue;
      if (existing.some((e) => same(e.employer, r.employer) && same(e.title, r.title))) continue;
      const start = DATE_RE.test(r.start.trim()) ? r.start.trim() : "";
      const end = DATE_RE.test(r.end.trim()) ? r.end.trim() : undefined;
      if (!start) notes.push(`${r.title} at ${r.employer}: the start date wasn't clear on the resume. Add it on Work history.`);
      await ctx.db.insert("loRoles", {
        ownerId: a.ownerId,
        visibility: "private",
        employer: r.employer.trim().slice(0, 120),
        title: r.title.trim().slice(0, 120),
        start,
        end,
        location: r.location.trim().slice(0, 120) || undefined,
        channels: r.channels.slice(0, 10).map((c) => c.slice(0, 40)),
        duties: r.duties.map((d) => d.trim()).filter(Boolean).join("\n").slice(0, 6000),
        achievements: r.achievements.map((d) => d.trim()).filter(Boolean).join("\n").slice(0, 6000),
        tools: r.tools.map((d) => d.trim()).filter(Boolean).join(", ").slice(0, 2000),
        sales: r.sales,
        confirmed: false,
        createdAt: now,
        updatedAt: now,
      });
      rolesAdded++;
    }
    let answersAdded = 0;
    for (const x of args.answers) {
      if (!INTAKE.some((q) => q.key === x.key) || x.key === "disclose") continue;
      const answer = x.answer.trim().slice(0, 6000);
      if (!answer) continue;
      const row = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId).eq("key", x.key)).first();
      if (row?.answer.trim()) continue;
      if (row) await ctx.db.patch(row._id, { answer, skipped: false, confirmed: false, updatedAt: now });
      else await ctx.db.insert("loAnswers", { ownerId: a.ownerId, visibility: "private", key: x.key, answer, skipped: false, confirmed: false, updatedAt: now });
      answersAdded++;
    }
    await ctx.db.insert("loImports", { ownerId: a.ownerId, visibility: "private", fileName: args.fileName.slice(0, 200), rolesAdded, answersAdded, notes: notes.slice(0, 20).map((n) => n.slice(0, 400)), importedAt: now });
    return { rolesAdded, answersAdded, notes };
  },
});


// ---------- The Insurance Sales, Inbound/W-2 preset (2026-11-20) ----------

const watchV = v.object({ name: v.string(), url: v.string(), search: v.optional(v.string()), note: v.optional(v.string()), enabled: v.boolean() });

/** Turn the preset on or off, or change its words, blocklist, or watchlist. The blocklist is applied to found jobs at once. */
export const setInsurance = mutation({
  args: { enabled: v.optional(v.boolean()), keywords: v.optional(v.array(v.string())), blocklist: v.optional(v.array(v.string())), watchlist: v.optional(v.array(watchV)), showBlocked: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const row = await ensureSettings(ctx, a.ownerId);
    const current = (row.insurance as InsuranceConfig | undefined) ?? defaultInsurance();
    const next = cleanConfig(args, current);
    await ctx.db.patch(row._id, { insurance: next, updatedAt: Date.now() });
    if (args.blocklist !== undefined) {
      // Newly blocked companies' unsaved finds move out of the way; unblocked ones come back.
      for (const j of await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId)).collect()) {
        if (j.preset !== INSURANCE_PRESET) continue;
        const was = !!isBlocked(j.employer, current.blocklist);
        const now = !!isBlocked(j.employer, next.blocklist);
        if (was === now) continue;
        const warnings = j.warnings.filter((w) => !w.startsWith("On your blocklist:"));
        if (now) await ctx.db.patch(j._id, { warnings: [...warnings, `On your blocklist: ${isBlocked(j.employer, next.blocklist)}. Hidden unless "show hidden" is on.`], ...(UNSAVED.includes(j.status) ? { shelvedAt: Date.now() } : {}) });
        else await ctx.db.patch(j._id, { warnings, ...(UNSAVED.includes(j.status) && j.shelvedAt ? { shelvedAt: undefined } : {}) });
      }
    }
    return next;
  },
});

/** The screening checklist on one job, filled in during interviews. A bad answer to a critical question marks the job Avoid. */
export const setScreening = mutation({
  args: { jobId: v.id("loJobs"), answers: v.array(v.object({ key: v.string(), asked: v.boolean(), answer: v.string(), note: v.string() })) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await ctx.db.patch(j._id, { screening: cleanScreening(args.answers as ScreeningAnswer[]) });
  },
});

/** Score a job by the preset's flags (for one pasted in by hand), or stop. */
export const setPreset = mutation({
  args: { jobId: v.id("loJobs"), preset: v.union(v.literal("insurance"), v.null()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    await ctx.db.patch(j._id, { preset: args.preset ?? undefined });
  },
});

/** Store what a watchlist "Check now" found, without counting as a search. */
export const storeWatch = internalMutation({
  args: { ownerId: v.id("profiles"), postings: v.array(postingV) },
  handler: async (ctx, args) => {
    const s = await ensureSettings(ctx, args.ownerId);
    const blocklist = (s.insurance as InsuranceConfig | undefined)?.blocklist ?? defaultInsurance().blocklist;
    let fresh = 0;
    for (const p of args.postings) {
      const r = await insertJob(ctx, args.ownerId, s.homeState, p, "new", blocklist);
      if (!r.duplicate) fresh++;
    }
    return fresh;
  },
});

/**
 * The watchlist grows on its own: an insurance job whose link is on a board
 * the Lookout can read (Greenhouse, Lever, and the rest) adds that company,
 * so its other openings are read at every search from then on.
 */
async function growWatchlist(ctx: MutationCtx, s: Doc<"loSettings">, postings: { employer: string; url: string; applyUrl?: string; preset?: string }[]): Promise<number> {
  const cfg = s.insurance as InsuranceConfig | undefined;
  if (!cfg?.enabled) return 0;
  const have = new Set(cfg.watchlist.map((w) => { const b = boardFromUrl(w.url); return b ? `${b.kind}:${b.token.toLowerCase()}` : `name:${w.name.toLowerCase()}`; }));
  const names = new Set(cfg.watchlist.map((w) => w.name.toLowerCase()));
  const added: InsuranceConfig["watchlist"] = [];
  for (const p of postings) {
    if (p.preset !== INSURANCE_PRESET || !p.employer) continue;
    const link = [p.applyUrl, p.url].find((u) => u && boardFromUrl(u));
    const b = link ? boardFromUrl(link) : null;
    if (!b || !link) continue;
    const key = `${b.kind}:${b.token.toLowerCase()}`;
    if (have.has(key) || names.has(p.employer.toLowerCase()) || isBlocked(p.employer, cfg.blocklist)) continue;
    have.add(key);
    names.add(p.employer.toLowerCase());
    added.push({ name: p.employer.slice(0, 80), url: link.slice(0, 500), note: `Added by the Lookout from a job found on ${new Date().toISOString().slice(0, 10)}; their board is readable.`, enabled: true });
  }
  if (!added.length) return 0;
  await ctx.db.patch(s._id, { insurance: { ...cfg, watchlist: [...cfg.watchlist, ...added].slice(0, 60) } });
  return added.length;
}

/** "Block this company": add the employer of one job to the blocklist, hiding its jobs. */
export const blockEmployer = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    const row = await ensureSettings(ctx, a.ownerId);
    const current = (row.insurance as InsuranceConfig | undefined) ?? defaultInsurance();
    if (isBlocked(j.employer, current.blocklist)) return current.blocklist;
    const next = cleanConfig({ blocklist: [...current.blocklist, j.employer] }, current);
    await ctx.db.patch(row._id, { insurance: next, updatedAt: Date.now() });
    for (const x of await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId)).collect()) {
      if (x.preset !== INSURANCE_PRESET || !isBlocked(x.employer, next.blocklist) || x.warnings.some((w) => w.startsWith("On your blocklist:"))) continue;
      await ctx.db.patch(x._id, { warnings: [...x.warnings, `On your blocklist: ${isBlocked(x.employer, next.blocklist)}. Hidden unless "show hidden" is on.`], ...(UNSAVED.includes(x.status) ? { shelvedAt: Date.now() } : {}) });
    }
    return next.blocklist;
  },
});

/** The preset's sources for this search, for the log and for the search itself. */
export function presetSourcesOf(cfg: InsuranceConfig): Source[] {
  return cfg.enabled ? insuranceSources(cfg) : [];
}
