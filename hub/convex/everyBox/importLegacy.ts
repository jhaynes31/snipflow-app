import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * One-time helpers for moving the standalone Every Box's data in. Run by
 * scripts/import-every-box.mjs during the Vercel build, never from a screen.
 *
 * After `npx convex import` has copied the eb* tables (with `userId` renamed
 * to `legacyUserId`), `link` attaches each imported partner row to the Shire
 * profile whose account has the same email the old account had.
 */
export const link = internalMutation({
  args: { links: v.array(v.object({ legacyUserId: v.string(), email: v.string() })) },
  handler: async (ctx, args) => {
    const partners = await ctx.db.query("ebPartners").collect();
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const result: { linked: string[]; unmatched: string[] } = { linked: [], unmatched: [] };
    for (const p of partners) {
      if (p.profileId || !p.legacyUserId) continue;
      const email = args.links.find((l) => l.legacyUserId === p.legacyUserId)?.email?.toLowerCase();
      const user = email ? users.find((u) => u.email?.toLowerCase() === email) : undefined;
      const profile = user ? profiles.find((pr) => pr.userId === user._id) : undefined;
      if (profile) {
        await ctx.db.patch(p._id, { profileId: profile._id, displayName: profile.displayName });
        result.linked.push(p.displayName);
      } else {
        result.unmatched.push(`${p.displayName} (${email ?? "no email"})`);
      }
    }
    return result;
  },
});

/** Row counts per Every Box table, for the before/after check. */
export const counts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [households, partners, categories, events, notes, reviews, commitments] = await Promise.all([
      ctx.db.query("ebHouseholds").collect(),
      ctx.db.query("ebPartners").collect(),
      ctx.db.query("ebCategories").collect(),
      ctx.db.query("ebTendingEvents").collect(),
      ctx.db.query("ebCategoryNotes").collect(),
      ctx.db.query("ebWeeklyReviews").collect(),
      ctx.db.query("ebCommitments").collect(),
    ]);
    return {
      ebHouseholds: households.length,
      ebPartners: partners.length,
      ebCategories: categories.length,
      ebTendingEvents: events.length,
      ebCategoryNotes: notes.length,
      ebWeeklyReviews: reviews.length,
      ebCommitments: commitments.length,
      partnersLinked: partners.filter((p) => p.profileId).length,
    };
  },
});
