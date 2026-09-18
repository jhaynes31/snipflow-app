import { addDays, sabbathWeekday, weekStartOf, weekdayOf } from './dates';
import type { SabbathDay, Weekday } from './types';

/**
 * Scheduling logic (Sections 8.1, 8.4, 8.5).
 *
 * Sessions run in SEQUENCE. Dates are suggestions layered on top: the next
 * uncompleted session lands on the next available training day, the one after
 * that on the following, and so on. A missed day therefore shifts everything
 * forward by one training day and never stacks two sessions on one day.
 */

export const DEFAULT_PREFERRED_DAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

/** Resolves the Sabbath day for the week that contains `weekStart` (a Monday ISO date). */
export type SabbathResolver = (weekStart: string) => SabbathDay;

/**
 * Training weekdays for a given week. The Sabbath is always removed. If the
 * Sabbath falls on a preferred weekend day, the OTHER weekend day takes its place
 * so the weekend PT session moves instead of disappearing. Weekdays never change.
 */
export function trainingWeekdaysForWeek(preferredDays: Weekday[], sabbath: SabbathDay): Weekday[] {
  const sab = sabbathWeekday(sabbath);
  const otherWeekend: Weekday = sab === 6 ? 0 : 6;
  const days = new Set<Weekday>(preferredDays);
  if (days.has(sab)) {
    days.delete(sab);
    days.add(otherWeekend);
  }
  days.delete(sab);
  return [...days].sort((a, b) => a - b);
}

export function isSabbathDate(iso: string, resolve: SabbathResolver): boolean {
  return weekdayOf(iso) === sabbathWeekday(resolve(weekStartOf(iso)));
}

export function isTrainingDate(iso: string, preferredDays: Weekday[], resolve: SabbathResolver): boolean {
  if (isSabbathDate(iso, resolve)) return false;
  const sab = resolve(weekStartOf(iso));
  return trainingWeekdaysForWeek(preferredDays, sab).includes(weekdayOf(iso));
}

/** First training date on or after `fromISO`. */
export function nextTrainingDate(fromISO: string, preferredDays: Weekday[], resolve: SabbathResolver): string {
  let d = fromISO;
  for (let i = 0; i < 366; i++) {
    if (isTrainingDate(d, preferredDays, resolve)) return d;
    d = addDays(d, 1);
  }
  return fromISO;
}

/**
 * Assign one date per session starting from `fromISO`, one session per training
 * day. Returns ISO dates in the same order as `count`.
 */
export function assignDates(count: number, fromISO: string, preferredDays: Weekday[], resolve: SabbathResolver): string[] {
  const out: string[] = [];
  let d = fromISO;
  while (out.length < count) {
    d = nextTrainingDate(d, preferredDays, resolve);
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

/** Build a resolver from stored week settings, falling back to the profile default. */
export function makeSabbathResolver(weeks: { weekStart: string; sabbathDay: SabbathDay }[], fallback: SabbathDay): SabbathResolver {
  const map = new Map(weeks.map((w) => [w.weekStart, w.sabbathDay]));
  return (weekStart) => map.get(weekStart) ?? fallback;
}
