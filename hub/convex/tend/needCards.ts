import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe } from "../lib";

/**
 * Personalization of the "What I Need Right Now" cards by their owner: edit,
 * add, reorder, hide, star, and the agreed plan for cards that ask for one.
 * Shared so the partner's support view reads the owner's version. Every save
 * keeps the previous version for undo.
 */
const ITEM = v.object({ text: v.string(), hidden: v.boolean(), starred: v.boolean(), custom: v.boolean() });
const SECTION = v.object({ key: v.string(), items: v.array(ITEM) });

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("tnCardEdits").withIndex("by_owner_card", (q) => q.eq("ownerId", me.profile._id)).collect();
  },
});

/** The partner's edits, for the support view. */
export const partners = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    return await ctx.db.query("tnCardEdits").withIndex("by_owner_card", (q) => q.eq("ownerId", me.partner!._id)).collect();
  },
});

export const save = mutation({
  args: { cardId: v.string(), sections: v.array(SECTION), plan: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const cardId = cleanText(args.cardId, 40, "Card");
    const sections = args.sections.slice(0, 8).map((s) => ({ key: cleanText(s.key, 20, "Section"), items: s.items.slice(0, 40).map((i) => ({ ...i, text: cleanText(i.text, 300, "Item") })) }));
    const plan = optionalText(args.plan, 2000, "Plan");
    const existing = await ctx.db.query("tnCardEdits").withIndex("by_owner_card", (q) => q.eq("ownerId", me.profile._id).eq("cardId", cardId)).first();
    const now = Date.now();
    if (existing) {
      await ctx.db.insert("tnCardHistory", { ownerId: me.profile._id, visibility: "private", cardId, snapshot: JSON.stringify({ sections: existing.sections, plan: existing.plan }), at: now });
      await ctx.db.patch(existing._id, { sections, plan, updatedAt: now });
    } else {
      await ctx.db.insert("tnCardEdits", { ownerId: me.profile._id, visibility: "shared", cardId, sections, plan, updatedAt: now });
    }
    // Keep the last twenty versions per card.
    const hist = await ctx.db.query("tnCardHistory").withIndex("by_owner_card", (q) => q.eq("ownerId", me.profile._id).eq("cardId", cardId)).collect();
    for (const h of hist.sort((a, b) => a.at - b.at).slice(0, Math.max(0, hist.length - 20))) await ctx.db.delete(h._id);
  },
});

export const historyCount = query({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return (await ctx.db.query("tnCardHistory").withIndex("by_owner_card", (q) => q.eq("ownerId", me.profile._id).eq("cardId", args.cardId)).collect()).length;
  },
});

/** Put back the previous version and drop it from the history. */
export const undo = mutation({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const hist = await ctx.db.query("tnCardHistory").withIndex("by_owner_card", (q) => q.eq("ownerId", me.profile._id).eq("cardId", args.cardId)).collect();
    const last = hist.sort((a, b) => b.at - a.at)[0];
    if (!last) return false;
    const existing = await ctx.db.query("tnCardEdits").withIndex("by_owner_card", (q) => q.eq("ownerId", me.profile._id).eq("cardId", args.cardId)).first();
    const snap = JSON.parse(last.snapshot) as { sections: { key: string; items: { text: string; hidden: boolean; starred: boolean; custom: boolean }[] }[]; plan?: string };
    if (existing) await ctx.db.patch(existing._id, { sections: snap.sections, plan: snap.plan, updatedAt: Date.now() });
    await ctx.db.delete(last._id);
    return true;
  },
});
