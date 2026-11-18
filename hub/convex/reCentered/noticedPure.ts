/**
 * Noticed: the ways chips, the hard-day pick, and the month's read-back.
 * Pure; tested in Node.
 */
export const WAYS = [
  "Made coffee or food",
  "Listened without fixing",
  "Fixed something",
  "Texted first",
  "Stayed in the room",
  "Repaired after a rupture",
  "Prayed with me or for me",
  "Played with Percy",
  "Took something off my plate",
  "Asked how I really was",
  "Kept a small promise",
  "Said the soft thing",
  "Made me laugh",
  "Held me",
  "Said what he needed plainly",
  "Took a no well",
] as const;

export interface Evidence { line: string; note?: string }
export interface NoticedLike { day: string; ways: string[]; didWell?: string; grateful?: string; evidenceAgainst?: string; evidence?: Evidence[]; createdAt: number }

/** The entry's old lines, folding in the one-line form from before 2026-11-18. */
export function evidenceOf(e: Pick<NoticedLike, "evidenceAgainst" | "evidence">): Evidence[] {
  const list = e.evidence ?? [];
  if (e.evidenceAgainst && !list.some((x) => x.line === e.evidenceAgainst)) return [{ line: e.evidenceAgainst }, ...list];
  return list;
}

/** Clean a submitted evidence list: trimmed, capped, no blanks, no repeats. */
export function cleanEvidence(list: Evidence[] | undefined): Evidence[] | undefined {
  if (!list) return undefined;
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const x of list) {
    const line = x.line.trim().slice(0, 300);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    const note = x.note?.trim().slice(0, 3000);
    out.push(note ? { line, note } : { line });
  }
  return out.slice(0, 12);
}

/** A handful of past entries for a hard day: steady for the day, spread across time, never the same five two days running. */
export function pickHardDay<T extends NoticedLike>(rows: T[], dayKey: string, count = 5): T[] {
  if (rows.length <= count) return [...rows];
  let seed = 0;
  for (const ch of dayKey) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt);
  const out: T[] = [];
  const step = sorted.length / count;
  for (let i = 0; i < count; i++) {
    const base = Math.floor(i * step);
    const jitter = (seed + i * 7919) % Math.max(1, Math.floor(step));
    out.push(sorted[Math.min(sorted.length - 1, base + jitter)]);
  }
  return out;
}

export function monthKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

/** One line per entry, for the month's read-back and the letter draft. */
export function entryLine(e: NoticedLike): string {
  const bits: string[] = [];
  if (e.ways.length) bits.push(e.ways.join(", ").toLowerCase());
  if (e.didWell) bits.push(e.didWell);
  if (e.grateful) bits.push(e.grateful);
  for (const x of evidenceOf(e)) if (x.note) bits.push(`Against "${x.line}": ${x.note}`);
  return bits.join(". ");
}

/** A letter draft from a month's entries, in her voice, to edit before sending. */
export function letterDraft(name: string, rows: NoticedLike[], month: string): string {
  const date = new Date(`${month}-15T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const ways = new Map<string, number>();
  for (const r of rows) for (const w of r.ways) ways.set(w, (ways.get(w) ?? 0) + 1);
  const top = [...ways.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w.toLowerCase());
  const wells = rows.map((r) => r.didWell).filter((x): x is string => !!x).slice(-4);
  const grats = rows.map((r) => r.grateful).filter((x): x is string => !!x).slice(-3);
  const lines = [`${name},`, "", `I've been writing down what I notice about you. Here's ${date}.`];
  if (top.length) lines.push("", `The ways you showed up, over and over: ${top.join(", ")}.`);
  if (wells.length) lines.push("", "Things you did well that I didn't want to forget:", ...wells.map((w) => `- ${w}`));
  if (grats.length) lines.push("", "What I'm grateful for about us:", ...grats.map((g) => `- ${g}`));
  lines.push("", "I see you. Thank you.", "");
  return lines.join("\n");
}
