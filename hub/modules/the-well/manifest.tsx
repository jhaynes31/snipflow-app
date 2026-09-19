"use client";

import { Droplets } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { WellShell } from "./WellShell";
import { Book, Books, Chapter, Glossary } from "./screens/Bible";
import { Compare } from "./screens/Compare";
import { ForMe } from "./screens/ForMe";
import { Lies } from "./screens/Lies";
import { Permissions } from "./screens/Permissions";
import { Remembering } from "./screens/Remembering";
import { Talking } from "./screens/Talking";
import { Today } from "./screens/Today";
import { Together } from "./screens/Together";
import { Untangle } from "./screens/Untangle";
import { Ways } from "./screens/Ways";

/**
 * The Well (working name; Jen may rename it): tending a relationship with
 * Jesus, for two people who know all the churchy words and need the plain
 * ones. No reading plan, no streak, no gap ever mentioned. Built from the
 * faith-app notes in docs/app-ideas.md.
 */
export const theWell: ModuleManifest = {
  id: "the-well",
  name: "The Well",
  tagline: "Living water, no religion required. One small thing with Jesus, whenever you come.",
  icon: Droplets,
  route: "/the-well",
  theme: {
    accent: "#2F6E8A",
    onAccent: "#FFFFFF",
    tint: "#DDEAF0",
    dark: { accent: "#7FB6CF", onAccent: "#1F261C", tint: "#243640" },
  },
  headsUpTypes: [],
  sharedData: ["passages marked for each other", "weekly question answers"],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function WellScreen({ path }: { path: string[] }) {
    const [first, second, third, fourth] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Today />;
    else if (first === "bible" && second === "glossary") screen = <Glossary />;
    else if (first === "bible" && second && third && fourth === "compare") screen = <Compare slug={second} chapter={Number(third) || 1} />;
    else if (first === "bible" && second && third) screen = <Chapter slug={second} chapter={Number(third) || 1} />;
    else if (first === "bible" && second) screen = <Book slug={second} />;
    else if (first === "bible") screen = <Books />;
    else if (first === "ways") screen = <Ways area={second} />;
    else if (first === "for-me") screen = <ForMe section={second} />;
    else if (first === "lies") screen = <Lies />;
    else if (first === "untangle") screen = <Untangle />;
    else if (first === "talking") screen = <Talking />;
    else if (first === "remembering") screen = <Remembering />;
    else if (first === "together") screen = <Together />;
    else if (first === "permissions") screen = <Permissions />;
    else screen = <Today />;
    return <WellShell>{screen}</WellShell>;
  },
};
