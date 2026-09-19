"use client";

import { Handshake } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { KeptWordShell } from "./KeptWordShell";
import { Asks } from "./screens/Asks";
import { Kept } from "./screens/Kept";
import { OpenWords } from "./screens/OpenWords";
import { Ways } from "./screens/Ways";
import { Weeks } from "./screens/Weeks";
import { KeptWordToday } from "./widgets";

/**
 * Kept Word: a word is one thing a person said they would do. The giver
 * writes it and the giver closes it. The record shows what was kept beside
 * what wasn't, and the app writes the weeks, so no one has to keep score
 * on anyone. Built from docs/kept-word-spec.md.
 */
export const keptWord: ModuleManifest = {
  id: "kept-word",
  name: "Kept Word",
  tagline: "What each of you said you'd do, and what happened. Written by the app, not by either of you.",
  icon: Handshake,
  route: "/kept-word",
  theme: {
    accent: "#8B5E3C",
    onAccent: "#FFFFFF",
    tint: "#F0E4D8",
    dark: { accent: "#D9A276", onAccent: "#1F261C", tint: "#3B2E24" },
  },
  todayWidget: KeptWordToday,
  headsUpTypes: [],
  sharedData: ["words", "I heard you say drafts", "asks and answers", "the weeks"],
  crossModuleHooks: {
    emits: ["word.kept", "word.didnt", "word.sendToEveryBox", "ask.answered"],
    listens: [],
  },
  usesAICoach: false,
  status: "ready",
  Screen: function KeptWordScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <OpenWords />;
    else if (first === "asks") screen = <Asks />;
    else if (first === "weeks") screen = <Weeks />;
    else if (first === "kept") screen = <Kept />;
    else if (first === "ways") screen = <Ways />;
    else screen = <OpenWords />;
    return <KeptWordShell>{screen}</KeptWordShell>;
  },
};
