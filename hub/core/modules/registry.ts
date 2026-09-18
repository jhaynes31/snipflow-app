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

/** Applies a person's on/off choices and tab order to the registry. */
export function modulesFor(prefs: { disabled: string[]; order: string[] }): ModuleManifest[] {
  const enabled = MODULES.filter((m) => !prefs.disabled.includes(m.id));
  const rank = (m: ModuleManifest) => {
    const i = prefs.order.indexOf(m.id);
    return i === -1 ? prefs.order.length + MODULES.indexOf(m) : i;
  };
  return [...enabled].sort((a, b) => rank(a) - rank(b));
}
