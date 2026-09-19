import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { emitEvent } from "../events";
import { cleanText, optionalText, requireMe, requirePartner } from "../lib";

/**
 * Repair: a guided conversation after a conflict or a hurt. Either person
 * starts it; the other accepts now or picks later. Both write privately,
 * both reveal at once, each reflects back, owns one thing, names one thing
 * for next time, and they close with a gesture from the other's Love Menu.
 * The coach never judges who was right; here there is no coach at all.
 */

function mine(r: { ownerId: string; partnerId: string }, id: string) {
  return r.ownerId === id || r.partnerId === id;
}

/** Everything the Together screen needs, with the partner's writing hidden until both submitted. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const ids = [me.profile._id, ...(me.partner ? [me.partner._id] : [])];
    const rows = [];
    for (const id of ids) {
      rows.push(
        ...(await ctx.db
          .query("tendRepairs")
          .withIndex("by_owner_time", (q) => q.eq("ownerId", id))
          .order("desc")
          .take(20)),
      );
    }
    return rows
      .filter((r) => mine(r, me.profile._id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((r) => {
        const bothIn = r.entries.length >= 2;
        return {
          ...r,
          entries: r.entries.map((e) => (e.profileId === me.profile._id || bothIn ? e : { profileId: e.profileId, happened: "", felt: "", needed: "", submittedAt: e.submittedAt })),
        };
      });
  },
});

export const start = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    const now = Date.now();
    return await ctx.db.insert("tendRepairs", {
      ownerId: me.profile._id,
      visibility: "shared",
      partnerId: partner._id,
      status: "invited",
      entries: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** The invited partner accepts now, or picks a later time. */
export const respond = mutation({
  args: { id: v.id("tendRepairs"), now: v.boolean(), laterAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || r.partnerId !== me.profile._id) throw new ConvexError("That invite isn't for you.");
    await ctx.db.patch(r._id, args.now ? { status: "writing", updatedAt: Date.now() } : { status: "later", laterAt: args.laterAt, updatedAt: Date.now() });
  },
});

/** Either person moves a "later" repair into writing when the time comes. */
export const begin = mutation({
  args: { id: v.id("tendRepairs") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || !mine(r, me.profile._id)) throw new ConvexError("That repair isn't yours.");
    if (r.status !== "later" && r.status !== "invited") return;
    await ctx.db.patch(r._id, { status: "writing", updatedAt: Date.now() });
  },
});

/** Write privately. Once both have submitted, both are revealed at the same time. */
export const submit = mutation({
  args: { id: v.id("tendRepairs"), happened: v.string(), felt: v.string(), needed: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || !mine(r, me.profile._id)) throw new ConvexError("That repair isn't yours.");
    if (r.status !== "writing") throw new ConvexError("This repair isn't at the writing step.");
    const entry = {
      profileId: me.profile._id,
      happened: cleanText(args.happened, 1500, "What happened"),
      felt: cleanText(args.felt, 800, "What I felt"),
      needed: cleanText(args.needed, 800, "What I needed"),
      submittedAt: Date.now(),
    };
    const entries = [...r.entries.filter((e) => e.profileId !== me.profile._id), entry];
    const both = entries.length >= 2;
    await ctx.db.patch(r._id, { entries, status: both ? "revealed" : "writing", revealedAt: both ? Date.now() : undefined, updatedAt: Date.now() });
  },
});

/** After the reveal: what I heard, one thing I own, one thing for next time. */
export const reflect = mutation({
  args: { id: v.id("tendRepairs"), heard: v.optional(v.string()), own: v.optional(v.string()), nextTime: v.optional(v.string()), gesture: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || !mine(r, me.profile._id)) throw new ConvexError("That repair isn't yours.");
    if (r.status !== "revealed") throw new ConvexError("Both need to have written first.");
    const entries = r.entries.map((e) =>
      e.profileId === me.profile._id
        ? {
            ...e,
            heard: args.heard === undefined ? e.heard : optionalText(args.heard, 800, "What I heard"),
            own: args.own === undefined ? e.own : optionalText(args.own, 400, "What I own"),
            nextTime: args.nextTime === undefined ? e.nextTime : optionalText(args.nextTime, 400, "Next time"),
            gesture: args.gesture === undefined ? e.gesture : optionalText(args.gesture, 200, "Gesture"),
          }
        : e,
    );
    await ctx.db.patch(r._id, { entries, updatedAt: Date.now() });
  },
});

export const close = mutation({
  args: { id: v.id("tendRepairs") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || !mine(r, me.profile._id)) throw new ConvexError("That repair isn't yours.");
    await ctx.db.patch(r._id, { status: "closed", closedAt: Date.now(), updatedAt: Date.now() });
    await emitEvent(ctx, { ownerId: me.profile._id, source: "tend", name: "repair.completed", payload: { repairId: r._id }, visibility: "shared" });
  },
});

/** Either person can delete a repair; it's gone for both. */
export const remove = mutation({
  args: { id: v.id("tendRepairs") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (!r || !mine(r, me.profile._id)) throw new ConvexError("That repair isn't yours.");
    await ctx.db.delete(r._id);
  },
});
