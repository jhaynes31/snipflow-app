import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import {
  cleanText,
  currentMembership,
  generateInviteCode,
  householdPartners,
  requireMembership,
  requireUserId,
} from "./lib";
import { availableThemes, DEFAULT_THEME, isThemeId, THEMES } from "./themes";

const MAX_PARTNERS = 2;

/**
 * Everything the shell needs to decide what to render: the signed-in user,
 * their partner record, the household and the other partner(s).
 * `null` when signed out. `{ onboarded: false }` when signed in but not yet
 * in a household.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) {
      const userId = await (async () => {
        try {
          return await requireUserId(ctx);
        } catch {
          return null;
        }
      })();
      if (!userId) return null;
      const user = await ctx.db.get(userId);
      return { onboarded: false as const, email: user?.email ?? null };
    }
    const partners = await householdPartners(ctx, m.household._id);
    const user = await ctx.db.get(m.userId);
    return {
      onboarded: true as const,
      email: user?.email ?? null,
      partner: m.partner,
      household: m.household,
      partners,
      availableThemes: [
        ...new Set([
          ...availableThemes(m.household.isPremium),
          ...m.household.unlockedThemes.filter(isThemeId),
        ]),
      ],
    };
  },
});

export const create = mutation({
  args: { householdName: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await currentMembership(ctx);
    if (existing) throw new Error("You're already part of a household.");

    const householdName = cleanText(args.householdName, 60, "Household name");
    const displayName = cleanText(args.displayName, 40, "Your name");
    const now = Date.now();

    let inviteCode = generateInviteCode();
    // Extremely unlikely, but keep codes unique.
    while (
      await ctx.db
        .query("ebHouseholds")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .first()
    ) {
      inviteCode = generateInviteCode();
    }

    const householdId = await ctx.db.insert("ebHouseholds", {
      name: householdName,
      activeTheme: DEFAULT_THEME,
      unlockedThemes: [],
      isPremium: false,
      inviteCode,
      createdBy: userId,
      createdAt: now,
    });
    await ctx.db.insert("ebPartners", {
      householdId,
      userId,
      displayName,
      joinedAt: now,
    });
    return householdId;
  },
});

/** Public preview of an invite so the join page can say whose household it is. */
export const inviteInfo = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    const household = await ctx.db
      .query("ebHouseholds")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!household) return null;
    const partners = await householdPartners(ctx, household._id);
    return {
      householdName: household.name,
      partnerNames: partners.map((p) => p.displayName),
      full: partners.length >= MAX_PARTNERS,
    };
  },
});

export const join = mutation({
  args: { code: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await currentMembership(ctx);
    if (existing) throw new Error("You're already part of a household.");

    const code = args.code.trim().toUpperCase();
    const household = await ctx.db
      .query("ebHouseholds")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!household) throw new Error("That invite link doesn't match a household.");

    const partners = await householdPartners(ctx, household._id);
    if (partners.length >= MAX_PARTNERS) {
      throw new Error("That household already has two partners.");
    }

    const displayName = cleanText(args.displayName, 40, "Your name");
    await ctx.db.insert("ebPartners", {
      householdId: household._id,
      userId,
      displayName,
      joinedAt: Date.now(),
    });
    return household._id;
  },
});

export const regenerateInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const m = await requireMembership(ctx);
    const inviteCode = generateInviteCode();
    await ctx.db.patch(m.household._id, { inviteCode });
    return inviteCode;
  },
});

export const updateProfile = mutation({
  args: { displayName: v.optional(v.string()), householdName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    if (args.displayName !== undefined) {
      await ctx.db.patch(m.partner._id, {
        displayName: cleanText(args.displayName, 40, "Your name"),
      });
    }
    if (args.householdName !== undefined) {
      await ctx.db.patch(m.household._id, {
        name: cleanText(args.householdName, 60, "Household name"),
      });
    }
  },
});

/** Theme is a skin only; switching it never touches category data. */
export const setTheme = mutation({
  args: { theme: v.string() },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    if (!isThemeId(args.theme)) throw new Error("Unknown theme.");
    const theme = THEMES[args.theme];
    const unlocked =
      !theme.premium ||
      m.household.isPremium ||
      m.household.unlockedThemes.includes(args.theme);
    if (!unlocked) throw new Error(`${theme.name} is a premium theme.`);
    await ctx.db.patch(m.household._id, { activeTheme: args.theme });
  },
});

/**
 * Phase 4 hook: flip the household-level subscription flag. Internal only, so
 * it can be wired to a billing webhook later without exposing it to clients.
 */
export const setPremium = internalMutation({
  args: { householdId: v.id("ebHouseholds"), isPremium: v.boolean() },
  handler: async (ctx, args) => {
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found.");
    await ctx.db.patch(args.householdId, { isPremium: args.isPremium });
    // If premium lapses while a premium theme is active, fall back gracefully.
    if (!args.isPremium && isThemeId(household.activeTheme)) {
      const stillAllowed =
        !THEMES[household.activeTheme].premium ||
        household.unlockedThemes.includes(household.activeTheme);
      if (!stillAllowed) {
        await ctx.db.patch(args.householdId, { activeTheme: DEFAULT_THEME });
      }
    }
  },
});

/** Grant a single theme outside the subscription (promo, gift). Internal only. */
export const unlockTheme = internalMutation({
  args: { householdId: v.id("ebHouseholds"), theme: v.string() },
  handler: async (ctx, args) => {
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found.");
    if (!isThemeId(args.theme)) throw new Error("Unknown theme.");
    if (household.unlockedThemes.includes(args.theme)) return;
    await ctx.db.patch(args.householdId, {
      unlockedThemes: [...household.unlockedThemes, args.theme],
    });
  },
});
