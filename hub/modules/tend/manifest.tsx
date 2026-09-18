"use client";

import { Flame } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { PlannedScreen } from "@/modules/_shared/PlannedScreen";

/**
 * Tend: the support app. Check-ins, core tools, and partner cards, in a warm
 * hearth-corner look of sage green, warm wood, and candlelight gold. Built in
 * phase 3 from its own spec. It builds on the shell's check-in and the
 * `checkin.*` events rather than replacing them.
 */
export const tend: ModuleManifest = {
  id: "tend",
  name: "Tend",
  tagline: "A warm corner for hard days. Check in, use a tool, reach your partner.",
  icon: Flame,
  route: "/tend",
  theme: {
    accent: "#C98A2E",
    onAccent: "#2F2A24",
    tint: "#F3E7CC",
    dark: { accent: "#E8B866", onAccent: "#1F261C", tint: "#3A3A2A" },
  },
  gentleModeBehavior: "Shows only the check-in and the three smallest tools. Hides everything that asks for reflection.",
  headsUpTypes: ["roughDay", "needSpace", "urgent"],
  sharedData: ["heads-up cards", "repair conversations", "the Evidence Bank"],
  crossModuleHooks: {
    emits: ["checkin.low", "forecast.tenderWeek", "loveAction.done"],
    listens: ["category.stuck"],
  },
  usesAICoach: true,
  status: "planned",
  Screen: function TendScreen() {
    return <PlannedScreen manifest={tend} phase={3} />;
  },
};
