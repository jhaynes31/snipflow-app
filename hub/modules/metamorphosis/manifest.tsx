"use client";

import { Mountain } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { Charter } from "./screens/Charter";
import { Export } from "./screens/Export";
import { Home } from "./screens/Home";
import { Knowing } from "./screens/Knowing";
import { Landing } from "./screens/Landing";
import { MapScreen } from "./screens/MapScreen";
import { Mirror } from "./screens/Mirror";
import { Sheet } from "./screens/Sheet";
import { CompassScreen, Iron, Quests, Scout, Seen, Shield, Tired } from "./screens/Tools";

/**
 * Metamorphosis: one man's own room, claimed by him. Romans 12:2. Built
 * from docs/metamorphose-spec.md in three steps; steps 1 and 2 are in.
 */
export const metamorphosis: ModuleManifest = {
  id: "metamorphosis",
  name: "Metamorphosis",
  tagline: "A room for one man. Claim it if you want it.",
  icon: Mountain,
  route: "/metamorphosis",
  theme: {
    accent: "#3D5A73",
    onAccent: "#FFFFFF",
    tint: "#DFE7EE",
    dark: { accent: "#8FB3CF", onAccent: "#1F261C", tint: "#26323D" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function MetamorphosisScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Home />;
    else if (first === "mirror") screen = <Mirror />;
    else if (first === "sheet") screen = <Sheet />;
    else if (first === "map") screen = <MapScreen />;
    else if (first === "knowing") screen = <Knowing which={second} />;
    else if (first === "landing") screen = <Landing />;
    else if (first === "charter") screen = <Charter />;
    else if (first === "export") screen = <Export />;
    else if (first === "scout") screen = <Scout />;
    else if (first === "tired") screen = <Tired />;
    else if (first === "shield") screen = <Shield />;
    else if (first === "quests") screen = <Quests />;
    else if (first === "iron") screen = <Iron />;
    else if (first === "compass") screen = <CompassScreen />;
    else if (first === "seen") screen = <Seen />;
    else screen = <Home />;
    return <Shell>{screen}</Shell>;
  },
};
