"use client";

import { Sun } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Open } from "./screens/Open";
import { FitnessToday } from "./widgets";

/**
 * Heartwood Fitness: the workout app. Named by Jen on 2026-09-18. The id and route
 * stay `fitness`; only this `name` is user-facing, and every screen and doc
 * reads it from here. Keeps its sunflower and sunshine accents inside the
 * village palette.
 *
 * The app itself is Heartwood (hub/heartwood), a separate Vite app served at
 * /fitness/app/ with its data on the device. This module is the doorway:
 * it opens Heartwood as the signed-in person and shows today's plan.
 */
export const fitness: ModuleManifest = {
  id: "fitness",
  name: "Heartwood Fitness",
  tagline: "Fitness that fits the day you're actually having.",
  icon: Sun,
  route: "/fitness",
  theme: {
    accent: "#B8860B",
    onAccent: "#FFFFFF",
    tint: "#F6EBC8",
    dark: { accent: "#E6C35C", onAccent: "#1F261C", tint: "#3A3A22" },
  },
  todayWidget: FitnessToday,
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: {
    emits: [],
    listens: ["checkin.low", "forecast.tenderWeek"],
  },
  usesAICoach: false,
  status: "ready",
  Screen: function FitnessScreen() {
    return <Open />;
  },
};
