import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "./lib";

/**
 * The Mantel (2026-09-25, Jen's ask): the shelf above the hearth for lines
 * you want to see again. Kept from any coach, Dad, or Mom reply, or written
 * as a takeaway in your own words. Private by default; one line at a time
 * can be shared with the partner. Nothing is counted.
 */
const KIND = v.union(v.literal("takeaway"), v.literal("quote"), v.literal("prayer"), v.literal("forPartner"));
const SPEAKER = v.union(v.literal("coach"), v.literal("dad"), v.literal("mom"), v.literal("me"));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("mantel").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect();
  },
});

export const keep = mutation({
  args: { text: v.string(), kind: v.optional(KIND), speaker: v.optional(SPEAKER), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("mantel", {
      ownerId: me.profile._id,
      visibility: "private",
      text: cleanText(args.text, 2000, "The line"),
      kind: args.kind ?? (args.speaker && args.speaker !== "me" ? "quote" : "takeaway"),
      speaker: args.speaker ?? "me",
      source: optionalText(args.source, 80, "Source"),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("mantel"), text: v.optional(v.string()), kind: v.optional(KIND), shared: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "mantel", args.id);
    const patch: Record<string, unknown> = {};
    if (args.text !== undefined) patch.text = cleanText(args.text, 2000, "The line");
    if (args.kind !== undefined) patch.kind = args.kind;
    if (args.shared !== undefined) patch.visibility = args.shared ? "shared" : "private";
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("mantel") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await requireOwned(ctx, me, "mantel", args.id);
    await ctx.db.delete(args.id);
  },
});

/** Lines the partner chose to share from their mantel. */
export const sharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const rows = await ctx.db.query("mantel").withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id)).order("desc").collect();
    return rows.filter((r) => r.visibility === "shared").map((r) => ({ _id: r._id, text: r.text, kind: r.kind, speaker: r.speaker, source: r.source ?? null, createdAt: r.createdAt }));
  },
});
