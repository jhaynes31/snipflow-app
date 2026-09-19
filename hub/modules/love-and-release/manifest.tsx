"use client";

import { Leaf } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Open } from "./screens/Open";

/**
 * Love & Release: circles for letting go. Private by default. Built on its
 * own (hub/love-and-release, a Vite app with its data on the device) and
 * moved into The Shire on 2026-09-19 as an embedded app served at
 * /love-and-release/app/. This module is the doorway.
 */
export const loveAndRelease: ModuleManifest = {
  id: "love-and-release",
  name: "Love & Release",
  tagline: "A quiet place to set things down.",
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
    listens: [],
  },
  usesAICoach: false,
  status: "ready",
  Screen: function LoveAndReleaseScreen() {
    return <Open />;
  },
};
