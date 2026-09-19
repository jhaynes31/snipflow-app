import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireMe, requireOwned } from "../lib";

const helped = v.union(v.literal("little"), v.literal("notReally"), v.literal("notAtAll"));

/** A tool was opened. Returns the use id so the close can update it. */
export const start = mutation({
  args: { tool: v.string(), checkInId: v.optional(v.id("checkIns")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("tendToolUses", {
      ownerId: me.profile._id,
      visibility: "private",
      tool: args.tool,
      checkInId: args.checkInId,
      startedAt: Date.now(),
    });
  },
});

/** The gentle close: did that help a little, not really, or not at all? Plus anything worth keeping. */
export const finish = mutation({
  args: { id: v.id("tendToolUses"), helped: v.optional(helped), saved: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const use = await requireOwned(ctx, me, "tendToolUses", args.id);
    await ctx.db.patch(use._id, {
      helped: args.helped ?? use.helped,
      saved: args.saved ?? use.saved,
      finishedAt: Date.now(),
    });
  },
});

/**
 * How much each tool has helped me, so the library can offer the helpful
 * ones first. Counts only; never a score shown to the person.
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const uses = await ctx.db
      .query("tendToolUses")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(300);
    const byTool: Record<string, { little: number; notReally: number; notAtAll: number; uses: number; lastUsed: number }> = {};
    for (const u of uses) {
      const t = (byTool[u.tool] ??= { little: 0, notReally: 0, notAtAll: 0, uses: 0, lastUsed: 0 });
      t.uses++;
      t.lastUsed = Math.max(t.lastUsed, u.startedAt);
      if (u.helped) t[u.helped]++;
    }
    return byTool;
  },
});

/** Things I kept from a tool, newest first: kinder sentences, finish lines, first steps, Story Checks. */
export const kept = query({
  args: { tool: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const uses = await ctx.db
      .query("tendToolUses")
      .withIndex("by_owner_tool", (q) => q.eq("ownerId", me.profile._id).eq("tool", args.tool))
      .order("desc")
      .take(Math.min(100, args.limit ?? 20));
    return uses.filter((u) => u.saved !== undefined);
  },
});

export const remove = mutation({
  args: { id: v.id("tendToolUses") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const use = await requireOwned(ctx, me, "tendToolUses", args.id);
    await ctx.db.delete(use._id);
  },
});
