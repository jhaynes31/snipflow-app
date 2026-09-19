import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { runListeners } from "./moduleHooks";
import { visibilityValidator } from "./privacy";
import { access, requireMe, type Me } from "./lib";
import type { Visibility } from "./privacy";

/**
 * Server-side emit, for foundation code and module functions. Writes the
 * event and runs any listeners in the same transaction.
 */
export async function emitEvent(
  ctx: MutationCtx,
  args: {
    ownerId: Id<"profiles">;
    source: string;
    name: string;
    payload?: unknown;
    visibility?: Visibility;
  },
): Promise<Id<"events">> {
  const id = await ctx.db.insert("events", {
    ownerId: args.ownerId,
    visibility: args.visibility ?? "private",
    name: args.name,
    source: args.source,
    payload: args.payload ?? {},
    createdAt: Date.now(),
  });
  const event = await ctx.db.get(id);
  if (event) await runListeners(ctx, event);
  return id;
}

/** Client-side emit, for module screens. The caller is always the owner. */
export const emit = mutation({
  args: {
    source: v.string(),
    name: v.string(),
    payload: v.optional(v.any()),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (!/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(args.name)) {
      throw new ConvexError("Event names look like `module.thing` (for example `category.stuck`).");
    }
    return await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: args.source,
      name: args.name,
      payload: args.payload,
      visibility: args.visibility,
    });
  },
});

/** My recent events, plus the partner's shared ones. */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const limit = Math.min(200, Math.max(1, args.limit ?? 50));
    const mine = await ctx.db
      .query("events")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(limit);
    const theirs = me.partner
      ? await ctx.db
          .query("events")
          .withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id))
          .order("desc")
          .take(limit)
      : [];
    return [...mine, ...theirs.filter((e) => access(me, e) === "full")]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

export function isMe(me: Me, ownerId: Id<"profiles">): boolean {
  return me.profile._id === ownerId;
}
