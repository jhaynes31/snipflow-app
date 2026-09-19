import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";

/**
 * The Evidence Bank. Shared. Entries name specific things, not general
 * praise; either partner can log one about either partner.
 */
export const about = query({
  args: { profileId: v.id("profiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (args.profileId !== me.profile._id && args.profileId !== me.partner?._id) return [];
    return await ctx.db
      .query("tendEvidence")
      .withIndex("by_about_time", (q) => q.eq("aboutProfileId", args.profileId))
      .order("desc")
      .take(Math.min(200, args.limit ?? 50));
  },
});

/** Three random entries about me, for the Shame Interrupter and shame-spiral check-ins. */
export const threeAboutMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const all = await ctx.db
      .query("tendEvidence")
      .withIndex("by_about_time", (q) => q.eq("aboutProfileId", me.profile._id))
      .collect();
    // Deterministic shuffle keyed to the day, so it stays stable while the screen is open.
    const seed = Math.floor(Date.now() / 3_600_000);
    const scored = all.map((e, i) => ({ e, r: ((seed * 9301 + i * 49297) % 233280) / 233280 }));
    return scored.sort((a, b) => a.r - b.r).slice(0, 3).map((x) => x.e);
  },
});

export const add = mutation({
  args: { aboutProfileId: v.id("profiles"), text: v.string(), showed: v.optional(v.string()), date: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (args.aboutProfileId !== me.profile._id && args.aboutProfileId !== me.partner?._id) {
      throw new Error("Evidence is about you or your partner.");
    }
    return await ctx.db.insert("tendEvidence", {
      ownerId: me.profile._id,
      visibility: "shared",
      aboutProfileId: args.aboutProfileId,
      text: cleanText(args.text, 300, "What they did"),
      showed: optionalText(args.showed, 120, "What it showed"),
      date: args.date ?? Date.now(),
      createdAt: Date.now(),
    });
  },
});

/** Only the person who logged an entry can remove it. */
export const remove = mutation({
  args: { id: v.id("tendEvidence") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const e = await requireOwned(ctx, me, "tendEvidence", args.id);
    await ctx.db.delete(e._id);
  },
});
