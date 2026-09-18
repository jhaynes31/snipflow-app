import { v } from "convex/values";

/**
 * The Hub privacy model, as data.
 *
 * Every record a person writes carries one of these three levels. The level
 * is checked in Convex functions (see `lib.ts`), which is the only way any
 * client can reach the database, so it is enforced at the data layer and not
 * just hidden in the interface.
 */
export const VISIBILITY = ["private", "shared", "sharedSummary"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("shared"),
  v.literal("sharedSummary"),
);

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Private. Only you can see this.",
  shared: "Shared. You and your partner can both see this.",
  sharedSummary: "Shared summary. Your partner sees only the summary line you write.",
};

export interface OwnedRecord {
  ownerId: string;
  visibility: Visibility;
}

export type Relationship = "self" | "partner" | "stranger";

/**
 * What a viewer may see of a record: the whole thing, a summary only, or
 * nothing. Pure, so it can be unit-tested without a database.
 */
export function accessFor(
  relationship: Relationship,
  visibility: Visibility,
): "full" | "summary" | "none" {
  if (relationship === "self") return "full";
  if (relationship === "stranger") return "none";
  if (visibility === "shared") return "full";
  if (visibility === "sharedSummary") return "summary";
  return "none";
}

export function relationshipTo(
  viewerProfileId: string,
  partnerProfileId: string | null,
  ownerId: string,
): Relationship {
  if (ownerId === viewerProfileId) return "self";
  if (partnerProfileId && ownerId === partnerProfileId) return "partner";
  return "stranger";
}
