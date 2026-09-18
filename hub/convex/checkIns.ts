import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { emitEvent } from "./events";
import { setGentleMode } from "./gentleMode";
import { optionalText, requireMe, requireOwned } from "./lib";
import { checkInAnswer } from "./schema";

/**
 * "How are you, really?" lives in the shell so it is on every screen. The
 * Support module (phase 3) builds its richer check-in on top of these rows
 * and the `checkin.*` events; it does not replace them.
 */

export const record = mutation({
  args: {
    answer: checkInAnswer,
    note: v.optional(v.string()),
    /** "Feeling steadier" after a gentle day turns gentle mode off. */
    turnGentleOff: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const id = await ctx.db.insert("checkIns", {
      ownerId: me.profile._id,
      visibility: "private",
      answer: args.answer,
      note: optionalText(args.note, 1000, "Note"),
      createdAt: Date.now(),
    });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "hub",
      name: `checkin.${args.answer}`,
      payload: { checkInId: id },
    });
    if (args.turnGentleOff) await setGentleMode(ctx, me.profile._id, false);
    return id;
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("checkIns")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(Math.min(100, args.limit ?? 10));
  },
});

export const remove = mutation({
  args: { id: v.id("checkIns") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "checkIns", args.id);
    await ctx.db.delete(row._id);
  },
});
