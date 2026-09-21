/**
 * Plain, server-safe list of place ids and names, for page titles. The full
 * manifests are browser-side files, so server code can't read them; keep
 * this in step with core/modules/registry.ts.
 */
export const MODULE_NAMES: Record<string, string> = {
  "every-box": "Every Box",
  tend: "Tend",
  "the-well": "The Well",
  "kept-word": "Kept Word",
  "re-centered": "Re-Centered", // the room inside (module id kept for its data and claim)
  metamorphosis: "Metamorphosis",
  storehouse: "The Storehouse",
  crossroads: "The Crossroads",
  seasons: "Seasons",
  fitness: "Heartwood Fitness",
  "love-and-release": "Re-Centered", // renamed by Jen 2026-09-19; id and route unchanged
  "renewed-mind": "Renewed Mind",
};
