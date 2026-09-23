import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { access, cleanText, optionalText, requireOwned } from "../lib";
import { dayKey } from "../tend/patterns";
import { daysOfMonth, exportRoom, readReCenteredSettings } from "./pure";
import { requireRoom } from "./room";

/**
 * Every read and write in Re-Centered goes through `requireRoom`: the
 * signed-in person must be the one who claimed the room. Rows are private
 * and there is no share switch anywhere.
 */

const whose = v.union(v.literal("mine"), v.literal("theirs"), v.literal("ours"), v.literal("notMine"), v.literal("unsure"));
const where = v.union(v.literal("partner"), v.literal("others"), v.literal("self"), v.literal("mixed"));
const ending = v.union(v.literal("stepIn"), v.literal("letItLand"), v.literal("notYet"));

// Whose is this?

export const sorts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db
      .query("rcSorts")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(Math.min(200, args.limit ?? 30));
  },
});

export const addSort = mutation({
  args: { text: v.string(), whose, myPart: v.optional(v.string()), theirPart: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db.insert("rcSorts", {
      ownerId: me.profile._id,
      visibility: "private",
      text: cleanText(args.text, 500, "What got handed to you"),
      whose: args.whose,
      myPart: optionalText(args.myPart, 500, "My part"),
      theirPart: optionalText(args.theirPart, 500, "Their part"),
      createdAt: Date.now(),
    });
  },
});

/** Re-sort something later, once it's clearer. Unsure is allowed to stay unsure. */
export const resort = mutation({
  args: { id: v.id("rcSorts"), whose, myPart: v.optional(v.string()), theirPart: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcSorts", args.id);
    await ctx.db.patch(row._id, {
      whose: args.whose,
      myPart: optionalText(args.myPart, 500, "My part"),
      theirPart: optionalText(args.theirPart, 500, "Their part"),
    });
  },
});

export const removeSort = mutation({
  args: { id: v.id("rcSorts") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcSorts", args.id);
    await ctx.db.delete(row._id);
  },
});

// The pause before rescuing

export const pauses = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db
      .query("rcPauses")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(Math.min(200, args.limit ?? 20));
  },
});

export const addPause = mutation({
  args: { ifNothing: v.string(), landsOn: v.string(), afraid: v.string(), need: v.string(), ending },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const opt = (s: string, label: string) => optionalText(s, 600, label) ?? "";
    return await ctx.db.insert("rcPauses", {
      ownerId: me.profile._id,
      visibility: "private",
      ifNothing: opt(args.ifNothing, "If I do nothing"),
      landsOn: opt(args.landsOn, "Who it lands on"),
      afraid: opt(args.afraid, "What I'm afraid of"),
      need: opt(args.need, "What I need"),
      ending: args.ending,
      createdAt: Date.now(),
    });
  },
});

export const removePause = mutation({
  args: { id: v.id("rcPauses") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcPauses", args.id);
    await ctx.db.delete(row._id);
  },
});

// Let it land

export const landings = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db
      .query("rcLandings")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(Math.min(200, args.limit ?? 50));
  },
});

export const addLanding = mutation({
  args: { text: v.string(), after: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db.insert("rcLandings", {
      ownerId: me.profile._id,
      visibility: "private",
      text: cleanText(args.text, 800, "What I did"),
      after: optionalText(args.after, 500, "How it felt after"),
      createdAt: Date.now(),
    });
  },
});

export const removeLanding = mutation({
  args: { id: v.id("rcLandings") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcLandings", args.id);
    await ctx.db.delete(row._id);
  },
});

// Where my security is sitting today

export const tapsForMonth = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const days = daysOfMonth(args.year, args.month);
    const rows = await ctx.db
      .query("rcSecurityTaps")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id).gte("day", days[0]).lte("day", days[days.length - 1]))
      .collect();
    const today = dayKey(Date.now(), me.profile.timeZone);
    return { days, today, taps: rows.map((r) => ({ day: r.day, where: r.where })) };
  },
});

export const tapToday = mutation({
  args: { where },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const day = dayKey(Date.now(), me.profile.timeZone);
    const existing = await ctx.db
      .query("rcSecurityTaps")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id).eq("day", day))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { where: args.where, createdAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("rcSecurityTaps", { ownerId: me.profile._id, visibility: "private", day, where: args.where, createdAt: Date.now() });
  },
});

// My own life

export const ownLife = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoom(ctx);
    return await ctx.db
      .query("rcOwnLife")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .collect();
  },
});

export const addOwnLife = mutation({
  args: { area: v.string(), wayBackIn: v.string() },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db.insert("rcOwnLife", {
      ownerId: me.profile._id,
      visibility: "private",
      area: cleanText(args.area, 80, "The area"),
      wayBackIn: cleanText(args.wayBackIn, 300, "One way back in"),
      createdAt: Date.now(),
    });
  },
});

export const updateOwnLife = mutation({
  args: { id: v.id("rcOwnLife"), area: v.string(), wayBackIn: v.string() },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcOwnLife", args.id);
    await ctx.db.patch(row._id, { area: cleanText(args.area, 80, "The area"), wayBackIn: cleanText(args.wayBackIn, 300, "One way back in") });
  },
});

export const removeOwnLife = mutation({
  args: { id: v.id("rcOwnLife") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcOwnLife", args.id);
    await ctx.db.delete(row._id);
  },
});

// Kept, by me

export const keptByMe = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db
      .query("rcKeptByMe")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(Math.min(200, args.limit ?? 50));
  },
});

export const addKeptByMe = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    return await ctx.db.insert("rcKeptByMe", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 500, "What I did"), createdAt: Date.now() });
  },
});

export const removeKeptByMe = mutation({
  args: { id: v.id("rcKeptByMe") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcKeptByMe", args.id);
    await ctx.db.delete(row._id);
  },
});

// Now: what the front room needs in one read

export const now = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoom(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const since = Date.now() - 36 * 3600_000;
    const [recentSorts, recentLandings, life, tap] = await Promise.all([
      ctx.db.query("rcSorts").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id).gte("createdAt", since)).collect(),
      ctx.db.query("rcLandings").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id).gte("createdAt", since)).collect(),
      ctx.db.query("rcOwnLife").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).collect(),
      ctx.db.query("rcSecurityTaps").withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id).eq("day", today)).first(),
    ]);
    const hardDay = recentSorts.some((s) => s.whose === "theirs" || s.whose === "notMine" || s.whose === "ours") || recentLandings.length > 0;
    // Kept Word emits word.didnt as a shared event; the partner's recent ones are information, nothing more.
    let wordNotKept: number | null = null;
    if (me.partner) {
      const theirs = await ctx.db
        .query("events")
        .withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id).gte("createdAt", Date.now() - 3 * 24 * 3600_000))
        .collect();
      const hit = theirs.filter((e) => e.name === "word.didnt" && access(me, e) === "full").sort((a, b) => b.createdAt - a.createdAt)[0];
      wordNotKept = hit?.createdAt ?? null;
    }
    return {
      today,
      hardDay,
      wordNotKept,
      ownLife: life.map((o) => ({ area: o.area, wayBackIn: o.wayBackIn })),
      tappedToday: tap?.where ?? null,
      settings: readReCenteredSettings(me.profile.moduleSettings),
    };
  },
});

/** Plain-text export of the whole room. */
export const exportMine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoom(ctx);
    const id = me.profile._id;
    const [sorts, pauses, landings, taps, life, kept] = await Promise.all([
      ctx.db.query("rcSorts").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("rcPauses").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("rcLandings").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("rcSecurityTaps").withIndex("by_owner_day", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("rcOwnLife").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("rcKeptByMe").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
    ]);
    return exportRoom({ name: me.profile.displayName, settings: readReCenteredSettings(me.profile.moduleSettings), sorts, pauses, landings, taps, ownLife: life, keptByMe: kept });
  },
});
