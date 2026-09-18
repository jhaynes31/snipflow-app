import type { SabbathDay, Weekday } from './types';

/** ISO calendar date helpers. All dates are local "YYYY-MM-DD" strings. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function weekdayOf(iso: string): Weekday {
  return parseISODate(iso).getDay() as Weekday;
}

/** Monday of the week containing the date. */
export function weekStartOf(iso: string): string {
  const wd = weekdayOf(iso);
  const back = wd === 0 ? 6 : wd - 1;
  return addDays(iso, -back);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function sabbathWeekday(s: SabbathDay): Weekday {
  return s === 'sat' ? 6 : 0;
}

export function isWeekend(iso: string): boolean {
  const wd = weekdayOf(iso);
  return wd === 0 || wd === 6;
}

export const WEEKDAY_NAMES: Record<Weekday, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
export const WEEKDAY_SHORT: Record<Weekday, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
