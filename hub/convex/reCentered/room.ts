import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { requireMe, type Ctx, type Me } from "../lib";

export const MODULE_ID = "re-centered";

/**
 * Re-Centered is one person's own room. The first person to open it claims
 * it; after that the other account sees one line and nothing else. No name
 * or email is written in code. The claim is the gate for every read and
 * write in this module, on top of the usual owner check.
 */
export async function roomOwner(ctx: Ctx): Promise<Doc<"moduleOwners"> | null> {
  return await ctx.db
    .query("moduleOwners")
    .withIndex("by_module", (q) => q.eq("moduleId", MODULE_ID))
    .first();
}

/** Throws unless the signed-in person is the one who claimed the room. */
export async function requireRoom(ctx: Ctx): Promise<Me> {
  const me = await requireMe(ctx);
  const owner = await roomOwner(ctx);
  if (!owner || owner.ownerId !== me.profile._id) throw new ConvexError("This room isn't yours.");
  return me;
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const owner = await roomOwner(ctx);
    if (!owner) return { state: "unclaimed" as const, ownerName: null };
    if (owner.ownerId === me.profile._id) return { state: "mine" as const, ownerName: me.profile.displayName };
    return { state: "theirs" as const, ownerName: me.partner?.displayName ?? "your partner" };
  },
});

export const claim = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const owner = await roomOwner(ctx);
    if (owner) {
      if (owner.ownerId === me.profile._id) return;
      throw new ConvexError("This room already belongs to someone.");
    }
    await ctx.db.insert("moduleOwners", { moduleId: MODULE_ID, ownerId: me.profile._id, claimedAt: Date.now() });
  },
});
