/**
 * Renewed Mind's pure helpers, shared by the Convex functions, the screens
 * and the tests. Self-contained on purpose (the test runner loads it alone).
 *
 * The shape: a belief is an old line and a truer one in the person's own
 * words. Rehearsing brings one back a day; "felt true today" is an answer,
 * never a score. Evidence is lived moments that proved the new line.
 */
export type FeltTrue = "notYet" | "aLittle" | "mostly";

export const FELT_LABEL: Record<FeltTrue, string> = { notYet: "Not yet", aLittle: "A little", mostly: "Mostly" };

export type Check = "yes" | "partly" | "no";

export const CHECK_LABEL: Record<Check, string> = { yes: "Yes", partly: "Partly", no: "No" };

export interface BeliefLike {
  _id: string;
  newLine: string;
  createdAt: number;
}

export interface RehearsalLike {
  beliefId: string;
  feltTrue: FeltTrue;
  day: string;
}

/** Deterministic pick for a day, so reloading doesn't shuffle it. */
export function hashDay(day: string): number {
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Today's line: the belief rehearsed least recently, ties broken by the day
 * hash so the order feels alive without ever repeating yesterday's when
 * there is a choice. Null when there are no beliefs.
 */
export function pickForToday<T extends BeliefLike>(beliefs: T[], rehearsals: RehearsalLike[], day: string): T | null {
  if (beliefs.length === 0) return null;
  const last = new Map<string, string>();
  for (const r of rehearsals) {
    const prev = last.get(r.beliefId);
    if (!prev || r.day > prev) last.set(r.beliefId, r.day);
  }
  const doneToday = rehearsals.find((r) => r.day === day);
  if (doneToday) return beliefs.find((b) => b._id === doneToday.beliefId) ?? null;
  const ranked = [...beliefs].sort((a, b) => {
    const la = last.get(a._id) ?? "";
    const lb = last.get(b._id) ?? "";
    if (la !== lb) return la < lb ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
  const oldest = last.get(ranked[0]._id) ?? "";
  const tied = ranked.filter((b) => (last.get(b._id) ?? "") === oldest);
  return tied[hashDay(day) % tied.length];
}

const ORDER: Record<FeltTrue, number> = { notYet: 0, aLittle: 1, mostly: 2 };

/**
 * For Seasons: one plain line per belief, from the first answer in the
 * period to the last. "went from not yet to mostly" is growth made visible.
 */
export function trendLines(beliefs: BeliefLike[], rehearsals: RehearsalLike[]): { line: string; first: FeltTrue; last: FeltTrue; times: number }[] {
  const out = [];
  for (const b of beliefs) {
    const rows = rehearsals.filter((r) => r.beliefId === b._id).sort((x, y) => (x.day < y.day ? -1 : 1));
    if (rows.length === 0) continue;
    out.push({ line: b.newLine, first: rows[0].feltTrue, last: rows[rows.length - 1].feltTrue, times: rows.length });
  }
  return out;
}

export function moved(first: FeltTrue, last: FeltTrue): "up" | "same" | "down" {
  const d = ORDER[last] - ORDER[first];
  return d > 0 ? "up" : d < 0 ? "down" : "same";
}

/** The scriptures this place stands on, for the About card. Plain references only. */
export const FOUNDATIONS = [
  { ref: "Proverbs 23:7", line: "As a man thinks in his heart, so is he." },
  { ref: "Romans 12:2", line: "Be transformed by the renewing of your mind." },
  { ref: "2 Corinthians 10:5", line: "Take every thought captive." },
  { ref: "Philippians 4:8", line: "Whatever is true, whatever is noble, whatever is right: think on these." },
  { ref: "Ephesians 4:22-24", line: "Put off the old self; be made new in the attitude of your mind; put on the new." },
];
