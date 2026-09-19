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

/** Tables a released room wipes, so the next person starts clean. */
const ROOM_TABLES = {
  metamorphosis: ["mmSheet", "mmMirror", "mmMaps", "mmScout", "mmTired", "mmShield", "mmQuests", "mmIron", "mmIronWeek", "mmCompass", "mmSeen", "mmLetters", "mmParty", "mmHorizon", "mmSmallWays", "mmPresent", "mmBuilder", "mmFailureChecks", "mmShares"] as const,
};

/**
 * The owner gives the room back: the claim is removed and every row they
 * wrote in it is deleted, so whoever claims it next starts clean. Blessings
 * written for the room by the other person stay sealed for the next owner.
 * Coach conversations under the room's module are deleted too.
 */
export const release = mutation({
  args: { moduleId: roomId, confirm: v.literal("release") },
  handler: async (ctx, args) => {
    const me = await requireRoomOf(ctx, args.moduleId);
    const id = me.profile._id;
    for (const table of ROOM_TABLES[args.moduleId]) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) if (row.ownerId === id) await ctx.db.delete(row._id);
    }
    const convos = await ctx.db.query("coachConversations").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
    for (const c of convos) if (c.module === args.moduleId) await ctx.db.delete(c._id);
    const owner = await roomOwnerOf(ctx, args.moduleId);
    if (owner) await ctx.db.delete(owner._id);
    const settings = { ...(me.profile.moduleSettings ?? {}) };
    delete settings[args.moduleId];
    await ctx.db.patch(id, { moduleSettings: settings });
  },
});
