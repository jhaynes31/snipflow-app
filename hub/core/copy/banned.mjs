/**
 * Words and phrases the shame-free rules forbid in user-facing copy.
 * `scripts/check-copy.mjs` scans app/, core/ and modules/ for these.
 * Matching is case-insensitive.
 */
export const BANNED_PHRASES = [
  "don't forget",
  "dont forget",
  "you missed",
  "you haven't done",
  "get back on track",
  "streak",
  "overdue",
  "leaderboard",
  "% complete",
  "percent complete",
  "days in a row",
  "missed day",
  "behind schedule",
  "falling behind",
  "coming soon",
  "you should have",
];

/** Returns the phrases found in a piece of text. */
export function findBanned(text) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
}
