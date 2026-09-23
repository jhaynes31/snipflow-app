"use client";

import { Leaf } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { Ask } from "./screens/Ask";
import { Body } from "./screens/Body";
import { Cabinet } from "./screens/Cabinet";
import { Conditions } from "./screens/Conditions";
import { Log } from "./screens/Log";
import { Now } from "./screens/Now";
import { Patterns } from "./screens/Patterns";
import { Where } from "./screens/Where";

/**
 * The Apothecary: body questions answered straight, holistic things to
 * try, what a place tends to hold, a log that finds patterns over months,
 * and where to go for low-cost care. Asked for by Jen on 2026-09-23.
 * Built from docs/apothecary-spec.md. Private to each person.
 */
export const apothecary: ModuleManifest = {
  id: "apothecary",
  name: "The Apothecary",
  tagline: "Bring the body question. A straight answer, holistic things to try, and patterns over time.",
  icon: Leaf,
  route: "/apothecary",
  theme: {
    accent: "#8A5A2B",
    onAccent: "#FFFFFF",
    tint: "#F1E4D3",
    dark: { accent: "#D9A66A", onAccent: "#1F261C", tint: "#3B3026" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function ApothecaryScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Ask />;
    else if (first === "now") screen = <Now />;
    else if (first === "log") screen = <Log />;
    else if (first === "patterns") screen = <Patterns />;
    else if (first === "body") screen = <Body />;
    else if (first === "conditions") screen = <Conditions />;
    else if (first === "cabinet") screen = <Cabinet />;
    else if (first === "where") screen = <Where />;
    else screen = <Ask />;
    return <Shell>{screen}</Shell>;
  },
};
