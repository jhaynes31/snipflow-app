"use client";

import { createContext, useContext } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { ModuleManifest } from "@/core/modules/types";

export interface PartnerView {
  _id: Id<"profiles">;
  displayName: string;
  photoUrl?: string;
  timeZone: string;
}

export interface HubContextValue {
  profile: Doc<"profiles">;
  partner: PartnerView | null;
  email: string | null;
  /** My own gentle day state. */
  gentle: boolean;
  /** Whether the partner has gentle day on. Nothing more is visible. */
  partnerGentle: boolean;
  /** Every place, in this person's chosen tab order. */
  modules: ModuleManifest[];
  /** The places this person pinned to their home screen. */
  pinned: ModuleManifest[];
  /** Open and responded heads-ups addressed to me, newest first. */
  headsUpsForMe: Doc<"headsUps">[];
}

export const HubContext = createContext<HubContextValue | null>(null);

export function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside HubShell");
  return ctx;
}
