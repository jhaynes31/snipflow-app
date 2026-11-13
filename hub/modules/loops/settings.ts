import type { LoopTheme } from "./theme";

/** Per-profile settings for the tool: the faith layer (on for the Shire mount, off for Metamorphosis until turned on). */
export interface LoopSettings { faith: boolean }

export function readLoopSettings(moduleSettings: Record<string, unknown> | undefined, theme: LoopTheme): LoopSettings {
  const raw = (moduleSettings?.loops ?? {}) as { faith?: unknown };
  return { faith: typeof raw.faith === "boolean" ? raw.faith : theme === "shire" };
}
