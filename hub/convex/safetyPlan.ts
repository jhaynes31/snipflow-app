import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { access, requireMe } from "./lib";
import { visibilityValidator } from "./privacy";

/**
 * The personal safety plan: warning signs, what calms me, people to call,
 * reasons to hold on. Private by default; sharing it with the partner is an
 * explicit choice. It lives behind "Need help now".
 */

const MAX = 2000;

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("safetyPlans")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .first();
  },
});

/** The partner's plan, only when they chose to share it. */
export const partners = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return null;
    const row = await ctx.db
      .query("safetyPlans")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id))
      .first();
    if (!row || access(me, row) !== "full") return null;
    return {
      displayName: me.partner.displayName,
      warningSigns: row.warningSigns,
      whatCalmsMe: row.whatCalmsMe,
      peopleToCall: row.peopleToCall,
      reasonsToHoldOn: row.reasonsToHoldOn,
      updatedAt: row.updatedAt,
    };
  },
});

function clip(value: string, label: string): string {
  const t = value.trim();
  if (t.length > MAX) throw new ConvexError(`${label} is too long (max ${MAX} characters).`);
  return t;
}

export const save = mutation({
  args: {
    warningSigns: v.string(),
    whatCalmsMe: v.string(),
    peopleToCall: v.string(),
    reasonsToHoldOn: v.string(),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const fields = {
      warningSigns: clip(args.warningSigns, "Warning signs"),
      whatCalmsMe: clip(args.whatCalmsMe, "What calms me"),
      peopleToCall: clip(args.peopleToCall, "People to call"),
      reasonsToHoldOn: clip(args.reasonsToHoldOn, "Reasons to hold on"),
    };
    const visibility = args.visibility === "shared" ? "shared" : args.visibility === "private" ? "private" : undefined;
    const existing = await ctx.db
      .query("safetyPlans")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, visibility: visibility ?? existing.visibility, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("safetyPlans", {
      ownerId: me.profile._id,
      visibility: visibility ?? "private",
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

/** Share with, or un-share from, the partner. Whole plan, on or off. */
export const setShared = mutation({
  args: { shared: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const existing = await ctx.db
      .query("safetyPlans")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .first();
    if (!existing) throw new ConvexError("Write your plan first, then share it.");
    await ctx.db.patch(existing._id, { visibility: args.shared ? "shared" : "private", updatedAt: Date.now() });
  },
});
