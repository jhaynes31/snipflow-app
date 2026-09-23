import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { access, cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { visibilityValidator } from "../privacy";
import { dayKey } from "../tend/patterns";
import { addDays, compass, daysBetween, haloRead, LAYERS, moveCheck, safeRead, stayCheckDue, stayRead, type CompassAnswers, type SafeAnswer } from "./pure";
import { initiationRead, signalByKey, signalsFor, tally, type Signal } from "./signals";

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
    return {
      ...p,
      mine,
      today,
      daysKnown: daysBetween(p.metDay, today),
      notes,
      checks,
      moves,
      nextLayer: p.layer < 4 ? moveCheck(p.metDay, today, p.layer + 1) : null,
      signalsSeen: mine ? tally(notes) : [],
      initiation: mine ? initiationRead(p.contacts ?? []) : null,
    };
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
  args: { personId: v.id("orPeople"), kind: noteKind, text: v.string(), shared: v.optional(v.boolean()), signal: v.optional(v.string()), signals: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.personId);
    const taggable = args.kind === "flag" || args.kind === "conflict";
    const wanted = [...(args.signal ? [args.signal] : []), ...(args.signals ?? [])];
    const signals = taggable ? [...new Set(wanted.filter((k) => signalByKey(k, mySignals(me.profile.moduleSettings))))] : [];
    const signal = signals[0];
    return await ctx.db.insert("orNotes", {
      ownerId: me.profile._id,
      visibility: args.shared && p.visibility === "shared" ? "shared" : "private",
      personId: p._id,
      kind: args.kind,
      text: cleanText(args.text, 500, "The note"),
      signal,
      signals: signals.length ? signals : undefined,
      day: dayKey(Date.now(), me.profile.timeZone),
      createdAt: Date.now(),
    });
  },
});

// My signals: the built-in list, minus what I switched off, plus my own

function orchardSettings(moduleSettings: Record<string, unknown> | undefined): { off?: unknown; custom?: unknown } {
  return (moduleSettings?.orchard ?? {}) as { off?: unknown; custom?: unknown };
}

function mySignals(moduleSettings: Record<string, unknown> | undefined): Signal[] {
  const s = orchardSettings(moduleSettings);
  return Array.isArray(s.custom) ? (s.custom as Signal[]) : [];
}

export const signals = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const s = orchardSettings(me.profile.moduleSettings);
    return { list: signalsFor(s), off: Array.isArray(s.off) ? (s.off as string[]) : [] };
  },
});

export const toggleSignal = mutation({
  args: { key: v.string(), on: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = orchardSettings(me.profile.moduleSettings);
    const off = new Set(Array.isArray(s.off) ? (s.off as string[]) : []);
    if (args.on) off.delete(args.key);
    else off.add(args.key);
    await ctx.db.patch(me.profile._id, { moduleSettings: { ...me.profile.moduleSettings, orchard: { ...s, off: [...off] } } });
  },
});

export const addSignal = mutation({
  args: { name: v.string(), tell: v.string(), test: v.string(), response: v.string(), twin: v.string(), hardLine: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = orchardSettings(me.profile.moduleSettings);
    const custom = mySignals(me.profile.moduleSettings);
    if (custom.length >= 20) throw new ConvexError("Twenty of your own is plenty. Switch one off first.");
    const key = `own-${Date.now().toString(36)}`;
    const next: Signal = {
      key,
      name: cleanText(args.name, 80, "The name"),
      tell: cleanText(args.tell, 300, "The tell"),
      test: cleanText(args.test, 300, "The test"),
      response: cleanText(args.response, 300, "The response"),
      twin: cleanText(args.twin, 120, "The twin"),
      hardLine: args.hardLine ?? false,
    };
    await ctx.db.patch(me.profile._id, { moduleSettings: { ...me.profile.moduleSettings, orchard: { ...s, custom: [...custom, next] } } });
    return key;
  },
});

export const removeSignal = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = orchardSettings(me.profile.moduleSettings);
    const custom = mySignals(me.profile.moduleSettings).filter((c) => c.key !== args.key);
    await ctx.db.patch(me.profile._id, { moduleSettings: { ...me.profile.moduleSettings, orchard: { ...s, custom } } });
  },
});

// The initiation ledger, and the quiet test

export const contact = mutation({
  args: { id: v.id("orPeople"), by: v.union(v.literal("me"), v.literal("them")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.id);
    const day = dayKey(Date.now(), me.profile.timeZone);
    const contacts = [...(p.contacts ?? []), { by: args.by, day }].slice(-30);
    // Them reaching out ends a quiet window with the answer you were waiting for.
    const patch: { contacts: typeof contacts; updatedAt: number; quietUntil?: undefined } = { contacts, updatedAt: Date.now() };
    if (args.by === "them" && p.quietUntil) {
      patch.quietUntil = undefined;
      await ctx.db.insert("orNotes", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "fact", text: "Reached out during a quiet window. Initiated.", day, createdAt: Date.now() });
    }
    await ctx.db.patch(p._id, patch);
  },
});

export const quiet = mutation({
  args: { id: v.id("orPeople"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.id);
    const today = dayKey(Date.now(), me.profile.timeZone);
    await ctx.db.patch(p._id, { quietUntil: addDays(today, Math.min(60, Math.max(7, Math.round(args.days ?? 14)))), updatedAt: Date.now() });
  },
});

/** The quiet window ended with nothing: that is a sighting of "never initiates". */
export const quietEnded = mutation({
  args: { id: v.id("orPeople"), nothing: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.id);
    const day = dayKey(Date.now(), me.profile.timeZone);
    if (args.nothing) {
      await ctx.db.insert("orNotes", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "flag", text: "A quiet window passed with nothing from them.", signal: "neverInitiates", day, createdAt: Date.now() });
    }
    await ctx.db.patch(p._id, { quietUntil: undefined, updatedAt: Date.now() });
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
    signal: v.optional(v.string()),
    signals: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "orPeople", args.personId);
    const { personId: _p, what, signal: signalKey, signals: signalKeys, ...rest } = args;
    void _p;
    const custom = mySignals(me.profile.moduleSettings);
    const sigs = [...new Set([...(signalKey ? [signalKey] : []), ...(signalKeys ?? [])])].map((k) => signalByKey(k, custom)).filter((x): x is NonNullable<typeof x> => Boolean(x));
    const sig = sigs[0];
    const notes = sigs.length ? await ctx.db.query("orNotes").withIndex("by_person", (q) => q.eq("personId", p._id)).collect() : [];
    // The most-seen of the signals named sets the count; any hard line among them is a hard line.
    const prior = sigs.length ? Math.max(...sigs.map((s) => notes.filter((n) => n.signal === s.key || n.signals?.includes(s.key)).length)) : 0;
    const a: CompassAnswers = { ...rest, signal: sig?.key, priorSightings: prior, hardLine: sigs.some((s) => s.hardLine) };
    const result = compass(a);
    const suggestedLayer = Math.max(0, p.layer - result.moveOut);
    const cleaned = cleanText(what, 600, "What happened");
    await ctx.db.insert("orChecks", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "compass", answers: { what: cleaned, ...a }, read: result.call, createdAt: Date.now() });
    await ctx.db.insert("orNotes", { ownerId: me.profile._id, visibility: "private", personId: p._id, kind: "conflict", text: cleaned, signal: sig?.key, signals: sigs.length ? sigs.map((s) => s.key) : undefined, day: dayKey(Date.now(), me.profile.timeZone), createdAt: Date.now() });
    return { ...result, suggestedLayer, currentLayer: p.layer, signalName: sigs.length ? sigs.map((s) => s.name).join(", ") : null, priorSightings: prior };
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


// The lonely hour

export const lonely = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("orLonely").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
    const people = await ctx.db.query("orPeople").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    const moves = await ctx.db.query("orMoves").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    const reasonFor = (id: string) => moves.filter((m) => m.personId === id && m.to < m.from).sort((a, b) => b.createdAt - a.createdAt)[0]?.reason ?? null;
    return {
      rows,
      reachable: people.filter((p) => p.state === "growing" && p.layer >= 1 && p.layer <= 3).map((p) => ({ _id: p._id, name: p.name, layer: LAYERS[p.layer].name })),
      released: people.filter((p) => p.state !== "growing").map((p) => ({ _id: p._id, name: p.name, state: p.state, why: reasonFor(p._id) })),
    };
  },
});

export const logLonely = mutation({
  args: { choice: v.union(v.literal("smallAsk"), v.literal("place"), v.literal("partner"), v.literal("god"), v.literal("alone"), v.literal("waited"), v.literal("reachedBack")), wanted: v.optional(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("orLonely", { ownerId: me.profile._id, visibility: "private", day: dayKey(Date.now(), me.profile.timeZone), choice: args.choice, wanted: optionalText(args.wanted, 200, "Who I wanted to reach for"), note: optionalText(args.note, 400, "Note"), createdAt: Date.now() });
  },
});

// Too long

export const stays = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const rows = await ctx.db.query("orStays").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    return {
      today,
      stays: rows
        .map((r) => {
          const lastCheck = r.checks[r.checks.length - 1]?.day ?? dayKey(r.createdAt, me.profile.timeZone);
          return { ...r, daysSinceKnew: daysBetween(r.firstKnewDay, today), read: stayRead(daysBetween(r.firstKnewDay, today), r.keepers, r.changeSince), checkDue: r.status === "staying" && stayCheckDue(lastCheck, today) };
        })
        .sort((a, b) => Number(a.status !== "staying") - Number(b.status !== "staying") || b.daysSinceKnew - a.daysSinceKnew),
    };
  },
});

export const addStay = mutation({
  args: { kind: v.union(v.literal("person"), v.literal("place"), v.literal("situation")), label: v.string(), personId: v.optional(v.id("orPeople")), firstKnewDay: v.string(), keepers: v.array(v.string()), changeSince: v.union(v.literal("none"), v.literal("some"), v.literal("real")), cost: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (args.personId) await requireOwned(ctx, me, "orPeople", args.personId);
    const today = dayKey(Date.now(), me.profile.timeZone);
    return await ctx.db.insert("orStays", {
      ownerId: me.profile._id,
      visibility: "private",
      kind: args.kind,
      label: cleanText(args.label, 120, "What it is"),
      personId: args.personId,
      firstKnewDay: cleanDay(args.firstKnewDay, today),
      keepers: args.keepers.map((k) => cleanText(k, 80, "A reason")).slice(0, 10),
      changeSince: args.changeSince,
      cost: optionalText(args.cost, 400, "What it costs"),
      status: "staying",
      checks: [{ day: today, changeSince: args.changeSince }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const checkStay = mutation({
  args: { id: v.id("orStays"), changeSince: v.union(v.literal("none"), v.literal("some"), v.literal("real")), note: v.optional(v.string()), keepers: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "orStays", args.id);
    const today = dayKey(Date.now(), me.profile.timeZone);
    await ctx.db.patch(r._id, {
      changeSince: args.changeSince,
      keepers: args.keepers ? args.keepers.map((k) => cleanText(k, 80, "A reason")).slice(0, 10) : r.keepers,
      checks: [...r.checks, { day: today, changeSince: args.changeSince, note: optionalText(args.note, 300, "Note") }].slice(-24),
      updatedAt: Date.now(),
    });
  },
});

export const setStayStatus = mutation({
  args: { id: v.id("orStays"), status: v.union(v.literal("staying"), v.literal("leaving"), v.literal("left")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "orStays", args.id);
    await ctx.db.patch(r._id, { status: args.status, updatedAt: Date.now() });
    if (args.status === "left" && r.personId) {
      const p = await ctx.db.get(r.personId);
      if (p && p.ownerId === me.profile._id && p.state !== "released") await ctx.db.patch(p._id, { state: "released", updatedAt: Date.now() });
    }
  },
});

export const removeStay = mutation({
  args: { id: v.id("orStays") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "orStays", args.id);
    await ctx.db.delete(r._id);
  },
});
