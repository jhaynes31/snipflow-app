import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireOwned } from "../lib";
import { dayKey } from "../tend/patterns";
import { requireRoomOf } from "../rooms";

const ROOM = "metamorphosis";
const room = (ctx: Parameters<typeof requireRoomOf>[0]) => requireRoomOf(ctx, ROOM);

/**
 * Metamorphosis, step 1: the Character Sheet, the Mirror (survival first),
 * and the Map. Every row is his and private; there is no share switch.
 */

// Character Sheet

export const sheet = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmSheet").withIndex("by_owner_key", (q) => q.eq("ownerId", me.profile._id)).collect();
  },
});

export const saveSheet = mutation({
  args: { key: v.string(), text: v.string(), coachAllowed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const key = cleanText(args.key, 40, "Key");
    const text = args.text.trim();
    if (text.length > 2000) throw new ConvexError("That answer is long (max 2000 characters).");
    const existing = await ctx.db.query("mmSheet").withIndex("by_owner_key", (q) => q.eq("ownerId", me.profile._id).eq("key", key)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { text, coachAllowed: args.coachAllowed ?? existing.coachAllowed, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("mmSheet", { ownerId: me.profile._id, visibility: "private", key, text, coachAllowed: args.coachAllowed ?? false, updatedAt: Date.now() });
  },
});

// The Mirror

export const mirrorToday = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const rows = await ctx.db.query("mmMirror").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
    return { today, todays: rows.find((r) => r.day === today) ?? null, recent: rows };
  },
});

export const mirror = mutation({
  args: {
    survival: v.boolean(),
    feeling: v.optional(v.string()),
    under: v.optional(v.string()),
    body: v.optional(v.string()),
    want: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmMirror", {
      ownerId: me.profile._id,
      visibility: "private",
      day: dayKey(Date.now(), me.profile.timeZone),
      survival: args.survival,
      feeling: optionalText(args.feeling, 300, "Feeling"),
      under: optionalText(args.under, 200, "What's under it"),
      body: optionalText(args.body, 300, "Body"),
      want: optionalText(args.want, 300, "What I want"),
      createdAt: Date.now(),
    });
  },
});

export const removeMirror = mutation({
  args: { id: v.id("mmMirror") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmMirror", args.id);
    await ctx.db.delete(r._id);
  },
});

// The Map

export const maps = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmMaps").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30);
  },
});

export const addMap = mutation({
  args: { levels: v.array(v.object({ key: v.string(), text: v.string() })) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const levels = args.levels.map((l) => ({ key: cleanText(l.key, 20, "Level"), text: l.text.trim().slice(0, 600) })).filter((l) => l.text);
    if (levels.length === 0) throw new ConvexError("Write at least the one thing.");
    return await ctx.db.insert("mmMaps", { ownerId: me.profile._id, visibility: "private", levels, createdAt: Date.now() });
  },
});

export const removeMap = mutation({
  args: { id: v.id("mmMaps") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmMaps", args.id);
    await ctx.db.delete(r._id);
  },
});

/** Plain-text export of everything in the room so far. His to keep, or to hand a therapist. */
export const exportMine = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const id = me.profile._id;
    const [sheet, mirror, maps] = await Promise.all([
      ctx.db.query("mmSheet").withIndex("by_owner_key", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("mmMirror").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("mmMaps").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
    ]);
    const lines = [`Metamorphosis: ${me.profile.displayName}'s room`, "", "Character Sheet"];
    for (const s of sheet) lines.push(`${s.key}: ${s.text}`);
    lines.push("", "The Mirror");
    for (const m of mirror) lines.push(`${m.day}: ${m.survival ? "survival. " : ""}${[m.feeling, m.under && `under: ${m.under}`, m.body && `body: ${m.body}`, m.want && `want: ${m.want}`].filter(Boolean).join(" / ")}`);
    lines.push("", "The Map");
    for (const m of maps) lines.push(`${new Date(m.createdAt).toISOString().slice(0, 10)}: ${m.levels.map((l) => `${l.key}: ${l.text}`).join(" | ")}`);
    return lines.join("\n");
  },
});
