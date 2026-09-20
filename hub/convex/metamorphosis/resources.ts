import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireOwned } from "../lib";
import { requireRoomOf } from "../rooms";
import { FEEDS } from "./rss";

const ROOM = "metamorphosis";
const room = (ctx: Parameters<typeof requireRoomOf>[0]) => requireRoomOf(ctx, ROOM);

/**
 * The Field Guide's data. His shelf rows are his and private, like every
 * other row in the room. Feed items are a shared cache of public headlines
 * (title, link, teaser, date), refreshed daily by feeds.ts and readable only
 * from inside the room.
 */

/** New pieces from the feeds, newest first, with the feed's name attached. */
export const fresh = query({
  args: {},
  handler: async (ctx) => {
    await room(ctx);
    const out = [];
    for (const feed of FEEDS) {
      const rows = await ctx.db.query("mmFeedItems").withIndex("by_feed", (q) => q.eq("feedKey", feed.key)).collect();
      out.push(...rows.map((r) => ({ ...r, feedName: feed.name })));
    }
    return out.sort((a, b) => (b.publishedAt ?? b.fetchedAt) - (a.publishedAt ?? a.fetchedAt));
  },
});

/** His shelf: what he kept from the feeds and what he added himself. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const rows = await ctx.db.query("mmResources").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

function checkUrl(url: string): string {
  const u = url.trim();
  if (!/^https?:\/\/\S+$/i.test(u)) throw new ConvexError("That doesn't look like a web address. It should start with http:// or https://.");
  return u.slice(0, 500);
}

export const add = mutation({
  args: { title: v.string(), url: v.string(), note: v.optional(v.string()), source: v.optional(v.union(v.literal("feed"), v.literal("own"))), questId: v.optional(v.id("mmQuests")) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const url = checkUrl(args.url);
    const existing = await ctx.db.query("mmResources").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    if (existing.some((r) => r.url === url)) throw new ConvexError("That one is already on your shelf.");
    if (args.questId) await requireOwned(ctx, me, "mmQuests", args.questId);
    return await ctx.db.insert("mmResources", {
      ownerId: me.profile._id,
      visibility: "private",
      title: cleanText(args.title, 200, "The title"),
      url,
      note: optionalText(args.note, 300, "Note"),
      source: args.source ?? "own",
      questId: args.questId,
      createdAt: Date.now(),
    });
  },
});

export const pin = mutation({
  args: { id: v.id("mmResources"), questId: v.optional(v.id("mmQuests")) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "mmResources", args.id);
    if (args.questId) await requireOwned(ctx, me, "mmQuests", args.questId);
    await ctx.db.patch(row._id, { questId: args.questId });
  },
});

export const remove = mutation({
  args: { id: v.id("mmResources") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "mmResources", args.id);
    await ctx.db.delete(row._id);
  },
});

/** When the cache was last filled (the oldest feed's fetch time), or null when empty. */
export const lastFetched = internalQuery({
  args: {},
  handler: async (ctx) => {
    let oldest: number | null = null;
    for (const feed of FEEDS) {
      const row = await ctx.db.query("mmFeedItems").withIndex("by_feed", (q) => q.eq("feedKey", feed.key)).first();
      if (!row) return null;
      oldest = oldest === null ? row.fetchedAt : Math.min(oldest, row.fetchedAt);
    }
    return oldest;
  },
});

/** Replaces one feed's cached headlines. Called only by feeds.ts. */
export const storeFeed = internalMutation({
  args: {
    feedKey: v.string(),
    items: v.array(v.object({ title: v.string(), url: v.string(), teaser: v.string(), publishedAt: v.union(v.number(), v.null()) })),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) return; // A bad fetch never wipes what was there.
    const old = await ctx.db.query("mmFeedItems").withIndex("by_feed", (q) => q.eq("feedKey", args.feedKey)).collect();
    for (const row of old) await ctx.db.delete(row._id);
    const now = Date.now();
    for (const item of args.items.slice(0, 12)) {
      await ctx.db.insert("mmFeedItems", { feedKey: args.feedKey, title: item.title, url: item.url, teaser: item.teaser, publishedAt: item.publishedAt ?? undefined, fetchedAt: now });
    }
  },
});
