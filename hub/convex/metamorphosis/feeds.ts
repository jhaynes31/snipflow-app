"use node";

import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { FEEDS, parseFeed } from "./rss";

/**
 * Once a day, fetch each feed and cache its newest headlines for the Field
 * Guide. A feed that fails or comes back empty is left as it was, so a site
 * changing its format shows yesterday's list rather than nothing. Nothing
 * else is fetched, and no article text is stored.
 */
async function fetchAll(ctx: ActionCtx): Promise<void> {
  for (const feed of FEEDS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      const res = await fetch(feed.url, { signal: controller.signal, headers: { "user-agent": "TheShire/1.0 (+private household app)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
      clearTimeout(timer);
      if (!res.ok) {
        console.error(`Field Guide: ${feed.name} answered ${res.status}.`);
        continue;
      }
      const items = parseFeed(await res.text());
      if (items.length === 0) {
        console.error(`Field Guide: ${feed.name} gave no items; keeping the last list.`);
        continue;
      }
      await ctx.runMutation(internal.metamorphosis.resources.storeFeed, { feedKey: feed.key, items });
    } catch (err) {
      console.error(`Field Guide: could not fetch ${feed.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export const tick = internalAction({
  args: {},
  handler: async (ctx) => {
    await fetchAll(ctx);
  },
});

const STALE_MS = 20 * 60 * 60 * 1000;

/**
 * Opening the Field Guide asks for a refresh; it only fetches when the cache
 * is empty or older than twenty hours, so the sites see at most one visit a
 * day from here. Only the room's owner can ask.
 */
export const refresh = action({
  args: {},
  handler: async (ctx): Promise<{ fetched: boolean }> => {
    const room = await ctx.runQuery(api.rooms.status, { moduleId: "metamorphosis" });
    if (room.state !== "mine") throw new ConvexError("This room isn't yours.");
    const last = await ctx.runQuery(internal.metamorphosis.resources.lastFetched, {});
    if (last && Date.now() - last < STALE_MS) return { fetched: false };
    await fetchAll(ctx);
    return { fetched: true };
  },
});
