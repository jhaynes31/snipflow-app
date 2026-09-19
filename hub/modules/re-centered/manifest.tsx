"use client";

import { Compass } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { ReCenteredShell } from "./ReCenteredShell";
import { Boundaries } from "./screens/Boundaries";
import { Landed } from "./screens/Landed";
import { Now } from "./screens/Now";
import { OwnLife } from "./screens/OwnLife";
import { Pause } from "./screens/Pause";
import { Security } from "./screens/Security";
import { Whose } from "./screens/Whose";

/**
 * Re-Centered: one person's own room, named by Jen (2026-09-19). A visible
 * tile that only the person who claimed it can open. Every row is private
 * with no share switch. Built from docs/kept-word-spec.md.
 */
export const reCentered: ModuleManifest = {
  id: "re-centered",
  name: "Re-Centered",
  tagline: "One person's own quiet room, for standing on your own ground.",
  icon: Compass,
  route: "/re-centered",
  theme: {
    accent: "#6B5B8E",
    onAccent: "#FFFFFF",
    tint: "#EAE4F1",
    dark: { accent: "#B3A2D6", onAccent: "#1F261C", tint: "#332C3F" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: ["word.didnt"] },
  usesAICoach: false,
  status: "ready",
  Screen: function ReCenteredScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Now />;
    else if (first === "whose") screen = <Whose />;
    else if (first === "pause") screen = <Pause />;
    else if (first === "landed") screen = <Landed />;
    else if (first === "security") screen = <Security />;
    else if (first === "own-life") screen = <OwnLife />;
    else if (first === "boundaries") screen = <Boundaries />;
    else screen = <Now />;
    return <ReCenteredShell>{screen}</ReCenteredShell>;
  },
};
