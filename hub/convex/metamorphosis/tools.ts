import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { emitEvent } from "../events";
import { cleanText, optionalText, requireOwned } from "../lib";
import { dayKey } from "../tend/patterns";
import { requireRoomOf } from "../rooms";

const ROOM = "metamorphosis";
const room = (ctx: Parameters<typeof requireRoomOf>[0]) => requireRoomOf(ctx, ROOM);

function weekKeyOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return dt.toISOString().slice(0, 10);
}

/** Step 2 of Metamorphosis: the practical tools. Every row his, private, deletable. */

// The Scout

export const scout = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmScout").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
  },
});

export const addScout = mutation({
  args: { noticed: v.string(), did: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmScout", { ownerId: me.profile._id, visibility: "private", day: dayKey(Date.now(), me.profile.timeZone), noticed: cleanText(args.noticed, 300, "What you noticed"), did: optionalText(args.did, 300, "What you did"), createdAt: Date.now() });
  },
});

export const removeScout = mutation({
  args: { id: v.id("mmScout") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmScout", args.id);
    await ctx.db.delete(r._id);
  },
});

// Do It Tired

export const tired = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmTired").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
  },
});

export const addTired = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmTired", { ownerId: me.profile._id, visibility: "private", day: dayKey(Date.now(), me.profile.timeZone), text: cleanText(args.text, 300, "The thing"), createdAt: Date.now() });
  },
});

// Shield Down

export const shields = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmShield").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30);
  },
});

export const addShield = mutation({
  args: { threat: v.string(), truePart: v.string(), sentences: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmShield", { ownerId: me.profile._id, visibility: "private", threat: cleanText(args.threat, 400, "The threat"), truePart: cleanText(args.truePart, 400, "The one percent"), sentences: cleanText(args.sentences, 800, "The three sentences"), createdAt: Date.now() });
  },
});

export const removeShield = mutation({
  args: { id: v.id("mmShield") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmShield", args.id);
    await ctx.db.delete(r._id);
  },
});

// Quest Log

export const quests = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const rows = [];
    for (const status of ["active", "done", "abandoned"] as const) {
      rows.push(...(await ctx.db.query("mmQuests").withIndex("by_owner_status", (q) => q.eq("ownerId", me.profile._id).eq("status", status)).take(50)));
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addQuest = mutation({
  args: { title: v.string(), kind: v.union(v.literal("main"), v.literal("side")) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    if (args.kind === "main") {
      const active = await ctx.db.query("mmQuests").withIndex("by_owner_status", (q) => q.eq("ownerId", me.profile._id).eq("status", "active")).collect();
      if (active.some((q) => q.kind === "main")) throw new ConvexError("One main quest at a time. Finish or set down the current one first; that's the rule that keeps this light.");
    }
    return await ctx.db.insert("mmQuests", { ownerId: me.profile._id, visibility: "private", title: cleanText(args.title, 200, "The quest"), kind: args.kind, status: "active", createdAt: Date.now() });
  },
});

export const closeQuest = mutation({
  args: { id: v.id("mmQuests"), status: v.union(v.literal("done"), v.literal("abandoned")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const q = await requireOwned(ctx, me, "mmQuests", args.id);
    await ctx.db.patch(q._id, { status: args.status, note: optionalText(args.note, 300, "Note"), closedAt: Date.now() });
  },
});

export const questToEveryBox = mutation({
  args: { id: v.id("mmQuests") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const q = await requireOwned(ctx, me, "mmQuests", args.id);
    if (q.sentToEveryBoxAt) throw new ConvexError("Already in Every Box.");
    await ctx.db.patch(q._id, { sentToEveryBoxAt: Date.now() });
    // The event carries only the title. Every Box never learns it came from this room.
    await emitEvent(ctx, { ownerId: me.profile._id, source: "hub", name: "project.sendToEveryBox", payload: { title: q.title } });
  },
});

// Iron

export const iron = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const weekKey = weekKeyOf(today);
    const open = await ctx.db.query("mmIron").withIndex("by_owner_status", (q) => q.eq("ownerId", me.profile._id).eq("status", "open")).collect();
    const kept = await ctx.db.query("mmIron").withIndex("by_owner_status", (q) => q.eq("ownerId", me.profile._id).eq("status", "kept")).take(100);
    const week = await ctx.db.query("mmIronWeek").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id).eq("weekKey", weekKey)).first();
    return { today, weekKey, open: open.sort((a, b) => (a.dueDay ?? "9999").localeCompare(b.dueDay ?? "9999")), kept: kept.sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0)), week };
  },
});

export const giveIron = mutation({
  args: { text: v.string(), dueDay: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    if (args.dueDay && !/^\d{4}-\d{2}-\d{2}$/.test(args.dueDay)) throw new ConvexError("Pick a day from the calendar.");
    return await ctx.db.insert("mmIron", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 300, "Your word"), dueDay: args.dueDay, status: "open", createdAt: Date.now() });
  },
});

export const closeIron = mutation({
  args: { id: v.id("mmIron"), status: v.union(v.literal("kept"), v.literal("didnt")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmIron", args.id);
    await ctx.db.patch(r._id, { status: args.status, note: optionalText(args.note, 300, "Note"), closedAt: Date.now() });
  },
});

export const removeIron = mutation({
  args: { id: v.id("mmIron") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmIron", args.id);
    await ctx.db.delete(r._id);
  },
});

export const ironWeek = mutation({
  args: { man: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const weekKey = weekKeyOf(dayKey(Date.now(), me.profile.timeZone));
    const man = cleanText(args.man, 120, "Who");
    const existing = await ctx.db.query("mmIronWeek").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id).eq("weekKey", weekKey)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { man });
      return existing._id;
    }
    return await ctx.db.insert("mmIronWeek", { ownerId: me.profile._id, visibility: "private", weekKey, man, createdAt: Date.now() });
  },
});

// The Compass

export const compass = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const weekKey = weekKeyOf(dayKey(Date.now(), me.profile.timeZone));
    const week = await ctx.db.query("mmCompass").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id).eq("weekKey", weekKey)).first();
    const earlier = await ctx.db.query("mmCompass").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(12);
    return { weekKey, week, earlier: earlier.filter((e) => e.weekKey !== weekKey) };
  },
});

export const setCompass = mutation({
  args: { lead: v.string(), decision: v.optional(v.string()), done: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const weekKey = weekKeyOf(dayKey(Date.now(), me.profile.timeZone));
    const existing = await ctx.db.query("mmCompass").withIndex("by_owner_week", (q) => q.eq("ownerId", me.profile._id).eq("weekKey", weekKey)).first();
    const fields = { lead: cleanText(args.lead, 300, "What I'll lead"), decision: optionalText(args.decision, 300, "The decision"), done: args.done };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("mmCompass", { ownerId: me.profile._id, visibility: "private", weekKey, ...fields, createdAt: Date.now() });
  },
});

// Seen

export const seen = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmSeen").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
  },
});

export const addSeen = mutation({
  args: { act: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmSeen", { ownerId: me.profile._id, visibility: "private", act: cleanText(args.act, 300, "The act"), done: false, createdAt: Date.now() });
  },
});

export const doneSeen = mutation({
  args: { id: v.id("mmSeen"), after: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmSeen", args.id);
    await ctx.db.patch(r._id, { done: true, after: optionalText(args.after, 400, "How it went"), doneAt: Date.now() });
  },
});

export const removeSeen = mutation({
  args: { id: v.id("mmSeen") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmSeen", args.id);
    await ctx.db.delete(r._id);
  },
});
