import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";

/**
 * The Well's private rows: prayers, remembering, personal lie cards, and
 * untangle entries. All owned by the person, all private, all deletable.
 */

// Talking with him

export const prayers = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("wellPrayers").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(100);
  },
});

export const addPrayer = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("wellPrayers", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 2000, "The prayer"), createdAt: Date.now() });
  },
});

/** Mark a prayer answered, and keep the answer in Remembering. */
export const answered = mutation({
  args: { id: v.id("wellPrayers"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "wellPrayers", args.id);
    const note = optionalText(args.note, 600, "The note");
    await ctx.db.patch(p._id, { answeredAt: Date.now(), answerNote: note });
    await ctx.db.insert("wellRemembering", {
      ownerId: me.profile._id,
      visibility: "private",
      text: note ? `Answered: ${p.text} — ${note}` : `Answered: ${p.text}`,
      createdAt: Date.now(),
    });
  },
});

export const removePrayer = mutation({
  args: { id: v.id("wellPrayers") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "wellPrayers", args.id);
    await ctx.db.delete(p._id);
  },
});

// Remembering

export const remembering = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("wellRemembering").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(200);
  },
});

export const addRemembering = mutation({
  args: { text: v.string(), happenedOn: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("wellRemembering", {
      ownerId: me.profile._id,
      visibility: "private",
      text: cleanText(args.text, 1500, "What happened"),
      happenedOn: optionalText(args.happenedOn, 40, "When"),
      createdAt: Date.now(),
    });
  },
});

export const removeRemembering = mutation({
  args: { id: v.id("wellRemembering") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "wellRemembering", args.id);
    await ctx.db.delete(r._id);
  },
});

// Lies and truth, personal cards

export const lies = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("wellLies").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(100);
  },
});

export const addLie = mutation({
  args: { lie: v.string(), truth: v.string(), ref: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("wellLies", {
      ownerId: me.profile._id,
      visibility: "private",
      lie: cleanText(args.lie, 300, "The lie"),
      truth: cleanText(args.truth, 800, "The truth"),
      ref: optionalText(args.ref, 60, "The reference"),
      createdAt: Date.now(),
    });
  },
});

export const removeLie = mutation({
  args: { id: v.id("wellLies") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "wellLies", args.id);
    await ctx.db.delete(r._id);
  },
});

// Untangle

export const untangle = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("wellUntangle").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(100);
  },
});

export const addUntangle = mutation({
  args: { taught: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const now = Date.now();
    return await ctx.db.insert("wellUntangle", { ownerId: me.profile._id, visibility: "private", taught: cleanText(args.taught, 600, "What I was taught"), createdAt: now, updatedAt: now });
  },
});

export const updateUntangle = mutation({
  args: { id: v.id("wellUntangle"), jesusDid: v.optional(v.string()), ref: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "wellUntangle", args.id);
    await ctx.db.patch(r._id, { jesusDid: optionalText(args.jesusDid, 1500, "What Jesus did"), ref: optionalText(args.ref, 60, "The reference"), updatedAt: Date.now() });
  },
});

export const removeUntangle = mutation({
  args: { id: v.id("wellUntangle") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await requireOwned(ctx, me, "wellUntangle", args.id);
    await ctx.db.delete(r._id);
  },
});
