import { DAY_MS } from "./freshness.ts";

/**
 * When a box reminder is due. Pure, so it can be tested in Node.
 *
 * A reminder is due at the hour the person chose, when the box hasn't been
 * tended for at least `afterDays` (counted from the last tending, or from
 * when the box was made if it never was), and either it was never sent for
 * this untended spell, or they asked for every day and the last one went
 * out more than 20 hours ago.
 */
export interface ReminderLike {
  afterDays: number;
  hour: number;
  everyDay: boolean;
  lastSentAt?: number;
}

export function reminderDue(r: ReminderLike, box: { lastTendedAt?: number; createdAt: number; archivedAt?: number }, localHour: number, now: number): boolean {
  if (box.archivedAt !== undefined) return false;
  if (localHour !== r.hour) return false;
  const since = box.lastTendedAt ?? box.createdAt;
  const days = (now - since) / DAY_MS;
  if (days < r.afterDays) return false;
  if (r.lastSentAt === undefined || r.lastSentAt < since) return true;
  return r.everyDay && now - r.lastSentAt >= 20 * 60 * 60 * 1000;
}

/** "3 days" / "1 day", for a reminder's words. */
export function daysWord(n: number): string {
  const d = Math.max(1, Math.floor(n));
  return `${d} day${d === 1 ? "" : "s"}`;
}

export const AFTER_DAYS_CHOICES = [1, 2, 3, 5, 7, 10, 14, 21, 30];
