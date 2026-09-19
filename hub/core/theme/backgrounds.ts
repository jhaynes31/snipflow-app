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
