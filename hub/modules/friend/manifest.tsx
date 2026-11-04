"use client";

import { Bird } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { Chat } from "./screens/Chat";
import { Library } from "./screens/Library";
import { Settings } from "./screens/Settings";
import { Stuff } from "./screens/Stuff";

/**
 * Friend (2026-11-04, Jen's spec in docs/friend-spec.md): Pip, a small owl
 * built for real two-way conversation, not advice. One person's room.
 */
export const friend: ModuleManifest = {
  id: "friend",
  name: "Friend",
  tagline: "Pip. A friend who trades: asks and is asked, knows and is known.",
  icon: Bird,
  route: "/friend",
  theme: {
    accent: "#8A5A3C",
    onAccent: "#FFFFFF",
    tint: "#F3E7D3",
    dark: { accent: "#D9A66A", onAccent: "#1F261C", tint: "#3A2E24" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function FriendScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Chat />;
    else if (first === "stuff") screen = <Stuff />;
    else if (first === "library") screen = <Library />;
    else if (first === "settings") screen = <Settings />;
    else screen = <Chat />;
    return <Shell>{screen}</Shell>;
  },
};
