import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Every module registers itself with one manifest. Adding a module means
 * writing a manifest plus the module's own screens; the shell needs no
 * changes. See docs/foundation.md, "Adding a module".
 */
export interface ModuleTheme {
  /** The module's own accent inside the village palette. */
  accent: string;
  /** Text color that passes AA on `accent`. */
  onAccent: string;
  /** Optional tint for the module's tile and frame. */
  tint?: string;
  /** Dark-mode versions. Fall back to the light values when absent. */
  dark?: { accent: string; onAccent: string; tint?: string };
}

export interface ModuleManifest {
  /** Stable id. Also the prefix for the module's Convex tables and settings key. */
  id: string;
  /** User-facing name. The only place it is written. */
  name: string;
  /** One plain line for the home-screen tile. */
  tagline: string;
  icon: LucideIcon;
  /** Route root, for example "/tend". */
  route: string;
  theme: ModuleTheme;
  /**
   * Optional small item for the home screen's "Today" row. Render nothing
   * when there is nothing worth showing; the row stays silent for you.
   */
  todayWidget?: ComponentType;
  /** Heads-up card kinds this module can hand to the Hub, if any. */
  headsUpTypes: string[];
  /** Data types shared with the partner by default. Everything else is private. */
  sharedData: string[];
  crossModuleHooks: { emits: string[]; listens: string[] };
  usesAICoach: boolean;
  /** The module's root screen. Receives the path segments after `route`. */
  Screen: ComponentType<{ path: string[] }>;
  /** "planned" modules show a tile and a plain screen saying they aren't built yet. */
  status: "planned" | "ready";
}
