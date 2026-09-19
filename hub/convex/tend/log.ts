import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { emitEvent } from "../events";
import { access, requireMe, requireOwned } from "../lib";
import { dayKey, forecastFrom, WEATHER_SCORE, type DayPoint } from "./patterns";
import { readTendSettings } from "./pure";

/** My check-ins and sleep, folded into one point per day (oldest first). Private. */
export const points = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const span = Math.min(180, Math.max(7, args.days ?? 60));
    const since = Date.now() - span * 86_400_000;
    const tz = me.profile.timeZone;
    const checkIns = (await ctx.db
      .query("checkIns")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id).gte("createdAt", since))
      .collect()).filter((c) => !c.justLogging || c.weather);
    const sleep = await ctx.db
      .query("tendSleep")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id))
      .collect();
    const byDay = new Map<string, DayPoint>();
    for (const c of checkIns) {
      const day = dayKey(c.createdAt, tz);
      const p = byDay.get(day) ?? { day, weather: null, energy: null, sleep: null };
      if (c.weather) p.weather = WEATHER_SCORE[c.weather] ?? p.weather;
      if (c.energy) p.energy = c.energy;
      byDay.set(day, p);
    }
    for (const s of sleep) {
      if (s.day < dayKey(since, tz)) continue;
      const p = byDay.get(s.day) ?? { day: s.day, weather: null, energy: null, sleep: null };
      p.sleep = s.hours;
      byDay.set(s.day, p);
    }
    return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
  },
});

export const setSleep = mutation({
  args: { day: v.string(), hours: v.number() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.day)) throw new Error("Pick a day.");
    const hours = Math.min(16, Math.max(0, Math.round(args.hours * 2) / 2));
    const existing = await ctx.db
      .query("tendSleep")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id).eq("day", args.day))
      .first();
    if (existing) await ctx.db.patch(existing._id, { hours });
    else await ctx.db.insert("tendSleep", { ownerId: me.profile._id, visibility: "private", day: args.day, hours, createdAt: Date.now() });
  },
});

/** My cycle starts (days) and my forecast. Private. */
export const cycle = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const starts = await ctx.db
      .query("tendCycleStarts")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id))
      .collect();
    const settings = readTendSettings(me.profile.moduleSettings);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const days = starts.map((s) => s.day).sort();
    return { starts: days, forecast: forecastFrom(days, settings.tenderBefore, settings.tenderAfter, today), today };
  },
});

export const addCycleStart = mutation({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.day)) throw new Error("Pick a day.");
    const existing = await ctx.db
      .query("tendCycleStarts")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id).eq("day", args.day))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("tendCycleStarts", { ownerId: me.profile._id, visibility: "private", day: args.day, createdAt: Date.now() });
  },
});

export const removeCycleStart = mutation({
  args: { id: v.id("tendCycleStarts") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "tendCycleStarts", args.id);
    await ctx.db.delete(row._id);
  },
});

export const cycleStartRows = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("tendCycleStarts")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id))
      .collect();
  },
});

/**
 * The partner's forecast, as a shared summary: only the tender window's
 * dates, only when they turned sharing on. Never the underlying dates.
 */
export const partnerForecast = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return null;
    const settings = readTendSettings(me.partner.moduleSettings);
    if (!settings.shareForecast) return null;
    const starts = await ctx.db
      .query("tendCycleStarts")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.partner!._id))
      .collect();
    // Belt and braces: every row is private; the summary is the only thing that leaves.
    if (starts.some((s) => access(me, s) === "full")) return null;
    const today = dayKey(Date.now(), me.profile.timeZone);
    const f = forecastFrom(starts.map((s) => s.day), settings.tenderBefore, settings.tenderAfter, today);
    if (!f) return null;
    return { name: me.partner.displayName, tenderStart: f.tenderStart, tenderEnd: f.tenderEnd, today };
  },
});

/**
 * Emit `forecast.tenderWeek` once per window, a few days ahead, when the
 * person has sharing on. Called by Tend's screens; idempotent.
 */
export const announceTenderWeek = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const settings = readTendSettings(me.profile.moduleSettings);
    if (!settings.shareForecast) return null;
    const starts = await ctx.db
      .query("tendCycleStarts")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id))
      .collect();
    const today = dayKey(Date.now(), me.profile.timeZone);
    const f = forecastFrom(starts.map((s) => s.day), settings.tenderBefore, settings.tenderAfter, today);
    if (!f) return null;
    const lead = Math.round((Date.parse(f.tenderStart) - Date.parse(today)) / 86_400_000);
    if (lead > 3 || lead < -settings.tenderBefore) return null;
    const already = (await ctx.db
      .query("events")
      .withIndex("by_name", (q) => q.eq("name", "forecast.tenderWeek"))
      .order("desc")
      .take(20)).find((e) => e.ownerId === me.profile._id && (e.payload as { tenderStart?: string })?.tenderStart === f.tenderStart);
    if (already) return null;
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "tend",
      name: "forecast.tenderWeek",
      payload: { tenderStart: f.tenderStart, tenderEnd: f.tenderEnd },
      visibility: "sharedSummary",
    });
    return f.tenderStart;
  },
});
