"use client";

import { createContext, useContext } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import type { Theme, ThemeId } from "@/convex/everybox/themes";

export interface EveryBoxContextValue {
  partner: Doc<"ebPartners">;
  household: Doc<"ebHouseholds">;
  partners: Doc<"ebPartners">[];
  /** The other partner, once they've joined. */
  other: Doc<"ebPartners"> | null;
  theme: Theme;
  availableThemes: ThemeId[];
  email: string | null;
}

export const EveryBoxContext = createContext<EveryBoxContextValue | null>(null);

export function useEveryBox(): EveryBoxContextValue {
  const ctx = useContext(EveryBoxContext);
  if (!ctx) throw new Error("useEveryBox must be used inside EveryBoxShell");
  return ctx;
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
