import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { emitEvent } from "../events";
import { cleanText, requireMe, requireOwned, requirePartner } from "../lib";

/**
 * Asks: written once, plainly. The other person answers with "I'll make
 * this a word" (which creates the word, see words.give), "Not now", or
 * "Let's talk". The answer goes on the record either way.
 */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const mine = await ctx.db.query("kwAsks").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(50);
    const toMe = await ctx.db.query("kwAsks").withIndex("by_to_time", (q) => q.eq("toProfileId", me.profile._id)).order("desc").take(50);
    return { mine, toMe };
  },
});

export const write = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    return await ctx.db.insert("kwAsks", {
      ownerId: me.profile._id,
      visibility: "shared",
      toProfileId: partner._id,
      text: cleanText(args.text, 400, "The ask"),
      createdAt: Date.now(),
    });
  },
});

/** "Not now" or "Let's talk". "I'll make this a word" goes through words.give with askId. */
export const answer = mutation({
  args: { id: v.id("kwAsks"), answer: v.union(v.literal("notNow"), v.literal("talk")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const ask = await ctx.db.get(args.id);
    if (!ask || ask.toProfileId !== me.profile._id) throw new Error("That ask isn't for you.");
    await ctx.db.patch(ask._id, { answer: args.answer, answeredAt: Date.now() });
    await emitEvent(ctx, { ownerId: me.profile._id, source: "kept-word", name: "ask.answered", payload: { askId: ask._id, answer: args.answer }, visibility: "shared" });
  },
});

export const remove = mutation({
  args: { id: v.id("kwAsks") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const ask = await requireOwned(ctx, me, "kwAsks", args.id);
    if (ask.answer) throw new Error("Answered asks stay on the record.");
    await ctx.db.delete(ask._id);
  },
});
