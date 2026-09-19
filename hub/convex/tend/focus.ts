import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, requireMe } from "../lib";

/**
 * Focus Mode: one task, one timer, nothing else. Sessions are shared only
 * so the partner can body-double; they carry a task name and times, nothing
 * more.
 */

export const current = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const mine = await ctx.db
      .query("tendFocusSessions")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .first();
    const partners = me.partner
      ? await ctx.db
          .query("tendFocusSessions")
          .withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id))
          .order("desc")
          .first()
      : null;
    return {
      mine: mine && mine.status === "running" ? mine : null,
      partner: partners && partners.status === "running" && partners.bodyDoubleWanted ? partners : null,
    };
  },
});

export const start = mutation({
  args: { task: v.string(), minutes: v.number(), bodyDoubleWanted: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const minutes = Math.min(180, Math.max(1, Math.round(args.minutes)));
    // End any session left running.
    const prev = await ctx.db
      .query("tendFocusSessions")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .first();
    if (prev && prev.status === "running") await ctx.db.patch(prev._id, { status: "ended" });
    const now = Date.now();
    return await ctx.db.insert("tendFocusSessions", {
      ownerId: me.profile._id,
      visibility: "shared",
      task: cleanText(args.task, 200, "Task"),
      minutes,
      startedAt: now,
      endsAt: now + minutes * 60_000,
      status: "running",
      bodyDoubleWanted: args.bodyDoubleWanted,
    });
  },
});

/** Keep going: add minutes to the running session. */
export const extend = mutation({
  args: { id: v.id("tendFocusSessions"), minutes: v.number() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await ctx.db.get(args.id);
    if (!s || s.ownerId !== me.profile._id) throw new Error("That isn't your session.");
    const add = Math.min(180, Math.max(1, Math.round(args.minutes)));
    await ctx.db.patch(s._id, { endsAt: Math.max(s.endsAt, Date.now()) + add * 60_000, minutes: s.minutes + add, status: "running" });
  },
});

export const end = mutation({
  args: { id: v.id("tendFocusSessions") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await ctx.db.get(args.id);
    if (!s || s.ownerId !== me.profile._id) throw new Error("That isn't your session.");
    await ctx.db.patch(s._id, { status: "ended" });
  },
});

/** The partner joins as a body double. Presence only; nothing else is shared. */
export const join = mutation({
  args: { id: v.id("tendFocusSessions"), joining: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const s = await ctx.db.get(args.id);
    if (!s || !me.partner || s.ownerId !== me.partner._id) throw new Error("That isn't your partner's session.");
    await ctx.db.patch(s._id, { joinedProfileId: args.joining ? me.profile._id : undefined });
  },
});
