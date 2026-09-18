import type { ModuleManifest } from "./types";
import { everyBox } from "@/modules/every-box/manifest";
import { fitness } from "@/modules/fitness/manifest";
import { loveAndRelease } from "@/modules/love-and-release/manifest";
import { tend } from "@/modules/tend/manifest";

/** Registry order is the default tab order. People can rearrange it in Settings. */
export const MODULES: ModuleManifest[] = [everyBox, tend, fitness, loveAndRelease];

export function moduleById(id: string): ModuleManifest | undefined {
  return MODULES.find((m) => m.id === id);
}

/**
 * The registry in a person's chosen tab order. Every place is always on for
 * both people (Jen's decision, 2026-09-18); only the order is personal.
 */
export function modulesFor(prefs: { order: string[] }): ModuleManifest[] {
  const rank = (m: ModuleManifest) => {
    const i = prefs.order.indexOf(m.id);
    return i === -1 ? prefs.order.length + MODULES.indexOf(m) : i;
  };
  return [...MODULES].sort((a, b) => rank(a) - rank(b));
}
