"use client";

import { createContext, useContext } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import type { Theme, ThemeId } from "@/convex/everyBox/themes";

export interface EveryBoxContextValue {
  partner: Doc<"ebPartners">;
  household: Doc<"ebHouseholds">;
  partners: Doc<"ebPartners">[];
  /** The other partner, once they've joined. */
  other: Doc<"ebPartners"> | null;
  theme: Theme;
  availableThemes: ThemeId[];
}

export const EveryBoxContext = createContext<EveryBoxContextValue | null>(null);

export function useEveryBox(): EveryBoxContextValue {
  const ctx = useContext(EveryBoxContext);
  if (!ctx) throw new Error("useEveryBox must be used inside EveryBoxShell");
  return ctx;
}

/** "you", "Sam", or "you and Sam" for a list of partner ids. */
export function partnerNames(
  partners: Doc<"ebPartners">[],
  ids: Doc<"ebPartners">["_id"][],
  selfId?: Doc<"ebPartners">["_id"],
): string {
  const names = ids.map((id) => partnerName(partners, id, selfId));
  // Put "you" first; it reads more naturally.
  names.sort((a, b) => (a === "you" ? -1 : b === "you" ? 1 : 0));
  if (names.length <= 1) return names[0] ?? "someone";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Look up a partner's display name by id, with a gentle fallback. */
export function partnerName(
  partners: Doc<"ebPartners">[],
  id: Doc<"ebPartners">["_id"] | undefined,
  selfId?: Doc<"ebPartners">["_id"],
): string {
  if (!id) return "someone";
  if (selfId && id === selfId) return "you";
  return partners.find((p) => p._id === id)?.displayName ?? "your partner";
}
