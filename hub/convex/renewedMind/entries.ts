import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { visibilityValidator } from "../privacy";
import { dayKey } from "../tend/patterns";
import { pickForToday } from "./pure";

/**
 * Renewed Mind: beliefs (an old line and a truer one), captures (a thought
 * taken captive in the moment), rehearsals (one line a day, with "felt true
 * today"), and evidence (lived moments that proved a new line). Every row is
 * the person's own and private; a belief can be shared on purpose.
 */

const feltTrue = v.union(v.literal("notYet"), v.literal("aLittle"), v.literal("mostly"));
const check = v.union(v.literal("yes"), v.literal("partly"), v.literal("no"));

// Beliefs

export const beliefs = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("rmBeliefs").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    return rows.sort((a, b) => Number(Boolean(a.retiredAt)) - Number(Boolean(b.retiredAt)) || b.createdAt - a.createdAt);
  },
});

export const addBelief = mutation({
  args: { oldLine: v.string(), origin: v.optional(v.string()), newLine: v.string(), verse: v.optional(v.string()), verseText: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("rmBeliefs", {
      ownerId: me.profile._id,
      visibility: "private",
      oldLine: cleanText(args.oldLine, 200, "The old line"),
      origin: optionalText(args.origin, 400, "Where it came from"),
      newLine: cleanText(args.newLine, 300, "The truer line"),
      verse: optionalText(args.verse, 80, "The reference"),
      verseText: optionalText(args.verseText, 600, "The verse"),
      createdAt: Date.now(),
    });
  },
});

export const updateBelief = mutation({
  args: { id: v.id("rmBeliefs"), oldLine: v.optional(v.string()), origin: v.optional(v.string()), newLine: v.optional(v.string()), verse: v.optional(v.string()), verseText: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rmBeliefs", args.id);
    await ctx.db.patch(row._id, {
      ...(args.oldLine !== undefined ? { oldLine: cleanText(args.oldLine, 200, "The old line") } : {}),
      ...(args.origin !== undefined ? { origin: optionalText(args.origin, 400, "Where it came from") } : {}),
      ...(args.newLine !== undefined ? { newLine: cleanText(args.newLine, 300, "The truer line") } : {}),
      ...(args.verse !== undefined ? { verse: optionalText(args.verse, 80, "The reference") } : {}),
      ...(args.verseText !== undefined ? { verseText: optionalText(args.verseText, 600, "The verse") } : {}),
    });
  },
});

/** Retiring keeps the record (and its evidence); it just stops coming back to rehearse. */
export const retireBelief = mutation({
  args: { id: v.id("rmBeliefs"), retired: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rmBeliefs", args.id);
    await ctx.db.patch(row._id, { retiredAt: args.retired ? Date.now() : undefined });
  },
});

export const setBeliefVisibility = mutation({
  args: { id: v.id("rmBeliefs"), visibility: visibilityValidator },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rmBeliefs", args.id);
    await ctx.db.patch(row._id, { visibility: args.visibility });
  },
});

export const removeBelief = mutation({
  args: { id: v.id("rmBeliefs") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rmBeliefs", args.id);
    for (const t of ["rmRehearsals", "rmEvidence"] as const) {
      const rows = await ctx.db.query(t).withIndex("by_belief", (q) => q.eq("beliefId", row._id)).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    await ctx.db.delete(row._id);
  },
});

/** The partner's shared lines, if they shared any. Only the truer line travels. */
export const partnersShared = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const rows = await ctx.db.query("rmBeliefs").withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id)).collect();
    return rows.filter((r) => r.visibility === "shared" && !r.retiredAt).map((r) => ({ _id: r._id, newLine: r.newLine, verse: r.verse }));
  },
});

// Today, and rehearsing

export const today = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const day = dayKey(Date.now(), me.profile.timeZone);
    const all = await ctx.db.query("rmBeliefs").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    const active = all.filter((b) => !b.retiredAt);
    const rehearsals = await ctx.db.query("rmRehearsals").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(400);
    const pick = pickForToday(active, rehearsals, day);
    const doneToday = rehearsals.find((r) => r.day === day) ?? null;
    const lastByBelief: Record<string, { feltTrue: "notYet" | "aLittle" | "mostly"; day: string }> = {};
    for (const r of rehearsals) if (!lastByBelief[r.beliefId]) lastByBelief[r.beliefId] = { feltTrue: r.feltTrue, day: r.day };
    const settings = (me.profile.moduleSettings?.["renewed-mind"] ?? {}) as { rehearseDaily?: unknown };
    return { day, pick, doneToday, active: active.length, lastByBelief, rehearseDaily: settings.rehearseDaily === true };
  },
});

export const rehearse = mutation({
  args: { beliefId: v.id("rmBeliefs"), feltTrue },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const belief = await requireOwned(ctx, me, "rmBeliefs", args.beliefId);
    const day = dayKey(Date.now(), me.profile.timeZone);
    const existing = (await ctx.db.query("rmRehearsals").withIndex("by_belief", (q) => q.eq("beliefId", belief._id)).collect()).find((r) => r.day === day);
    if (existing) {
      await ctx.db.patch(existing._id, { feltTrue: args.feltTrue });
      return existing._id;
    }
    return await ctx.db.insert("rmRehearsals", { ownerId: me.profile._id, visibility: "private", beliefId: belief._id, feltTrue: args.feltTrue, day, createdAt: Date.now() });
  },
});

export const rehearsalsFor = query({
  args: { beliefId: v.id("rmBeliefs") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "rmBeliefs", args.beliefId);
    return (await ctx.db.query("rmRehearsals").withIndex("by_belief", (q) => q.eq("beliefId", args.beliefId)).collect()).sort((a, b) => (a.day < b.day ? -1 : 1));
  },
});

// Take It Captive

export const captures = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("rmCaptures").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30);
  },
});

export const capture = mutation({
  args: { thought: v.string(), feeling: v.optional(v.string()), isTrue: check, isKind: check, isNecessary: check, friendSays: v.optional(v.string()), beliefId: v.optional(v.id("rmBeliefs")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (args.beliefId) await requireOwned(ctx, me, "rmBeliefs", args.beliefId);
    return await ctx.db.insert("rmCaptures", {
      ownerId: me.profile._id,
      visibility: "private",
      thought: cleanText(args.thought, 400, "The thought"),
      feeling: optionalText(args.feeling, 120, "The feeling"),
      isTrue: args.isTrue,
      isKind: args.isKind,
      isNecessary: args.isNecessary,
      friendSays: optionalText(args.friendSays, 400, "What a friend would say"),
      beliefId: args.beliefId,
      createdAt: Date.now(),
    });
  },
});

export const removeCapture = mutation({
  args: { id: v.id("rmCaptures") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rmCaptures", args.id);
    await ctx.db.delete(row._id);
  },
});

// Evidence for the new

export const evidence = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return (await ctx.db.query("rmEvidence").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect()).sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addEvidence = mutation({
  args: { beliefId: v.id("rmBeliefs"), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "rmBeliefs", args.beliefId);
    return await ctx.db.insert("rmEvidence", { ownerId: me.profile._id, visibility: "private", beliefId: args.beliefId, text: cleanText(args.text, 400, "The moment"), createdAt: Date.now() });
  },
});

export const removeEvidence = mutation({
  args: { id: v.id("rmEvidence") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rmEvidence", args.id);
    await ctx.db.delete(row._id);
  },
});

export const setSettings = mutation({
  args: { rehearseDaily: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const current = (me.profile.moduleSettings?.["renewed-mind"] as Record<string, unknown> | undefined) ?? {};
    await ctx.db.patch(me.profile._id, { moduleSettings: { ...me.profile.moduleSettings, "renewed-mind": { ...current, rehearseDaily: args.rehearseDaily } } });
  },
});
