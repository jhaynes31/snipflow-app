/**
 * Plain, server-safe list of place ids and names, for page titles. The full
 * manifests are browser-side files, so server code can't read them; keep
 * this in step with core/modules/registry.ts.
 */
export const MODULE_NAMES: Record<string, string> = {
  "every-box": "Every Box",
  tend: "Tend",
  "re-centered": "Re-Centered",
  fitness: "Heartwood Fitness",
  "love-and-release": "Love & Release",
};
