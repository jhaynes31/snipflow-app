import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "./lib";

/**
 * Felt (2026-09-28): what was felt, where in the body, and what it was like
 * there. Logged from the wheel anywhere in The Shire. Private by default;
 * one entry at a time can be shared with the partner. Nothing is counted
 * as a score; the Felt page shows plain patterns.
 */
const BODY = v.array(v.object({ area: v.string(), words: v.array(v.string()), note: v.optional(v.string()) }));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("felt").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(400);
  },
});

export const add = mutation({
  args: { feelings: v.array(v.string()), body: BODY, note: v.optional(v.string()), context: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const feelings = [...new Set(args.feelings.map((f) => f.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    const body = args.body.slice(0, 12).map((b) => ({ area: cleanText(b.area, 30, "Area"), words: [...new Set(b.words.map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, 12), note: optionalText(b.note, 300, "Note") }));
    return await ctx.db.insert("felt", {
      ownerId: me.profile._id,
      visibility: "private",
      feelings,
      body,
      note: optionalText(args.note, 500, "Note"),
      context: optionalText(args.context, 60, "Context"),
      createdAt: Date.now(),
    });
  },
});

export const setShared = mutation({
  args: { id: v.id("felt"), shared: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "felt", args.id);
    await ctx.db.patch(args.id, { visibility: args.shared ? "shared" : "private" });
  },
});

export const remove = mutation({
  args: { id: v.id("felt") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "felt", args.id);
    await ctx.db.delete(args.id);
  },
});

/** Entries the partner chose to share. */
export const sharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const rows = await ctx.db.query("felt").withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id)).order("desc").take(100);
    return rows.filter((r) => r.visibility === "shared").map((r) => ({ _id: r._id, feelings: r.feelings, body: r.body, note: r.note ?? null, createdAt: r.createdAt }));
  },
});
