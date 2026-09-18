"use client";

import { Sun } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { PlannedScreen } from "@/modules/_shared/PlannedScreen";

/**
 * The workout app. Its final name is still being decided, so the display
 * name below is a placeholder. When the name arrives, change `name` here and
 * nothing else; every screen and doc reads it from this manifest.
 * Keeps its sunflower and sunshine accents inside the village palette.
 */
export const fitness: ModuleManifest = {
  id: "fitness",
  name: "Fitness",
  tagline: "Movement that fits the day you're actually having.",
  icon: Sun,
  route: "/fitness",
  theme: {
    accent: "#B8860B",
    onAccent: "#FFFFFF",
    tint: "#F6EBC8",
    dark: { accent: "#E6C35C", onAccent: "#1F261C", tint: "#3A3A22" },
  },
  gentleModeBehavior: "Offers one short, easy session and hides every plan and history view.",
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: {
    emits: ["session.done"],
    listens: ["checkin.low", "forecast.tenderWeek"],
  },
  usesAICoach: true,
  status: "planned",
  Screen: function FitnessScreen() {
    return <PlannedScreen manifest={fitness} phase={5} />;
  },
};
