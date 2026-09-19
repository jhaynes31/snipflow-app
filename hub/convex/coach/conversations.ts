import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { access, cleanText, requireMe, requireOwned } from "../lib";
import { readTendSettings } from "../tend/pure";
import { MANUAL_SECTION_TITLES } from "./titles";
import type { ManualLine } from "./prompt";

/**
 * Coach conversations. Private to the person, always. Each one can be
 * deleted, and deleting deletes. The model call itself lives in chat.ts
 * (a Node action); these are the plain reads and writes around it.
 */

/** Keep a conversation from growing without end. */
export const MAX_MESSAGES = 200;
/** How many recent messages the model sees. */
export const CONTEXT_MESSAGES = 30;

export const mine = query({
  args: { module: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db
      .query("coachConversations")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(50);
    return rows
      .filter((r) => !args.module || r.module === args.module)
      .map((r) => ({
        _id: r._id,
        module: r.module,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
        count: r.messages.length,
        firstLine: r.messages.find((m) => m.role === "user")?.content.slice(0, 80) ?? "",
      }));
  },
});

export const get = query({
  args: { id: v.id("coachConversations") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || access(me, row) !== "full") return null;
    return row;
  },
});

export const start = mutation({
  args: { module: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const now = Date.now();
    return await ctx.db.insert("coachConversations", {
      ownerId: me.profile._id,
      visibility: "private",
      module: cleanText(args.module, 60, "Module"),
      messages: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("coachConversations") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "coachConversations", args.id);
    await ctx.db.delete(row._id);
  },
});

/** Delete every conversation of mine. Nothing is kept. */
export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db
      .query("coachConversations")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return rows.length;
  },
});

/**
 * Everything the model call needs, gathered under the privacy gate: the
 * person's allowed manual sections, the partner's shared sections, and the
 * recent messages. Internal; only the chat action calls it, with the
 * signed-in person's identity carried through.
 */
export const contextFor = internalQuery({
  args: { id: v.id("coachConversations") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "coachConversations", args.id);
    if (row.messages.length >= MAX_MESSAGES) {
      throw new ConvexError("This conversation has gotten long. Start a fresh one and it will feel lighter.");
    }
    const mine = await ctx.db
      .query("userManualSections")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .collect();
    const mySections: ManualLine[] = mine
      .filter((s) => s.coachAllowed && s.body.trim())
      .map((s) => ({ title: MANUAL_SECTION_TITLES[s.key] ?? s.key, body: s.body }));
    const partnerSections: ManualLine[] = [];
    if (me.partner) {
      const theirs = await ctx.db
        .query("userManualSections")
        .withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id))
        .collect();
      for (const s of theirs) {
        const a = access(me, s);
        const title = MANUAL_SECTION_TITLES[s.key] ?? s.key;
        if (a === "full" && s.body.trim()) partnerSections.push({ title, body: s.body });
        else if (a === "summary" && s.summary) partnerSections.push({ title, body: s.summary });
      }
    }
    const settings = readTendSettings(me.profile.moduleSettings);
    return {
      module: row.module,
      messages: row.messages.slice(-CONTEXT_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
      displayName: me.profile.displayName,
      partnerName: me.partner?.displayName ?? null,
      faith: settings.faith,
      mySections,
      partnerSections,
    };
  },
});

/** Append one exchange. Internal; the chat action writes, nothing else. */
export const append = internalMutation({
  args: {
    id: v.id("coachConversations"),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "coachConversations", args.id);
    const now = Date.now();
    await ctx.db.patch(row._id, {
      messages: [
        ...row.messages,
        { role: "user", content: args.userMessage, at: now },
        { role: "assistant", content: args.assistantMessage, at: now + 1 },
      ],
      updatedAt: now,
    });
  },
});
