"use client";

import { Flame } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { HearthShell } from "./Shell";
import { About } from "./screens/About";
import { CareHome, Hair, Hygiene, Skin, Style } from "./screens/Care";
import { FatherAsk, FatherBlessing, FatherHome, FatherTeaches, FatherTold, InHisEyes } from "./screens/Father";
import { Home } from "./screens/Home";
import { Know } from "./screens/Know";
import { Little } from "./screens/Little";
import { Available, Body, ComeSit, Equipped, Married, MotherAsk, MotherBlessing, MotherHome, MotherTeaches } from "./screens/Mother";

/**
 * The Hearth (2026-09-23): the third door in Re-Centered. A father's chair and
 * a mother's table for the daughter who had two parents who never acted like
 * them, her care shelf, What I know, and rooms for the girl and the teenager.
 * One person's room, claimed once (module id "hearth" in moduleOwners), served
 * at /love-and-release/hearth/… by Re-Centered's Screen. docs/hearth-spec.md.
 */
export const hearth: ModuleManifest = {
  id: "hearth",
  name: "The Hearth",
  tagline: "A father's chair and a mother's table, for the daughter who didn't get them.",
  icon: Flame,
  route: "/love-and-release/hearth",
  theme: {
    accent: "#9A5B3C",
    onAccent: "#FFFFFF",
    tint: "#F1E3D6",
    dark: { accent: "#D49A76", onAccent: "#1F261C", tint: "#3A2D25" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function HearthScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Home />;
    else if (first === "about") screen = <About />;
    else if (first === "father") {
      if (second === "ask") screen = <FatherAsk />;
      else if (second === "told") screen = <FatherTold />;
      else if (second === "eyes") screen = <InHisEyes />;
      else if (second === "teaches") screen = <FatherTeaches />;
      else if (second === "blessing") screen = <FatherBlessing />;
      else screen = <FatherHome />;
    } else if (first === "mother") {
      if (second === "ask") screen = <MotherAsk />;
      else if (second === "sit") screen = <ComeSit />;
      else if (second === "teaches") screen = <MotherTeaches />;
      else if (second === "equipped") screen = <Equipped />;
      else if (second === "married") screen = <Married />;
      else if (second === "available") screen = <Available />;
      else if (second === "body") screen = <Body />;
      else if (second === "blessing") screen = <MotherBlessing />;
      else screen = <MotherHome />;
    } else if (first === "care") {
      if (second === "skin") screen = <Skin />;
      else if (second === "hygiene") screen = <Hygiene />;
      else if (second === "hair") screen = <Hair />;
      else if (second === "style") screen = <Style />;
      else screen = <CareHome />;
    } else if (first === "know") screen = <Know />;
    else if (first === "girl") screen = <Little who="girl" />;
    else if (first === "teen") screen = <Little who="teen" />;
    else screen = <Home />;
    return <HearthShell>{screen}</HearthShell>;
  },
};
