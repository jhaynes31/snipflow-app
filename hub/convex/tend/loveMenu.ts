import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { emitEvent } from "../events";
import { access, cleanText, requireMe, requireOwned, requirePartner } from "../lib";

const column = v.union(v.literal("practical"), v.literal("emotional"), v.literal("spiritual"));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("tendLoveMenu")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .collect();
  },
});

/** The partner's menu, through the privacy gate. */
export const partners = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    return (await ctx.db
      .query("tendLoveMenu")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id))
      .collect()).filter((m) => access(me, m) === "full");
  },
});

export const add = mutation({
  args: { column, text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const existing = await ctx.db
      .query("tendLoveMenu")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id).eq("column", args.column))
      .collect();
    return await ctx.db.insert("tendLoveMenu", {
      ownerId: me.profile._id,
      visibility: "shared",
      column: args.column,
      text: cleanText(args.text, 120, "Item"),
      sortOrder: existing.reduce((m, x) => Math.max(m, x.sortOrder), 0) + 1,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("tendLoveMenu") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const item = await requireOwned(ctx, me, "tendLoveMenu", args.id);
    await ctx.db.delete(item._id);
  },
});

/** I did one of my partner's menu items. Records it and emits `loveAction.done`. */
export const did = mutation({
  args: { itemId: v.id("tendLoveMenu"), headsUpId: v.optional(v.id("headsUps")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.ownerId !== partner._id) throw new Error("That item isn't on your partner's menu.");
    await ctx.db.insert("tendLoveActions", {
      ownerId: me.profile._id,
      visibility: "shared",
      forProfileId: partner._id,
      itemText: item.text,
      headsUpId: args.headsUpId,
      createdAt: Date.now(),
    });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "tend",
      name: "loveAction.done",
      payload: { itemText: item.text, forProfileId: partner._id, headsUpId: args.headsUpId ?? null },
      visibility: "shared",
    });
  },
});

/** Recent love actions between us, newest first. Shared. */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const ids = [me.profile._id, ...(me.partner ? [me.partner._id] : [])];
    const rows = [];
    for (const id of ids) {
      rows.push(
        ...(await ctx.db
          .query("tendLoveActions")
          .withIndex("by_owner_time", (q) => q.eq("ownerId", id))
          .order("desc")
          .take(20)),
      );
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
  },
});
