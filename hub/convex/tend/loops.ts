import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";

const column = v.union(v.literal("dump"), v.literal("now"), v.literal("later"), v.literal("cantThink"));
const card = v.object({ id: v.string(), text: v.string(), column, parkedUntil: v.optional(v.number()) });

/**
 * Loop Breaker. Never debates the logic: gets every "but what about…" out
 * as a card, sorted into Solve now / Solve later / Can't be solved by
 * thinking harder, then one card to test. Private to the person.
 */
export const open = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("tendLoops")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(20);
  },
});

export const get = query({
  args: { id: v.id("tendLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await ctx.db.get(args.id);
    return loop && loop.ownerId === me.profile._id ? loop : null;
  },
});

export const create = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const now = Date.now();
    return await ctx.db.insert("tendLoops", {
      ownerId: me.profile._id,
      visibility: "private",
      title: optionalText(args.title, 120, "Title"),
      cards: [],
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Replace the whole card list (dump, sort, and reorder all go through here). */
export const setCards = mutation({
  args: { id: v.id("tendLoops"), cards: v.array(card) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await requireOwned(ctx, me, "tendLoops", args.id);
    const cards = args.cards.slice(0, 200).map((c) => ({ ...c, text: cleanText(c.text, 300, "Card") }));
    await ctx.db.patch(loop._id, { cards, updatedAt: Date.now() });
  },
});

export const pick = mutation({
  args: { id: v.id("tendLoops"), cardId: v.optional(v.string()), testAction: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await requireOwned(ctx, me, "tendLoops", args.id);
    await ctx.db.patch(loop._id, {
      pickedCardId: args.cardId ?? loop.pickedCardId,
      testAction: args.testAction === undefined ? loop.testAction : optionalText(args.testAction, 300, "Smallest action"),
      updatedAt: Date.now(),
    });
  },
});

/** Decide by default: name the reasonable default and a deadline. */
export const setDecision = mutation({
  args: { id: v.id("tendLoops"), defaultChoice: v.string(), deadline: v.number() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await requireOwned(ctx, me, "tendLoops", args.id);
    await ctx.db.patch(loop._id, {
      decision: { defaultChoice: cleanText(args.defaultChoice, 300, "Default"), deadline: args.deadline },
      updatedAt: Date.now(),
    });
  },
});

/** The choice was made, by the person or by the default winning. Recorded as a decision made, never a failure. */
export const decide = mutation({
  args: { id: v.id("tendLoops"), byDefault: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await requireOwned(ctx, me, "tendLoops", args.id);
    if (!loop.decision) throw new ConvexError("There's no default set yet.");
    await ctx.db.patch(loop._id, {
      decision: { ...loop.decision, decidedAt: Date.now(), byDefault: args.byDefault },
      updatedAt: Date.now(),
    });
  },
});

export const close = mutation({
  args: { id: v.id("tendLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await requireOwned(ctx, me, "tendLoops", args.id);
    await ctx.db.patch(loop._id, { status: "closed", updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("tendLoops") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const loop = await requireOwned(ctx, me, "tendLoops", args.id);
    await ctx.db.delete(loop._id);
  },
});
