import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { emitEvent } from "./events";
import { cleanText, requireMe, requireOwned, requirePartner } from "./lib";
import { headsUpResponse, helpKind } from "./schema";

/**
 * Heads-ups are the one channel for reaching the partner. Modules never send
 * their own notifications; they call `send` with their module id and the Hub
 * delivers the card through the home screen, the icon badge and the calendar
 * feed.
 */

const MAX_SUGGESTIONS = 5;

function cleanLines(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_SUGGESTIONS)
    .map((l) => (l.length > 240 ? l.slice(0, 240) : l));
}

export const send = mutation({
  args: {
    statusLine: v.string(),
    help: helpKind,
    suggestions: v.object({ do: v.array(v.string()), say: v.array(v.string()), skip: v.array(v.string()) }),
    urgent: v.optional(v.boolean()),
    addToCalendar: v.optional(v.boolean()),
    sourceModule: v.optional(v.string()),
    kinds: v.optional(v.array(v.string())),
    checkInId: v.optional(v.id("checkIns")),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    const id = await ctx.db.insert("headsUps", {
      ownerId: me.profile._id,
      receiverId: partner._id,
      visibility: "shared",
      status: "open",
      statusLine: cleanText(args.statusLine, 140, "Status line"),
      help: args.help,
      suggestions: {
        do: cleanLines(args.suggestions.do),
        say: cleanLines(args.suggestions.say),
        skip: cleanLines(args.suggestions.skip),
      },
      urgent: args.urgent ?? false,
      addToCalendar: args.addToCalendar ?? false,
      sourceModule: args.sourceModule ?? "hub",
      kinds: args.kinds?.slice(0, 12),
      checkInId: args.checkInId,
      createdAt: Date.now(),
    });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: args.sourceModule ?? "hub",
      name: "headsUp.sent",
      payload: { headsUpId: id, help: args.help, urgent: args.urgent ?? false },
      visibility: "shared",
    });
    return id;
  },
});

/** Cards addressed to me that are still open, newest first. */
export const openForMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const open = await ctx.db
      .query("headsUps")
      .withIndex("by_receiver_status", (q) => q.eq("receiverId", me.profile._id).eq("status", "open"))
      .collect();
    const responded = await ctx.db
      .query("headsUps")
      .withIndex("by_receiver_status", (q) => q.eq("receiverId", me.profile._id).eq("status", "responded"))
      .collect();
    return [...open, ...responded].sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Just the number for the icon badge: open cards only, nothing else, ever. */
export const openCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const open = await ctx.db
      .query("headsUps")
      .withIndex("by_receiver_status", (q) => q.eq("receiverId", me.profile._id).eq("status", "open"))
      .collect();
    return open.length;
  },
});

/** Cards I sent that the partner hasn't closed out of view yet, newest first. */
export const sentByMe = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("headsUps")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(Math.min(100, args.limit ?? 20));
  },
});

export const get = query({
  args: { id: v.id("headsUps") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const card = await ctx.db.get(args.id);
    if (!card) return null;
    if (card.ownerId !== me.profile._id && card.receiverId !== me.profile._id) return null;
    return card;
  },
});

export const respond = mutation({
  args: { id: v.id("headsUps"), response: headsUpResponse },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const card = await ctx.db.get(args.id);
    if (!card || card.receiverId !== me.profile._id) throw new ConvexError("That card wasn't sent to you.");
    if (card.status === "closed") throw new ConvexError("That card is already closed.");
    await ctx.db.patch(card._id, { status: "responded", response: args.response, respondedAt: Date.now() });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "hub",
      name: "headsUp.responded",
      payload: { headsUpId: card._id, response: args.response },
      visibility: "shared",
    });
  },
});

/** The receiver clears a responded card from their home screen. */
export const dismiss = mutation({
  args: { id: v.id("headsUps") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const card = await ctx.db.get(args.id);
    if (!card || card.receiverId !== me.profile._id) throw new ConvexError("That card wasn't sent to you.");
    if (card.status !== "responded") throw new ConvexError("Respond to the card first.");
    await ctx.db.patch(card._id, { status: "closed", closedAt: Date.now() });
  },
});

/** The sender closes their own card, whether or not it was answered. */
export const close = mutation({
  args: { id: v.id("headsUps") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const card = await requireOwned(ctx, me, "headsUps", args.id);
    if (card.status === "closed") return;
    await ctx.db.patch(card._id, { status: "closed", closedAt: Date.now() });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "hub",
      name: "headsUp.closed",
      payload: { headsUpId: card._id },
      visibility: "shared",
    });
  },
});

/** Un-sharing: the sender deletes the card and it is gone from both views. */
export const remove = mutation({
  args: { id: v.id("headsUps") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const card = await requireOwned(ctx, me, "headsUps", args.id);
    await ctx.db.delete(card._id);
  },
});
