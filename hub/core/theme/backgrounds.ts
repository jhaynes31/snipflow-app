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
];

export const DEFAULT_BACKGROUND = BACKGROUNDS[0].key;

export function readBackground(moduleSettings: Record<string, unknown> | undefined): string {
  const raw = (moduleSettings?.hub ?? {}) as { background?: unknown };
  return typeof raw.background === "string" && BACKGROUNDS.some((b) => b.key === raw.background) ? raw.background : DEFAULT_BACKGROUND;
}

/** CSS that switches `--background` by the `data-bg` attribute on <html>, in both modes. */
export function backgroundCss(): string {
  return BACKGROUNDS.filter((b) => b.key !== DEFAULT_BACKGROUND)
    .map((b) =>
      [
        `:root[data-bg="${b.key}"] { --background: ${b.light}; }`,
        `@media (prefers-color-scheme: dark) { :root[data-bg="${b.key}"]:not([data-theme="light"]) { --background: ${b.dark}; } }`,
        `:root[data-bg="${b.key}"][data-theme="dark"] { --background: ${b.dark}; }`,
      ].join("\n"),
    )
    .join("\n");
}
