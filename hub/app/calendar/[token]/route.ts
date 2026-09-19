import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { buildFeed } from "@/core/calendar/ics";
import { APP_DISPLAY_NAME } from "@/core/config";

/**
 * The per-person calendar feed: a daily "how are you, really?" invite plus a
 * one-off event for each open heads-up the sender chose to put on the
 * calendar. The token in the URL is the person's secret from Settings.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return new Response("Calendar feed is not configured.", { status: 503 });
  const client = new ConvexHttpClient(url);
  const feed = await client.query(api.calendar.feedByToken, { token });
  if (!feed) return new Response("Not found", { status: 404 });

  const body = buildFeed({
    appName: APP_DISPLAY_NAME,
    siteUrl: request.nextUrl.origin,
    displayName: feed.displayName,
    dailyCheckInHour: feed.dailyCheckInHour,
    dailyCheckInMinute: feed.dailyCheckInMinute,
    headsUps: feed.headsUps,
    everyBoxWeeklyReview: feed.everyBoxWeeklyReview,
    words: feed.words,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="the-shire.ics"',
      "Cache-Control": "no-store",
    },
  });
}
