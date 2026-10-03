import { MODULE_NAMES } from "./names";

/**
 * Server-safe brand bits for each place: its accent color and a short mark,
 * for the home-screen icon of one app on its own (2026-10-03). The full
 * manifests are browser-side files, so this stays in step with them by hand.
 */
export const MODULE_BRAND: Record<string, { accent: string; mark: string }> = {
  "every-box": { accent: "#6B4F3A", mark: "EB" },
  tend: { accent: "#C98A2E", mark: "T" },
  "renewed-mind": { accent: "#7B5EA7", mark: "RM" },
  "the-well": { accent: "#2F6E8A", mark: "W" },
  "kept-word": { accent: "#8B5E3C", mark: "KW" },
  "love-and-release": { accent: "#4F6B3A", mark: "RC" },
  orchard: { accent: "#3F7A5A", mark: "O" },
  apothecary: { accent: "#8A5A2B", mark: "A" },
  metamorphosis: { accent: "#3D5A73", mark: "M" },
  storehouse: { accent: "#7A5C2E", mark: "S" },
  crossroads: { accent: "#5B6B3A", mark: "X" },
  seasons: { accent: "#4F6F3A", mark: "Se" },
  fitness: { accent: "#B8860B", mark: "H" },
};

/** The places a person can put on the phone's home screen on their own. */
export const HOME_SCREEN_MODULES = Object.keys(MODULE_BRAND).map((id) => ({ id, name: MODULE_NAMES[id] ?? id, ...MODULE_BRAND[id] }));
