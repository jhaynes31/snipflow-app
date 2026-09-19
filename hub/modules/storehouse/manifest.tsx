"use client";

import { Warehouse } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { Shell } from "./Shell";
import { Barns } from "./screens/Barns";
import { Debts } from "./screens/Debts";
import { Lifeboat } from "./screens/Lifeboat";
import { ThisMonth } from "./screens/ThisMonth";
import { Worries } from "./screens/Worries";
import { StorehouseToday } from "./widgets";

/**
 * The Storehouse: household money, shared by nature. The Sit-Down, every
 * debt as a fact, the strategies compared in sentences, the Barns, the
 * Lifeboat, and money worries said once. No red, no scorekeeping.
 */
export const storehouse: ModuleManifest = {
  id: "storehouse",
  name: "The Storehouse",
  tagline: "Every dollar with a job, every debt as a fact, and a way out that doesn't need a credit score.",
  icon: Warehouse,
  route: "/storehouse",
  theme: {
    accent: "#7A5C2E",
    onAccent: "#FFFFFF",
    tint: "#F1E7D6",
    dark: { accent: "#D4B27A", onAccent: "#1F261C", tint: "#3A3020" },
  },
  todayWidget: StorehouseToday,
  headsUpTypes: [],
  sharedData: ["income", "the plan", "debts and calls", "the Barns", "the Sit-Down"],
  crossModuleHooks: { emits: ["debt.paid", "sitDown.agreed"], listens: [] },
  usesAICoach: false,
  status: "ready",
  Screen: function StorehouseScreen({ path }: { path: string[] }) {
    const [first] = path;
    let screen: React.ReactNode;
    if (!first) screen = <ThisMonth />;
    else if (first === "debts") screen = <Debts />;
    else if (first === "lifeboat") screen = <Lifeboat />;
    else if (first === "barns") screen = <Barns />;
    else if (first === "worries") screen = <Worries />;
    else screen = <ThisMonth />;
    return <Shell>{screen}</Shell>;
  },
};
