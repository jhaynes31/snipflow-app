"use client";

import { Brain } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { Beliefs } from "./screens/Beliefs";
import { Captive } from "./screens/Captive";
import { Evidence } from "./screens/Evidence";
import { Live } from "./screens/Live";
import { Rehearse } from "./screens/Rehearse";
import { RenewedMindToday } from "./widgets";

/**
 * Renewed Mind: rewriting the lines that run you, in your own words, and
 * wearing the new path by rehearsing them. Four tools: Rehearse, Put Off
 * Put On, Take It Captive, Live It, Evidence for the New. Asked for by Jen on
 * 2026-09-21 ("as a man thinks, so he is"). Built from docs/renewed-mind-spec.md.
 */
export const renewedMind: ModuleManifest = {
  id: "renewed-mind",
  name: "Renewed Mind",
  tagline: "The lines that run you, rewritten in your own words, and worn in one day at a time.",
  icon: Brain,
  route: "/renewed-mind",
  theme: {
    accent: "#7B5EA7",
    onAccent: "#FFFFFF",
    tint: "#EDE6F5",
    dark: { accent: "#C3B1E1", onAccent: "#1F261C", tint: "#342C42" },
  },
  todayWidget: RenewedMindToday,
  headsUpTypes: [],
  sharedData: ["a truer line, only when its writer shares it"],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function RenewedMindScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Rehearse />;
    else if (first === "beliefs") screen = <Beliefs />;
    else if (first === "captive") screen = <Captive />;
    else if (first === "live") screen = <Live />;
    else if (first === "evidence") screen = <Evidence />;
    else screen = <Rehearse />;
    return <Shell>{screen}</Shell>;
  },
};
