"use client";

import { Leaf } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { reCentered } from "@/modules/re-centered/manifest";
import { Open } from "./screens/Open";

/**
 * Re-Centered (named by Jen 2026-09-19; the id and route stay
 * `love-and-release`, the name of the app it grew from). Private by
 * default. Two doors: the app built on its own (hub/love-and-release, a
 * Vite app with its data on the device, served at /love-and-release/app/)
 * and the "{partner}, and me" room kept in The Shire's database
 * (modules/re-centered, module id "re-centered") at /love-and-release/john.
 */
export const loveAndRelease: ModuleManifest = {
  id: "love-and-release",
  name: "Re-Centered",
  tagline: "Your own ground. Everyone, and me; my partner, and me.",
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
