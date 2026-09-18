/**
 * Who tends a category. Pure helpers shared by the backend and the browser.
 *
 * A category can have one or more tenders. Older records carry a single
 * `tenderId`; newer ones carry `tenderIds`. Both shapes resolve through here
 * so nothing else has to care which one it is looking at.
 */
import type { Id } from "../_generated/dataModel";

export interface HasTenders {
  tenderId?: Id<"ebPartners">;
  tenderIds?: Id<"ebPartners">[];
}

/** Effective list of tenders, never empty for a valid record. */
export function tenderIdsOf(category: HasTenders): Id<"ebPartners">[] {
  if (category.tenderIds && category.tenderIds.length > 0) return category.tenderIds;
  return category.tenderId ? [category.tenderId] : [];
}

export function isTender(category: HasTenders, partnerId: Id<"ebPartners">): boolean {
  return tenderIdsOf(category).includes(partnerId);
}

export interface HasAssignees {
  assignedTo?: Id<"ebPartners">;
  assignedToIds?: Id<"ebPartners">[];
}

/** Who a commitment is for; one or both partners. */
export function assigneeIdsOf(c: HasAssignees): Id<"ebPartners">[] {
  if (c.assignedToIds && c.assignedToIds.length > 0) return c.assignedToIds;
  return c.assignedTo ? [c.assignedTo] : [];
}

export function isAssignee(c: HasAssignees, partnerId: Id<"ebPartners">): boolean {
  return assigneeIdsOf(c).includes(partnerId);
}

/** De-duplicate while keeping order. */
export function uniqueIds(ids: Id<"ebPartners">[]): Id<"ebPartners">[] {
  return [...new Set(ids)];
}
