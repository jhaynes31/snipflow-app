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
  /**
   * The living scene on the home screen: CSS gradients for the backdrop and
   * a few ambient glyphs scattered at low opacity. Skin only.
   */
  scene: {
    sky: string;
    ground: string;
    props: readonly string[];
    /** One word for the plots the boxes sit in ("bed", "tank", "room"). */
    plot: string;
  };
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
      { label: "Dormant", glyph: "🌰", flavor: "It's been a while. Resting in the soil, ready to wake." },
      { label: "Sprouting", glyph: "🌱", flavor: "A first shoot. Some attention soon would help." },
      { label: "Growing", glyph: "🌿", flavor: "Coming along. A little past its rhythm." },
      { label: "Thriving", glyph: "🪴", flavor: "Well tended. Full and green." },
      { label: "Flourishing", glyph: "🌸", flavor: "Tended recently. In bloom." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #e9f2f8 0%, #f7f4e6 60%)",
      ground: "linear-gradient(180deg, #cfe3c0 0%, #a9c98f 45%, #8a6f4e 100%)",
      props: ["☁️", "🌤️", "🦋", "🐝", "🌾"],
      plot: "bed",
    },
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
      { label: "Quiet tank", glyph: "🐚", flavor: "It's been a while. Still and clear, waiting." },
      { label: "Stirring", glyph: "🫧", flavor: "Something's moving. A feed soon would help." },
      { label: "Swimming", glyph: "🐟", flavor: "Coming along. A little past its rhythm." },
      { label: "Lively", glyph: "🐠", flavor: "Well tended. Bright and busy." },
      { label: "Full reef", glyph: "🪸", flavor: "Fed recently. The whole tank is alive." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #bfe4f3 0%, #7fc3df 100%)",
      ground: "linear-gradient(180deg, #5eaacb 0%, #e8d9b0 85%, #d8c79a 100%)",
      props: ["🫧", "🫧", "🌊", "🐚", "🌿"],
      plot: "tank",
    },
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
      { label: "Resting", glyph: "💤", flavor: "It's been a while. Camped by the fire, ready for the road." },
      { label: "Warming up", glyph: "⚔️", flavor: "Back in the practice yard. Some training soon would help." },
      { label: "Adventuring", glyph: "🛡️", flavor: "Coming along. A little past its rhythm." },
      { label: "Heroic", glyph: "✨", flavor: "Well trained. Songs are being written." },
      { label: "Legendary", glyph: "🐉", flavor: "Trained recently. Dragons know your name." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #f6efe0 0%, #eadfc6 100%)",
      ground: "linear-gradient(180deg, #d9c8a6 0%, #b99a6c 100%)",
      props: ["🏰", "🔥", "🗡️", "📜", "🌄"],
      plot: "stat",
    },
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
      { label: "Boarded up", glyph: "🪵", flavor: "It's been a while. Closed up, but the bones are good." },
      { label: "Cleared", glyph: "🧹", flavor: "Swept out. Some work soon would help." },
      { label: "Framed", glyph: "🔨", flavor: "Coming along. A little past its rhythm." },
      { label: "Furnished", glyph: "🛋️", flavor: "Well kept. Somewhere you'd sit down." },
      { label: "Restored", glyph: "🏡", flavor: "Worked on recently. Warm and lived-in." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #f6f1ec 0%, #eadfd5 100%)",
      ground: "linear-gradient(180deg, #d7c5b5 0%, #a97f5f 100%)",
      props: ["🪟", "🧱", "🪜", "🪵", "🌳"],
      plot: "room",
    },
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
      { label: "Sealed", glyph: "🫙", flavor: "It's been a while. Resting behind the glass." },
      { label: "Misted", glyph: "💧", flavor: "A little dew. Some care soon would help." },
      { label: "Mossy", glyph: "🍃", flavor: "Coming along. A little past its rhythm." },
      { label: "Taking shape", glyph: "🌳", flavor: "Well tended. A bonsai finding its form." },
      { label: "In bloom", glyph: "🌺", flavor: "Tended recently. A tiny flower in a tiny world." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #f2f8f2 0%, #dcebdd 100%)",
      ground: "linear-gradient(180deg, #b7d6bb 0%, #6f8f66 60%, #5b4636 100%)",
      props: ["💧", "🪨", "🐌", "🍄", "🫧"],
      plot: "jar",
    },
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
      { label: "At camp", glyph: "🏕️", flavor: "It's been a while. The party rests; the road will wait." },
      { label: "Rallying", glyph: "📯", flavor: "The horn has sounded. A quest soon would help." },
      { label: "Questing", glyph: "🗺️", flavor: "Coming along. A little past its rhythm." },
      { label: "Triumphant", glyph: "🏆", flavor: "Well led. Back with the spoils." },
      { label: "Legendary", glyph: "👑", flavor: "Rallied recently. Your banner hangs in the hall." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #ece6f5 0%, #d9cfe8 100%)",
      ground: "linear-gradient(180deg, #b7a6d6 0%, #6d5397 100%)",
      props: ["🏰", "🚩", "🛡️", "🔥", "⭐"],
      plot: "quest",
    },
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
    name: "Woodland village",
    tagline: "Moss, wood smoke and lantern light. The Shire's own look.",
    premium: false,
    noun: "house",
    nounPlural: "houses",
    tendVerb: "Visit",
    tendPast: "visited",
    worldName: "your village",
    stages: [
      { label: "Quiet lane", glyph: "🌙", flavor: "It's been a while. Shutters closed, everyone tucked in." },
      { label: "Lantern lit", glyph: "🏮", flavor: "A light in the window. A visit soon would help." },
      { label: "Market day", glyph: "🧺", flavor: "Coming along. A little past its rhythm." },
      { label: "Festival", glyph: "🎪", flavor: "Well visited. Music down the street." },
      { label: "Cozy village", glyph: "🏘️", flavor: "Visited recently. Everyone is home and happy." },
    ],
    scene: {
      sky: "linear-gradient(180deg, #2a3a2a 0%, #55704a 55%, #d8c48a 100%)",
      ground: "linear-gradient(180deg, #6f8a4f 0%, #4a5d38 100%)",
      props: ["🌲", "🌿", "🍄", "🏮", "🌲"],
      plot: "house",
    },
    // Reads The Shire's own tokens, so it follows light and dark mode.
    palette: {
      bg: "var(--background)",
      surface: "var(--surface)",
      surfaceAlt: "color-mix(in srgb, var(--surface) 70%, var(--primary) 12%)",
      text: "var(--text)",
      muted: "var(--text-muted)",
      accent: "var(--primary)",
      accentText: "var(--on-primary)",
      border: "var(--border)",
      stageTints: ["#c9c2ad", "#d8dcb8", "#bfd39c", "#9fc27c", "#e8c86e"],
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/**
 * While this is true every theme is available to every household, premium
 * ones included. Flip it to false to turn the paid tier back on; the
 * household-level `isPremium` flag and `unlockedThemes` list keep working.
 */
export const ALL_THEMES_UNLOCKED = true;
export const FREE_THEME_IDS = THEME_IDS.filter((id) => !THEMES[id].premium);
export const PREMIUM_THEME_IDS = THEME_IDS.filter((id) => THEMES[id].premium);
export const DEFAULT_THEME: ThemeId = "village";

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
  return ALL_THEMES_UNLOCKED || isPremium ? THEME_IDS : FREE_THEME_IDS;
}

/** Whether a given theme is usable by a household. */
export function themeUnlocked(id: ThemeId, isPremium: boolean, unlockedThemes: readonly string[]): boolean {
  return availableThemes(isPremium).includes(id) || unlockedThemes.includes(id);
}
