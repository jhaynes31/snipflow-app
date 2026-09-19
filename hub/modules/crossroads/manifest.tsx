"use client";

import { Signpost } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { Guide } from "./screens/Guide";
import { Places } from "./screens/Places";
import { Questions } from "./screens/Questions";
import { Road } from "./screens/Road";
import { Sources } from "./screens/Sources";
import { Together } from "./screens/Together";

/**
 * The Crossroads: deciding where to live, together, and the road there.
 * Questions each person answers alone, a Together view, places rated on
 * what you both said matters, a guide that never picks for you, and the
 * steps in order with costs. Built from docs/crossroads-spec.md.
 */
export const crossroads: ModuleManifest = {
  id: "crossroads",
  name: "The Crossroads",
  tagline: "Stay, another state, or another country: decide together, then walk the road one step at a time.",
  icon: Signpost,
  route: "/crossroads",
  theme: {
    accent: "#5B6B3A",
    onAccent: "#FFFFFF",
    tint: "#E8ECD9",
    dark: { accent: "#A9BC7A", onAccent: "#1F261C", tint: "#2E3524" },
  },
  headsUpTypes: [],
  sharedData: ["answers", "places and ratings", "the road"],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function CrossroadsScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Questions />;
    else if (first === "together") screen = <Together />;
    else if (first === "places") screen = <Places />;
    else if (first === "guide") screen = <Guide />;
    else if (first === "road") screen = <Road />;
    else if (first === "sources") screen = <Sources />;
    else screen = <Questions />;
    return <Shell>{screen}</Shell>;
  },
};
