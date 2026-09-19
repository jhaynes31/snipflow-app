"use client";

import { Sprout } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { SeasonsShell } from "./SeasonsShell";
import { Read } from "./screens/Read";
import { ReportList } from "./screens/ReportList";
import { SeasonsToday } from "./widgets";

/**
 * Seasons: the pattern report. Two reports, never one. "My season" is
 * private and drawn from a person's own data everywhere in The Shire.
 * "Our season" is shared, identical for both, and drawn only from what is
 * shared by nature. Built from docs/kept-word-spec.md.
 */
export const seasons: ModuleManifest = {
  id: "seasons",
  name: "Seasons",
  tagline: "What changed, in plain words: a private season for each of you, and one for the two of you.",
  icon: Sprout,
  route: "/seasons",
  theme: {
    accent: "#4F6F3A",
    onAccent: "#FFFFFF",
    tint: "#E4ECD9",
    dark: { accent: "#9CBF7A", onAccent: "#1F261C", tint: "#2C3826" },
  },
  todayWidget: SeasonsToday,
  headsUpTypes: [],
  sharedData: ["our season"],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function SeasonsScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    let screen: React.ReactNode;
    if (!first) screen = <ReportList kind="mine" />;
    else if (first === "ours") screen = <ReportList kind="ours" />;
    else if (first === "read" && second) screen = <Read id={second} />;
    else screen = <ReportList kind="mine" />;
    return <SeasonsShell>{screen}</SeasonsShell>;
  },
};
