/**
 * Home-screen background colors. Each person picks their own in Settings or
 * from the home page; the choice lives under `moduleSettings.hub.background`
 * and never affects the partner. Every option has a light and a dark version
 * so text stays readable in both modes (tests/theme.test.ts checks them).
 */
export interface Background {
  key: string;
  name: string;
  light: string;
  dark: string;
  /** A soft two-color wash for the page itself (the base color above still backs chips and inputs). */
  gradient?: { light: [string, string]; dark: [string, string] };
}

export const BACKGROUNDS: Background[] = [
  // The defaults from tokens.ts (LIGHT.background, DARK.background); kept literal so the
  // test runner can load this file on its own.
  { key: "parchment", name: "Parchment", light: "#F5EFE0", dark: "#1F261C" },
  { key: "moss", name: "Moss", light: "#E3EAD6", dark: "#222A1E" },
  { key: "sunshine", name: "Sunshine", light: "#F6EBC8", dark: "#2E2A1A" },
  { key: "blush", name: "Blush", light: "#F3E3DC", dark: "#2E2320" },
  { key: "lavender", name: "Lavender", light: "#EAE4F1", dark: "#29243A" },
  { key: "sky", name: "Sky", light: "#E0EAF0", dark: "#1E262C" },
  { key: "water", name: "Water", light: "#DCEBEA", dark: "#1C2A2A" },
  // More, by Jen's ask (2026-11-14): warm, cool, and a few deeper ones.
  { key: "peach", name: "Peach", light: "#F7E4D3", dark: "#2F2520" },
  { key: "honey", name: "Honey", light: "#F3E2B8", dark: "#2C2616" },
  { key: "pumpkin", name: "Pumpkin", light: "#F4DCC3", dark: "#30231A" },
  { key: "clay", name: "Clay", light: "#EEDBD0", dark: "#2D221F" },
  { key: "rose", name: "Rose", light: "#F1DDE3", dark: "#2E2026" },
  { key: "mauve", name: "Mauve", light: "#E9DEE7", dark: "#2A2230" },
  { key: "plum", name: "Plum", light: "#E6DDEB", dark: "#261F2E" },
  { key: "periwinkle", name: "Periwinkle", light: "#E1E4F2", dark: "#20233A" },
  { key: "slate", name: "Slate", light: "#E2E6EA", dark: "#202428" },
  { key: "sage", name: "Sage", light: "#E1EADF", dark: "#1F2A22" },
  { key: "mint", name: "Mint", light: "#DDEFE6", dark: "#1B2B25" },
  { key: "sand", name: "Sand", light: "#EFE6D6", dark: "#2A2620" },
  { key: "stone", name: "Stone", light: "#E8E4DC", dark: "#262522" },
  { key: "fog", name: "Fog", light: "#ECEEF0", dark: "#232628" },
  // Richer colors (2026-11-14, Jen: "they all look the same"). Still readable; the test checks.
  { key: "butter", name: "Butter", light: "#F6E58A", dark: "#3A3416" },
  { key: "marigold", name: "Marigold", light: "#F8DC97", dark: "#3A2F12" },
  { key: "apricot", name: "Apricot", light: "#FADAB4", dark: "#3C2A16" },
  { key: "coral", name: "Coral", light: "#FAD7CD", dark: "#3C221E" },
  { key: "terracotta", name: "Terracotta", light: "#F4D9CA", dark: "#3C2516" },
  { key: "pink", name: "Pink", light: "#F7D7E5", dark: "#381F2C" },
  { key: "lilac", name: "Lilac", light: "#E7DAF6", dark: "#2C2142" },
  { key: "wisteria", name: "Wisteria", light: "#DFDDF7", dark: "#232045" },
  { key: "cornflower", name: "Cornflower", light: "#D1E0F7", dark: "#1A2745" },
  { key: "robin", name: "Robin's egg", light: "#C6E9EA", dark: "#143034" },
  { key: "seafoam", name: "Seafoam", light: "#C6EDDB", dark: "#15302A" },
  { key: "pistachio", name: "Pistachio", light: "#D8EBB4", dark: "#232E14" },
  { key: "olive", name: "Olive", light: "#DEE2B0", dark: "#282B14" },
  // Washes: two colors, soft, top-left to bottom-right.
  { key: "sunset", name: "Sunset", light: "#F7E4D3", dark: "#2F2520", gradient: { light: ["#F7E4D3", "#F1D3DC"], dark: ["#2F2520", "#2E2026"] } },
  { key: "dawn", name: "Dawn", light: "#F3E3DC", dark: "#2E2320", gradient: { light: ["#F3E3DC", "#F6E58A"], dark: ["#2E2320", "#3A3416"] } },
  { key: "harvest", name: "Harvest", light: "#F4DCC3", dark: "#30231A", gradient: { light: ["#F4DCC3", "#F3E2B8"], dark: ["#30231A", "#2C2616"] } },
  { key: "meadow", name: "Meadow", light: "#E3EAD6", dark: "#222A1E", gradient: { light: ["#E3EAD6", "#E0EAF0"], dark: ["#222A1E", "#1E262C"] } },
  { key: "tide", name: "Tide", light: "#DDEFE6", dark: "#1B2B25", gradient: { light: ["#DDEFE6", "#D1E0F7"], dark: ["#1B2B25", "#1A2745"] } },
  { key: "dusk", name: "Dusk", light: "#EAE4F1", dark: "#29243A", gradient: { light: ["#EAE4F1", "#D1E0F7"], dark: ["#29243A", "#1A2745"] } },
  { key: "orchard", name: "Orchard", light: "#E1EADF", dark: "#1F2A22", gradient: { light: ["#E1EADF", "#F8DC97"], dark: ["#1F2A22", "#3A2F12"] } },
  { key: "berry", name: "Berry", light: "#F7D7E5", dark: "#381F2C", gradient: { light: ["#F7D7E5", "#E7DAF6"], dark: ["#381F2C", "#2C2142"] } },
];

export const DEFAULT_BACKGROUND = BACKGROUNDS[0].key;

export function readBackground(moduleSettings: Record<string, unknown> | undefined): string {
  const raw = (moduleSettings?.hub ?? {}) as { background?: unknown };
  return typeof raw.background === "string" && BACKGROUNDS.some((b) => b.key === raw.background) ? raw.background : DEFAULT_BACKGROUND;
}

/** CSS that switches `--background` by the `data-bg` attribute on <html>, in both modes. */
export function gradientCss(pair: [string, string]): string {
  return `linear-gradient(160deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

export function backgroundCss(): string {
  return BACKGROUNDS.filter((b) => b.key !== DEFAULT_BACKGROUND)
    .map((b) => {
      const lines = [
        `:root[data-bg="${b.key}"] { --background: ${b.light}; }`,
        `@media (prefers-color-scheme: dark) { :root[data-bg="${b.key}"]:not([data-theme="light"]) { --background: ${b.dark}; } }`,
        `:root[data-bg="${b.key}"][data-theme="dark"] { --background: ${b.dark}; }`,
      ];
      if (b.gradient) {
        // The wash goes on the page only; chips and inputs keep the solid base above.
        lines.push(
          `:root[data-bg="${b.key}"] body { background: ${gradientCss(b.gradient.light)} fixed; }`,
          `@media (prefers-color-scheme: dark) { :root[data-bg="${b.key}"]:not([data-theme="light"]) body { background: ${gradientCss(b.gradient.dark)} fixed; } }`,
          `:root[data-bg="${b.key}"][data-theme="dark"] body { background: ${gradientCss(b.gradient.dark)} fixed; }`,
        );
      }
      return lines.join("\n");
    })
    .join("\n");
}
