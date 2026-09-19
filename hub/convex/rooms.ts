import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMe, type Ctx, type Me } from "./lib";

/**
 * Single-person rooms. The first person to open one claims it; after that
 * the other account sees one line and nothing else. No name or email is
 * written in code. Used by Metamorphosis; Re-Centered has its own copy of
 * this from before it was generalized.
 */
const ROOMS = ["metamorphosis"] as const;
const roomId = v.union(...ROOMS.map((r) => v.literal(r)));

export async function roomOwnerOf(ctx: Ctx, moduleId: string): Promise<Doc<"moduleOwners"> | null> {
  return await ctx.db
    .query("moduleOwners")
    .withIndex("by_module", (q) => q.eq("moduleId", moduleId))
    .first();
}

/** Throws unless the signed-in person is the one who claimed the room. */
export async function requireRoomOf(ctx: Ctx, moduleId: string): Promise<Me> {
  const me = await requireMe(ctx);
  const owner = await roomOwnerOf(ctx, moduleId);
  if (!owner || owner.ownerId !== me.profile._id) throw new ConvexError("This room isn't yours.");
  return me;
}

export const status = query({
  args: { moduleId: roomId },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const owner = await roomOwnerOf(ctx, args.moduleId);
    if (!owner) return { state: "unclaimed" as const, ownerName: null };
    if (owner.ownerId === me.profile._id) return { state: "mine" as const, ownerName: me.profile.displayName };
    return { state: "theirs" as const, ownerName: me.partner?.displayName ?? "your partner" };
  },
});

export const claim = mutation({
  args: { moduleId: roomId },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const owner = await roomOwnerOf(ctx, args.moduleId);
    if (owner) {
      if (owner.ownerId === me.profile._id) return;
      throw new ConvexError("This room already belongs to someone.");
    }
    await ctx.db.insert("moduleOwners", { moduleId: args.moduleId, ownerId: me.profile._id, claimedAt: Date.now() });
  },
});
