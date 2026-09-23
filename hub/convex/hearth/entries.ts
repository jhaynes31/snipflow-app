import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, requireMe, requireOwned } from "../lib";
import { requireRoomOf } from "../rooms";

/**
 * The Hearth (2026-09-23): the third door in Re-Centered, one person's room
 * with a father's voice and a mother's voice for the daughter who didn't get
 * them. Two tables: What I know (lived wisdom, shareable one entry at a time)
 * and the little ones' letters (always private). Every read and write is
 * gated by the room claim on top of the owner check. Everything else in the
 * room is content in core/hearth and coach conversations under module "hearth".
 */
const ROOM = "hearth";
const WHO = v.union(v.literal("girl"), v.literal("teen"));

// ---------- What I know ----------

export const know = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRoomOf(ctx, ROOM);
    return await ctx.db.query("hhKnow").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect();
  },
});

export const addKnow = mutation({
  args: { topic: v.string(), title: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, ROOM);
    const now = Date.now();
    return await ctx.db.insert("hhKnow", {
      ownerId: me.profile._id,
      visibility: "private",
      topic: cleanText(args.topic, 40, "Topic"),
      title: cleanText(args.title, 120, "Title"),
      text: cleanText(args.text, 6000, "What you know"),
      ready: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateKnow = mutation({
  args: {
    id: v.id("hhKnow"),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    ready: v.optional(v.boolean()),
    shared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, ROOM);
    await requireOwned(ctx, me, "hhKnow", args.id);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = cleanText(args.title, 120, "Title");
    if (args.text !== undefined) patch.text = cleanText(args.text, 6000, "What you know");
    if (args.ready !== undefined) patch.ready = args.ready;
    if (args.shared !== undefined) patch.visibility = args.shared ? "shared" : "private";
    await ctx.db.patch(args.id, patch);
  },
});

export const removeKnow = mutation({
  args: { id: v.id("hhKnow") },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, ROOM);
    await requireOwned(ctx, me, "hhKnow", args.id);
    await ctx.db.delete(args.id);
  },
});

/** What the partner shared from their table. Read by the other person, on their partner page. */
export const sharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const rows = await ctx.db.query("hhKnow").withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id)).order("desc").collect();
    return rows.filter((r) => r.visibility === "shared").map((r) => ({ _id: r._id, topic: r.topic, title: r.title, text: r.text, updatedAt: r.updatedAt }));
  },
});

// ---------- The girl and the teenager ----------

export const letters = query({
  args: { who: WHO },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, ROOM);
    const rows = await ctx.db.query("hhLetters").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect();
    return rows.filter((r) => r.who === args.who);
  },
});

export const addLetter = mutation({
  args: { who: WHO, kind: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, ROOM);
    const kind = cleanText(args.kind, 20, "Kind");
    if (!["loved", "needed", "toHer", "fromHer", "right", "today"].includes(kind)) throw new ConvexError("That isn't one of the prompts.");
    return await ctx.db.insert("hhLetters", {
      ownerId: me.profile._id,
      visibility: "private",
      who: args.who,
      kind,
      text: cleanText(args.text, 6000, "The letter"),
      createdAt: Date.now(),
    });
  },
});

export const removeLetter = mutation({
  args: { id: v.id("hhLetters") },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, ROOM);
    await requireOwned(ctx, me, "hhLetters", args.id);
    await ctx.db.delete(args.id);
  },
});
