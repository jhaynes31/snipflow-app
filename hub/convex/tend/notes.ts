import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, requireMe, requirePartner, requireOwned } from "../lib";

/** "I saw you" notes: everyday gratitude, sent any time. Shared. */
export const between = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const ids = [me.profile._id, ...(me.partner ? [me.partner._id] : [])];
    const rows = [];
    for (const id of ids) {
      rows.push(
        ...(await ctx.db
          .query("tendNotes")
          .withIndex("by_to_time", (q) => q.eq("toProfileId", id))
          .order("desc")
          .take(Math.min(100, args.limit ?? 30))),
      );
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, args.limit ?? 30);
  },
});

export const send = mutation({
  args: { text: v.string(), saveToEvidence: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    const text = cleanText(args.text, 400, "Note");
    const id = await ctx.db.insert("tendNotes", {
      ownerId: me.profile._id,
      visibility: "shared",
      toProfileId: partner._id,
      text,
      createdAt: Date.now(),
    });
    if (args.saveToEvidence) {
      await ctx.db.insert("tendEvidence", {
        ownerId: me.profile._id,
        visibility: "shared",
        aboutProfileId: partner._id,
        text,
        showed: "I saw you",
        date: Date.now(),
        createdAt: Date.now(),
      });
    }
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("tendNotes") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const n = await requireOwned(ctx, me, "tendNotes", args.id);
    await ctx.db.delete(n._id);
  },
});
