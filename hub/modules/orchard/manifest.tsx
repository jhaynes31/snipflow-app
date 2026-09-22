"use client";

import { TreeDeciduous } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { CompassScreen } from "./screens/CompassScreen";
import { People } from "./screens/People";
import { Person } from "./screens/Person";
import { SlowTrust } from "./screens/SlowTrust";
import { Together } from "./screens/Together";
import { Ways } from "./screens/Ways";
import { OrchardToday } from "./widgets";

/**
 * The Orchard: friendships that grow slowly. Asked for by Jen on 2026-09-22
 * for both of them: trust slowly when the vibes are good, rein in the
 * story, know if someone is safe and right, and know which way to go when
 * conflict or a pattern shows. Built from docs/orchard-spec.md.
 */
export const orchard: ModuleManifest = {
  id: "orchard",
  name: "The Orchard",
  tagline: "Friendships that grow slowly. Keep the excitement, keep the pearls, let them earn it.",
  icon: TreeDeciduous,
  route: "/orchard",
  theme: {
    accent: "#3F7A5A",
    onAccent: "#FFFFFF",
    tint: "#DDEDE3",
    dark: { accent: "#8FCFA9", onAccent: "#1F261C", tint: "#243A2D" },
  },
  todayWidget: OrchardToday,
  headsUpTypes: [],
  sharedData: ["a person's name, layer and the notes marked shared, only when you share that person"],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function OrchardScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    let screen: React.ReactNode;
    if (!first) screen = <People />;
    else if (first === "person" && second) screen = <Person id={second} />;
    else if (first === "slow-trust") screen = <SlowTrust />;
    else if (first === "compass") screen = <CompassScreen />;
    else if (first === "together") screen = <Together />;
    else if (first === "ways") screen = <Ways />;
    else screen = <People />;
    return <Shell>{screen}</Shell>;
  },
};
