import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { currentMe, type Me } from "../lib";

export type Ctx = QueryCtx | MutationCtx;

/**
 * Who the signed-in person is inside Every Box. Built on The Shire's
 * profile: the partner row is found by `profileId`, and the household is
 * the one both partners share. `households.ensure` creates both on first
 * visit; queries never write.
 */
export interface Membership {
  me: Me;
  partner: Doc<"ebPartners">;
  household: Doc<"ebHouseholds">;
}

export async function partnerForProfile(ctx: Ctx, profileId: Id<"profiles">): Promise<Doc<"ebPartners"> | null> {
  return await ctx.db
    .query("ebPartners")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .first();
}

/** The signed-in person's membership, or null when signed out or not yet provisioned. */
export async function currentMembership(ctx: Ctx): Promise<Membership | null> {
  const me = await currentMe(ctx);
  if (!me) return null;
  const partner = await partnerForProfile(ctx, me.profile._id);
  if (!partner) return null;
  const household = await ctx.db.get(partner.householdId);
  if (!household) return null;
  return { me, partner, household };
}

export async function requireMembership(ctx: Ctx): Promise<Membership> {
  const m = await currentMembership(ctx);
  if (!m) throw new Error("Open Every Box once from The Shire first.");
  return m;
}

/** Load a category and check it belongs to the caller's household. */
export async function requireCategory(ctx: Ctx, m: Membership, categoryId: Id<"ebCategories">): Promise<Doc<"ebCategories">> {
  const category = await ctx.db.get(categoryId);
  if (!category || category.householdId !== m.household._id) {
    throw new Error("That box isn't in your household.");
  }
  return category;
}

export async function requireCommitment(ctx: Ctx, m: Membership, commitmentId: Id<"ebCommitments">): Promise<Doc<"ebCommitments">> {
  const c = await ctx.db.get(commitmentId);
  if (!c || c.householdId !== m.household._id) {
    throw new Error("That commitment isn't in your household.");
  }
  return c;
}

export async function householdPartners(ctx: Ctx, householdId: Id<"ebHouseholds">): Promise<Doc<"ebPartners">[]> {
  return await ctx.db
    .query("ebPartners")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
}

/**
 * Partners with display names taken from their Shire profiles, so a name
 * change in the profile shows everywhere at once. Legacy rows without a
 * profile keep their stored name.
 */
export async function partnersWithNames(ctx: Ctx, householdId: Id<"ebHouseholds">): Promise<Doc<"ebPartners">[]> {
  const partners = await householdPartners(ctx, householdId);
  const out: Doc<"ebPartners">[] = [];
  for (const p of partners) {
    const profile = p.profileId ? await ctx.db.get(p.profileId) : null;
    out.push(profile ? { ...p, displayName: profile.displayName } : p);
  }
  return out;
}

export function cleanText(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} can't be empty.`);
  if (trimmed.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return trimmed;
}

export function cleanCadence(days: number): number {
  if (!Number.isFinite(days)) throw new Error("Cadence must be a number of days.");
  const rounded = Math.round(days);
  if (rounded < 1 || rounded > 365) throw new Error("Cadence must be between 1 and 365 days.");
  return rounded;
}
