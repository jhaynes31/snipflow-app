import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { access, requireMe, requireOwned } from "../lib";

/** Reading, deleting, and (internally) saving season reports. */

/** Lists carry the prose, not the fact sheet. */
function withoutFacts<T extends { facts: unknown }>(row: T): Omit<T, "facts"> {
  const copy: Partial<T> = { ...row };
  delete copy.facts;
  return copy as Omit<T, "facts">;
}

const kind = v.union(v.literal("mine"), v.literal("ours"));
const interval = v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("now"));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("seasonReports").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
    return rows.filter((r) => r.kind === "mine").map(withoutFacts);
  },
});

export const ours = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const ids = [me.profile._id, ...(me.partner ? [me.partner._id] : [])];
    const rows = [];
    for (const id of ids) {
      rows.push(...(await ctx.db.query("seasonReports").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).order("desc").take(60)));
    }
    return rows
      .filter((r) => r.kind === "ours" && access(me, r) === "full")
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(withoutFacts);
  },
});

export const get = query({
  args: { id: v.id("seasonReports") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || access(me, row) !== "full") return null;
    return row;
  },
});

/** Mine: only I can delete. Ours: either of us can, and it is gone for both. */
export const remove = mutation({
  args: { id: v.id("seasonReports") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return;
    if (row.kind === "ours") {
      if (access(me, row) !== "full") throw new ConvexError("That isn't yours to change.");
      await ctx.db.delete(row._id);
      return;
    }
    await requireOwned(ctx, me, "seasonReports", args.id);
    await ctx.db.delete(row._id);
  },
});

export const save = internalMutation({
  args: {
    ownerId: v.id("profiles"),
    kind,
    interval,
    periodStart: v.string(),
    periodEnd: v.string(),
    title: v.string(),
    body: v.string(),
    facts: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seasonReports", {
      ownerId: args.ownerId,
      visibility: args.kind === "ours" ? "shared" : "private",
      kind: args.kind,
      interval: args.interval,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      title: args.title,
      body: args.body,
      facts: args.facts,
      createdAt: Date.now(),
    });
  },
});
