"use client";

import { Package } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { EveryBoxShell } from "./EveryBoxShell";
import { BoxDetail } from "./screens/BoxDetail";
import { Boxes } from "./screens/Boxes";
import { Commitments } from "./screens/Commitments";
import { Dashboard } from "./screens/Dashboard";
import { Glance } from "./screens/Glance";
import { Review } from "./screens/Review";
import { Settings } from "./screens/Settings";
import { EveryBoxHome, EveryBoxToday } from "./widgets";

/**
 * Every Box: a shared, ambient view of how recently each part of life has
 * been tended, so John can see every box in his brain. Moved in from the
 * standalone app in phase 2; see docs/every-box-migration-plan.md. Its
 * freshness stages are the one allowed exception to the shame-free rules,
 * and they stay inside this module.
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
  todayWidget: EveryBoxToday,
  homeWidget: EveryBoxHome,
  headsUpTypes: [],
  sharedData: ["boxes", "tending events", "context notes", "commitments", "weekly reviews"],
  crossModuleHooks: {
    emits: ["category.stuck"],
    listens: [],
  },
  usesAICoach: false,
  status: "ready",
  Screen: function EveryBoxScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    const bare = first === "glance";
    let screen: React.ReactNode;
    if (!first) screen = <Dashboard />;
    else if (first === "boxes") screen = <Boxes />;
    else if (first === "box" && second) screen = <BoxDetail id={second} />;
    else if (first === "commitments") screen = <Commitments />;
    else if (first === "review") screen = <Review />;
    else if (first === "glance") screen = <Glance />;
    else if (first === "settings") screen = <Settings />;
    else screen = <Dashboard />;
    return <EveryBoxShell bare={bare}>{screen}</EveryBoxShell>;
  },
};
