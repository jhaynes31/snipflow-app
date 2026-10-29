import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "../_generated/server";
import { cleanText, optionalText, requireMe, type Ctx, type Me } from "../lib";
import { roomOwnerOf } from "../rooms";
import { INTAKE } from "./intake";
import { dedupeKey, DEFAULT_REQUIREMENTS, DEFAULT_WEIGHTS, FACT_KEYS, FOLLOW_UP_DAYS, fingerprint, MANUAL_MOVES, mergeFacts, normalizeUrl, rank, scanListing, STATUSES, type FactKey, type Facts, type Status } from "./pure";
import { DEFAULT_SOURCES } from "./sources";
import { blocking, findDashes, profileText, reviewDocument, scrubDashes } from "./writing";

/**
 * The Lookout: a personal recruiter for one person looking for work.
 *
 * Access. It is a one-person room (module id "lookout" in moduleOwners):
 * whoever is looking for work claims it. He can then let his partner help.
 * A helper sees and edits everything, with three exceptions that stay his
 * alone: approving an application, the privacy settings, and deleting or
 * exporting his data. Every row's ownerId is his, whoever wrote it.
 *
 * Truth. Facts about a job carry their source. Only a person's check marks
 * one "verified". Documents are drafted only from his confirmed history and
 * interview answers, and every saved document is scrubbed of dashes and
 * reviewed against that history before it can be approved.
 */
const ROOM = "lookout";

export interface Access {
  me: Me;
  ownerId: Id<"profiles">;
  role: "owner" | "helper";
}

async function settingsOf(ctx: Ctx, ownerId: Id<"profiles">): Promise<Doc<"loSettings"> | null> {
  return await ctx.db.query("loSettings").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first();
}

export async function lookoutAccess(ctx: Ctx): Promise<Access | null> {
  const me = await requireMe(ctx);
  const owner = await roomOwnerOf(ctx, ROOM);
  if (!owner) return null;
  if (owner.ownerId === me.profile._id) return { me, ownerId: owner.ownerId, role: "owner" };
  if (me.partner && owner.ownerId === me.partner._id) {
    const s = await settingsOf(ctx, owner.ownerId);
    if (s?.helper) return { me, ownerId: owner.ownerId, role: "helper" };
  }
  return null;
}

export async function requireLookout(ctx: Ctx, ownerOnly = false): Promise<Access> {
  const a = await lookoutAccess(ctx);
  if (!a) throw new ConvexError("The Lookout isn't open to you.");
  if (ownerOnly && a.role !== "owner") throw new ConvexError("Only the person looking for work can do this.");
  return a;
}

async function ensureSettings(ctx: MutationCtx, ownerId: Id<"profiles">): Promise<Doc<"loSettings">> {
  const row = await settingsOf(ctx, ownerId);
  if (row) return row;
  const id = await ctx.db.insert("loSettings", {
    ownerId,
    visibility: "private",
    helper: false,
    minHourly: DEFAULT_REQUIREMENTS.minHourly,
    maxHours: DEFAULT_REQUIREMENTS.maxHours,
    homeState: DEFAULT_REQUIREMENTS.homeState,
    weights: DEFAULT_WEIGHTS,
    frequency: "off",
    keywords: [],
    sources: DEFAULT_SOURCES,
    allowHealthDisclosure: false,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

function settingsView(row: Doc<"loSettings"> | null) {
  return {
    helper: row?.helper ?? false,
    minHourly: row?.minHourly ?? DEFAULT_REQUIREMENTS.minHourly,
    maxHours: row?.maxHours ?? DEFAULT_REQUIREMENTS.maxHours,
    homeState: row?.homeState ?? DEFAULT_REQUIREMENTS.homeState,
    weights: row?.weights ?? DEFAULT_WEIGHTS,
    frequency: row?.frequency ?? ("off" as const),
    keywords: row?.keywords ?? [],
    sources: row?.sources ?? DEFAULT_SOURCES,
    allowHealthDisclosure: row?.allowHealthDisclosure ?? false,
    lastSearchAt: row?.lastSearchAt,
    lastSearchNote: row?.lastSearchNote,
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

function rankJob(job: Doc<"loJobs">, s: ReturnType<typeof settingsView>, profile: string) {
  return rank(job.facts as Facts, { req: { minHourly: s.minHourly, maxHours: s.maxHours, homeState: s.homeState }, weights: s.weights, jobText: `${job.title}\n${job.description}`, profileText: profile });
}

// ---------- The room ----------

export const status = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const owner = await roomOwnerOf(ctx, ROOM);
    if (!owner) return { state: "unclaimed" as const, ownerName: null, partnerName: me.partner?.displayName ?? null };
    if (owner.ownerId === me.profile._id) return { state: "mine" as const, ownerName: me.profile.displayName, partnerName: me.partner?.displayName ?? null };
    const s = await settingsOf(ctx, owner.ownerId);
    return { state: s?.helper ? ("helping" as const) : ("theirs" as const), ownerName: me.partner?.displayName ?? "your partner", partnerName: me.profile.displayName };
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
    helper: v.optional(v.boolean()),
    allowHealthDisclosure: v.optional(v.boolean()),
    minHourly: v.optional(v.number()),
    maxHours: v.optional(v.number()),
    homeState: v.optional(v.string()),
    weights: v.optional(weightsV),
    frequency: v.optional(v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))),
    keywords: v.optional(v.array(v.string())),
    sources: v.optional(v.array(sourceV)),
  },
  handler: async (ctx, args) => {
    const privacy = args.helper !== undefined || args.allowHealthDisclosure !== undefined;
    const a = await requireLookout(ctx, privacy);
    const row = await ensureSettings(ctx, a.ownerId);
    const patch: Partial<Doc<"loSettings">> = { updatedAt: Date.now() };
    if (args.helper !== undefined) patch.helper = args.helper;
    if (args.allowHealthDisclosure !== undefined) patch.allowHealthDisclosure = args.allowHealthDisclosure;
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
      patch.sources = args.sources.map((s) => ({ kind: s.kind, token: cleanText(s.token, 80, "Board name"), name: cleanText(s.name, 80, "Name"), enabled: s.enabled }));
    }
    await ctx.db.patch(row._id, patch);
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

const ym = (s: string | undefined, label: string) => {
  if (s === undefined || s === "") return undefined;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new ConvexError(`${label} is a month and year.`);
  return s;
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
  const start = ym(args.start, "Start")!;
  if (!start) throw new ConvexError("Start is a month and year.");
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
    return {
      jobs: rows.map((j) => {
        const r = rankJob(j, s, profile);
        return { _id: j._id, title: j.title, employer: j.employer, url: j.url, status: j.status as Status, statusAt: j.statusAt, sourceName: j.sourceName, discoveredAt: j.discoveredAt, postedAt: j.postedAt, lastVerifiedAt: j.lastVerifiedAt, lastCheckedAt: j.lastCheckedAt, changedAt: j.changedAt, seen: !!j.seenAt, deadline: j.deadline, warnings: j.warnings, facts: j.facts as Facts, verdict: r.verdict, score: r.score, uncertain: r.uncertain.length, fails: r.checks.filter((c) => c.result === "fail").map((c) => c.why) };
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
    return { job: j, rank: rankJob(j, s, profile), docs, application, events: events.sort((x, y) => (x.at ?? x.createdAt) - (y.at ?? y.createdAt)), role: a.role };
  },
});

async function insertJob(
  ctx: MutationCtx,
  ownerId: Id<"profiles">,
  homeState: string,
  p: { title: string; employer: string; url: string; applyUrl?: string; location?: string; description: string; sourceKind: string; sourceName: string; sourceId?: string; postedAt?: number; deadline?: string },
  status: Status,
): Promise<{ id: Id<"loJobs">; duplicate: boolean }> {
  const key = dedupeKey(p.employer, p.title);
  const urlKey = normalizeUrl(p.url);
  const byUrl = await ctx.db.query("loJobs").withIndex("by_owner_url", (q) => q.eq("ownerId", ownerId).eq("urlKey", urlKey)).first();
  const same = byUrl ?? (await ctx.db.query("loJobs").withIndex("by_owner_dedupe", (q) => q.eq("ownerId", ownerId).eq("dedupeKey", key)).first());
  if (same) {
    if (!byUrl && !same.alsoAt.includes(p.url) && same.url !== p.url) await ctx.db.patch(same._id, { alsoAt: [...same.alsoAt, p.url].slice(-10) });
    return { id: same._id, duplicate: true };
  }
  const text = `${p.title}\n${p.location ?? ""}\n${p.description}`;
  const scan = scanListing(text, homeState);
  const now = Date.now();
  const id = await ctx.db.insert("loJobs", {
    ownerId,
    visibility: "private",
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
    return await insertJob(ctx, a.ownerId, s.homeState, { title: cleanText(args.title, 200, "Job title"), employer: cleanText(args.employer, 120, "Employer"), url, applyUrl: optionalText(args.applyUrl, 1000, "Application link"), description: args.description.trim(), location: optionalText(args.location, 300, "Location"), deadline: optionalText(args.deadline, 40, "Deadline"), sourceKind: "manual", sourceName: "Added by hand" }, "review");
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
    await ctx.db.patch(j._id, { status: args.status, statusAt: Date.now() });
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

export const removeJob = mutation({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    const app = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", j._id)).first();
    if (app) throw new ConvexError("This job has an approved application on record, so it stays. Mark it closed instead.");
    for (const d of await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect()) await ctx.db.delete(d._id);
    for (const e of await ctx.db.query("loEvents").withIndex("by_job", (q) => q.eq("jobId", j._id)).collect()) await ctx.db.delete(e._id);
    await ctx.db.delete(j._id);
  },
});

// ---------- Documents ----------

async function writeDoc(ctx: MutationCtx, a: { ownerId: Id<"profiles"> }, job: Doc<"loJobs">, kind: "resume" | "letter" | "answers", raw: string, questions: string[]): Promise<Id<"loDocs">> {
  const text = scrubDashes(raw).slice(0, 30000);
  const s = settingsView(await settingsOf(ctx, a.ownerId));
  const roles = await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
  const answers = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId)).collect();
  // The claim check reads his confirmed facts plus his contact lines, which are allowed on every document.
  const source = `${await profileSource(ctx, a.ownerId)}\n${answers.filter((x) => ["phone", "email", "cityLine", "link", "name"].includes(x.key)).map((x) => x.answer).join("\n")}`;
  const issues = reviewDocument(text, { sourceText: source, kind, employers: roles.filter((r) => r.confirmed).map((r) => r.employer), allowHealthDisclosure: s.allowHealthDisclosure, jobText: job.description });
  if (roles.some((r) => !r.confirmed)) issues.push({ level: "note", text: "Some work history is waiting for his confirmation and wasn't used." });
  const existing = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", job._id).eq("kind", kind)).first();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, { text, questions, issues, updatedAt: now });
    return existing._id;
  }
  return await ctx.db.insert("loDocs", { ownerId: a.ownerId, visibility: "private", jobId: job._id, kind, text, questions, issues, createdAt: now, updatedAt: now });
}

/** Save a person's own edit of a document. It is scrubbed and reviewed again like any draft. */
export const saveDoc = mutation({
  args: { jobId: v.id("loJobs"), kind: v.union(v.literal("resume"), v.literal("letter"), v.literal("answers")), text: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    if (["approved", "submitted", "interview", "offer", "rejected", "closed"].includes(j.status)) throw new ConvexError("This application is approved; its documents are kept exactly as they were.");
    const existing = await ctx.db.query("loDocs").withIndex("by_job", (q) => q.eq("jobId", j._id).eq("kind", args.kind)).first();
    return await writeDoc(ctx, a, j, args.kind, args.text, existing?.questions ?? []);
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

/**
 * Record a submission. Only after approval, and only with something that
 * confirms it went through: the confirmation page or email, a reference
 * number. Nothing is ever submitted from here; he submits on the employer's
 * own page.
 */
export const markSubmitted = mutation({
  args: { jobId: v.id("loJobs"), confirmation: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const j = await loadJob(ctx, a, args.jobId);
    const app = await ctx.db.query("loApplications").withIndex("by_job", (q) => q.eq("jobId", j._id)).first();
    if (!app || j.status !== "approved") throw new ConvexError("An application is approved before it's submitted.");
    const confirmation = cleanText(args.confirmation, 500, "What confirms it was submitted");
    const now = Date.now();
    await ctx.db.patch(app._id, { submittedAt: now, confirmation });
    await ctx.db.patch(j._id, { status: "submitted", statusAt: now });
    await ctx.db.insert("loEvents", { ownerId: a.ownerId, visibility: "private", jobId: j._id, kind: "followUp", at: now + FOLLOW_UP_DAYS * 86400000, text: "A short, polite check in on the application, if nothing has come back.", done: false, createdAt: now });
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
    const by = <T extends "loAnswers" | "loRoles" | "loJobs" | "loDocs" | "loApplications" | "loEvents">(table: T) => ctx.db.query(table).collect().then((rows) => rows.filter((r) => r.ownerId === a.ownerId));
    return {
      exportedAt: new Date().toISOString(),
      settings: settingsView(await settingsOf(ctx, a.ownerId)),
      interview: (await by("loAnswers")).map((x) => ({ question: INTAKE.find((q) => q.key === x.key)?.question ?? x.key, answer: x.answer, confirmed: x.confirmed })),
      history: await by("loRoles"),
      jobs: await by("loJobs"),
      documents: await by("loDocs"),
      applications: await by("loApplications"),
      events: await by("loEvents"),
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
    return {
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
    const owner = await roomOwnerOf(ctx, ROOM);
    if (!owner || owner.ownerId !== ownerId) return null;
    const s = settingsView(await settingsOf(ctx, ownerId));
    return { ownerId, settings: s };
  },
});

export const scheduledOwner = internalQuery({
  args: {},
  handler: async (ctx) => {
    const owner = await roomOwnerOf(ctx, ROOM);
    if (!owner) return null;
    const s = await settingsOf(ctx, owner.ownerId);
    if (!s || s.frequency === "off") return null;
    const gap = s.frequency === "daily" ? 20 * 3600000 : 6.5 * 86400000;
    if (s.lastSearchAt && Date.now() - s.lastSearchAt < gap) return null;
    return owner.ownerId;
  },
});

const postingV = v.object({ title: v.string(), employer: v.string(), url: v.string(), applyUrl: v.optional(v.string()), location: v.optional(v.string()), description: v.string(), sourceKind: v.string(), sourceName: v.string(), sourceId: v.optional(v.string()), postedAt: v.optional(v.number()), deadline: v.optional(v.string()) });

/** Store what a search found. Duplicates are folded into the job already here. Returns how many were new. */
export const storeFound = internalMutation({
  args: { ownerId: v.id("profiles"), postings: v.array(postingV), note: v.string() },
  handler: async (ctx, args) => {
    const s = await ensureSettings(ctx, args.ownerId);
    let fresh = 0;
    for (const p of args.postings) {
      const r = await insertJob(ctx, args.ownerId, s.homeState, p, "new");
      if (!r.duplicate) fresh++;
    }
    await ctx.db.patch(s._id, { lastSearchAt: Date.now(), lastSearchNote: args.note.slice(0, 1000) });
    return fresh;
  },
});

/** The jobs worth rechecking: saved or in progress, not checked in the last day. */
export const toRecheck = internalQuery({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", args.ownerId)).collect();
    const live = ["new", "review", "saved", "preparing", "ready", "approved"];
    return rows.filter((j) => live.includes(j.status) && (!j.lastCheckedAt || Date.now() - j.lastCheckedAt > 20 * 3600000)).slice(0, 40).map((j) => ({ id: j._id, url: j.url, sourceKind: j.sourceKind }));
  },
});

export const recordCheck = internalMutation({
  args: { jobId: v.id("loJobs"), open: v.union(v.literal("yes"), v.literal("no"), v.literal("unknown")), fingerprint: v.optional(v.string()), note: v.string() },
  handler: async (ctx, args) => {
    const j = await ctx.db.get(args.jobId);
    if (!j) return;
    const now = Date.now();
    const facts = { ...(j.facts as Facts) };
    if (args.open !== "unknown" && facts.open?.source !== "verified") facts.open = { state: args.open, source: "listing", note: args.note };
    const patch: Partial<Doc<"loJobs">> = { lastCheckedAt: now, facts };
    if (args.fingerprint) {
      if (j.pageFingerprint && args.fingerprint !== j.pageFingerprint) patch.changedAt = now;
      patch.pageFingerprint = args.fingerprint;
    }
    if (args.open === "no" && ["new", "review", "saved", "preparing", "ready"].includes(j.status)) {
      patch.status = "closed";
      patch.statusAt = now;
    }
    await ctx.db.patch(j._id, patch);
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
