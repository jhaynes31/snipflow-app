/**
 * Pure scoring for the financial health quiz.
 *
 * Everything a person is told about their finances (stats, tier, weakest
 * stat, lead score) is computed here from their answers and nothing else.
 * This module must never import the dice engine or accept roll results.
 */

export type StatKey = "CON" | "DEX" | "STR" | "WIS" | "INT";

export const STAT_ORDER: StatKey[] = ["CON", "DEX", "STR", "WIS", "INT"];

/** Tie break order for the weakest stat. */
export const WEAKEST_PRIORITY: StatKey[] = ["CON", "STR", "DEX", "WIS", "INT"];

export const STAT_META: Record<StatKey, { name: string; meaning: string; icon: string }> = {
  CON: { name: "Constitution", meaning: "Emergency savings: how many hits you can take", icon: "🛡️" },
  DEX: { name: "Dexterity", meaning: "Budget and cash flow: how nimbly money moves", icon: "🏃" },
  STR: { name: "Strength", meaning: "Debt load: less debt means more strength", icon: "💪" },
  WIS: { name: "Wisdom", meaning: "Long term saving, investing, retirement", icon: "🦉" },
  INT: { name: "Intelligence", meaning: "Money knowledge: credit score, statements, plans", icon: "📖" },
};

export const STAT_MIN = -3;
export const STAT_MAX = 3;

/** Thresholds on the average of the active stats. */
export const TIER_CONFIG = {
  seasonedMin: 0,
  legendaryMin: 1.5,
} as const;

export type TierId = "recruit" | "seasoned" | "legendary";

export const TIER_META: Record<TierId, { title: string; line: string }> = {
  recruit: { title: "Fresh Recruit", line: "Every legend starts somewhere, and yours starts tonight." },
  seasoned: { title: "Seasoned Adventurer", line: "You've got real armor on. A few upgrades and you're dangerous." },
  legendary: { title: "Legendary Hero", line: "Look at you. Most folks in this tavern would trade sheets with you." },
};

export type Modifiers = Partial<Record<StatKey, number>>;

export interface AnswerOption {
  id: string;
  label: string;
  /** Lead score points, unchanged from the original quiz. */
  points: number;
  modifiers?: Modifiers;
}

export interface ProfileQuestion {
  key: string;
  options: AnswerOption[];
}

/** Answers are keyed by question key and hold the chosen option id. */
export type Answers = Record<string, string | undefined>;

export interface Profile {
  stats: Record<StatKey, number>;
  /** Stats that at least one question maps to, in display order. */
  activeStats: StatKey[];
  average: number;
  tier: TierId;
  weakestStat: StatKey | null;
  /** The original 0 to 100 lead score. */
  leadScore: number;
}

const clamp = (v: number) => Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(v)));

/** Which stats any question in the set can move. */
export function activeStatsFor(questions: ProfileQuestion[]): StatKey[] {
  const touched = new Set<StatKey>();
  for (const q of questions) for (const o of q.options) for (const k of Object.keys(o.modifiers ?? {})) touched.add(k as StatKey);
  return STAT_ORDER.filter((k) => touched.has(k));
}

/** The chosen option for a question, if any. */
export function chosenOption(q: ProfileQuestion, answers: Answers): AnswerOption | undefined {
  const id = answers[q.key];
  return id ? q.options.find((o) => o.id === id) : undefined;
}

export function computeLeadScore(questions: ProfileQuestion[], answers: Answers): number {
  let total = 0;
  for (const q of questions) total += chosenOption(q, answers)?.points ?? 0;
  return Math.max(0, Math.min(100, Math.round(total)));
}

export function tierForAverage(avg: number): TierId {
  if (avg >= TIER_CONFIG.legendaryMin) return "legendary";
  if (avg >= TIER_CONFIG.seasonedMin) return "seasoned";
  return "recruit";
}

export function weakestOf(stats: Record<StatKey, number>, active: StatKey[]): StatKey | null {
  let best: StatKey | null = null;
  for (const k of WEAKEST_PRIORITY) {
    if (!active.includes(k)) continue;
    if (best === null || stats[k] < stats[best]) best = k;
  }
  return best;
}

/**
 * Recompute everything from the full answer set. Stats are derived, never
 * accumulated, so changing an earlier answer can never double count.
 */
export function computeProfile(questions: ProfileQuestion[], answers: Answers): Profile {
  const raw: Record<StatKey, number> = { CON: 0, DEX: 0, STR: 0, WIS: 0, INT: 0 };
  for (const q of questions) {
    const mods = chosenOption(q, answers)?.modifiers ?? {};
    for (const [k, v] of Object.entries(mods)) raw[k as StatKey] += v ?? 0;
  }
  const stats = { CON: clamp(raw.CON), DEX: clamp(raw.DEX), STR: clamp(raw.STR), WIS: clamp(raw.WIS), INT: clamp(raw.INT) };
  const activeStats = activeStatsFor(questions);
  const average = activeStats.length ? activeStats.reduce((s, k) => s + stats[k], 0) / activeStats.length : 0;
  return {
    stats,
    activeStats,
    average,
    tier: tierForAverage(average),
    weakestStat: weakestOf(stats, activeStats),
    leadScore: computeLeadScore(questions, answers),
  };
}

/** Achievable range per stat, for authoring checks. */
export function statRanges(questions: ProfileQuestion[]): Record<StatKey, { min: number; max: number }> {
  const out = { CON: { min: 0, max: 0 }, DEX: { min: 0, max: 0 }, STR: { min: 0, max: 0 }, WIS: { min: 0, max: 0 }, INT: { min: 0, max: 0 } };
  for (const q of questions) {
    for (const k of STAT_ORDER) {
      const vals = q.options.map((o) => o.modifiers?.[k] ?? 0);
      out[k].min += Math.min(...vals);
      out[k].max += Math.max(...vals);
    }
  }
  return out;
}

export const formatMod = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");
