/**
 * Every Box themes.
 *
 * A theme is purely a skin over the same category/freshness data: five stage
 * visuals, five stage labels, a verb for "tending", and a palette. No theme
 * carries any data logic of its own. Adding a theme means adding an entry
 * here and nothing else.
 */

import type { StageIndex } from "./freshness";

export type ThemeId =
  | "garden"
  | "aquarium"
  | "character"
  | "house"
  | "terrarium"
  | "guild"
  | "village";

export interface ThemeStage {
  /** Short label for the stage, in the theme's own voice. */
  label: string;
  /** Glyph used as the stage's art asset. */
  glyph: string;
  /** One soft sentence describing the state. Never a grade. */
  flavor: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  premium: boolean;
  /** What a category is called in this world ("plant", "tank", "stat"). */
  noun: string;
  nounPlural: string;
  /** Verb used on the tend button ("Water", "Feed", "Train"). */
  tendVerb: string;
  /** Past tense of the tend verb, for history ("watered", "fed"). */
  tendPast: string;
  /** What the whole dashboard is called ("your garden"). */
  worldName: string;
  /** Index 0 = dormant … index 4 = flourishing. */
  stages: readonly [ThemeStage, ThemeStage, ThemeStage, ThemeStage, ThemeStage];
  palette: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
    border: string;
    /** Stage tints, dormant → flourishing. */
    stageTints: readonly [string, string, string, string, string];
  };
}

export const THEMES: Record<ThemeId, Theme> = {
  garden: {
    id: "garden",
    name: "Garden",
    tagline: "Beds that wake up when you water them.",
    premium: false,
    noun: "plant",
    nounPlural: "plants",
    tendVerb: "Water",
    tendPast: "watered",
    worldName: "your garden",
    stages: [
      { label: "Dormant", glyph: "🌰", flavor: "Resting in the soil, ready to wake." },
      { label: "Sprouting", glyph: "🌱", flavor: "A first shoot is showing." },
      { label: "Growing", glyph: "🌿", flavor: "Leafing out nicely." },
      { label: "Thriving", glyph: "🪴", flavor: "Full and green." },
      { label: "Flourishing", glyph: "🌸", flavor: "In bloom." },
    ],
    palette: {
      bg: "#f5f2e8",
      surface: "#fffdf7",
      surfaceAlt: "#eef0e2",
      text: "#2f3a2a",
      muted: "#6b7561",
      accent: "#4f7d4a",
      accentText: "#ffffff",
      border: "#dcdccb",
      stageTints: ["#d9d3c2", "#cfe3c0", "#b5d69f", "#8fc47c", "#f2b8c6"],
    },
  },
  aquarium: {
    id: "aquarium",
    name: "Aquarium",
    tagline: "Tanks that come alive with a little feeding.",
    premium: false,
    noun: "tank",
    nounPlural: "tanks",
    tendVerb: "Feed",
    tendPast: "fed",
    worldName: "your aquarium",
    stages: [
      { label: "Still water", glyph: "🫧", flavor: "Quiet and clear, waiting for company." },
      { label: "Stirring", glyph: "🐚", flavor: "Something is moving in the sand." },
      { label: "Swimming", glyph: "🐟", flavor: "A fish is exploring." },
      { label: "Lively", glyph: "🐠", flavor: "Colour everywhere." },
      { label: "Teeming", glyph: "🪸", flavor: "A whole reef, buzzing." },
    ],
    palette: {
      bg: "#e6f1f6",
      surface: "#f7fbfd",
      surfaceAlt: "#d8e8f0",
      text: "#1f3440",
      muted: "#5b7482",
      accent: "#2a7fa3",
      accentText: "#ffffff",
      border: "#c6d9e3",
      stageTints: ["#cfd9de", "#bcdbe8", "#9fd0e3", "#79c2dc", "#ffcf8a"],
    },
  },
  character: {
    id: "character",
    name: "Character sheet",
    tagline: "Every stat levels with practice, none is ever lost.",
    premium: false,
    noun: "stat",
    nounPlural: "stats",
    tendVerb: "Train",
    tendPast: "trained",
    worldName: "your character sheet",
    stages: [
      { label: "Resting", glyph: "💤", flavor: "Camped by the fire, ready for the next quest." },
      { label: "Training", glyph: "⚔️", flavor: "Back in the practice yard." },
      { label: "Adventuring", glyph: "🛡️", flavor: "Out on the road." },
      { label: "Heroic", glyph: "✨", flavor: "Songs are being written." },
      { label: "Legendary", glyph: "🐉", flavor: "Dragons know your name." },
    ],
    palette: {
      bg: "#f3ecdf",
      surface: "#fbf6ec",
      surfaceAlt: "#e9dfcb",
      text: "#3a2d1e",
      muted: "#7a6a54",
      accent: "#8b4a2b",
      accentText: "#ffffff",
      border: "#d9cbb3",
      stageTints: ["#ddd3c3", "#e3c9a5", "#e0b47b", "#d99a4e", "#c9a2e8"],
    },
  },
  house: {
    id: "house",
    name: "House restoration",
    tagline: "Rooms that come back to life, one visit at a time.",
    premium: false,
    noun: "room",
    nounPlural: "rooms",
    tendVerb: "Restore",
    tendPast: "restored",
    worldName: "your house",
    stages: [
      { label: "Boarded up", glyph: "🪵", flavor: "Closed for now. The bones are good." },
      { label: "Cleared", glyph: "🧹", flavor: "Swept and open to the light." },
      { label: "Framed", glyph: "🔨", flavor: "Taking shape." },
      { label: "Furnished", glyph: "🛋️", flavor: "Somewhere you'd sit down." },
      { label: "Restored", glyph: "🏡", flavor: "Warm, lived-in, finished." },
    ],
    palette: {
      bg: "#f2eeea",
      surface: "#fbf9f7",
      surfaceAlt: "#e8e1da",
      text: "#33302d",
      muted: "#6e6660",
      accent: "#a0613b",
      accentText: "#ffffff",
      border: "#d9d0c8",
      stageTints: ["#d6d0ca", "#e2d8cd", "#e6c9ae", "#e0b58f", "#f0d59c"],
    },
  },
  terrarium: {
    id: "terrarium",
    name: "Terrarium & bonsai",
    tagline: "A small glass world that rewards patience.",
    premium: true,
    noun: "jar",
    nounPlural: "jars",
    tendVerb: "Mist",
    tendPast: "misted",
    worldName: "your terrarium",
    stages: [
      { label: "Sealed", glyph: "🫙", flavor: "Resting behind the glass." },
      { label: "Misted", glyph: "💧", flavor: "Dew on the inside of the jar." },
      { label: "Mossy", glyph: "🍃", flavor: "Soft green creeping in." },
      { label: "Shaped", glyph: "🌳", flavor: "A bonsai finding its form." },
      { label: "In bloom", glyph: "🌺", flavor: "A tiny flower in a tiny world." },
    ],
    palette: {
      bg: "#eaf1ea",
      surface: "#f8fbf8",
      surfaceAlt: "#dbe7dc",
      text: "#243126",
      muted: "#5f7062",
      accent: "#3b7a57",
      accentText: "#ffffff",
      border: "#c8d8ca",
      stageTints: ["#d3d8d3", "#c3dccc", "#a9d4b6", "#86c39a", "#f4b6c4"],
    },
  },
  guild: {
    id: "guild",
    name: "Party & guild",
    tagline: "The character sheet, but for the whole party.",
    premium: true,
    noun: "quest",
    nounPlural: "quests",
    tendVerb: "Rally",
    tendPast: "rallied",
    worldName: "your guild hall",
    stages: [
      { label: "At camp", glyph: "🏕️", flavor: "The party rests. The road will wait." },
      { label: "Rallying", glyph: "📯", flavor: "The horn has sounded." },
      { label: "Questing", glyph: "🗺️", flavor: "Out in the field together." },
      { label: "Triumphant", glyph: "🏆", flavor: "Back with the spoils." },
      { label: "Legendary", glyph: "👑", flavor: "Your banner hangs in the hall." },
    ],
    palette: {
      bg: "#ece8f2",
      surface: "#f8f6fb",
      surfaceAlt: "#ded8e8",
      text: "#2c2438",
      muted: "#6b6178",
      accent: "#5b3f8f",
      accentText: "#ffffff",
      border: "#cfc6dc",
      stageTints: ["#d4d0da", "#d9cfe6", "#c7b6e0", "#b096d8", "#f2c96f"],
    },
  },
  village: {
    id: "village",
    name: "Cozy village",
    tagline: "Lanterns, market days and a village that hums when visited.",
    premium: true,
    noun: "house",
    nounPlural: "houses",
    tendVerb: "Visit",
    tendPast: "visited",
    worldName: "your village",
    stages: [
      { label: "Quiet lane", glyph: "🌙", flavor: "Shutters closed, everyone tucked in." },
      { label: "Lantern lit", glyph: "🏮", flavor: "A light in the window." },
      { label: "Market day", glyph: "🧺", flavor: "Stalls are opening." },
      { label: "Festival", glyph: "🎪", flavor: "Music down the street." },
      { label: "Cozy village", glyph: "🏘️", flavor: "Everyone is home and happy." },
    ],
    palette: {
      bg: "#f6ede4",
      surface: "#fdf7f1",
      surfaceAlt: "#eedfd0",
      text: "#3b2e26",
      muted: "#7c6a5e",
      accent: "#c2653a",
      accentText: "#ffffff",
      border: "#e0cfc0",
      stageTints: ["#dcd3cb", "#f1d6b5", "#f3c795", "#f2b37a", "#f7d98c"],
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const FREE_THEME_IDS = THEME_IDS.filter((id) => !THEMES[id].premium);
export const PREMIUM_THEME_IDS = THEME_IDS.filter((id) => THEMES[id].premium);
export const DEFAULT_THEME: ThemeId = "garden";

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as string[]).includes(value);
}

export function getTheme(id: string | undefined | null): Theme {
  if (id && isThemeId(id)) return THEMES[id];
  return THEMES[DEFAULT_THEME];
}

export function stageVisual(theme: Theme, stage: StageIndex): ThemeStage {
  return theme.stages[stage - 1];
}

/** Which themes a household may use. Premium unlocks ride on the household flag. */
export function availableThemes(isPremium: boolean): ThemeId[] {
  return isPremium ? THEME_IDS : FREE_THEME_IDS;
}
