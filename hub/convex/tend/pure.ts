/**
 * Tend's check-in vocabulary. Pure; shared by the Convex functions and the
 * browser. Plain, literal words, never a grade.
 */
export type Weather = "sunny" | "partlyCloudy" | "foggy" | "stormy" | "heavy";

export const WEATHER: { key: Weather; label: string; glyph: string }[] = [
  { key: "sunny", label: "Sunny", glyph: "☀️" },
  { key: "partlyCloudy", label: "Partly cloudy", glyph: "⛅" },
  { key: "foggy", label: "Foggy", glyph: "🌫️" },
  { key: "stormy", label: "Stormy", glyph: "⛈️" },
  { key: "heavy", label: "Heavy", glyph: "🌧️" },
];

export const ENERGY_LABELS = ["Running on empty", "Low", "Middling", "Up", "Revved up"] as const;

/** The shell's three-way summary, derived from the weather. */
export function answerFor(weather: Weather): "steady" | "tender" | "low" {
  if (weather === "sunny" || weather === "partlyCloudy") return "steady";
  if (weather === "foggy") return "tender";
  return "low";
}

/** "What kind of hard?" tiles. Each person can rename, hide, or add their own. */
export interface KindTile {
  key: string;
  label: string;
}

export const DEFAULT_KINDS: KindTile[] = [
  { key: "overwhelmed", label: "Overwhelmed" },
  { key: "loop", label: "Stuck in a loop" },
  { key: "cantStart", label: "Can't start" },
  { key: "rejected", label: "Feeling rejected" },
  { key: "oldPain", label: "Old pain showing up" },
  { key: "low", label: "Low or heavy" },
  { key: "wired", label: "Too wired" },
  { key: "shutDown", label: "Shut down" },
  { key: "shame", label: "Shame spiral" },
  { key: "sensory", label: "Sensory overload" },
  { key: "unsure", label: "I don't know" },
];

export interface TendSettings {
  /** Anchor and the Pray line. On by default for both (decided 2026-09-18). */
  faith: boolean;
  /** Per-person tile changes: relabels, hides, and additions. */
  tiles: { key: string; label?: string; hidden?: boolean }[];
  /** True once the person chose a starter guidance set or declined one. */
  starterChosen: boolean;
  /** Pause Before Big Moves: the person's own rule, set on a steady day. Shown when energy reads revved. */
  pauseRule?: string;
}

export function readTendSettings(moduleSettings: Record<string, unknown> | undefined): TendSettings {
  const raw = (moduleSettings?.tend ?? {}) as Partial<TendSettings>;
  return {
    faith: raw.faith !== false,
    tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
    starterChosen: raw.starterChosen === true,
    pauseRule: typeof raw.pauseRule === "string" && raw.pauseRule.trim() ? raw.pauseRule : undefined,
  };
}

/** The person's tiles: defaults with their relabels and hides applied, plus their additions. */
export function tilesFor(settings: TendSettings): KindTile[] {
  const byKey = new Map(settings.tiles.map((t) => [t.key, t]));
  const out: KindTile[] = [];
  for (const d of DEFAULT_KINDS) {
    const o = byKey.get(d.key);
    if (o?.hidden) continue;
    out.push({ key: d.key, label: o?.label ?? d.label });
  }
  for (const t of settings.tiles) {
    if (!DEFAULT_KINDS.some((d) => d.key === t.key) && !t.hidden && t.label) out.push({ key: t.key, label: t.label });
  }
  return out;
}

export function labelForKind(key: string, tiles: KindTile[]): string {
  return tiles.find((t) => t.key === key)?.label ?? DEFAULT_KINDS.find((d) => d.key === key)?.label ?? key;
}

/** A plain status line for a heads-up, from the check-in answers. */
export function statusLineFor(weather: Weather, energy: number, kinds: string[], tiles: KindTile[]): string {
  const w = WEATHER.find((x) => x.key === weather)?.label ?? weather;
  const e = ENERGY_LABELS[Math.min(5, Math.max(1, energy)) - 1].toLowerCase();
  const k = kinds
    .slice(0, 3)
    .map((key) => labelForKind(key, tiles).toLowerCase())
    .join(", ");
  return k ? `${w}, ${e}. ${k.charAt(0).toUpperCase()}${k.slice(1)}.` : `${w}, ${e}.`;
}
