import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireMe } from "../lib";
import { notify } from "../push/notify";
import { hourIn } from "../push/pure";
import { currentMembership, requireCategory, requireMembership } from "./lib";
import { DAY_MS } from "./freshness";
import { daysWord, reminderDue } from "./remindersPure";

/**
 * "Remind me about this box" (2026-10-03, John's ask): each person chooses,
 * box by box, whether to be reminded, after how many untended days, at what
 * hour, by which ways (phone or computer notification, email, text), and
 * whether once or every day until it's tended. Rows are the person's own;
 * the partner never sees them. Nothing is counted or scored.
 */
const channels = v.object({ push: v.boolean(), email: v.boolean(), text: v.boolean() });

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) return [];
    const me = await requireMe(ctx);
    return await ctx.db.query("ebReminders").withIndex("by_profile", (q) => q.eq("profileId", me.profile._id)).collect();
  },
});

function check(afterDays: number, hour: number) {
  if (!Number.isInteger(afterDays) || afterDays < 1 || afterDays > 365) throw new ConvexError("Pick a number of days from 1 to 365.");
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new ConvexError("Pick an hour from 0 to 23.");
}

/** Turn a reminder on (or change it) for one box, or turn it off. */
export const set = mutation({
  args: { categoryId: v.id("ebCategories"), enabled: v.boolean(), afterDays: v.optional(v.number()), hour: v.optional(v.number()), everyDay: v.optional(v.boolean()), channels: v.optional(channels) },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const me = await requireMe(ctx);
    const category = await requireCategory(ctx, m, args.categoryId);
    const existing = (await ctx.db.query("ebReminders").withIndex("by_category", (q) => q.eq("categoryId", category._id)).collect()).find((r) => r.profileId === me.profile._id);
    if (!args.enabled) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }
    const afterDays = args.afterDays ?? existing?.afterDays ?? Math.max(1, category.idealCadenceDays);
    const hour = args.hour ?? existing?.hour ?? 9;
    check(afterDays, hour);
    const row = { afterDays, hour, everyDay: args.everyDay ?? existing?.everyDay ?? true, channels: args.channels ?? existing?.channels ?? { push: true, email: false, text: false } };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("ebReminders", { profileId: me.profile._id, householdId: m.household._id, categoryId: category._id, ...row, createdAt: Date.now() });
  },
});

/** The same reminder on every box at once (or off everywhere). "Spam me about all of it." */
export const setAll = mutation({
  args: { enabled: v.boolean(), afterDays: v.optional(v.number()), hour: v.optional(v.number()), everyDay: v.optional(v.boolean()), channels: v.optional(channels) },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const me = await requireMe(ctx);
    const mine = await ctx.db.query("ebReminders").withIndex("by_profile", (q) => q.eq("profileId", me.profile._id)).collect();
    if (!args.enabled) {
      for (const r of mine) await ctx.db.delete(r._id);
      return;
    }
    const hour = args.hour ?? 9;
    const boxes = (await ctx.db.query("ebCategories").withIndex("by_household", (q) => q.eq("householdId", m.household._id)).collect()).filter((c) => c.archivedAt === undefined);
    for (const c of boxes) {
      const afterDays = args.afterDays ?? Math.max(1, c.idealCadenceDays);
      check(afterDays, hour);
      const existing = mine.find((r) => r.categoryId === c._id);
      const row = { afterDays, hour, everyDay: args.everyDay ?? existing?.everyDay ?? true, channels: args.channels ?? existing?.channels ?? { push: true, email: false, text: false } };
      if (existing) await ctx.db.patch(existing._id, row);
      else await ctx.db.insert("ebReminders", { profileId: me.profile._id, householdId: m.household._id, categoryId: c._id, ...row, createdAt: Date.now() });
    }
  },
});

/** Once an hour (crons.ts): send whatever is due. */
export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("ebReminders").collect();
    for (const r of all) {
      const box = await ctx.db.get(r.categoryId);
      if (!box) {
        await ctx.db.delete(r._id);
        continue;
      }
      const p = await ctx.db.get(r.profileId);
      if (!p) continue;
      if (!reminderDue(r, box, hourIn(p.timeZone, now), now)) continue;
      const days = Math.floor((now - (box.lastTendedAt ?? box.createdAt)) / DAY_MS);
      const sent = await notify(ctx, p._id, {
        title: `${box.icon} ${box.name}`,
        body: box.lastTendedAt === undefined ? `Not done yet since it was added, ${daysWord(days)} ago. A small tending counts.` : `Last done ${daysWord(days)} ago. A small tending counts.`,
        url: `/every-box/box/${box._id}`,
        tag: `eb-remind-${box._id}`,
        channels: r.channels,
      });
      if (sent) await ctx.db.patch(r._id, { lastSentAt: now });
    }
  },
});
