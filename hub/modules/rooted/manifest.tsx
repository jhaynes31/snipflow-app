"use client";

import { Sprout } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { FailSafes } from "./screens/FailSafes";
import { Home } from "./screens/Home";
import { Learn } from "./screens/Learn";
import { People } from "./screens/People";
import { Read } from "./screens/Read";
import { Secure } from "./screens/Secure";
import { Talk } from "./screens/Talk";
import { Today } from "./screens/Today";
import { Us } from "./screens/Us";

/**
 * Rooted (2026-11-03, Jen's ask): attachment work. Learn the four styles,
 * read where you are, practice toward secure, recognize an avoidant pattern
 * early, keep fail safes written on a calm day, and map the people who
 * shaped the pattern. Private to each person; both can use it.
 */
export const rooted: ModuleManifest = {
  id: "rooted",
  name: "Rooted",
  tagline: "Earned security: knowing your pattern, choosing your people.",
  icon: Sprout,
  route: "/rooted",
  theme: {
    accent: "#6E4B3A",
    onAccent: "#FFFFFF",
    tint: "#EADFD3",
    dark: { accent: "#C9A086", onAccent: "#1F261C", tint: "#3A2E26" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: { emits: [], listens: [] },
  usesAICoach: true,
  status: "ready",
  Screen: function RootedScreen({ path }: { path: string[] }) {
    const [first, second] = path;
    let screen: React.ReactNode;
    if (!first) screen = <Home />;
    else if (first === "learn") screen = <Learn page={second ?? null} />;
    else if (first === "today") screen = <Today />;
    else if (first === "secure") screen = <Secure />;
    else if (first === "read") screen = <Read />;
    else if (first === "fail-safes") screen = <FailSafes />;
    else if (first === "people") screen = <People />;
    else if (first === "talk") screen = <Talk />;
    else if (first === "us") screen = <Us page={second ?? null} />;
    else screen = <Home />;
    return <Shell>{screen}</Shell>;
  },
};
