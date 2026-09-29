import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { cleanText, requireMe, requireOwned } from "../lib";

/**
 * Someone in my circle (2026-09-29, Jen's ask): a box for what you know
 * about a person you are letting in, with green and red flags you tap,
 * and the coach's sort of it into buckets. Each person's rows are their
 * own; nothing here is shared and nothing is counted.
 */

const sortValidator = v.object({
  green: v.array(v.string()),
  red: v.array(v.string()),
  confront: v.array(v.string()),
  monitor: v.array(v.string()),
  unclear: v.array(v.string()),
  line: v.string(),
});

function cleanFlags(list: string[], label: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const flag = raw.trim().slice(0, 120);
    if (!flag || seen.has(flag.toLowerCase())) continue;
    seen.add(flag.toLowerCase());
    out.push(flag);
  }
  if (out.length > 40) throw new ConvexError(`${label}: that's a lot of flags at once (max 40).`);
  return out;
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("rcCircle").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(300);
  },
});

export const add = mutation({
  args: { name: v.string(), text: v.string(), green: v.array(v.string()), red: v.array(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("rcCircle", {
      ownerId: me.profile._id,
      visibility: "private",
      name: cleanText(args.name, 80, "Their name"),
      text: cleanText(args.text, 20000, "What you know so far"),
      green: cleanFlags(args.green, "Green flags"),
      red: cleanFlags(args.red, "Red flags"),
      createdAt: Date.now(),
    });
  },
});

/** Change the note or the flags later. Clears the coach's sort, since it was about the old words. */
export const edit = mutation({
  args: { id: v.id("rcCircle"), name: v.string(), text: v.string(), green: v.array(v.string()), red: v.array(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rcCircle", args.id);
    await ctx.db.patch(row._id, {
      name: cleanText(args.name, 80, "Their name"),
      text: cleanText(args.text, 20000, "What you know so far"),
      green: cleanFlags(args.green, "Green flags"),
      red: cleanFlags(args.red, "Red flags"),
      sort: undefined,
      sortedAt: undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("rcCircle") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rcCircle", args.id);
    await ctx.db.delete(row._id);
  },
});

/** For the sort action: the row, only if it's the signed-in person's. */
export const forSort = internalQuery({
  args: { id: v.id("rcCircle") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rcCircle", args.id);
    return { name: row.name, text: row.text, green: row.green, red: row.red, displayName: me.profile.displayName, partnerName: me.partner?.displayName ?? null };
  },
});

export const setSort = internalMutation({
  args: { id: v.id("rcCircle"), sort: sortValidator },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rcCircle", args.id);
    await ctx.db.patch(row._id, { sort: args.sort, sortedAt: Date.now() });
  },
});
