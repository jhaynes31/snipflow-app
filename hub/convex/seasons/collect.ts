import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { partnerForProfile } from "../everyBox/lib";
import { firstName, partnerOf, requireMe } from "../lib";
import { readTendSettings } from "../tend/pure";
import { dayKey } from "../tend/patterns";
import { roomOwner } from "../reCentered/room";
import { duePeriod, inPeriod, nowPeriod, previousPeriod, readSeasonsSettings, type Compared, type MineFacts, type OursFacts, type Period } from "./pure";

/**
 * Fact gathering for Seasons. Internal only; called by the generate action
 * and the daily tick, with explicit profile ids. "mine" reads one person's
 * own rows. "ours" reads only what is shared by nature, or what a person
 * switched on, and nothing from Re-Centered ever.
 */

const period = v.object({ interval: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("now")), start: v.string(), end: v.string() });

function count<T>(rows: T[], at: (r: T) => number, p: Period, dayOf: (ms: number) => string): number {
  return rows.filter((r) => inPeriod(at(r), p, dayOf)).length;
}

function tally<T>(rows: T[], key: (r: T) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

async function mineFor(ctx: QueryCtx, profile: Doc<"profiles">, p: Period): Promise<MineFacts> {
  const id = profile._id;
  const dayOf = (ms: number) => dayKey(ms, profile.timeZone);
  const before = previousPeriod(p);
  const both = <T>(rows: T[], at: (r: T) => number): [T[], T[]] => [rows.filter((r) => inPeriod(at(r), p, dayOf)), rows.filter((r) => inPeriod(at(r), before, dayOf))];
  const cmp = <T, U>(pair: [T[], T[]], f: (rows: T[]) => U): Compared<U> => ({ now: f(pair[0]), before: f(pair[1]) });

  const checkIns = await ctx.db.query("checkIns").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
  const tools = await ctx.db.query("tendToolUses").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
  const love = await ctx.db.query("tendLoveActions").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
  const allNotes = (await ctx.db.query("tendNotes").collect()).filter((n) => n.ownerId === id);
  const repairs = (await ctx.db.query("tendRepairs").collect()).filter((r) => r.status === "closed" && r.closedAt && (r.ownerId === id || r.partnerId === id));
  const sent = await ctx.db.query("headsUps").withIndex("by_owner", (q) => q.eq("ownerId", id)).collect();
  const answered = (await ctx.db.query("headsUps").withIndex("by_receiver_status", (q) => q.eq("receiverId", id)).collect()).filter((h) => h.respondedAt);
  const ebPartner = await partnerForProfile(ctx, id);
  const tends = ebPartner ? (await ctx.db.query("ebTendingEvents").withIndex("by_household", (q) => q.eq("householdId", ebPartner.householdId)).collect()).filter((t) => t.partnerId === ebPartner._id) : [];
  const words = await ctx.db.query("kwWords").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
  const asks = (await ctx.db.query("kwAsks").withIndex("by_to_time", (q) => q.eq("toProfileId", id)).collect()).filter((a) => a.answeredAt);

  const closedPair = both(words.filter((w) => w.closedAt), (w) => w.closedAt ?? w.createdAt);
  const pair0 = closedPair[0];
  const facts: MineFacts = {
    name: profile.displayName,
    period: p,
    checkIns: cmp(both(checkIns, (c) => c.createdAt), (rows) => ({
      total: rows.length,
      steady: rows.filter((c) => c.answer === "steady").length,
      aBitOff: rows.filter((c) => c.answer === "tender").length,
      low: rows.filter((c) => c.answer === "low").length,
    })),
    tools: cmp(both(tools, (t) => t.startedAt), (rows) => ({
      used: rows.length,
      byTool: tally(rows, (t) => t.tool),
      helpedALittle: [...new Set(rows.filter((t) => t.helped === "little").map((t) => t.tool))],
    })),
    loveActionsIDid: cmp(both(love, (l) => l.createdAt), (r) => r.length),
    notesISent: cmp(both(allNotes, (n) => n.createdAt), (r) => r.length),
    repairsITookPartIn: cmp(both(repairs, (r) => r.closedAt ?? r.createdAt), (r) => r.length),
    headsUpsISent: cmp(both(sent, (h) => h.createdAt), (r) => r.length),
    headsUpsIAnswered: cmp(both(answered, (h) => h.respondedAt ?? h.createdAt), (r) => r.length),
    everyBoxTends: cmp(both(tends, (t) => t.tendedAt), (r) => r.length),
    keptWord: cmp(closedPair, (rows) => ({
      kept: rows.filter((w) => w.status === "kept").length,
      didnt: rows.filter((w) => w.status === "didnt").length,
      renegotiated: rows.filter((w) => w.status === "renegotiated").length,
      reasons: tally(rows.filter((w) => w.status === "didnt"), (w) => w.reason),
      asksAnswered: tally(asks.filter((a) => inPeriod(a.answeredAt ?? 0, rows === pair0 ? p : before, dayOf)), (a) => a.answer),
    })),
  };

  const room = await roomOwner(ctx);
  if (room && room.ownerId === id) {
    const sorts = await ctx.db.query("rcSorts").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
    const pauses = await ctx.db.query("rcPauses").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
    const landings = await ctx.db.query("rcLandings").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
    const kept = await ctx.db.query("rcKeptByMe").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
    const taps = await ctx.db.query("rcSecurityTaps").withIndex("by_owner_day", (q) => q.eq("ownerId", id)).collect();
    const tapsIn = (q: Period) => taps.filter((t) => t.day >= q.start && t.day <= q.end);
    facts.reCentered = {
      now: { sorts: tally(both(sorts, (s) => s.createdAt)[0], (s) => s.whose), pauses: tally(both(pauses, (s) => s.createdAt)[0], (s) => s.ending), landings: count(landings, (l) => l.createdAt, p, dayOf), keptByMe: count(kept, (k) => k.createdAt, p, dayOf), securityTaps: tally(tapsIn(p), (t) => t.where) },
      before: { sorts: tally(both(sorts, (s) => s.createdAt)[1], (s) => s.whose), pauses: tally(both(pauses, (s) => s.createdAt)[1], (s) => s.ending), landings: count(landings, (l) => l.createdAt, before, dayOf), keptByMe: count(kept, (k) => k.createdAt, before, dayOf), securityTaps: tally(tapsIn(before), (t) => t.where) },
    };
  }
  return facts;
}

async function oursFor(ctx: QueryCtx, a: Doc<"profiles">, b: Doc<"profiles">, p: Period): Promise<OursFacts> {
  const dayOf = (ms: number) => dayKey(ms, a.timeZone);
  const before = previousPeriod(p);
  const ids = [a._id, b._id];
  const cmpCount = <T>(rows: T[], at: (r: T) => number): Compared<number> => ({ now: count(rows, at, p, dayOf), before: count(rows, at, before, dayOf) });

  const headsUps = (await ctx.db.query("headsUps").collect()).filter((h) => ids.includes(h.ownerId));
  const love = (await ctx.db.query("tendLoveActions").collect()).filter((l) => ids.includes(l.ownerId));
  const notes = (await ctx.db.query("tendNotes").collect()).filter((n) => ids.includes(n.ownerId));
  const repairs = (await ctx.db.query("tendRepairs").collect()).filter((r) => r.status === "closed" && r.closedAt);
  const tender = await ctx.db.query("events").withIndex("by_name", (q) => q.eq("name", "forecast.tenderWeek")).collect();
  const ebPartner = await partnerForProfile(ctx, a._id);
  const reviews = ebPartner ? await ctx.db.query("ebWeeklyReviews").withIndex("by_household", (q) => q.eq("householdId", ebPartner.householdId)).collect() : [];
  const words: Doc<"kwWords">[] = [];
  const asks: Doc<"kwAsks">[] = [];
  for (const id of ids) {
    words.push(...(await ctx.db.query("kwWords").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()));
    asks.push(...(await ctx.db.query("kwAsks").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()));
  }
  const closed = words.filter((w) => w.closedAt);
  const kw = (q: Period) => {
    const rows = closed.filter((w) => inPeriod(w.closedAt ?? 0, q, dayOf));
    return {
      kept: rows.filter((w) => w.status === "kept").length,
      didnt: rows.filter((w) => w.status === "didnt").length,
      renegotiated: rows.filter((w) => w.status === "renegotiated").length,
      asksAnswered: asks.filter((x) => x.answeredAt && inPeriod(x.answeredAt, q, dayOf)).length,
    };
  };
  const toolsThatHelped: OursFacts["toolsThatHelped"] = [];
  for (const person of [a, b]) {
    if (!readTendSettings(person.moduleSettings).shareToolHelps) continue;
    const uses = (await ctx.db.query("tendToolUses").withIndex("by_owner_time", (q) => q.eq("ownerId", person._id)).collect()).filter((t) => t.helped === "little" && inPeriod(t.startedAt, p, dayOf));
    toolsThatHelped.push({ name: firstName(person.displayName), tools: [...new Set(uses.map((u) => u.tool))] });
  }
  return {
    names: [firstName(a.displayName), firstName(b.displayName)],
    period: p,
    headsUpsSent: cmpCount(headsUps, (h) => h.createdAt),
    headsUpsAnswered: cmpCount(headsUps.filter((h) => h.respondedAt), (h) => h.respondedAt ?? 0),
    loveActionsDone: cmpCount(love, (l) => l.createdAt),
    notesSent: cmpCount(notes, (n) => n.createdAt),
    repairsCompleted: cmpCount(repairs, (r) => r.closedAt ?? 0),
    tenderWeeksAnnounced: cmpCount(tender, (e) => e.createdAt),
    everyBoxWeeklyReviews: cmpCount(reviews, (r) => r.completedAt),
    keptWord: { now: kw(p), before: kw(before) },
    toolsThatHelped,
  };
}

/** Facts for one person's own report. */
export const mine = internalQuery({
  args: { profileId: v.id("profiles"), period },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError("No such person.");
    return await mineFor(ctx, profile, args.period);
  },
});

/** Facts for the shared report. Both people must have "ours" on. */
export const ours = internalQuery({
  args: { profileId: v.id("profiles"), period },
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.profileId);
    if (!a) throw new ConvexError("No such person.");
    const b = await partnerOf(ctx, a);
    if (!b) throw new ConvexError("Your partner hasn't joined yet.");
    if (!readSeasonsSettings(a.moduleSettings).ours || !readSeasonsSettings(b.moduleSettings).ours) {
      throw new ConvexError("Our season is written only when you both have it on in Seasons.");
    }
    return await oursFor(ctx, a, b, args.period);
  },
});

/** The signed-in person, for the public "write it now" actions. */
export const whoAmI = internalQuery({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return { profileId: me.profile._id, today: dayKey(Date.now(), me.profile.timeZone), partnerId: me.partner?._id ?? null };
  },
});

export interface DueItem {
  profileId: Id<"profiles">;
  kind: "mine" | "ours";
  period: Period;
}

/** What the daily tick should write today: every due report that doesn't exist yet. */
export const due = internalQuery({
  args: {},
  handler: async (ctx): Promise<DueItem[]> => {
    const profiles = await ctx.db.query("profiles").collect();
    const out: DueItem[] = [];
    const exists = async (kind: "mine" | "ours", p: Period, ownerId?: Id<"profiles">) => {
      const rows = await ctx.db.query("seasonReports").withIndex("by_kind_period", (q) => q.eq("kind", kind).eq("interval", p.interval).eq("periodStart", p.start)).collect();
      return rows.some((r) => kind === "ours" || r.ownerId === ownerId);
    };
    for (const profile of profiles) {
      const today = dayKey(Date.now(), profile.timeZone);
      const s = readSeasonsSettings(profile.moduleSettings);
      for (const interval of ["weekly", "biweekly", "monthly"] as const) {
        if (!s[interval]) continue;
        const p = duePeriod(interval, today);
        if (p && !(await exists("mine", p, profile._id))) out.push({ profileId: profile._id, kind: "mine", period: p });
      }
    }
    // Our season: monthly, once, when both have it on.
    if (profiles.length === 2 && profiles.every((p) => readSeasonsSettings(p.moduleSettings).ours)) {
      const today = dayKey(Date.now(), profiles[0].timeZone);
      const p = duePeriod("monthly", today);
      if (p && !(await exists("ours", p))) out.push({ profileId: profiles[0]._id, kind: "ours", period: p });
    }
    return out;
  },
});

export { nowPeriod };
