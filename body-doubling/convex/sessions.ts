import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { blockValidator } from "./schema";
import { publicSession, refundHours, requireAdmin, sessionBookings } from "./lib";
import { defaultDropInSlots, HOUR_MS, sessionHours } from "./rules";

/** The public schedule: anyone can see it, signed in or not. */
export const upcoming = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Keep sessions that are running right now on the list until they end.
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_start", (q) => q.gte("startsAt", now - 8 * HOUR_MS))
      .take(60);
    const out = [];
    for (const s of sessions) {
      if (s.status !== "scheduled") continue;
      if (s.startsAt + sessionHours(s.blocks) * HOUR_MS < now) continue;
      out.push(publicSession(s, await sessionBookings(ctx, s._id), now));
    }
    return out;
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const s = await ctx.db.get(sessionId);
    if (!s) return null;
    return publicSession(s, await sessionBookings(ctx, s._id), Date.now());
  },
});

function checkShape(args: { title: string; blocks: { hours: number; category: string }[]; capacity: number; dropInSlots?: number }) {
  if (!args.title.trim()) throw new ConvexError("Give the session a name.");
  if (args.blocks.length === 0) throw new ConvexError("Add at least one block.");
  if (args.blocks.some((b) => !b.category.trim() || b.hours <= 0)) throw new ConvexError("Every block needs a name and some time.");
  if (args.capacity < 2 || args.capacity > 20) throw new ConvexError("Capacity should be between 2 and 20.");
  const dropIns = args.dropInSlots ?? defaultDropInSlots(args.capacity);
  if (dropIns < 0 || dropIns >= args.capacity) throw new ConvexError("Leave at least one seat for members.");
  return dropIns;
}

export const create = mutation({
  args: {
    title: v.string(),
    startsAt: v.number(),
    blocks: v.array(blockValidator),
    gameTitle: v.optional(v.string()),
    capacity: v.number(),
    dropInSlots: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const dropInSlots = checkShape(args);
    return await ctx.db.insert("sessions", {
      title: args.title.trim(),
      startsAt: args.startsAt,
      blocks: args.blocks.map((b) => ({ ...b, category: b.category.trim() })),
      gameTitle: args.gameTitle?.trim() || undefined,
      capacity: args.capacity,
      dropInSlots,
      status: "scheduled",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    startsAt: v.number(),
    blocks: v.array(blockValidator),
    gameTitle: v.optional(v.string()),
    capacity: v.number(),
    dropInSlots: v.number(),
  },
  handler: async (ctx, { sessionId, ...args }) => {
    await requireAdmin(ctx);
    const dropInSlots = checkShape(args);
    await ctx.db.patch(sessionId, {
      title: args.title.trim(),
      startsAt: args.startsAt,
      blocks: args.blocks,
      gameTitle: args.gameTitle?.trim() || undefined,
      capacity: args.capacity,
      dropInSlots,
    });
  },
});

/**
 * Cancel a whole session. Members get their hours back. Paid drop-ins are
 * listed for the hosts to refund in Stripe (refunds stay a human decision).
 */
export const cancel = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);
    const bookings = await sessionBookings(ctx, sessionId);
    const toRefund: { name: string; email: string; amountCents: number }[] = [];
    for (const b of bookings) {
      if (b.status === "canceled") continue;
      if (b.status === "confirmed" && b.kind === "member") await refundHours(ctx, b);
      if (b.status === "confirmed" && b.kind === "dropIn" && b.amountCents) {
        toRefund.push({ name: b.guestName ?? "", email: b.guestEmail ?? "", amountCents: b.amountCents });
      }
      await ctx.db.patch(b._id, { status: "canceled" });
    }
    await ctx.db.patch(sessionId, { status: "canceled" });
    return { dropInsToRefund: toRefund };
  },
});
