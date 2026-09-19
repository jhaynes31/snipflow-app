/**
 * Re-Centered's pure helpers, shared by the Convex functions and the screens.
 */

export type Whose = "mine" | "theirs" | "ours" | "notMine" | "unsure";
export type SecurityWhere = "partner" | "others" | "self" | "mixed";
export type PauseEnding = "stepIn" | "letItLand" | "notYet";

export const WHOSE_LABEL: Record<Whose, string> = {
  mine: "Mine to carry",
  theirs: "Theirs to carry",
  ours: "Ours: a piece each",
  notMine: "Not mine at all",
  unsure: "I don't know yet",
};

/** The three questions that usually settle it, plus the one that matters most. */
export const SORTING_QUESTIONS = [
  "Whose action or choice caused this?",
  "Who has the power to change it?",
  "Whose consequence is it, if no one steps in?",
  "Is this mine, or is it just familiar? Familiar is not the same as mine.",
];

export const WHERE_LABEL: Record<SecurityWhere, string> = {
  partner: "In my partner",
  others: "In others",
  self: "In me and God",
  mixed: "Mixed today",
};

export const ENDING_LABEL: Record<PauseEnding, string> = {
  stepIn: "I'm going to step in",
  letItLand: "I'm going to let it land",
  notYet: "I don't know yet",
};

export interface ReCenteredSettings {
  /** What I will and won't do, in my words. */
  boundaries: string;
  /** If a word isn't kept, then I will… */
  ifThen: string;
}

export function readReCenteredSettings(moduleSettings: Record<string, unknown> | undefined): ReCenteredSettings {
  const raw = (moduleSettings?.reCentered ?? {}) as Partial<ReCenteredSettings>;
  return {
    boundaries: typeof raw.boundaries === "string" ? raw.boundaries : "",
    ifThen: typeof raw.ifThen === "string" ? raw.ifThen : "",
  };
}

/** The days of a month as "YYYY-MM-DD", for the security dots. */
export function daysOfMonth(year: number, month1to12: number): string[] {
  const out: string[] = [];
  const count = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  for (let d = 1; d <= count; d++) {
    out.push(`${year}-${String(month1to12).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

/**
 * One "way back in" for today, chosen by the day so it stays the same all day
 * and rotates over the week. Returns null with nothing to choose from.
 */
export function pickForDay<T>(items: T[], day: string): T | null {
  if (items.length === 0) return null;
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return items[hash % items.length];
}

/** Plain-text export of the room, in the person's own words only. */
export function exportRoom(input: {
  name: string;
  settings: ReCenteredSettings;
  sorts: { createdAt: number; text: string; whose: Whose; myPart?: string; theirPart?: string }[];
  pauses: { createdAt: number; ifNothing: string; landsOn: string; afraid: string; need: string; ending: PauseEnding }[];
  landings: { createdAt: number; text: string; after?: string }[];
  taps: { day: string; where: SecurityWhere }[];
  ownLife: { area: string; wayBackIn: string }[];
  keptByMe: { createdAt: number; text: string }[];
}): string {
  const date = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const lines: string[] = [`Re-Centered: ${input.name}'s room`, ""];
  if (input.settings.boundaries) lines.push("What I will and won't do", input.settings.boundaries, "");
  if (input.settings.ifThen) lines.push("If a word isn't kept, then I will…", input.settings.ifThen, "");
  lines.push("Whose is this?");
  for (const s of input.sorts) lines.push(`${date(s.createdAt)}: ${s.text} [${WHOSE_LABEL[s.whose]}]${s.myPart ? ` My part: ${s.myPart}` : ""}${s.theirPart ? ` Their part: ${s.theirPart}` : ""}`);
  lines.push("", "The pause before rescuing");
  for (const p of input.pauses) lines.push(`${date(p.createdAt)}: if nothing: ${p.ifNothing} / lands on: ${p.landsOn} / afraid: ${p.afraid} / need: ${p.need} [${ENDING_LABEL[p.ending]}]`);
  lines.push("", "Let it land");
  for (const l of input.landings) lines.push(`${date(l.createdAt)}: ${l.text}${l.after ? ` After: ${l.after}` : ""}`);
  lines.push("", "Where my security was sitting");
  for (const t of input.taps) lines.push(`${t.day}: ${WHERE_LABEL[t.where]}`);
  lines.push("", "My own life");
  for (const o of input.ownLife) lines.push(`${o.area}: ${o.wayBackIn}`);
  lines.push("", "Kept, by me");
  for (const k of input.keptByMe) lines.push(`${date(k.createdAt)}: ${k.text}`);
  return lines.join("\n");
}
