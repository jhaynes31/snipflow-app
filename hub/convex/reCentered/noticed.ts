import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { optionalText, requireOwned } from "../lib";
import { notifyPartner, who } from "../push/notify";
import { requireRoom } from "./room";
import { cleanEvidence, monthKey, pickHardDay, WAYS } from "./noticedPure";

/**
 * Noticed (2026-11-16): a gratitude journal and evidence log about her
 * husband and their marriage. Every row is hers, in her room. One entry
 * can be sent to him on purpose; otherwise nothing leaves.
 */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoom(ctx);
    return await ctx.db.query("rcNoticed").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(400);
  },
});

export const add = mutation({
  args: { ways: v.array(v.string()), didWell: v.optional(v.string()), grateful: v.optional(v.string()), evidence: v.optional(v.array(v.object({ line: v.string(), note: v.optional(v.string()) }))), day: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const ways = args.ways.map((w) => w.trim().slice(0, 80)).filter(Boolean).slice(0, 20);
    const didWell = optionalText(args.didWell, 2000, "What he did well");
    const grateful = optionalText(args.grateful, 2000, "What I'm grateful for");
    if (!ways.length && !didWell && !grateful) throw new ConvexError("Tap a way, or write a line.");
    const day = args.day && /^\d{4}-\d{2}-\d{2}$/.test(args.day) ? args.day : new Date().toISOString().slice(0, 10);
    return await ctx.db.insert("rcNoticed", { ownerId: me.profile._id, visibility: "private", day, ways, didWell, grateful, evidence: cleanEvidence(args.evidence), createdAt: Date.now() });
  },
});

export const edit = mutation({
  args: { id: v.id("rcNoticed"), ways: v.optional(v.array(v.string())), didWell: v.optional(v.string()), grateful: v.optional(v.string()), evidence: v.optional(v.array(v.object({ line: v.string(), note: v.optional(v.string()) }))) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcNoticed", args.id);
    await ctx.db.patch(row._id, {
      ...(args.ways ? { ways: args.ways.map((w) => w.trim().slice(0, 80)).filter(Boolean).slice(0, 20) } : {}),
      ...(args.didWell !== undefined ? { didWell: optionalText(args.didWell, 2000, "What he did well") } : {}),
      ...(args.grateful !== undefined ? { grateful: optionalText(args.grateful, 2000, "What I'm grateful for") } : {}),
      ...(args.evidence !== undefined ? { evidence: cleanEvidence(args.evidence), evidenceAgainst: undefined } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("rcNoticed") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcNoticed", args.id);
    await ctx.db.delete(row._id);
  },
});

/** "Tell him": one entry, as a short note by whatever ways he chose. Off by default; this is the on-purpose switch. */
export const share = mutation({
  args: { id: v.id("rcNoticed") },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const row = await requireOwned(ctx, me, "rcNoticed", args.id);
    if (!me.partner) throw new ConvexError("Your partner hasn't joined yet.");
    const line = [row.ways.length ? row.ways.join(", ").toLowerCase() : "", row.didWell ?? "", row.grateful ?? ""].filter(Boolean).join(". ").slice(0, 160);
    await notifyPartner(ctx, me, { title: `${who(me)} noticed`, body: line || "Something you did today.", url: "/", tag: `noticed-${row._id}` });
    await ctx.db.patch(row._id, { sharedAt: Date.now(), visibility: "shared" });
  },
});

/** A handful of past entries for a hard day, steady for the day. */
export const hardDay = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoom(ctx);
    const rows = await ctx.db.query("rcNoticed").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(400);
    return pickHardDay(rows, new Date().toISOString().slice(0, 10));
  },
});

export const month = query({
  args: { month: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireRoom(ctx);
    const key = args.month && /^\d{4}-\d{2}$/.test(args.month) ? args.month : monthKey(Date.now());
    const rows = (await ctx.db.query("rcNoticed").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(400)).filter((r) => r.day.startsWith(key));
    const months = [...new Set((await ctx.db.query("rcNoticed").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(400)).map((r) => r.day.slice(0, 7)))];
    return { key, rows, months, partnerName: me.partner?.displayName ?? "him" };
  },
});

/** The old lines she's working on, from Renewed Mind, Rooted's loop beliefs, and the Loop Map, so an entry can be filed as evidence against one. */
export const oldLines = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoom(ctx);
    const rm = (await ctx.db.query("rmBeliefs").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect()).filter((b) => !b.retiredAt).map((b) => b.oldLine);
    const loops = await ctx.db.query("lpLoops").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    const lp: string[] = [];
    for (const l of loops) for (const b of await ctx.db.query("lpBeliefs").withIndex("by_loop", (q) => q.eq("loopId", l._id)).collect()) lp.push(b.text);
    return [...new Set([...rm, ...lp])].slice(0, 30);
  },
});

export const ways = query({ args: {}, handler: async () => [...WAYS] });
