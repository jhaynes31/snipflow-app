"use client";

import { Leaf } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { reCentered } from "@/modules/re-centered/manifest";
import { Open } from "./screens/Open";

/**
 * Love & Release: circles for letting go. Private by default. Two doors:
 * the app built on its own (hub/love-and-release, a Vite app with its data
 * on the device, served at /love-and-release/app/) and Re-Centered, one
 * person's room kept in The Shire's database (modules/re-centered) at
 * /love-and-release/john. Combined at Jen's direction on 2026-09-19.
 */
export const loveAndRelease: ModuleManifest = {
  id: "love-and-release",
  name: "Love & Release",
  tagline: "A quiet place to set things down: everyone, and me; my partner, and me.",
  icon: Leaf,
  route: "/love-and-release",
  theme: {
    accent: "#4F6B3A",
    onAccent: "#FFFFFF",
    tint: "#E3EAD6",
    dark: { accent: "#8FB069", onAccent: "#1F261C", tint: "#2F3A28" },
  },
  headsUpTypes: [],
  sharedData: [],
  crossModuleHooks: {
    emits: [],
    listens: ["word.didnt"],
  },
  usesAICoach: false,
  status: "ready",
  Screen: function LoveAndReleaseScreen({ path }: { path: string[] }) {
    const [first, ...rest] = path;
    if (first === "john") {
      const Room = reCentered.Screen;
      return <Room path={rest} />;
    }
    return <Open />;
  },
};
