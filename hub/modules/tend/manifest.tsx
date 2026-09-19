"use client";

import { Flame } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { TendShell } from "./TendShell";
import { ForYou } from "./screens/ForYou";
import { MyManual } from "./screens/MyManual";
import { MyTools } from "./screens/MyTools";
import { Now } from "./screens/Now";
import { ToolScreen } from "./tools/index";

/**
 * Tend: the support app. So Jen and John can support each other where
 * each is weak. Built from docs/support-app-spec.md in steps; step 1
 * (check-in, guidance cards, Love Menus) is in. The check-in itself lives
 * behind the shell's "How are you, really?" button, at /check-in.
 */
export const tend: ModuleManifest = {
  id: "tend",
  name: "Tend",
  tagline: "A warm corner for hard days. Check in, use a tool, reach your partner.",
  icon: Flame,
  route: "/tend",
  theme: {
    accent: "#C98A2E",
    onAccent: "#2F2A24",
    tint: "#F3E7CC",
    dark: { accent: "#E8B866", onAccent: "#1F261C", tint: "#3A3A2A" },
  },
  headsUpTypes: ["checkIn", "storyCheck", "repairInvite", "urgent"],
  sharedData: ["heads-up cards", "guidance entries", "love menus", "love actions", "the Evidence Bank"],
  crossModuleHooks: {
    emits: ["checkin.low", "checkin.revved", "loveAction.done"],
    listens: ["category.stuck"],
  },
  usesAICoach: true,
  status: "ready",
  Screen: function TendScreen({ path }: { path: string[] }) {
    const [first, second, third] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Now />;
    else if (first === "for-you") screen = <ForYou />;
    else if (first === "my-manual") screen = <MyManual />;
    else if (first === "tools" && second) screen = <ToolScreen toolKey={second} id={third} />;
    else if (first === "tools") screen = <MyTools />;
    else screen = <Now />;
    return <TendShell>{screen}</TendShell>;
  },
};
