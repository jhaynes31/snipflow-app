import { v } from "convex/values";
import { query } from "./_generated/server";
import { firstName } from "./lib";
import { wordsForCalendar } from "./keptWord/words";
import { billsForCalendar } from "./storehouse/money";

/**
 * Backs the per-person calendar feed at `/calendar/<token>`. The token is a
 * secret only the owner sees in Settings, which is what lets a calendar app
 * fetch the feed without a login. Regenerating the token in Settings cuts
 * off any old subscription.
 */
export const feedByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (args.token.length < 16) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_calendar_token", (q) => q.eq("calendarToken", args.token))
      .first();
    if (!profile) return null;
    const open = await ctx.db
      .query("headsUps")
      .withIndex("by_receiver_status", (q) => q.eq("receiverId", profile._id).eq("status", "open"))
      .collect();
    const senders = new Map<string, string>();
    for (const card of open) {
      if (!card.addToCalendar) continue;
      if (!senders.has(card.ownerId)) {
        const s = await ctx.db.get(card.ownerId);
        senders.set(card.ownerId, s ? firstName(s.displayName) : "Your partner");
      }
    }
    const eb = (profile.moduleSettings?.["every-box"] ?? {}) as { weeklyReviewOnCalendar?: boolean };
    const words = await wordsForCalendar(ctx, profile);
    const bills = await billsForCalendar(ctx);
    return {
      bills,
      displayName: profile.displayName,
      everyBoxWeeklyReview: eb.weeklyReviewOnCalendar === true,
      words,
      timeZone: profile.timeZone,
      dailyCheckInHour: profile.reminders.dailyCheckInHour,
      dailyCheckInMinute: profile.reminders.dailyCheckInMinute,
      headsUps: open
        .filter((c) => c.addToCalendar)
        .map((c) => ({
          id: c._id,
          from: senders.get(c.ownerId) ?? "Your partner",
          statusLine: c.statusLine,
          urgent: c.urgent,
          createdAt: c.createdAt,
        })),
    };
  },
});
