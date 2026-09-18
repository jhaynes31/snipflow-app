import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { emitEvent } from "./events";
import { access, optionalText, requireMe, requireOwned } from "./lib";
import { visibilityValidator } from "./privacy";
import { manualSectionKey, MANUAL_SECTION_KEYS } from "./schema";

/**
 * The user manual: eight plain-language sections a person writes about
 * themselves. Each section carries its own privacy setting.
 */

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("userManualSections")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id))
      .collect();
  },
});

/**
 * The partner's manual, filtered by the privacy gate: shared sections in
 * full, shared-summary sections as their summary line only, private ones
 * not at all.
 */
export const partners = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    const sections = await ctx.db
      .query("userManualSections")
      .withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id))
      .collect();
    const out: { key: (typeof MANUAL_SECTION_KEYS)[number]; body: string; summaryOnly: boolean }[] = [];
    for (const s of sections) {
      const a = access(me, s);
      if (a === "full") out.push({ key: s.key, body: s.body, summaryOnly: false });
      else if (a === "summary" && s.summary) out.push({ key: s.key, body: s.summary, summaryOnly: true });
    }
    return out;
  },
});

export const save = mutation({
  args: {
    key: manualSectionKey,
    body: v.string(),
    summary: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    coachAllowed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const body = args.body.trim();
    if (body.length > 4000) throw new Error("That section is too long (max 4000 characters).");
    const summary = optionalText(args.summary, 300, "Summary");
    const existing = await ctx.db
      .query("userManualSections")
      .withIndex("by_owner_key", (q) => q.eq("ownerId", me.profile._id).eq("key", args.key))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        body,
        summary,
        visibility: args.visibility ?? existing.visibility,
        coachAllowed: args.coachAllowed ?? existing.coachAllowed,
        updatedAt: now,
      });
    } else {
      // Private is the default for any new data.
      await ctx.db.insert("userManualSections", {
        ownerId: me.profile._id,
        key: args.key,
        body,
        summary,
        visibility: args.visibility ?? "private",
        coachAllowed: args.coachAllowed ?? false,
        updatedAt: now,
      });
    }
    await emitEvent(ctx, { ownerId: me.profile._id, source: "hub", name: "manual.updated", payload: { key: args.key } });
  },
});

/** Changing visibility is the explicit share (or un-share) action. */
export const setVisibility = mutation({
  args: { id: v.id("userManualSections"), visibility: visibilityValidator, summary: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const section = await requireOwned(ctx, me, "userManualSections", args.id);
    const summary = optionalText(args.summary, 300, "Summary") ?? section.summary;
    if (args.visibility === "sharedSummary" && !summary) {
      throw new Error("Write the one-line summary your partner will see first.");
    }
    await ctx.db.patch(section._id, { visibility: args.visibility, summary, updatedAt: Date.now() });
  },
});

/** Deleting deletes. The row is gone, not hidden. */
export const remove = mutation({
  args: { id: v.id("userManualSections") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const section = await requireOwned(ctx, me, "userManualSections", args.id);
    await ctx.db.delete(section._id);
  },
});
