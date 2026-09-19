import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { access, cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { STARTER } from "./starter";

/** My own guidance entries, in order. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("tendGuidance")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .collect();
  },
});

/**
 * The guidance card for a heads-up I received: the sender's entries that
 * match the kinds they picked (entries with no kinds always apply), plus
 * their manual's shared lines. Nothing private to the sender leaks: the
 * privacy gate decides every line.
 */
export const forHeadsUp = query({
  args: { headsUpId: v.id("headsUps") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const card = await ctx.db.get(args.headsUpId);
    if (!card || card.receiverId !== me.profile._id) return null;
    const kinds = new Set(card.kinds ?? []);
    const entries = (await ctx.db
      .query("tendGuidance")
      .withIndex("by_owner", (q) => q.eq("ownerId", card.ownerId))
      .collect())
      .filter((g) => access(me, g) === "full")
      .filter((g) => g.kinds.length === 0 || g.kinds.some((k) => kinds.has(k)));
    const senderSettings = (await ctx.db.get(card.ownerId))?.moduleSettings?.tend as { faith?: boolean } | undefined;
    const mySettings = me.profile.moduleSettings?.tend as { faith?: boolean } | undefined;
    const showPray = (senderSettings?.faith ?? true) && (mySettings?.faith ?? true);
    const menu = (await ctx.db
      .query("tendLoveMenu")
      .withIndex("by_owner", (q) => q.eq("ownerId", card.ownerId))
      .collect()).filter((m) => access(me, m) === "full");
    return { entries, showPray, loveMenu: menu, kinds: card.kinds ?? [], help: card.help };
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("tendGuidance")),
    title: v.string(),
    kinds: v.array(v.string()),
    do: v.string(),
    say: v.string(),
    skip: v.string(),
    pray: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const fields = {
      title: cleanText(args.title, 80, "When I'm…"),
      kinds: args.kinds.slice(0, 12),
      do: optionalText(args.do, 400, "Do") ?? "",
      say: optionalText(args.say, 400, "Say") ?? "",
      skip: optionalText(args.skip, 400, "Skip") ?? "",
      pray: optionalText(args.pray, 400, "Pray"),
      updatedAt: Date.now(),
    };
    if (args.id) {
      const g = await requireOwned(ctx, me, "tendGuidance", args.id);
      await ctx.db.patch(g._id, fields);
      return g._id;
    }
    const existing = await ctx.db
      .query("tendGuidance")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .collect();
    return await ctx.db.insert("tendGuidance", {
      ownerId: me.profile._id,
      visibility: "shared",
      sortOrder: existing.reduce((m, g) => Math.max(m, g.sortOrder), 0) + 1,
      ...fields,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("tendGuidance") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const g = await requireOwned(ctx, me, "tendGuidance", args.id);
    await ctx.db.delete(g._id);
  },
});

/** Seed the starter set the person chooses. Only when they have no entries yet. */
export const seedStarter = mutation({
  args: { set: v.union(v.literal("john"), v.literal("jen")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const existing = await ctx.db
      .query("tendGuidance")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .first();
    if (existing) throw new ConvexError("You already have guidance entries. Add to them instead.");
    let i = 1;
    for (const g of STARTER[args.set]) {
      await ctx.db.insert("tendGuidance", {
        ownerId: me.profile._id,
        visibility: "shared",
        title: g.title,
        kinds: g.kinds,
        do: g.do,
        say: g.say,
        skip: g.skip,
        sortOrder: i++,
        updatedAt: Date.now(),
      });
    }
  },
});
