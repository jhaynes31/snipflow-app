/**
 * Kept Word's pure helpers: labels, the app-written week, and the private
 * pattern notice for a giver. Shared by the Convex functions and the screens.
 */
const DAY_MS = 86_400_000;

function dayToMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  return new Date(dayToMs(day) + n * DAY_MS).toISOString().slice(0, 10);
}

export type WordStatus = "open" | "kept" | "notYet" | "didnt" | "renegotiated";
export type Reason = "forgot" | "overcommitted" | "avoided" | "changedMind" | "outsideControl";
export type WhatNow = "smaller" | "notHappening" | "askedHelp";
export type ForWhom = "partner" | "me" | "us";
export type AskAnswer = "word" | "notNow" | "talk";

export const AREAS = ["home", "us", "money", "family", "work", "health", "faith", "other"] as const;

export const STATUS_LABEL: Record<WordStatus, string> = {
  open: "Open",
  kept: "Kept",
  notYet: "Not yet",
  didnt: "Didn't",
  renegotiated: "Said again, smaller",
};

export const REASON_LABEL: Record<Reason, string> = {
  forgot: "I forgot",
  overcommitted: "I said too much",
  avoided: "I avoided it",
  changedMind: "I changed my mind and didn't say",
  outsideControl: "Something outside my control",
};

export const WHAT_NOW_LABEL: Record<WhatNow, string> = {
  smaller: "Say it again, smaller, with a new day",
  notHappening: "Say plainly: it isn't going to happen",
  askedHelp: "Ask for help with it",
};

export const FOR_WHOM_LABEL: Record<ForWhom, string> = {
  partner: "for my partner",
  me: "for me",
  us: "for us",
};

export const ANSWER_LABEL: Record<AskAnswer, string> = {
  word: "I'll make this a word",
  notNow: "Not now",
  talk: "Let's talk",
};

export interface WordLike {
  _id: string;
  ownerId: string;
  text: string;
  area: string;
  forWhom: ForWhom;
  dueDay?: string;
  status: WordStatus;
  reason?: Reason;
  reasons?: Reason[];
  whatNow?: WhatNow;
  note?: string;
  createdAt: number;
  closedAt?: number;
}

/** Monday of the week containing `day`. */
export function weekStartOf(day: string): string {
  const d = new Date(dayToMs(day));
  const dow = d.getUTCDay(); // 0 Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(day, -back);
}

/** Which week a word belongs to: the week it was closed, else the week it is due, else the week it was said. */
export function weekOf(word: WordLike, dayOf: (ms: number) => string): string {
  if (word.closedAt) return weekStartOf(dayOf(word.closedAt));
  if (word.dueDay) return weekStartOf(word.dueDay);
  return weekStartOf(dayOf(word.createdAt));
}

export interface WeekLine {
  giverId: string;
  text: string;
  status: WordStatus;
  dueDay?: string;
  reason?: Reason;
  reasons?: Reason[];
  whatNow?: WhatNow;
  note?: string;
}

export interface Week {
  weekStart: string;
  weekEnd: string;
  lines: WeekLine[];
}

/**
 * The app-written weeks. Every word, its outcome, in date order, in the
 * same type. No counts, no percentages, no colors. Identical for both
 * people by construction, because it is computed from the shared record.
 */
export function buildWeeks(words: WordLike[], dayOf: (ms: number) => string): Week[] {
  const byWeek = new Map<string, WeekLine[]>();
  for (const w of words) {
    const key = weekOf(w, dayOf);
    const list = byWeek.get(key) ?? [];
    list.push({ giverId: w.ownerId, text: w.text, status: w.status, dueDay: w.dueDay, reason: w.reason, reasons: w.reasons, whatNow: w.whatNow, note: w.note });
    byWeek.set(key, list);
  }
  const sortKey = (l: WeekLine) => l.dueDay ?? "9999";
  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([weekStart, lines]) => ({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      lines: lines.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0)),
    }));
}

/** One line of plain words for a week line. */
export function describeLine(l: WeekLine, giverName: string): string {
  let out = `${giverName}: ${l.text}`;
  if (l.dueDay) out += ` (by ${l.dueDay})`;
  out += `. ${STATUS_LABEL[l.status]}`;
  const reasons = l.reasons?.length ? l.reasons : l.reason ? [l.reason] : [];
  if (l.status === "didnt" && reasons.length) out += `: ${reasons.map((r) => REASON_LABEL[r].toLowerCase()).join(", ")}`;
  if (l.whatNow) out += `. Then: ${WHAT_NOW_LABEL[l.whatNow].toLowerCase()}`;
  if (l.note) out += `. ${l.note}`;
  return out + ".";
}

export interface PatternNotice {
  kind: "repeatedArea" | "mostlyForgot" | "mostlyOvercommitted" | "mostlyAvoided";
  area?: string;
  text: string;
}

/**
 * Private to the giver. Only after enough closed words to mean anything.
 * Names the pattern plainly and points at a tool; never a score.
 */
export function noticesFor(words: WordLike[]): PatternNotice[] {
  const closed = words.filter((w) => w.status === "didnt" || w.status === "kept" || w.status === "notYet");
  if (closed.length < 4) return [];
  const out: PatternNotice[] = [];
  const didnt = words.filter((w) => w.status === "didnt");
  const perArea = new Map<string, number>();
  for (const w of didnt) perArea.set(w.area, (perArea.get(w.area) ?? 0) + 1);
  for (const [area, n] of perArea) {
    if (n >= 3) {
      out.push({ kind: "repeatedArea", area, text: `You've said a "${area}" word and marked it "didn't" ${n} times. Make it smaller, or stop saying it.` });
    }
  }
  if (didnt.length >= 3) {
    const reasons = new Map<Reason, number>();
    for (const w of didnt) if (w.reason) reasons.set(w.reason, (reasons.get(w.reason) ?? 0) + 1);
    const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] * 2 > didnt.length) {
      if (top[0] === "forgot") out.push({ kind: "mostlyForgot", text: "Most of your \"didn't\" words were forgotten. A word with a day goes on your calendar feed; Focus Mode and an Every Box commitment can hold it too." });
      if (top[0] === "overcommitted") out.push({ kind: "mostlyOvercommitted", text: "Most of your \"didn't\" words were more than the week had room for. Say fewer, smaller words. A kept small word counts more than a big one said." });
      if (top[0] === "avoided") out.push({ kind: "mostlyAvoided", text: "Most of your \"didn't\" words were avoided. Smallest Step is built for exactly that: the two-minute first action, then the timer." });
    }
  }
  return out;
}

export interface KeptWordSettings {
  /** Show my private pattern notices to me. On by default. */
  notices: boolean;
  /** Put my words with a day on my calendar feed. On by default. */
  wordsOnCalendar: boolean;
}

export function readKeptWordSettings(moduleSettings: Record<string, unknown> | undefined): KeptWordSettings {
  const raw = (moduleSettings?.keptWord ?? {}) as Partial<KeptWordSettings>;
  return { notices: raw.notices !== false, wordsOnCalendar: raw.wordsOnCalendar !== false };
}

export function cleanArea(area: string): string {
  const a = area.trim().toLowerCase().slice(0, 30);
  return a || "other";
}
