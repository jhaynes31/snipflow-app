import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { dayKey } from "../tend/patterns";
import { AREAS, areaName, patterns } from "./pure";

/**
 * The Apothecary: symptom entries, the daily factors line, the cabinet,
 * and the person's own conditions and zip. Every row is private to the
 * person; nothing here is shared or read by the partner, ever.
 */

const side = v.union(v.literal("left"), v.literal("right"), v.literal("both"), v.literal("n/a"));

function settingsOf(moduleSettings: Record<string, unknown> | undefined): { conditions: string[]; zip: string | null } {
  const raw = (moduleSettings?.apothecary ?? {}) as { conditions?: unknown; zip?: unknown };
  return { conditions: Array.isArray(raw.conditions) ? (raw.conditions as string[]) : [], zip: typeof raw.zip === "string" && raw.zip ? raw.zip : null };
}

export const settings = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return settingsOf(me.profile.moduleSettings);
  },
});

export const setSettings = mutation({
  args: { conditions: v.optional(v.array(v.string())), zip: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const cur = settingsOf(me.profile.moduleSettings);
    const next = {
      conditions: args.conditions ? args.conditions.map((c) => c.slice(0, 40)).slice(0, 12) : cur.conditions,
      zip: args.zip === undefined ? cur.zip : args.zip ? args.zip.replace(/[^0-9A-Za-z -]/g, "").slice(0, 10) : null,
    };
    await ctx.db.patch(me.profile._id, { moduleSettings: { ...me.profile.moduleSettings, apothecary: next } });
  },
});

// Entries

export const entries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("apEntries").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(Math.min(500, args.limit ?? 60));
  },
});

export const addEntry = mutation({
  args: { area: v.string(), side, qualities: v.array(v.string()), severity: v.number(), onset: v.optional(v.string()), duration: v.optional(v.string()), text: v.string(), tried: v.optional(v.string()), helped: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const area = AREAS.some((a) => a.key === args.area) ? args.area : "whole";
    return await ctx.db.insert("apEntries", {
      ownerId: me.profile._id,
      visibility: "private",
      day: dayKey(Date.now(), me.profile.timeZone),
      area,
      side: args.side,
      qualities: args.qualities.map((q) => q.slice(0, 30)).slice(0, 12),
      severity: Math.min(5, Math.max(1, Math.round(args.severity))),
      onset: optionalText(args.onset, 40, "Onset"),
      duration: optionalText(args.duration, 80, "How long"),
      text: cleanText(args.text, 2000, "What's going on"),
      tried: optionalText(args.tried, 600, "What you tried"),
      helped: optionalText(args.helped, 600, "What helped"),
      createdAt: Date.now(),
    });
  },
});

export const updateEntry = mutation({
  args: { id: v.id("apEntries"), tried: v.optional(v.string()), helped: v.optional(v.string()), severity: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const e = await requireOwned(ctx, me, "apEntries", args.id);
    await ctx.db.patch(e._id, {
      ...(args.tried !== undefined ? { tried: optionalText(args.tried, 600, "What you tried") } : {}),
      ...(args.helped !== undefined ? { helped: optionalText(args.helped, 600, "What helped") } : {}),
      ...(args.severity !== undefined ? { severity: Math.min(5, Math.max(1, Math.round(args.severity))) } : {}),
    });
  },
});

export const removeEntry = mutation({
  args: { id: v.id("apEntries") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const e = await requireOwned(ctx, me, "apEntries", args.id);
    await ctx.db.delete(e._id);
  },
});

// The daily line

export const days = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const rows = await ctx.db.query("apDays").withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(120);
    return { today, todayRow: rows.find((r) => r.day === today) ?? null, rows };
  },
});

export const setDay = mutation({
  args: { factors: v.array(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const day = dayKey(Date.now(), me.profile.timeZone);
    const factors = [...new Set(args.factors.map((f) => f.slice(0, 30)))].slice(0, 24);
    const note = optionalText(args.note, 300, "Note");
    const existing = await ctx.db.query("apDays").withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id).eq("day", day)).first();
    if (existing) await ctx.db.patch(existing._id, { factors, note });
    else await ctx.db.insert("apDays", { ownerId: me.profile._id, visibility: "private", day, factors, note, createdAt: Date.now() });
  },
});

// Patterns

export const patternLines = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const es = await ctx.db.query("apEntries").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(500);
    const ds = await ctx.db.query("apDays").withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(365);
    const byArea: Record<string, number> = {};
    for (const e of es) byArea[e.area] = (byArea[e.area] ?? 0) + 1;
    return { lines: patterns(es, ds, areaName), byArea, entries: es.length, days: ds.length };
  },
});

// The cabinet

export const cabinet = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return (await ctx.db.query("apCabinet").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect()).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const addToCabinet = mutation({
  args: { name: v.string(), kind: v.union(v.literal("herb"), v.literal("tincture"), v.literal("supplement"), v.literal("topical"), v.literal("tool"), v.literal("medication")), forWhat: v.optional(v.string()), amount: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("apCabinet", { ownerId: me.profile._id, visibility: "private", name: cleanText(args.name, 80, "The name"), kind: args.kind, forWhat: optionalText(args.forWhat, 200, "What for"), amount: optionalText(args.amount, 80, "How much"), createdAt: Date.now() });
  },
});

export const removeFromCabinet = mutation({
  args: { id: v.id("apCabinet") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "apCabinet", args.id);
    await ctx.db.delete(row._id);
  },
});
