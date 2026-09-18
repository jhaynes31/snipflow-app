import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { currentMe, requireMe } from "../lib";
import { currentMembership, partnerForProfile, partnersWithNames, requireMembership } from "./lib";
import { DEFAULT_THEME, isThemeId, THEME_IDS } from "./themes";
import { randomToken } from "../lib";

/**
 * Everything the Every Box screens need. `null` when signed out.
 * `{ provisioned: false }` when the person has a Shire profile but no
 * Every Box partner row yet; the shell then calls `ensure` once.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) {
      const me = await currentMe(ctx);
      if (!me) return null;
      return { provisioned: false as const };
    }
    const partners = await partnersWithNames(ctx, m.household._id);
    const partner = partners.find((p) => p._id === m.partner._id) ?? m.partner;
    return {
      provisioned: true as const,
      partner,
      household: m.household,
      partners,
      availableThemes: THEME_IDS,
    };
  },
});

/**
 * First visit: create the one household if it doesn't exist and a partner
 * row for this profile. Safe to call again; it does nothing the second time.
 * Replaces the standalone app's create/join/invite flow, since the two
 * accounts are already linked by The Shire.
 */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const existing = await partnerForProfile(ctx, me.profile._id);
    if (existing) return existing.householdId;

    const now = Date.now();
    let household = await ctx.db.query("ebHouseholds").first();
    if (!household) {
      const partnerName = me.partner?.displayName;
      const id = await ctx.db.insert("ebHouseholds", {
        name: partnerName ? `${me.profile.displayName} & ${partnerName}` : `${me.profile.displayName}'s home`,
        activeTheme: DEFAULT_THEME,
        unlockedThemes: [],
        isPremium: false,
        inviteCode: randomToken(8).toUpperCase(),
        createdAt: now,
        visibility: "shared",
      });
      household = (await ctx.db.get(id))!;
    }

    // An imported partner row that matches this person by name and has no
    // profile yet is claimed rather than duplicated, so history stays theirs.
    const unlinked = (await ctx.db
      .query("ebPartners")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .collect()).find((p) => !p.profileId && p.displayName.trim().toLowerCase() === me.profile.displayName.trim().toLowerCase());
    if (unlinked) {
      await ctx.db.patch(unlinked._id, { profileId: me.profile._id });
      return household._id;
    }

    await ctx.db.insert("ebPartners", {
      householdId: household._id,
      profileId: me.profile._id,
      displayName: me.profile.displayName,
      joinedAt: now,
      visibility: "shared",
    });
    return household._id;
  },
});

/** Theme is a skin only; switching it never touches box data. Every theme is open. */
export const setTheme = mutation({
  args: { theme: v.string() },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    if (!isThemeId(args.theme)) throw new Error("Unknown theme.");
    await ctx.db.patch(m.household._id, { activeTheme: args.theme });
  },
});
