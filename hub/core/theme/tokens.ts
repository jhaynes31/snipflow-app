/**
 * The cozy village theme, as data. Every color in the app comes from here.
 * `cssVariables()` turns these into CSS custom properties in the root layout,
 * and module themes build on the same names.
 *
 * `accentText` exists because candlelight gold does not have enough contrast
 * to be read as text on parchment. Use `accent` for fills and lines and
 * `accentText` for gold-colored words. `on*` colors are for text placed on a
 * filled `primary`, `secondary` or `accent` surface. tests/theme.test.ts
 * checks every pairing used in the app for WCAG AA.
 */
export interface ThemeTokens {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  accent: string;
  accentText: string;
  onAccent: string;
  border: string;
}

export const LIGHT: ThemeTokens = {
  background: "#F5EFE0", // parchment
  surface: "#FBF8F0", // cream
  text: "#2F2A24", // warm charcoal
  textMuted: "#6B6155", // bark gray
  primary: "#4F6B3A", // moss green
  onPrimary: "#FFFFFF",
  secondary: "#6B4F3A", // bark brown
  onSecondary: "#FFFFFF",
  accent: "#C98A2E", // candlelight gold
  accentText: "#8A5A14", // deep candlelight, for gold words
  onAccent: "#2F2A24",
  border: "#D9CFBA", // soft twig
};

export const DARK: ThemeTokens = {
  background: "#1F261C", // evening forest
  surface: "#2A3226", // deep moss
  text: "#EDE6D6", // soft cream
  textMuted: "#B5AE9C", // lichen
  primary: "#8FB069", // fern
  onPrimary: "#1F261C",
  secondary: "#C4A07C", // warm oak, lightened so it reads on deep moss
  onSecondary: "#1F261C",
  accent: "#E8B866", // lantern gold
  accentText: "#E8B866",
  onAccent: "#1F261C",
  border: "#3C4535", // dark bark
};

/** Text-on-background pairs the app uses, checked for WCAG AA in tests. */
export const TEXT_PAIRS: [keyof ThemeTokens, keyof ThemeTokens][] = [
  ["text", "background"],
  ["text", "surface"],
  ["textMuted", "background"],
  ["textMuted", "surface"],
  ["primary", "background"],
  ["primary", "surface"],
  ["secondary", "background"],
  ["secondary", "surface"],
  ["accentText", "background"],
  ["accentText", "surface"],
  ["onPrimary", "primary"],
  ["onSecondary", "secondary"],
  ["onAccent", "accent"],
];

function declarations(t: ThemeTokens): string {
  return Object.entries(t)
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
    .join(" ");
}

/**
 * Light by default, dark when the device prefers it (unless the person chose
 * light), and dark when the person chose dark.
 */
export function cssVariables(): string {
  return [
    `:root { ${declarations(LIGHT)} color-scheme: light; }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${declarations(DARK)} color-scheme: dark; } }`,
    `:root[data-theme="dark"] { ${declarations(DARK)} color-scheme: dark; }`,
  ].join("\n");
}
