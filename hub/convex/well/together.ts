import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { access, cleanText, optionalText, requireMe, requireOwned, requirePartner } from "../lib";

/**
 * Together: a passage marked for the other person with a note, and one
 * question a week that each answers in their own words. Shared on purpose;
 * never a comparison of who read what.
 */

export const marks = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const forMe = await ctx.db.query("wellMarks").withIndex("by_to_time", (q) => q.eq("toProfileId", me.profile._id)).order("desc").take(50);
    const byMe = me.partner ? await ctx.db.query("wellMarks").withIndex("by_to_time", (q) => q.eq("toProfileId", me.partner!._id)).order("desc").take(50) : [];
    return { forMe: forMe.filter((m) => access(me, m) === "full"), byMe };
  },
});

export const mark = mutation({
  args: { book: v.string(), chapter: v.number(), from: v.optional(v.number()), to: v.optional(v.number()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    return await ctx.db.insert("wellMarks", {
      ownerId: me.profile._id,
      visibility: "shared",
      toProfileId: partner._id,
      book: cleanText(args.book, 40, "Book"),
      chapter: args.chapter,
      from: args.from,
      to: args.to,
      note: optionalText(args.note, 500, "The note"),
      createdAt: Date.now(),
    });
  },
});

export const unmark = mutation({
  args: { id: v.id("wellMarks") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const m = await requireOwned(ctx, me, "wellMarks", args.id);
    await ctx.db.delete(m._id);
  },
});

export const answers = query({
  args: { weekKey: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const mine = await ctx.db.query("wellAnswers").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id).eq("weekKey", args.weekKey)).first();
    const theirs = me.partner ? await ctx.db.query("wellAnswers").withIndex("by_owner_week", (q) => q.eq("ownerId", me.partner!._id).eq("weekKey", args.weekKey)).first() : null;
    return { mine, theirs: theirs && access(me, theirs) === "full" ? theirs : null };
  },
});

export const answer = mutation({
  args: { weekKey: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const text = cleanText(args.text, 1500, "Your answer");
    const existing = await ctx.db.query("wellAnswers").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id).eq("weekKey", args.weekKey)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { text });
      return existing._id;
    }
    return await ctx.db.insert("wellAnswers", { ownerId: me.profile._id, visibility: "shared", weekKey: args.weekKey, text, createdAt: Date.now() });
  },
});
