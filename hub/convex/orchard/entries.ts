import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { access, cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { visibilityValidator } from "../privacy";
import { dayKey } from "../tend/patterns";
import { addDays, compass, daysBetween, haloRead, LAYERS, moveCheck, safeRead, type CompassAnswers, type SafeAnswer } from "./pure";

/**
 * The Orchard: people, what they've actually shown, the story I'm telling
 * myself, the three checks, and moves between layers with a reason. Each
 * person's rows are their own. A person can be shared with the partner,
 * which shows the name, layer and the notes marked shared, so the two of
 * them can compare what each has seen of a mutual friend.
 */

const noteKind = v.union(v.literal("fact"), v.literal("story"), v.literal("green"), v.literal("flag"), v.literal("gave"), v.literal("showedUp"), v.literal("conflict"));
const state = v.union(v.literal("growing"), v.literal("resting"), v.literal("released"));

function cleanDay(day: string | undefined, fallback: string): string {
  if (!day) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ConvexError("Dates look like 2026-09-22.");
  return day;
}

export const people = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const rows = await ctx.db.query("orPeople").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    return {
      today,
      people: rows
        .map((p) => ({ ...p, daysKnown: daysBetween(p.metDay, today), layerName: LAYERS[p.layer]?.name ?? "" }))
        .sort((a, b) => b.layer - a.layer || a.name.localeCompare(b.name)),
    };
  },
});

export const person = query({
  args: { id: v.id("orPeople") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await ctx.db.get(args.id);
    if (!p || access(me, p) === "none") throw new ConvexError("No one by that name here.");
    const mine = p.ownerId === me.profile._id;
    const today = dayKey(Date.now(), me.profile.timeZone);
    const notes = (await ctx.db.query("orNotes").withIndex("by_person", (q) => q.eq("personId", p._id)).collect()).filter((n) => mine || n.visibility === "shared").sort((a, b) => b.createdAt - a.createdAt);
    const checks = mine ? (await ctx.db.query("orChecks").withIndex("by_person", (q) => q.eq("personId", p._id)).collect()).sort((a, b) => b.createdAt - a.createdAt) : [];
    const moves = mine ? (await ctx.db.query("orMoves").withIndex("by_person", (q) => q.eq("personId", p._id)).collect()).sort((a, b) => b.createdAt - a.createdAt) : [];
    return { ...p, mine, today, daysKnown: daysBetween(p.metDay, today), notes, checks, moves, nextLayer: p.layer < 4 ? moveCheck(p.metDay, today, p.layer + 1) : null };
  },
});

export const addPerson = mutation({
  args: { name: v.string(), howMet: v.optional(v.string()), metDay: v.optional(v.string()), story: v.optional(v.string()), pearls: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const metDay = cleanDay(args.metDay, today);
    return await ctx.db.insert("orPeople", {
      ownerId: me.profile._id,
      visibility: "private",
      name: cleanText(args.name, 80, "Their name"),
      howMet: optionalText(args.howMet, 200, "How you met"),
      metDay,
      layer: 0,
      state: "growing",
      story: optionalText(args.story, 1500, "The story"),
      storyReadDay: args.story?.trim() ? addDays(today, 30) : undefined,
      pearls: (args.pearls ?? []).map((p) => cleanText(p, 80, "A pearl")).slice(0, 12),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePerson = mutation({
  args: { id: v.id("orPeople"), name: v.optional(v.string()), howMet: v.optional(v.string()), metDay: v.optional(v.string()), story: v.optional(v.string()), pearls: v.optional(v.array(v.string())), state: v.optional(state), visibility: v.optional(visibilityValidator) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.id);
    const patch: Partial<Doc<"orPeople">> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanText(args.name, 80, "Their name");
    if (args.howMet !== undefined) patch.howMet = optionalText(args.howMet, 200, "How you met");
    if (args.metDay !== undefined) patch.metDay = cleanDay(args.metDay, p.metDay);
    if (args.story !== undefined) {
      patch.story = optionalText(args.story, 1500, "The story");
      if (patch.story) patch.storyReadDay = addDays(dayKey(Date.now(), me.profile.timeZone), 30);
    }
    if (args.pearls !== undefined) patch.pearls = args.pearls.map((x) => cleanText(x, 80, "A pearl")).slice(0, 12);
    if (args.state !== undefined) patch.state = args.state;
    if (args.visibility !== undefined) patch.visibility = args.visibility === "sharedSummary" ? "shared" : args.visibility;
    await ctx.db.patch(p._id, patch);
  },
});

export const removePerson = mutation({
  args: { id: v.id("orPeople") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.id);
    for (const t of ["orNotes", "orChecks", "orMoves"] as const) {
      const rows = await ctx.db.query(t).withIndex("by_person", (q) => q.eq("personId", p._id)).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    await ctx.db.delete(p._id);
  },
});

/** A move between layers, with the slow-trust rule said out loud but never enforced. */
export const move = mutation({
  args: { id: v.id("orPeople"), to: v.number(), reason: v.string(), anyway: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.id);
    const to = Math.round(args.to);
    if (to < 0 || to > 4) throw new ConvexError("There are five layers.");
    if (to === p.layer) throw new ConvexError("They're already there.");
    const today = dayKey(Date.now(), me.profile.timeZone);
    if (to > p.layer) {
      const check = moveCheck(p.metDay, today, to);
      if (!check.ok && !args.anyway) throw new ConvexError(`Slow trust: ${LAYERS[to].name} usually waits until ${check.needed} days known; you're at ${check.daysKnown}. Ready on ${check.readyOn}. You can move them anyway, with a reason.`);
    }
    await ctx.db.insert("orMoves", { ownerId: me.profile._id, visibility: "private", personId: p._id, from: p.layer, to, reason: cleanText(args.reason, 300, "The reason"), createdAt: Date.now() });
    await ctx.db.patch(p._id, { layer: to, updatedAt: Date.now() });
  },
});

// Notes: facts, stories, green, flags, gave, showed up, conflict

export const addNote = mutation({
  args: { personId: v.id("orPeople"), kind: noteKind, text: v.string(), shared: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.personId);
    return await ctx.db.insert("orNotes", {
      ownerId: me.profile._id,
      visibility: args.shared && p.visibility === "shared" ? "shared" : "private",
      personId: p._id,
      kind: args.kind,
      text: cleanText(args.text, 500, "The note"),
      day: dayKey(Date.now(), me.profile.timeZone),
      createdAt: Date.now(),
    });
  },
});

export const removeNote = mutation({
  args: { id: v.id("orNotes") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const n = await requireOwned(ctx, me, "orNotes", args.id);
    await ctx.db.delete(n._id);
  },
});

// Checks

export const halo = mutation({
  args: { personId: v.id("orPeople"), excitement: v.number(), answers: v.record(v.string(), v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.personId);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const excitement = Math.min(5, Math.max(1, Math.round(args.excitement)));
    const read = haloRead(excitement, daysBetween(p.metDay, today));
    const answers: Record<string, string> = {};
    for (const [k, val] of Object.entries(args.answers)) answers[k.slice(0, 20)] = String(val).slice(0, 600);
    await ctx.db.insert("orChecks", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "halo", answers: { excitement, ...answers }, read, createdAt: Date.now() });
    if (!p.storyReadDay) await ctx.db.patch(p._id, { storyReadDay: addDays(today, 30) });
    return { read, readOn: addDays(today, 30) };
  },
});

export const safe = mutation({
  args: { personId: v.id("orPeople"), answers: v.record(v.string(), v.union(v.literal("yes"), v.literal("no"), v.literal("unsure"))) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.personId);
    const result = safeRead(args.answers as Record<string, SafeAnswer>);
    await ctx.db.insert("orChecks", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "safe", answers: args.answers, read: `${result.level}: ${result.text}`, createdAt: Date.now() });
    return result;
  },
});

export const compassCheck = mutation({
  args: {
    personId: v.id("orPeople"),
    what: v.string(),
    times: v.union(v.literal("first"), v.literal("second"), v.literal("pattern")),
    said: v.union(v.literal("yes"), v.literal("no")),
    safety: v.boolean(),
    expect: v.union(v.literal("repair"), v.literal("defensive"), v.literal("punish"), v.literal("unknown")),
    repaired: v.union(v.literal("yes"), v.literal("no"), v.literal("untested")),
    feel: v.union(v.literal("filled"), v.literal("drained"), v.literal("mixed")),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.personId);
    const { personId: _p, what, ...rest } = args;
    void _p;
    const a: CompassAnswers = rest;
    const result = compass(a);
    const suggestedLayer = Math.max(0, p.layer - result.moveOut);
    const cleaned = cleanText(what, 600, "What happened");
    await ctx.db.insert("orChecks", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "compass", answers: { what: cleaned, ...a }, read: result.call, createdAt: Date.now() });
    await ctx.db.insert("orNotes", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "conflict", text: cleaned, day: dayKey(Date.now(), me.profile.timeZone), createdAt: Date.now() });
    return { ...result, suggestedLayer, currentLayer: p.layer };
  },
});

// Together: the partner's shared people

export const partnersShared = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const rows = await ctx.db.query("orPeople").withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id)).collect();
    return rows.filter((p) => p.visibility === "shared").map((p) => ({ _id: p._id, name: p.name, layer: p.layer, layerName: LAYERS[p.layer]?.name ?? "", state: p.state }));
  },
});
