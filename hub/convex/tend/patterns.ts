/**
 * Pure helpers for the cycle forecast and the mood/sleep pattern notices.
 * Shared by the Convex functions, the browser, and the tests. Nothing here
 * diagnoses; it notices, in plain words, and suggests slowing down and
 * bringing the pattern to a doctor.
 */

export const DAY_MS = 86_400_000;

/** YYYY-MM-DD for a timestamp, in the given IANA time zone (falls back to UTC). */
export function dayKey(ms: number, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

export function dayToMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  return new Date(dayToMs(day) + n * DAY_MS).toISOString().slice(0, 10);
}

export interface Forecast {
  /** Average cycle length in days, from the logged starts (28 when fewer than two). */
  averageLength: number;
  nextStart: string;
  tenderStart: string;
  tenderEnd: string;
  /** How many starts the estimate rests on. */
  basedOn: number;
}

/**
 * Predict the next start from the last logged starts, and the tender window
 * around it. Needs at least one start; with one, assumes 28 days.
 */
export function forecastFrom(starts: string[], tenderBefore: number, tenderAfter: number, today: string): Forecast | null {
  const sorted = [...new Set(starts)].sort();
  if (sorted.length === 0) return null;
  const recent = sorted.slice(-6);
  let averageLength = 28;
  if (recent.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < recent.length; i++) gaps.push((dayToMs(recent[i]) - dayToMs(recent[i - 1])) / DAY_MS);
    const sane = gaps.filter((g) => g >= 15 && g <= 60);
    if (sane.length) averageLength = Math.round(sane.reduce((a, b) => a + b, 0) / sane.length);
  }
  let nextStart = addDays(sorted[sorted.length - 1], averageLength);
  // If that date has passed, roll forward so the forecast is always ahead.
  while (dayToMs(nextStart) + tenderAfter * DAY_MS < dayToMs(today)) nextStart = addDays(nextStart, averageLength);
  return {
    averageLength,
    nextStart,
    tenderStart: addDays(nextStart, -tenderBefore),
    tenderEnd: addDays(nextStart, tenderAfter),
    basedOn: recent.length,
  };
}

export function inWindow(day: string, f: Forecast): boolean {
  return day >= f.tenderStart && day <= f.tenderEnd;
}

/** Days until the tender window starts (negative once inside it). */
export function daysUntilTender(today: string, f: Forecast): number {
  return Math.round((dayToMs(f.tenderStart) - dayToMs(today)) / DAY_MS);
}

export interface DayPoint {
  day: string;
  /** 1 heavy … 5 sunny, or null when no check-in that day. */
  weather: number | null;
  energy: number | null;
  sleep: number | null;
}

export const WEATHER_SCORE: Record<string, number> = { heavy: 1, stormy: 2, foggy: 3, partlyCloudy: 4, sunny: 5 };

export interface Notice {
  key: string;
  text: string;
  suggestTool: string;
}

/**
 * Patterns worth noticing, from the last days of points (oldest first).
 * Plain and gentle. Never a diagnosis.
 */
export function noticePatterns(points: DayPoint[]): Notice[] {
  const out: Notice[] = [];
  const recent = points.slice(-14);

  // Several low days in a row (weather at heavy or stormy).
  let run = 0;
  let maxRun = 0;
  for (const p of recent) {
    if (p.weather !== null && p.weather <= 2) run++;
    else run = 0;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun >= 3) {
    out.push({
      key: "lowRun",
      text: `${maxRun} low days in a row. That is worth a slower day, and worth mentioning to your doctor if it keeps going.`,
      suggestTool: "anchor",
    });
  }

  // Less sleep with rising energy for three or more days in a row.
  let climb = 0;
  for (let i = 1; i < recent.length; i++) {
    const a = recent[i - 1];
    const b = recent[i];
    const shortSleep = b.sleep !== null && b.sleep < 6;
    const rising = a.energy !== null && b.energy !== null && b.energy >= a.energy && b.energy >= 4;
    climb = shortSleep && rising ? climb + 1 : 0;
    if (climb >= 2) {
      out.push({
        key: "shortSleepHighEnergy",
        text: "Less sleep with rising energy for several days. A slowing tool and an early night may help, and it is a pattern worth bringing to your doctor.",
        suggestTool: "sitWithIt",
      });
      break;
    }
  }
  return out;
}

/** Plain-text summary for appointments. */
export function exportSummary(points: DayPoint[], notices: Notice[]): string {
  const lines = ["Tend log summary", "", "Day        Mood(1-5) Energy(1-5) Sleep(h)"];
  for (const p of points) {
    lines.push(`${p.day}  ${p.weather ?? "-"}         ${p.energy ?? "-"}           ${p.sleep ?? "-"}`);
  }
  if (notices.length) {
    lines.push("", "Patterns noticed:");
    for (const n of notices) lines.push(`- ${n.text}`);
  }
  return lines.join("\n") + "\n";
}
