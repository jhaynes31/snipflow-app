import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { cleanText, optionalText, partnerOf, requireMe, requireOwned, type Me } from "../lib";
import { notify, notifyPartner } from "../push/notify";
import { hourIn } from "../push/pure";
import { EXIT_LIBRARY, TEMPLATES } from "../../core/loops/content";
import { growthLine, levelFor, newStageId, patterns, SIGNAL_REPLIES, tripwireDue, visibilityFor, type SharingLevel } from "./pure";

/**
 * The Loop Map / The Chrysalis Loop (2026-11-13). Every row belongs to one
 * person. The spouse sees a loop's name only when it is shared, and a
 * signal only when it is shared "with signal". Nothing else ever crosses,
 * and the spouse can never edit.
 */
type Ctx = QueryCtx | MutationCtx;

async function myLoop(ctx: Ctx, me: Me, id: Id<"lpLoops">): Promise<Doc<"lpLoops">> {
  return await requireOwned(ctx, me, "lpLoops", id);
}

const stageValidator = v.object({ id: v.string(), key: v.string(), name: v.string(), prompt: v.string(), description: v.string(), needs: v.array(v.string()), healthierWay: v.string() });
const sharing = v.union(v.literal("private"), v.literal("nameOnly"), v.literal("signal"));

// ---------- Loops ----------

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const loops = await ctx.db.query("lpLoops").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect();
    const out = [];
    for (const l of loops) {
      const last = await ctx.db.query("lpCheckIns").withIndex("by_loop_time", (q) => q.eq("loopId", l._id)).order("desc").first();
      out.push({ ...l, level: levelFor(l.visibility), lastCheck: last ? { at: last.at, stageId: last.stageId, outcome: last.outcome ?? null } : null });
    }
    return out;
  },
});

/** What the spouse sees: names of loops shared with them, and whether each is "in it" right now. */
export const partners = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const loops = (await ctx.db.query("lpLoops").withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id)).collect()).filter((l) => l.visibility !== "private");
    const out = [];
    for (const l of loops) {
      let inIt: number | null = null;
      if (l.visibility === "shared") {
        const last = await ctx.db.query("lpCheckIns").withIndex("by_loop_time", (q) => q.eq("loopId", l._id)).order("desc").first();
        if (last && last.kind === "live" && !last.outcome && Date.now() - last.at < 6 * 60 * 60 * 1000) inIt = last.at;
      }
      out.push({ _id: l._id, name: l.name, level: levelFor(l.visibility), inIt, partnerName: me.partner.displayName });
    }
    return out;
  },
});

export const get = query({
  args: { id: v.id("lpLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.id);
    const exits = await ctx.db.query("lpExits").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).collect();
    const checks = await ctx.db.query("lpCheckIns").withIndex("by_loop_time", (q) => q.eq("loopId", loop._id)).order("desc").take(300);
    const beliefs = await ctx.db.query("lpBeliefs").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).order("desc").collect();
    const kids = await ctx.db.query("lpInnerKids").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).collect();
    const guardrails = await ctx.db.query("lpGuardrails").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).collect();
    const habits = await ctx.db.query("lpHabits").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).collect();
    const prayers = await ctx.db.query("lpPrayers").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).order("desc").collect();
    const open = checks.find((c) => c.kind === "live" && !c.outcome && Date.now() - c.at < 24 * 60 * 60 * 1000) ?? null;
    const p = patterns(loop.stages, checks, Date.now());
    return { loop, level: levelFor(loop.visibility), exits, checks, open, beliefs, kids, guardrails, habits, prayers, patterns: p, growth: growthLine(p, loop.stages), partnerName: me.partner?.displayName ?? null };
  },
});

export const create = mutation({
  args: { name: v.string(), templateType: v.string(), stages: v.optional(v.array(v.object({ name: v.string(), key: v.string(), prompt: v.string(), description: v.string() }))) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const template = TEMPLATES.find((t) => t.key === args.templateType) ?? TEMPLATES[0];
    const base = args.stages?.length ? args.stages : template.stages.map((s) => ({ ...s, description: "" }));
    if (base.length < 3 || base.length > 10) throw new ConvexError("A loop needs three to ten stages.");
    const stages = base.map((s) => ({ id: newStageId(), key: s.key, name: cleanText(s.name, 40, "Stage name"), prompt: s.prompt.slice(0, 200), description: s.description.trim().slice(0, 600), needs: [], healthierWay: "" }));
    const now = Date.now();
    const id = await ctx.db.insert("lpLoops", { ownerId: me.profile._id, visibility: "private", name: cleanText(args.name, 80, "The loop's name"), templateType: template.key, stages, createdAt: now, updatedAt: now });
    // Starter exits for every stage, by its kind.
    for (const s of stages) {
      for (const text of EXIT_LIBRARY[s.key] ?? EXIT_LIBRARY.trigger) {
        await ctx.db.insert("lpExits", { ownerId: me.profile._id, visibility: "private", loopId: id, stageId: s.id, text, isCustom: false, isPinned: false, isHidden: false, used: 0, helpful: 0 });
      }
    }
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("lpLoops"), name: v.optional(v.string()), stages: v.optional(v.array(stageValidator)), truthVerse: v.optional(v.union(v.string(), v.null())), stageOfChange: v.optional(v.union(v.string(), v.null())), howOld: v.optional(v.union(v.string(), v.null())), familyOrigin: v.optional(v.string()), passDown: v.optional(v.string()), kidPlacement: v.optional(v.object({ child: v.optional(v.string()), teen: v.optional(v.string()) })), spiral: v.optional(v.boolean()), pinnedBeliefId: v.optional(v.union(v.id("lpBeliefs"), v.null())), signalToken: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.id);
    const patch: Partial<Doc<"lpLoops">> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanText(args.name, 80, "The loop's name");
    if (args.stages) {
      if (args.stages.length < 3 || args.stages.length > 10) throw new ConvexError("A loop needs three to ten stages.");
      patch.stages = args.stages.map((s) => ({ ...s, id: s.id || newStageId(), name: cleanText(s.name, 40, "Stage name"), prompt: s.prompt.slice(0, 200), description: s.description.trim().slice(0, 600), needs: s.needs.slice(0, 12), healthierWay: s.healthierWay.trim().slice(0, 600) }));
      // A brand-new stage gets starter exits.
      const had = new Set(loop.stages.map((s) => s.id));
      for (const s of patch.stages) if (!had.has(s.id)) for (const text of EXIT_LIBRARY[s.key] ?? EXIT_LIBRARY.trigger) await ctx.db.insert("lpExits", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, stageId: s.id, text, isCustom: false, isPinned: false, isHidden: false, used: 0, helpful: 0 });
    }
    for (const k of ["truthVerse", "stageOfChange", "howOld", "signalToken"] as const) {
      const val = args[k];
      if (val === undefined) continue;
      patch[k] = val === null || !val.trim() ? undefined : val.trim().slice(0, 200);
    }
    if (args.familyOrigin !== undefined) patch.familyOrigin = args.familyOrigin.trim().slice(0, 2000) || undefined;
    if (args.passDown !== undefined) patch.passDown = args.passDown.trim().slice(0, 2000) || undefined;
    if (args.kidPlacement !== undefined) patch.kidPlacement = args.kidPlacement;
    if (args.spiral !== undefined) patch.spiral = args.spiral;
    if (args.pinnedBeliefId !== undefined) patch.pinnedBeliefId = args.pinnedBeliefId ?? undefined;
    await ctx.db.patch(loop._id, patch);
  },
});

export const setSharing = mutation({
  args: { id: v.id("lpLoops"), level: sharing },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.id);
    await ctx.db.patch(loop._id, { visibility: visibilityFor(args.level as SharingLevel), updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("lpLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.id);
    for (const table of ["lpExits", "lpBeliefs", "lpInnerKids", "lpGuardrails", "lpHabits", "lpPrayers"] as const) {
      const rows = await ctx.db.query(table).withIndex("by_loop", (q) => q.eq("loopId", loop._id)).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    for (const r of await ctx.db.query("lpCheckIns").withIndex("by_loop_time", (q) => q.eq("loopId", loop._id)).collect()) await ctx.db.delete(r._id);
    await ctx.db.delete(loop._id);
  },
});

// ---------- Exits ----------

export const addExit = mutation({
  args: { loopId: v.id("lpLoops"), stageId: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    if (!loop.stages.some((s) => s.id === args.stageId)) throw new ConvexError("That stage isn't on this loop.");
    return await ctx.db.insert("lpExits", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, stageId: args.stageId, text: cleanText(args.text, 300, "The exit"), isCustom: true, isPinned: false, isHidden: false, used: 0, helpful: 0 });
  },
});

export const editExit = mutation({
  args: { id: v.id("lpExits"), isPinned: v.optional(v.boolean()), isHidden: v.optional(v.boolean()), text: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpExits", args.id);
    const patch: Partial<Doc<"lpExits">> = {};
    if (args.isPinned !== undefined) patch.isPinned = args.isPinned;
    if (args.isHidden !== undefined) patch.isHidden = args.isHidden;
    if (args.text !== undefined) patch.text = cleanText(args.text, 300, "The exit");
    await ctx.db.patch(row._id, patch);
  },
});

/** "Try one now": counts a use, ties it to the open check-in if there is one. */
export const useExit = mutation({
  args: { id: v.id("lpExits"), checkInId: v.optional(v.id("lpCheckIns")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpExits", args.id);
    await ctx.db.patch(row._id, { used: row.used + 1 });
    if (args.checkInId) {
      const c = await requireOwned(ctx, me, "lpCheckIns", args.checkInId);
      await ctx.db.patch(c._id, { exitUsedId: row._id });
    }
  },
});

export const rateExit = mutation({
  args: { id: v.id("lpExits"), rating: v.union(v.literal(1), v.literal(0), v.literal(-1)) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpExits", args.id);
    await ctx.db.patch(row._id, { helpful: row.helpful + args.rating });
  },
});

// ---------- Check-ins ----------

export const checkIn = mutation({
  args: { loopId: v.id("lpLoops"), stageId: v.string(), intensity: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    if (!loop.stages.some((s) => s.id === args.stageId)) throw new ConvexError("That stage isn't on this loop.");
    const intensity = Math.max(1, Math.min(5, Math.round(args.intensity)));
    const id = await ctx.db.insert("lpCheckIns", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, stageId: args.stageId, intensity, note: optionalText(args.note, 1000, "Note"), firstNoticedStageId: args.stageId, kind: "live", at: Date.now() });
    // "How did it go?" an hour later, by the ways they chose for Re-Centered / Metamorphosis.
    await ctx.scheduler.runAfter(60 * 60 * 1000, internal.loops.entries.followUp, { checkInId: id });
    return id;
  },
});

export const resolve = mutation({
  args: { id: v.id("lpCheckIns"), outcome: v.union(v.literal("out"), v.literal("around"), v.literal("still")), exitedStageId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpCheckIns", args.id);
    await ctx.db.patch(row._id, { outcome: args.outcome, exitedStageId: args.outcome === "out" ? args.exitedStageId ?? row.stageId : undefined, resolvedAt: args.outcome === "still" ? undefined : Date.now() });
  },
});

/** "I noticed afterward": a whole pass, logged after the fact. */
export const retro = mutation({
  args: { loopId: v.id("lpLoops"), firstNoticedStageId: v.string(), exitedStageId: v.optional(v.string()), note: v.optional(v.string()), at: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    if (!loop.stages.some((s) => s.id === args.firstNoticedStageId)) throw new ConvexError("That stage isn't on this loop.");
    const at = Math.min(args.at ?? Date.now(), Date.now());
    return await ctx.db.insert("lpCheckIns", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, stageId: args.firstNoticedStageId, intensity: 3, note: optionalText(args.note, 1000, "Note"), firstNoticedStageId: args.firstNoticedStageId, exitedStageId: args.exitedStageId, outcome: args.exitedStageId ? "out" : "around", kind: "retro", at, resolvedAt: at });
  },
});

export const removeCheckIn = mutation({
  args: { id: v.id("lpCheckIns") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpCheckIns", args.id);
    await ctx.db.delete(row._id);
  },
});

export const followUp = internalMutation({
  args: { checkInId: v.id("lpCheckIns") },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.checkInId);
    if (!c || c.outcome) return;
    const loop = await ctx.db.get(c.loopId);
    if (!loop) return;
    await notify(ctx, c.ownerId, { title: `How did it go?`, body: `An hour ago you marked "${loop.name}". Out, around, or still in it? No wrong answer.`, url: `${await mountFor(ctx, c.ownerId)}/${loop._id}?check=${c._id}`, tag: `loop-follow-${c._id}` });
  },
});

/** Where the tool lives for this person: Re-Centered for one, Metamorphosis for the other. */
async function mountFor(ctx: Ctx, ownerId: Id<"profiles">): Promise<string> {
  const mm = await ctx.db.query("moduleOwners").withIndex("by_module", (q) => q.eq("moduleId", "metamorphosis")).first();
  return mm?.ownerId === ownerId ? "/metamorphosis/loops" : "/love-and-release/loops";
}

// ---------- Beliefs ----------

const beliefArgs = { text: v.string(), initialRating: v.number(), origin: v.string(), evidenceFor: v.string(), evidenceAgainst: v.string(), friendResponse: v.string(), protectsFrom: v.string(), truerBelief: v.string(), scripture: v.optional(v.string()), finalRating: v.optional(v.number()) };
function cleanBelief(a: { text: string; initialRating: number; origin: string; evidenceFor: string; evidenceAgainst: string; friendResponse: string; protectsFrom: string; truerBelief: string; scripture?: string; finalRating?: number }) {
  const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const t = (s: string) => s.trim().slice(0, 2000);
  return { text: cleanText(a.text, 400, "The belief"), initialRating: pct(a.initialRating), origin: t(a.origin), evidenceFor: t(a.evidenceFor), evidenceAgainst: t(a.evidenceAgainst), friendResponse: t(a.friendResponse), protectsFrom: t(a.protectsFrom), truerBelief: t(a.truerBelief), scripture: a.scripture?.trim() ? a.scripture.trim().slice(0, 600) : undefined, finalRating: a.finalRating === undefined ? undefined : pct(a.finalRating) };
}

export const addBelief = mutation({
  args: { loopId: v.id("lpLoops"), ...beliefArgs },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    const { loopId: _l, ...rest } = args;
    void _l;
    return await ctx.db.insert("lpBeliefs", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, ...cleanBelief(rest), createdAt: Date.now() });
  },
});

export const editBelief = mutation({
  args: { id: v.id("lpBeliefs"), ...beliefArgs },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpBeliefs", args.id);
    const { id: _i, ...rest } = args;
    void _i;
    await ctx.db.patch(row._id, cleanBelief(rest));
  },
});

export const removeBelief = mutation({
  args: { id: v.id("lpBeliefs") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpBeliefs", args.id);
    const loop = await ctx.db.get(row.loopId);
    if (loop?.pinnedBeliefId === row._id) await ctx.db.patch(loop._id, { pinnedBeliefId: undefined });
    await ctx.db.delete(row._id);
  },
});

// ---------- Inner kids ----------

export const saveKid = mutation({
  args: { loopId: v.id("lpLoops"), age: v.union(v.literal("child"), v.literal("teen")), need: v.string(), learned: v.string(), rule: v.string(), message: v.string(), newAgreement: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    const t = (s: string) => s.trim().slice(0, 4000);
    const existing = await ctx.db.query("lpInnerKids").withIndex("by_loop", (q) => q.eq("loopId", loop._id).eq("age", args.age)).first();
    const row = { need: t(args.need), learned: t(args.learned), rule: t(args.rule), message: t(args.message), newAgreement: t(args.newAgreement), updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("lpInnerKids", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, age: args.age, ...row });
  },
});

// ---------- Guardrails ----------

export const addGuardrail = mutation({
  args: { loopId: v.id("lpLoops"), type: v.union(v.literal("body"), v.literal("thought"), v.literal("behavior"), v.literal("situation"), v.literal("ifThen"), v.literal("tripwire")), text: v.string(), schedule: v.optional(v.object({ days: v.array(v.number()), hour: v.number() })) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    if (args.type === "tripwire" && (!args.schedule || !args.schedule.days.length)) throw new ConvexError("Pick at least one day and an hour.");
    return await ctx.db.insert("lpGuardrails", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, type: args.type, text: cleanText(args.text, 400, "The guardrail"), schedule: args.type === "tripwire" ? { days: args.schedule!.days.filter((d) => d >= 0 && d <= 6), hour: Math.max(0, Math.min(23, args.schedule!.hour)) } : undefined, createdAt: Date.now() });
  },
});

export const editGuardrail = mutation({
  args: { id: v.id("lpGuardrails"), text: v.optional(v.string()), snoozeDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpGuardrails", args.id);
    const patch: Partial<Doc<"lpGuardrails">> = {};
    if (args.text !== undefined) patch.text = cleanText(args.text, 400, "The guardrail");
    if (args.snoozeDays !== undefined) patch.snoozedUntil = args.snoozeDays > 0 ? Date.now() + args.snoozeDays * 86_400_000 : undefined;
    await ctx.db.patch(row._id, patch);
  },
});

export const removeGuardrail = mutation({
  args: { id: v.id("lpGuardrails") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpGuardrails", args.id);
    await ctx.db.delete(row._id);
  },
});

/** Hourly (crons.ts): the lantern check at each person's own risky times. */
export const tripwireTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("lpGuardrails").withIndex("by_type", (q) => q.eq("type", "tripwire")).collect();
    for (const g of rows) {
      const profile = await ctx.db.get(g.ownerId);
      if (!profile) continue;
      const local = new Date(now + 0);
      const hour = hourIn(profile.timeZone, now);
      let day = local.getUTCDay();
      try {
        const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: profile.timeZone }).format(local);
        day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
        if (day < 0) day = local.getUTCDay();
      } catch { /* keep UTC day */ }
      if (!tripwireDue(g, hour, day, now)) continue;
      const loop = await ctx.db.get(g.loopId);
      if (!loop) continue;
      const mount = await mountFor(ctx, g.ownerId);
      const lantern = mount.startsWith("/metamorphosis") ? "Butterfly check" : "Lantern check";
      const sent = await notify(ctx, g.ownerId, { title: lantern, body: `Anywhere near the ${loop.name} loop right now? ${g.text}`, url: `${mount}/${loop._id}?tripwire=1`, tag: `loop-trip-${g._id}` });
      if (sent) await ctx.db.patch(g._id, { lastFiredAt: now });
    }
  },
});

// ---------- Habits ----------

export const addHabit = mutation({
  args: { loopId: v.id("lpLoops"), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    const count = (await ctx.db.query("lpHabits").withIndex("by_loop", (q) => q.eq("loopId", loop._id)).collect()).length;
    if (count >= 3) throw new ConvexError("Three new paths is plenty for one loop. Retire one first.");
    return await ctx.db.insert("lpHabits", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, text: cleanText(args.text, 300, "The new path"), practiced: [], createdAt: Date.now() });
  },
});

export const practice = mutation({
  args: { id: v.id("lpHabits") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpHabits", args.id);
    await ctx.db.patch(row._id, { practiced: [...row.practiced, Date.now()].slice(-400) });
  },
});

export const removeHabit = mutation({
  args: { id: v.id("lpHabits") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpHabits", args.id);
    await ctx.db.delete(row._id);
  },
});

// ---------- Prayers, reviews, cards ----------

export const addPrayer = mutation({
  args: { loopId: v.id("lpLoops"), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    return await ctx.db.insert("lpPrayers", { ownerId: me.profile._id, visibility: "private", loopId: loop._id, text: cleanText(args.text, 4000, "The prayer"), createdAt: Date.now() });
  },
});

export const markPrayer = mutation({
  args: { id: v.id("lpPrayers"), answered: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpPrayers", args.id);
    await ctx.db.patch(row._id, { answeredAt: args.answered ? Date.now() : undefined });
  },
});

export const removePrayer = mutation({
  args: { id: v.id("lpPrayers") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpPrayers", args.id);
    await ctx.db.delete(row._id);
  },
});

export const reviews = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("lpReviews").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30);
  },
});

export const addReview = mutation({
  args: { showed: v.string(), caught: v.string(), exit: v.string(), guardrail: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const t = (s: string) => s.trim().slice(0, 2000);
    return await ctx.db.insert("lpReviews", { ownerId: me.profile._id, visibility: "private", showed: t(args.showed), caught: t(args.caught), exit: t(args.exit), guardrail: t(args.guardrail), createdAt: Date.now() });
  },
});

export const cards = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("lpCards").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
  },
});

export const addCard = mutation({
  args: { kind: v.union(v.literal("encouragement"), v.literal("saved")), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const text = cleanText(args.text, 400, "The card");
    const dup = (await ctx.db.query("lpCards").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id).eq("kind", args.kind)).collect()).find((c) => c.text === text);
    if (dup) { if (args.kind === "saved") await ctx.db.delete(dup._id); return; }
    await ctx.db.insert("lpCards", { ownerId: me.profile._id, visibility: "private", kind: args.kind, text, createdAt: Date.now() });
  },
});

export const removeCard = mutation({
  args: { id: v.id("lpCards") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "lpCards", args.id);
    await ctx.db.delete(row._id);
  },
});

// ---------- Signals ----------

/** "I'm in it": for a loop shared with signal, the spouse gets the signal word and three kind replies. Never the stage, never the note. */
export const sendSignal = mutation({
  args: { loopId: v.id("lpLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    if (loop.visibility !== "shared") throw new ConvexError("This loop isn't shared with signal.");
    if (!me.partner) throw new ConvexError("Your partner hasn't joined yet.");
    const id = await ctx.db.insert("lpSignals", { ownerId: me.profile._id, visibility: "shared", loopId: loop._id, at: Date.now() });
    await notifyPartner(ctx, me, { title: `${loop.signalToken ?? "🍂"} from ${me.profile.displayName.split(" ")[0]}`, body: "I'm in it. I don't want to explain. Please just be kind.", url: `/loops/signal/${id}`, tag: `loop-signal-${id}`, urgent: true });
    return id;
  },
});

export const signal = query({
  args: { id: v.id("lpSignals") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    const isPartner = me.partner?._id === row.ownerId;
    const isMine = row.ownerId === me.profile._id;
    if (!isPartner && !isMine) return null;
    const loop = await ctx.db.get(row.loopId);
    const owner = await ctx.db.get(row.ownerId);
    return { _id: row._id, at: row.at, response: row.response ?? null, respondedAt: row.respondedAt ?? null, from: owner?.displayName ?? "your partner", token: loop?.signalToken ?? "🍂", loopName: loop?.visibility === "private" ? null : loop?.name ?? null, isPartner, replies: [...SIGNAL_REPLIES] };
  },
});

export const respondSignal = mutation({
  args: { id: v.id("lpSignals"), response: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || me.partner?._id !== row.ownerId) throw new ConvexError("That signal isn't for you.");
    const response = (SIGNAL_REPLIES as readonly string[]).includes(args.response) ? args.response : cleanText(args.response, 200, "Your reply");
    await ctx.db.patch(row._id, { response, respondedAt: Date.now() });
    const partner = await partnerOf(ctx, me.profile);
    if (partner) await notify(ctx, partner._id, { title: me.profile.displayName.split(" ")[0], body: response, url: await mountFor(ctx, partner._id), tag: `loop-signal-${row._id}` });
  },
});

export const mySignals = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("lpSignals").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(10);
  },
});

// ---------- For the encouragement voice ----------

export const forEncouragement = internalQuery({
  args: { loopId: v.id("lpLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await myLoop(ctx, me, args.loopId);
    return { name: loop.name, displayName: me.profile.displayName };
  },
});
