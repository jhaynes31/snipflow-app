import { SHELL_CONFIG } from "./adminShell";

/**
 * Pure helpers for the Tavern Keeper's Morning (spec, Sections 4 to 6).
 * Everything here is counts and dates: no AI, no urgency copy, and no
 * lead or recruit details beyond a name.
 */

export interface HomeItem {
  id: number;
  title: string;
  /** One short line: which quiz, how long waiting, and so on. Never a dollar figure or an answer. */
  meta: string;
  href: string;
  /** Optional small tag such as "missed" or "ended". */
  tag?: string;
  /** Dismissal key, e.g. "lead:12". */
  key: string;
  /** Signature of the item's underlying state; a dismissal only holds while this matches (Section 6.4). */
  sig: string;
}

export interface HomeCard {
  count: number;
  items: HomeItem[];
  href: string;
}

export const EMPTY_CARD: HomeCard = { count: 0, items: [], href: "" };

/** The first moment of John's current week, as an ISO string, from the configured weekday, hour, and time zone. */
export function weekStartIso(now: Date = new Date(), cfg = SHELL_CONFIG.weekStart): string {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: cfg.timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" });
  const parts = Object.fromEntries(dtf.formatToParts(now).map((p) => [p.type, p.value]));
  const y = Number(parts.year), mo = Number(parts.month), d = Number(parts.day), h = Number(parts.hour), mi = Number(parts.minute), s = Number(parts.second);
  const weekdayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetMs = asUtc - Math.floor(now.getTime() / 1000) * 1000;
  // Days back to the configured weekday; if it is that weekday but before the start hour, go back a full week.
  let back = (weekdayIdx - cfg.weekday + 7) % 7;
  if (back === 0 && h < cfg.hour) back = 7;
  const localStart = Date.UTC(y, mo - 1, d - back, cfg.hour, 0, 0);
  return new Date(localStart - offsetMs).toISOString();
}

export function daysBetween(fromIso: string, to: Date = new Date()): number {
  const t = Date.parse(fromIso);
  if (!Number.isFinite(t)) return 0;
  return Math.floor((to.getTime() - t) / 86_400_000);
}

/** "just now", "3 hours", "2 days". Plain, for "waiting for" lines. */
export function waitingFor(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** A lead at Contacted whose last status change is older than the cold threshold (Card 6). */
export function isCold(lastChangeIso: string, now: Date = new Date(), days: number = SHELL_CONFIG.coldLeadDays): boolean {
  return daysBetween(lastChangeIso, now) >= days;
}

/** Days from today (YYYY-MM-DD, local) to a YYYY-MM-DD date. Negative when it has passed. */
export function daysUntil(dateYmd: string, todayYmd: string): number {
  const a = Date.parse(`${dateYmd}T00:00:00Z`);
  const b = Date.parse(`${todayYmd}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((a - b) / 86_400_000);
}

/** Today's date in John's time zone, YYYY-MM-DD. */
export function todayYmd(now: Date = new Date(), timeZone: string = SHELL_CONFIG.weekStart.timeZone): string {
  const dtf = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return dtf.format(now);
}

/** "today", "tomorrow", "Friday", or the date when further out. */
export function dayWord(dateYmd: string, todayYmd: string): string {
  const n = daysUntil(dateYmd, todayYmd);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1 && n < 7) return new Date(`${dateYmd}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  if (n < -1 && n > -7) return `${-n} days ago`;
  return new Date(`${dateYmd}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export interface DayLineCounts {
  newLeads: number;
  filmSoon: number;
  coldLeads: number;
  recruitsWaiting: number;
  /** Active quests ending within a week: their end dates. */
  questsEnding: string[];
  needsRetro: number;
  todayYmd: string;
}

const plural = (n: number, one: string, many: string) => `${n === 1 ? "one" : n} ${n === 1 ? one : many}`;

/**
 * Section 5.2: one line built from the counts, in a fixed order, at most
 * four parts. Null when nothing needs John, so the caller can show the
 * quiet-tavern line instead. No AI, no urgency words.
 */
export function dayLine(c: DayLineCounts): string | null {
  const parts: string[] = [];
  if (c.newLeads) parts.push(plural(c.newLeads, "new lead", "new leads"));
  if (c.filmSoon) parts.push(plural(c.filmSoon, "post to film", "posts to film"));
  if (c.coldLeads) parts.push(plural(c.coldLeads, "lead going cold", "leads going cold"));
  if (c.recruitsWaiting) parts.push(plural(c.recruitsWaiting, "recruit waiting", "recruits waiting"));
  if (c.questsEnding.length === 1) parts.push(`one quest wrapping up ${dayWord(c.questsEnding[0], c.todayYmd)}`);
  else if (c.questsEnding.length > 1) parts.push(`${c.questsEnding.length} quests wrapping up this week`);
  if (c.needsRetro) parts.push(c.needsRetro === 1 ? "a wrap-up to write" : `${c.needsRetro} wrap-ups to write`);
  if (!parts.length) return null;
  const shown = parts.slice(0, 4);
  const text = shown.length === 1 ? shown[0] : shown.length === 2 ? `${shown[0]} and ${shown[1]}` : `${shown.slice(0, -1).join(", ")}, and ${shown[shown.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

export function quietLine(word: string): string {
  return `Quiet tavern this ${word.toLowerCase()}. Nothing needs you right now.`;
}
