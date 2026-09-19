import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { accessFor, relationshipTo, type Visibility } from "./privacy";

export type Ctx = QueryCtx | MutationCtx;

/** Exactly two accounts exist. See `auth.ts`. */
export const MAX_ACCOUNTS = 2;

export interface Me {
  userId: Id<"users">;
  profile: Doc<"profiles">;
  /** The other account's profile, or null until they have signed in once. */
  partner: Doc<"profiles"> | null;
}

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Please sign in first.");
  return userId;
}

export async function profileForUser(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<Doc<"profiles"> | null> {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/** With only two accounts, the partner is whichever profile is not mine. */
export async function partnerOf(
  ctx: Ctx,
  profile: Doc<"profiles">,
): Promise<Doc<"profiles"> | null> {
  const all = await ctx.db.query("profiles").collect();
  return all.find((p) => p._id !== profile._id) ?? null;
}

/** The signed-in person with their profile, or null when signed out or not set up. */
export async function currentMe(ctx: Ctx): Promise<Me | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const profile = await profileForUser(ctx, userId);
  if (!profile) return null;
  const partner = await partnerOf(ctx, profile);
  return { userId, profile, partner };
}

export async function requireMe(ctx: Ctx): Promise<Me> {
  const me = await currentMe(ctx);
  if (!me) throw new Error("Finish setting up your profile first.");
  return me;
}

export async function requirePartner(ctx: Ctx, me: Me): Promise<Doc<"profiles">> {
  if (!me.partner) {
    throw new Error("Your partner hasn't signed in yet, so there's no one to send this to.");
  }
  return me.partner;
}

/**
 * The single privacy gate. Every read of an owned record goes through here.
 * Returns "full", "summary" or "none" for the viewer.
 */
export function access(
  me: Me,
  record: { ownerId: Id<"profiles">; visibility: Visibility },
): "full" | "summary" | "none" {
  const rel = relationshipTo(me.profile._id, me.partner?._id ?? null, record.ownerId);
  return accessFor(rel, record.visibility);
}

/** Loads a record and throws unless the viewer owns it. Used before any write. */
export async function requireOwned<
  T extends "userManualSections" | "headsUps" | "checkIns" | "coachConversations" | "safetyPlans" | "tendGuidance" | "tendLoveMenu" | "tendLoveActions" | "tendToolUses" | "tendLoops" | "tendEvidence" | "tendProjects" | "tendFocusSessions",
>(
  ctx: Ctx,
  me: Me,
  table: T,
  id: Id<T>,
): Promise<Doc<T>> {
  const doc = await ctx.db.get(id);
  if (!doc || doc.ownerId !== me.profile._id) {
    throw new Error("That isn't yours to change.");
  }
  return doc;
}

export function cleanText(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} can't be empty.`);
  if (trimmed.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return trimmed;
}

/** Like cleanText but an empty string is allowed and returned as undefined. */
export function optionalText(value: string | undefined, max: number, label: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return trimmed;
}

const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomToken(length = 32): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  }
  return out;
}
