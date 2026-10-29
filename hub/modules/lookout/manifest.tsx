"use client";

import { Binoculars } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { LookoutShell } from "./Shell";
import { AddJob } from "./screens/AddJob";
import { Assistant } from "./screens/Assistant";
import { History } from "./screens/History";
import { Interview } from "./screens/Interview";
import { JobDetail } from "./screens/JobDetail";
import { Jobs } from "./screens/Jobs";
import { Overview } from "./screens/Overview";
import { LookoutSettings } from "./screens/Settings";
import { LookoutToday } from "./widgets";

/**
 * The Lookout (2026-10-29): a personal recruiter for remote work that fits.
 * An interview builds his verified profile; jobs are found from employers'
 * own boards and remote job boards, checked against hard requirements,
 * ranked, and given a truthful tailored resume and letter. He approves and
 * submits every application himself. docs/lookout-spec.md.
 */
export const lookout: ModuleManifest = {
  id: "lookout",
  name: "The Lookout",
  tagline: "A personal recruiter for remote work that fits: found, checked, and written for.",
  icon: Binoculars,
  route: "/lookout",
  theme: {
    accent: "#2F5D62",
    onAccent: "#FFFFFF",
    tint: "#DDE9E7",
    dark: { accent: "#8CC2C0", onAccent: "#1F261C", tint: "#24363A" },
  },
  todayWidget: LookoutToday,
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: false,
  status: "ready",
  Screen: function LookoutScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Overview />;
    else if (first === "jobs" && second) screen = <JobDetail id={second} />;
    else if (first === "jobs") screen = <Jobs />;
    else if (first === "add") screen = <AddJob />;
    else if (first === "interview") screen = <Interview />;
    else if (first === "history") screen = <History />;
    else if (first === "assistant") screen = <Assistant />;
    else if (first === "settings") screen = <LookoutSettings />;
    else screen = <Overview />;
    return <LookoutShell>{screen}</LookoutShell>;
  },
};
