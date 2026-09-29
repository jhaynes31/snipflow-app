import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { notify, notifyPartner, who } from "../push/notify";

/**
 * "What I Need Right Now" (Tend spec update, 2026-09-29). A signal goes from
 * one person to the other with the cards, need types, intensity and a note.
 * The partner is told gently, can say "I'm on it", and later "Resolved".
 * Non-verbal taps after sending each tell the partner instantly. Everything
 * the partner reads is by design; nothing else in Tend changes.
 */
export const send = mutation({
  args: { cards: v.array(v.string()), needs: v.array(v.string()), intensity: v.optional(v.number()), note: v.optional(v.string()), nonverbal: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (args.cards.length === 0) throw new ConvexError("Pick at least one card.");
    const cards = [...new Set(args.cards.map((c) => cleanText(c, 40, "Card")))].slice(0, 10);
    const needs = [...new Set(args.needs.map((n) => cleanText(n, 30, "Need")))].slice(0, 5);
    const id = await ctx.db.insert("tnSignals", {
      ownerId: me.profile._id,
      visibility: "shared",
      cards,
      needs,
      intensity: args.intensity && args.intensity >= 1 && args.intensity <= 3 ? args.intensity : undefined,
      note: optionalText(args.note, 500, "Note"),
      taps: [],
      createdAt: Date.now(),
    });
    const urgent = args.nonverbal === true || args.intensity === 3;
    await notifyPartner(ctx, me, { title: `${who(me)} could use you right now 🌿`, body: args.nonverbal ? "Shutdown. No questions, lower the lights, come quietly." : "Open Tend for what would help.", url: `/tend/support/${id}`, tag: `signal-${id}`, urgent });
    return id;
  },
});

export const tap = mutation({
  args: { id: v.id("tnSignals"), key: v.string(), label: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await requireOwned(ctx, me, "tnSignals", args.id);
    const label = cleanText(args.label, 40, "Tap");
    await ctx.db.patch(args.id, { taps: [...s.taps, { key: cleanText(args.key, 20, "Tap"), label, at: Date.now() }].slice(-40) });
    await notifyPartner(ctx, me, { title: `${who(me)}: ${label} 🌿`, body: "One tap, no words needed.", url: `/tend/support/${args.id}`, tag: `signal-tap-${args.id}`, urgent: true });
  },
});

/** The partner says "I'm on it"; the sender gets a small notice. */
export const onIt = mutation({
  args: { id: v.id("tnSignals") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await ctx.db.get(args.id);
    if (!s || !me.partner || s.ownerId !== me.partner._id) throw new ConvexError("That signal isn't for you.");
    if (s.onItAt) return;
    await ctx.db.patch(args.id, { onItAt: Date.now() });
    await notify(ctx, s.ownerId, { title: `${who(me)}'s on it 🌿`, body: "You don't have to do anything else.", url: "/tend", tag: `signal-onit-${args.id}` });
  },
});

export const resolve = mutation({
  args: { id: v.id("tnSignals") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await ctx.db.get(args.id);
    const mine = s?.ownerId === me.profile._id;
    const theirs = !!s && !!me.partner && s.ownerId === me.partner._id;
    if (!s || (!mine && !theirs)) throw new ConvexError("That signal isn't yours.");
    if (!s.resolvedAt) await ctx.db.patch(args.id, { resolvedAt: Date.now() });
  },
});

/** One signal, readable by its sender and the partner. */
export const get = query({
  args: { id: v.id("tnSignals") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await ctx.db.get(args.id);
    if (!s) return null;
    const mine = s.ownerId === me.profile._id;
    const theirs = !!me.partner && s.ownerId === me.partner._id;
    if (!mine && !theirs) return null;
    return { ...s, mine, senderName: mine ? me.profile.displayName : me.partner!.displayName };
  },
});

/** The partner's open signals (unresolved, last two days), newest first. */
export const openForMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const rows = await ctx.db.query("tnSignals").withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id).gt("createdAt", Date.now() - 2 * 24 * 3600_000)).order("desc").take(10);
    return rows.filter((r) => !r.resolvedAt).map((r) => ({ _id: r._id, cards: r.cards, needs: r.needs, intensity: r.intensity, createdAt: r.createdAt, onItAt: r.onItAt, taps: r.taps.length }));
  },
});

/** My own recent signals, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("tnSignals").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(20);
  },
});

/** A resolved signal from the last three days, at least twelve hours old, with no reflection yet. */
export const reflectionDue = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("tnSignals").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id).gt("createdAt", Date.now() - 3 * 24 * 3600_000)).order("desc").take(10);
    const done = new Set((await ctx.db.query("tnReflections").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30)).map((r) => r.signalId));
    const due = rows.find((r) => r.resolvedAt && Date.now() - r.resolvedAt > 12 * 3600_000 && !done.has(r._id));
    return due ? { _id: due._id, cards: due.cards, createdAt: due.createdAt } : null;
  },
});

export const reflect = mutation({
  args: { signalId: v.id("tnSignals"), helped: v.array(v.string()), didnt: v.array(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "tnSignals", args.signalId);
    await ctx.db.insert("tnReflections", {
      ownerId: me.profile._id,
      visibility: "private",
      signalId: args.signalId,
      helped: args.helped.slice(0, 20).map((h) => cleanText(h, 300, "Helped")),
      didnt: args.didnt.slice(0, 20).map((h) => cleanText(h, 300, "Didn't")),
      note: optionalText(args.note, 500, "Note"),
      createdAt: Date.now(),
    });
  },
});

