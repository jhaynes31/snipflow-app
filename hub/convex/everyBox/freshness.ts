/**
 * Every Box freshness engine.
 *
 * Pure functions shared by the Convex backend and the browser. No I/O.
 *
 *   freshness_ratio = days_since_last_tended / ideal_cadence_days
 *
 * The ratio maps to five growth stages used identically by every theme.
 * A category that has never been tended, or that has been left for a long
 * while, is *dormant*: sleeping and ready to wake, never "overdue".
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Stage index, 1 = dormant … 5 = flourishing. */
export type StageIndex = 1 | 2 | 3 | 4 | 5;

export type StageKey =
  | "dormant"
  | "sprouting"
  | "growing"
  | "thriving"
  | "flourishing";

export const STAGE_KEYS: readonly StageKey[] = [
  "dormant",
  "sprouting",
  "growing",
  "thriving",
  "flourishing",
] as const;

/**
 * Upper bounds (inclusive) of the freshness ratio for each stage, from best
 * to worst. Anything above the last bound is dormant.
 *
 *   ratio <= 0.5  → flourishing   (tended within the first half of the cadence)
 *   ratio <= 1.0  → thriving      (still inside the ideal cadence)
 *   ratio <= 1.5  → growing       (a little past, easily topped up)
 *   ratio <= 2.5  → sprouting     (quiet for a while, still alive)
 *   otherwise     → dormant       (sleeping, ready to wake)
 */
export const STAGE_THRESHOLDS: ReadonlyArray<{ max: number; stage: StageIndex }> = [
  { max: 0.5, stage: 5 },
  { max: 1.0, stage: 4 },
  { max: 1.5, stage: 3 },
  { max: 2.5, stage: 2 },
];

export interface Freshness {
  /** Days since last tended, fractional. `null` when never tended. */
  daysSince: number | null;
  /** days_since / cadence. `null` when never tended. */
  ratio: number | null;
  stage: StageIndex;
  stageKey: StageKey;
}

export function stageKeyFor(stage: StageIndex): StageKey {
  return STAGE_KEYS[stage - 1];
}

export function stageForRatio(ratio: number | null): StageIndex {
  if (ratio === null || !Number.isFinite(ratio) || ratio < 0) return 1;
  for (const t of STAGE_THRESHOLDS) {
    if (ratio <= t.max) return t.stage;
  }
  return 1;
}

export function computeFreshness(
  lastTendedAt: number | null | undefined,
  idealCadenceDays: number,
  now: number = Date.now(),
): Freshness {
  const cadence = Math.max(1, idealCadenceDays || 1);
  if (lastTendedAt === null || lastTendedAt === undefined) {
    return { daysSince: null, ratio: null, stage: 1, stageKey: "dormant" };
  }
  const daysSince = Math.max(0, (now - lastTendedAt) / DAY_MS);
  const ratio = daysSince / cadence;
  const stage = stageForRatio(ratio);
  return { daysSince, ratio, stage, stageKey: stageKeyFor(stage) };
}

/**
 * A category "could use attention" from its tender when it has slipped to
 * sprouting or dormant. This is a state report, not a grade: it only ever
 * drives the passive app-icon badge and the widget, never a score.
 */
export function needsAttention(stage: StageIndex): boolean {
  return stage <= 2;
}

/** Whether a stage change between two snapshots is worth surfacing in a review. */
export function stageChanged(before: StageIndex | undefined, after: StageIndex): boolean {
  return before === undefined || before !== after;
}

/** Whole local calendar days from `from` to `to` ("yesterday" means the previous date, not 24h). */
export function calendarDaysBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const aDay = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bDay - aDay) / DAY_MS);
}

/**
 * Human-friendly, non-judgemental "when" text. Never mentions overdue or
 * counts of missed days beyond a plain elapsed time.
 */
export function describeLastTended(
  lastTendedAt: number | null | undefined,
  now: number = Date.now(),
): string {
  if (lastTendedAt === null || lastTendedAt === undefined) return "Not tended yet";
  const days = calendarDaysBetween(lastTendedAt, now);
  if (days <= 0) return "Tended today";
  if (days === 1) return "Tended yesterday";
  if (days < 14) return `Tended ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return `Tended ${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return `Tended about ${months} month${months === 1 ? "" : "s"} ago`;
}

/** Default wither cadence for an active commitment with no target window. */
export const DEFAULT_COMMITMENT_CADENCE_DAYS = 7;

/** Cadence presets offered in the UI; any positive integer is accepted. */
export const CADENCE_PRESETS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 1, label: "Daily" },
  { days: 3, label: "Every few days" },
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every two weeks" },
  { days: 30, label: "Monthly" },
  { days: 90, label: "Every season" },
];

export function describeCadence(days: number): string {
  const preset = CADENCE_PRESETS.find((p) => p.days === days);
  if (preset) return preset.label;
  return `Every ${days} days`;
}
