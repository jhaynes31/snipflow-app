import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { emitEvent } from "./events";
import { requireMe } from "./lib";

/**
 * Gentle day mode is per person. It changes that person's own view of the
 * whole Hub and tells the partner it is on. It never turns on silently: only
 * the toggle or an accepted offer after a low check-in calls `set`.
 */

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const state = await ctx.db
      .query("gentleModeState")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .first();
    return { on: state?.on ?? false, since: state?.since ?? null };
  },
});

/** The only thing the partner can see: on or off. No history, no count. */
export const partners = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return { on: false };
    const state = await ctx.db
      .query("gentleModeState")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id))
      .first();
    return { on: state?.on ?? false };
  },
});

export async function setGentleMode(ctx: MutationCtx, ownerId: Id<"profiles">, on: boolean): Promise<void> {
  const now = Date.now();
  const state = await ctx.db
    .query("gentleModeState")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .first();
  const wasOn = state?.on ?? false;
  if (state) {
    await ctx.db.patch(state._id, { on, since: on ? (state.since ?? now) : undefined, updatedAt: now });
  } else {
    await ctx.db.insert("gentleModeState", {
      ownerId,
      visibility: "sharedSummary",
      on,
      since: on ? now : undefined,
      updatedAt: now,
    });
  }
  if (wasOn !== on) {
    await emitEvent(ctx, {
      ownerId,
      source: "hub",
      name: on ? "gentleMode.on" : "gentleMode.off",
      visibility: "sharedSummary",
    });
  }
}

export const set = mutation({
  args: { on: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await setGentleMode(ctx, me.profile._id, args.on);
  },
});
