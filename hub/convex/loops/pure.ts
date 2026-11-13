/**
 * The Loop Map's pure helpers: sharing levels, stage ids, catch-point
 * statistics, tripwire timing. Tested in Node.
 */
export type SharingLevel = "private" | "nameOnly" | "signal";

/** Sharing level to the Shire's visibility, and back. */
export function visibilityFor(level: SharingLevel): "private" | "sharedSummary" | "shared" {
  return level === "private" ? "private" : level === "nameOnly" ? "sharedSummary" : "shared";
}
export function levelFor(visibility: string): SharingLevel {
  return visibility === "shared" ? "signal" : visibility === "sharedSummary" ? "nameOnly" : "private";
}

export interface StageLike { id: string; key: string; name: string }

export function stageIndex(stages: StageLike[], stageId: string | undefined): number {
  if (!stageId) return -1;
  return stages.findIndex((s) => s.id === stageId);
}

/** How wide and bright an exit ramp is: earlier stages are easier doors. 1 (widest) to 0.35. */
export function rampWeight(index: number, count: number): number {
  if (count <= 1) return 1;
  return Math.max(0.35, 1 - (index / (count - 1)) * 0.65);
}

export interface CheckLike { at: number; stageId: string; firstNoticedStageId?: string; exitedStageId?: string; outcome?: "out" | "around" | "still"; resolvedAt?: number; kind?: "live" | "retro" }

export interface Patterns {
  catches: { at: number; index: number; name: string }[];
  earlyCount: number;
  medianRecoveryMin: number | null;
  byHour: Record<number, number>;
  byDay: Record<number, number>;
  lastMonthMode: string | null;
  thisMonthMode: string | null;
  totalPasses: number;
}

function mode(items: number[]): number | null {
  if (!items.length) return null;
  const counts = new Map<number, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/** Counts only: where they noticed, how fast they got out, when it tends to happen. */
export function patterns(stages: StageLike[], checks: CheckLike[], now: number): Patterns {
  const catches = checks
    .map((c) => ({ at: c.at, index: stageIndex(stages, c.firstNoticedStageId ?? c.stageId) }))
    .filter((c) => c.index >= 0)
    .map((c) => ({ ...c, name: stages[c.index].name }))
    .sort((a, b) => a.at - b.at);
  const half = Math.ceil(stages.length / 2);
  const earlyCount = catches.filter((c) => c.index < half).length;
  const recoveries = checks.filter((c) => c.outcome === "out" && c.resolvedAt).map((c) => (c.resolvedAt! - c.at) / 60_000).sort((a, b) => a - b);
  const medianRecoveryMin = recoveries.length ? recoveries[Math.floor(recoveries.length / 2)] : null;
  const byHour: Record<number, number> = {};
  const byDay: Record<number, number> = {};
  for (const c of checks) {
    const d = new Date(c.at);
    byHour[d.getHours()] = (byHour[d.getHours()] ?? 0) + 1;
    byDay[d.getDay()] = (byDay[d.getDay()] ?? 0) + 1;
  }
  const month = 30 * 86_400_000;
  const thisMonth = catches.filter((c) => now - c.at < month).map((c) => c.index);
  const lastMonth = catches.filter((c) => now - c.at >= month && now - c.at < 2 * month).map((c) => c.index);
  const tm = mode(thisMonth);
  const lm = mode(lastMonth);
  return {
    catches,
    earlyCount,
    medianRecoveryMin,
    byHour,
    byDay,
    thisMonthMode: tm === null ? null : stages[tm]?.name ?? null,
    lastMonthMode: lm === null ? null : stages[lm]?.name ?? null,
    totalPasses: checks.filter((c) => c.outcome === "around" || c.kind === "retro").length,
  };
}

/** The plain-language line about growth, or nothing when there isn't a comparison yet. */
export function growthLine(p: Patterns, stages: StageLike[]): string | null {
  if (!p.lastMonthMode || !p.thisMonthMode || p.lastMonthMode === p.thisMonthMode) return null;
  const li = stages.findIndex((s) => s.name === p.lastMonthMode);
  const ti = stages.findIndex((s) => s.name === p.thisMonthMode);
  if (ti < li) return `Last month you usually caught this at ${p.lastMonthMode}. This month it's been ${p.thisMonthMode}. That's real growth.`;
  return `Last month you usually caught this at ${p.lastMonthMode}. This month it's been ${p.thisMonthMode}. Hard season, maybe. The noticing still counts.`;
}

/** A tripwire is due at its hour on its days, once per day, unless snoozed. */
export function tripwireDue(g: { schedule?: { days: number[]; hour: number }; snoozedUntil?: number; lastFiredAt?: number }, localHour: number, localDay: number, now: number): boolean {
  if (!g.schedule) return false;
  if (g.snoozedUntil && g.snoozedUntil > now) return false;
  if (g.schedule.hour !== localHour || !g.schedule.days.includes(localDay)) return false;
  return !g.lastFiredAt || now - g.lastFiredAt > 20 * 60 * 60 * 1000;
}

export function newStageId(): string {
  return `s${Math.random().toString(36).slice(2, 9)}`;
}

export const SIGNAL_REPLIES = ["❤️ I'm here", "Want to talk, or want space?", "☕ Can I bring you something?"] as const;
