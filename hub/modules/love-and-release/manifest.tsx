"use client";

import { Leaf } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { PlannedScreen } from "@/modules/_shared/PlannedScreen";

/**
 * Love & Release: circles for letting go. Private by default. Built in
 * phase 6 from its own spec.
 */
export const loveAndRelease: ModuleManifest = {
  id: "love-and-release",
  name: "Love & Release",
  tagline: "A quiet place to set things down.",
  icon: Leaf,
  route: "/love-and-release",
  theme: {
    accent: "#4F6B3A",
    onAccent: "#FFFFFF",
    tint: "#E3EAD6",
    dark: { accent: "#8FB069", onAccent: "#1F261C", tint: "#2F3A28" },
  },
  gentleModeBehavior: "Opens straight to one small release exercise. No circle list, no history.",
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: {
    emits: [],
    listens: ["checkin.low"],
  },
  usesAICoach: true,
  status: "planned",
  Screen: function LoveAndReleaseScreen() {
    return <PlannedScreen manifest={loveAndRelease} phase={6} />;
  },
};
