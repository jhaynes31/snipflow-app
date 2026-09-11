/**
 * Pure planning helpers for the Quest Board (spec, Section 6): campaign
 * link slugs, schedule dates, plan rules, generator summaries, and the
 * multi-part order check. No database, no AI, no randomness.
 */
import { QUEST_CONFIG, generatorById, type GeneratorId } from "./questConfig";

export type SlotStatus = "idea" | "drafted" | "approved" | "posted" | "skipped";
export const SLOT_STATUSES: SlotStatus[] = ["idea", "drafted", "approved", "posted", "skipped"];

export interface PlannedSlot {
  date: string; // YYYY-MM-DD
  platform: string;
  generator: GeneratorId;
  generatorReason: string;
  seriesName?: string;
  seriesKind?: "multi_part" | "recurring";
  partNumber?: number;
  totalParts?: number;
  topic: string;
  painPoint: string;
  hookAngle: string;
}

// ── Slugs ───────────────────────────────────────────────────────────

/** Digits that look like letters (0/o, 1/l) are kept out of spoken and on-screen links. */
const LOOKALIKES = /[01]/;

export function normalizeSlug(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Null when fine, else the plain-language reason. */
export function slugProblem(slug: string, taken: string[] = []): string | null {
  const s = normalizeSlug(slug);
  if (!s) return "Give the link a short word, like baby or armor.";
  if (s.length > 16) return "Keep the link to 16 characters or fewer so it's easy to say.";
  if (QUEST_CONFIG.reservedSlugs.includes(s)) return `"${s}" is already a page on the site. Pick another word.`;
  if (taken.map(normalizeSlug).includes(s)) return `"${s}" is already used by another quest, series, or post.`;
  if (LOOKALIKES.test(s)) return "Avoid the digits 0 and 1 in links: on screen they look like the letters o and l.";
  return null;
}

/** A first guess at a slug from a quest or profile name. */
export function suggestSlug(name: string): string {
  const words = normalizeSlug(name).split("-").filter((w) => w && !["the", "and", "for", "of", "a"].includes(w));
  const pick = words.find((w) => !LOOKALIKES.test(w) && w.length <= 10) ?? words[0] ?? "quest";
  return pick.replace(/[01]/g, "").slice(0, 12);
}

// ── Dates ───────────────────────────────────────────────────────────

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_NAMES = WEEKDAYS;

export function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export function weekdayOf(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getUTCDay()];
}

/** Monday of the week that holds this date. */
export function weekStart(iso: string): string {
  const d = parseISODate(iso);
  const dow = d.getUTCDay(); // 0 Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -back);
}

/** Default end date: `weeks` after the start, minus a day. */
export function defaultEndDate(start: string, weeks = QUEST_CONFIG.defaultQuestWeeks): string {
  return addDays(start, weeks * 7 - 1);
}

/** Monday-based offset (Monday 0 … Sunday 6) for a weekday name. */
export function weekdayOffset(name: string): number | null {
  const i = WEEKDAYS.findIndex((w) => w.toLowerCase() === name.trim().toLowerCase());
  return i < 0 ? null : (i + 6) % 7;
}

/**
 * Posting days for each week of the quest (Mon–Sun). Days that recurring
 * shows need come first (a Tuesday show gets a Tuesday), then the rest are
 * spread out, e.g. 3 a week with no shows → Mon, Wed, Fri.
 */
export function scheduleDates(start: string, end: string, postsPerWeek: number, preferredWeekdays: string[] = []): string[] {
  const perWeek = Math.max(1, Math.min(7, Math.round(postsPerWeek)));
  const spread = [[0], [0, 3], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]][perWeek - 1];
  const wanted = [...new Set(preferredWeekdays.map(weekdayOffset).filter((n): n is number => n !== null))].sort((a, b) => a - b).slice(0, perWeek);
  const pattern = [...wanted];
  // Fill the remaining days as far from the taken ones as possible.
  while (pattern.length < perWeek) {
    const free = [0, 1, 2, 3, 4, 5, 6].filter((d) => !pattern.includes(d));
    const spreadPick = spread.find((d) => free.includes(d));
    const best = spreadPick ?? free.map((d) => ({ d, gap: Math.min(...pattern.map((p) => Math.min(Math.abs(p - d), 7 - Math.abs(p - d)))) })).sort((a, b) => b.gap - a.gap || a.d - b.d)[0]?.d;
    if (best === undefined) break;
    pattern.push(best);
  }
  pattern.sort((a, b) => a - b);
  const out: string[] = [];
  let ws = weekStart(start);
  while (ws <= end) {
    for (const offset of pattern) {
      const d = addDays(ws, offset);
      if (d >= start && d <= end) out.push(d);
    }
    ws = addDays(ws, 7);
  }
  return out;
}

/** Group dates into weeks, labelled "Week 1" onward from the quest start. */
export function groupByWeek<T extends { date: string }>(items: T[], start: string): Array<{ label: string; weekStart: string; items: T[] }> {
  const first = weekStart(start);
  const map = new Map<string, T[]>();
  for (const it of items) {
    const ws = weekStart(it.date);
    map.set(ws, [...(map.get(ws) ?? []), it]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ws, list]) => {
      const idx = Math.round((parseISODate(ws).getTime() - parseISODate(first).getTime()) / (7 * 86400000)) + 1;
      return { label: `Week ${idx}`, weekStart: ws, items: [...list].sort((a, b) => (a.date < b.date ? -1 : 1)) };
    });
}

// ── Plan rules (Section 6.4) ────────────────────────────────────────

/** How many slots of each generator a plan of `total` posts should have, from the format mix, with memes capped. */
export function targetMix(total: number): Record<GeneratorId, number> {
  const ids = Object.keys(QUEST_CONFIG.formatMix) as GeneratorId[];
  const raw = ids.map((id) => ({ id, exact: QUEST_CONFIG.formatMix[id] * total }));
  const counts = Object.fromEntries(raw.map((r) => [r.id, Math.floor(r.exact)])) as Record<GeneratorId, number>;
  let left = total - Object.values(counts).reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left <= 0) break;
    counts[r.id]++;
    left--;
  }
  const memeCap = Math.floor(QUEST_CONFIG.memeMaxShare * total);
  if (counts.meme > memeCap) {
    counts.script += counts.meme - memeCap;
    counts.meme = memeCap;
  }
  return counts;
}

export interface PlanCheck {
  ok: boolean;
  problems: string[];
  memeShare: number;
  multiPartSeries: number;
  unavailable: GeneratorId[];
}

/** Check a proposed plan against the config rules. Problems are plain language. */
export function checkPlan(slots: PlannedSlot[]): PlanCheck {
  const problems: string[] = [];
  const total = slots.length;
  const memes = slots.filter((s) => s.generator === "meme").length;
  const memeShare = total ? memes / total : 0;
  if (total && memeShare > QUEST_CONFIG.memeMaxShare + 1e-9) problems.push(`Memes are ${Math.round(memeShare * 100)}% of the plan; the limit is ${Math.round(QUEST_CONFIG.memeMaxShare * 100)}%.`);
  const multi = new Set(slots.filter((s) => s.seriesKind === "multi_part" && s.seriesName).map((s) => s.seriesName));
  if (multi.size > QUEST_CONFIG.maxMultiPartSeriesPerQuest) problems.push(`The plan has ${multi.size} multi-part series; the limit is ${QUEST_CONFIG.maxMultiPartSeriesPerQuest}.`);
  const unavailable = [...new Set(slots.map((s) => s.generator).filter((g) => generatorById(g)?.available === false))];
  for (const s of slots) {
    if (!generatorById(s.generator)) problems.push(`Unknown generator "${s.generator}" on ${s.date}.`);
    if (!s.generatorReason) problems.push(`The ${s.date} slot has no reason for its generator.`);
  }
  return { ok: problems.length === 0, problems, memeShare, multiPartSeries: multi.size, unavailable };
}

/**
 * Make a proposed plan obey the rules: unknown generators become scripts,
 * extra multi-part series are turned into standalone posts, and memes past
 * the cap become scripts. Returns the fixed plan and what was changed.
 */
export function enforcePlan(slots: PlannedSlot[]): { slots: PlannedSlot[]; changes: string[] } {
  const changes: string[] = [];
  let out = slots.map((s) => ({ ...s }));
  for (const s of out) {
    if (!generatorById(s.generator)) {
      changes.push(`Changed an unknown generator to a script on ${s.date}.`);
      s.generator = "script";
      s.generatorReason = s.generatorReason || "Scripts carry a story best on TikTok.";
    }
  }
  const seriesNames = [...new Set(out.filter((s) => s.seriesKind === "multi_part" && s.seriesName).map((s) => s.seriesName!))];
  for (const name of seriesNames.slice(QUEST_CONFIG.maxMultiPartSeriesPerQuest)) {
    changes.push(`Turned the extra series "${name}" into standalone posts (one multi-part series per quest).`);
    out = out.map((s) => (s.seriesName === name ? { ...s, seriesName: undefined, seriesKind: undefined, partNumber: undefined, totalParts: undefined } : s));
  }
  const cap = Math.floor(QUEST_CONFIG.memeMaxShare * out.length);
  let memes = out.filter((s) => s.generator === "meme").length;
  for (let i = out.length - 1; i >= 0 && memes > cap; i--) {
    if (out[i].generator === "meme") {
      out[i] = { ...out[i], generator: "script", generatorReason: "Swapped from a meme to keep memes within the plan's limit." };
      memes--;
      changes.push(`Swapped a meme for a script on ${out[i].date} to stay within the meme limit.`);
    }
  }
  return { slots: out, changes };
}

// ── Summaries and warnings ─────────────────────────────────────────

export interface SlotLike {
  generator: GeneratorId;
  seriesId?: number | null;
  seriesName?: string | null;
  seriesKind?: "multi_part" | "recurring" | null;
  partNumber?: number | null;
  totalParts?: number | null;
  date: string;
  status: SlotStatus;
}

/** "Script ×5 · Insight card ×3 (not built yet) · ..." as data. */
export function generatorSummary(slots: SlotLike[]): Array<{ id: GeneratorId; label: string; count: number; available: boolean }> {
  return QUEST_CONFIG.generators
    .map((g) => ({ id: g.id, label: g.label, count: slots.filter((s) => s.generator === g.id && s.status !== "skipped").length, available: g.available }))
    .filter((g) => g.count > 0);
}

/** Warnings when a multi-part series is out of order by date or by posting (Section 6.3). */
export function partOrderWarnings(slots: SlotLike[]): string[] {
  const warnings: string[] = [];
  const bySeries = new Map<string, SlotLike[]>();
  for (const s of slots) {
    if (s.seriesKind !== "multi_part" || !s.partNumber) continue;
    const key = String(s.seriesId ?? s.seriesName ?? "");
    bySeries.set(key, [...(bySeries.get(key) ?? []), s]);
  }
  for (const [, parts] of bySeries) {
    const sorted = [...parts].sort((a, b) => (a.partNumber! < b.partNumber! ? -1 : 1));
    const name = sorted[0].seriesName || "the series";
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (cur.date < prev.date) warnings.push(`${name}: Part ${cur.partNumber} is scheduled before Part ${prev.partNumber}.`);
      if (cur.status === "posted" && prev.status !== "posted" && prev.status !== "skipped") warnings.push(`${name}: Part ${cur.partNumber} is marked posted but Part ${prev.partNumber} isn't.`);
    }
  }
  return warnings;
}

/** Text the plan and the briefs use for a series badge. */
export function seriesBadge(s: { seriesName?: string | null; seriesKind?: string | null; partNumber?: number | null; totalParts?: number | null }): string | null {
  if (!s.seriesName) return null;
  if (s.seriesKind === "multi_part" && s.partNumber) return `${s.seriesName} · Part ${s.partNumber}${s.totalParts ? ` of ${s.totalParts}` : ""}`;
  return s.seriesName;
}
