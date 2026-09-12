/**
 * Quest Board settings (campaign manager spec, Section 13). Everything the
 * planner, the tracker, the scoreboard, and (later) the coach read from one
 * place. Nothing here changes automatically; John's decisions change it.
 */

export type QuizId = "financial" | "life_insurance";
export type GeneratorId = "script" | "carousel" | "insight_card" | "social_card" | "meme";

export interface PlatformOption {
  id: string;
  label: string;
}

export interface GeneratorEntry {
  id: GeneratorId;
  label: string;
  bestFor: string;
  notes?: string;
  /** From the Phase 0 audit: false means "Generator not built yet". */
  available: boolean;
  /** Which Content Forge tab opens it. */
  forgeTab?: "script" | "carousel" | "card" | "meme";
}

export const QUEST_CONFIG = {
  /** The domain spoken on camera and printed on links. */
  siteDomain: "thefinancialdm.com",
  platforms: [{ id: "tiktok", label: "TikTok" }] as PlatformOption[],
  defaultQuestWeeks: 3,
  defaultPostsPerWeek: 3,
  attributionWindowDays: 14,
  minLeadsForRates: 20,
  coachMinQuests: 2,
  generators: [
    { id: "script", label: "Script", bestFor: "Stories, explanations, and every multi-part series", notes: "Favored on TikTok. Optional B Roll step.", available: true, forgeTab: "script" },
    { id: "carousel", label: "Carousel", bestFor: "Step-by-step how-tos and checklists", notes: "Posts as a TikTok photo post.", available: true, forgeTab: "carousel" },
    { id: "insight_card", label: "Insight card", bestFor: "Myth vs. fact (Trap or Treasure) and stat cards", notes: "Planned; not built yet.", available: false },
    { id: "social_card", label: "Social card", bestFor: "One punchy stat or tip", available: true, forgeTab: "card" },
    { id: "meme", label: "Meme", bestFor: "Humor and relatable moments", notes: "Kept to a small share by default.", available: true, forgeTab: "meme" },
  ] as GeneratorEntry[],
  /** Approximate targets for TikTok plans. */
  formatMix: { script: 0.55, insight_card: 0.15, carousel: 0.1, social_card: 0.1, meme: 0.1 } as Record<GeneratorId, number>,
  memeMaxShare: 0.15,
  maxMultiPartSeriesPerQuest: 1,
  seriesTeaseLine: "Part {next} is coming. Follow so you don't miss it.",
  complianceFlagWords: ["guaranteed", "risk-free", "best rate", "free money", "you will qualify", "no exam needed"],
  /** Paths a campaign link may never take: real routes and file folders. */
  reservedSlugs: [
    "admin", "api", "loot", "quiz", "wealth-check", "login", "generator", "dashboard", "change-password", "quest-board", "guild", "guild-hall",
    "carousel-generator", "meme-generator", "script-generator", "social-card-generator",
    "fonts", "themes", "logo.png", "favicon.png", "robots.txt", "sitemap.xml", "_serverFn", "assets",
  ],
  quizzes: {
    financial: { label: "Financial Health Quiz", path: "/wealth-check" },
    life_insurance: { label: "Life Insurance Quiz", path: "/quiz" },
  } as Record<QuizId, { label: string; path: string }>,
};

export function generatorById(id: string | undefined): GeneratorEntry | undefined {
  return QUEST_CONFIG.generators.find((g) => g.id === id);
}

export function platformLabel(id: string): string {
  return QUEST_CONFIG.platforms.find((p) => p.id === id)?.label ?? id;
}
