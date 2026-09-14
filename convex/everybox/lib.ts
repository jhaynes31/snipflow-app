import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type Ctx = QueryCtx | MutationCtx;

export interface Membership {
  userId: Id<"users">;
  partner: Doc<"ebPartners">;
  household: Doc<"ebHouseholds">;
}

/** The signed-in user's partner record, or null when signed out / not onboarded. */
export async function currentMembership(ctx: Ctx): Promise<Membership | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const partner = await ctx.db
    .query("ebPartners")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!partner) return null;
  const household = await ctx.db.get(partner.householdId);
  if (!household) return null;
  return { userId, partner, household };
}

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Please sign in first.");
  return userId;
}

export async function requireMembership(ctx: Ctx): Promise<Membership> {
  const m = await currentMembership(ctx);
  if (!m) throw new Error("You're not part of a household yet.");
  return m;
}

/** Load a category and check it belongs to the caller's household. */
export async function requireCategory(
  ctx: Ctx,
  m: Membership,
  categoryId: Id<"ebCategories">,
): Promise<Doc<"ebCategories">> {
  const category = await ctx.db.get(categoryId);
  if (!category || category.householdId !== m.household._id) {
    throw new Error("That category isn't in your household.");
  }
  return category;
}

export async function requireCommitment(
  ctx: Ctx,
  m: Membership,
  commitmentId: Id<"ebCommitments">,
): Promise<Doc<"ebCommitments">> {
  const c = await ctx.db.get(commitmentId);
  if (!c || c.householdId !== m.household._id) {
    throw new Error("That commitment isn't in your household.");
  }
  return c;
}

export async function householdPartners(
  ctx: Ctx,
  householdId: Id<"ebHouseholds">,
): Promise<Doc<"ebPartners">[]> {
  return await ctx.db
    .query("ebPartners")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
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
