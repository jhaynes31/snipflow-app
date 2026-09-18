"use client";

import { Package } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { PlannedScreen } from "@/modules/_shared/PlannedScreen";

/**
 * Every Box: a shared, ambient view of how recently each part of life has
 * been tended. Phase 2 moves the existing Every Box code into this folder.
 * Its freshness indicators are the one allowed exception to the shame-free
 * rules, and they stay inside this module.
 */
export const everyBox: ModuleManifest = {
  id: "every-box",
  name: "Every Box",
  tagline: "Every part of life has a box. See how recently each one was tended.",
  icon: Package,
  route: "/every-box",
  theme: {
    accent: "#6B4F3A",
    onAccent: "#FFFFFF",
    tint: "#EFE4D2",
    dark: { accent: "#C4A07C", onAccent: "#1F261C", tint: "#33392B" },
  },
  headsUpTypes: [],
  sharedData: ["categories", "tending events", "commitments", "weekly reviews"],
  crossModuleHooks: {
    emits: ["category.stuck"],
    listens: ["checkin.low", "loveAction.done"],
  },
  usesAICoach: false,
  status: "planned",
  Screen: function EveryBoxScreen() {
    return <PlannedScreen manifest={everyBox} phase={2} />;
  },
};
