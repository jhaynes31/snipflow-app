/**
 * Single source of truth for system-based holiday detection.
 *
 * Holiday weekends run Thursday through Monday. Every calendar day inside that
 * window that overlays a recognized holiday is a "holiday day" and carries the
 * $15/night surcharge, regardless of pet count. The Christmas period Dec 24
 * through Jan 2 is continuous: every calendar day in it is a holiday day.
 *
 * This is the single engine used by the client calculator, the reschedule flow
 * and the admin panel, so the surcharge and the downstream refund policy always
 * agree. Clients have no control over what is or is not a holiday.
 */

export const HOLIDAY_SURCHARGE = 15;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole days from a date until the Monday of its holiday weekend. */
function daysUntilMonday(date: Date): number {
  switch (date.getDay()) {
    case 1:
      return 0; // Monday
    case 2:
      return 6; // Tuesday
    case 3:
      return 5; // Wednesday
    case 4:
      return 4; // Thursday
    case 5:
      return 3; // Friday
    case 6:
      return 2; // Saturday
    default:
      return 1; // Sunday
  }
}

/** Thursday through Monday window (inclusive) containing a single holiday date. */
function holidayWindow(anchor: Date): { start: Date; end: Date } {
  const monday = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + daysUntilMonday(anchor),
  );
  const start = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() - 4,
  );
  return { start, end: monday };
}

/** Last Monday in May (Memorial Day). */
function memorialDay(year: number): Date {
  const d = new Date(year, 4, 31);
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return new Date(year, 4, d.getDate());
}

/** First Monday in September (Labor Day). */
function laborDay(year: number): Date {
  const d = new Date(year, 8, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return new Date(year, 8, d.getDate());
}

/** Fourth Thursday in November (Thanksgiving). */
function thanksgiving(year: number): Date {
  const d = new Date(year, 10, 1);
  let thursdays = 0;
  while (thursdays < 4) {
    if (d.getDay() === 4) thursdays++;
    if (thursdays < 4) d.setDate(d.getDate() + 1);
  }
  return new Date(year, 10, d.getDate());
}

/** Easter Sunday via the Anonymous Gregorian algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function anchorsForYear(year: number): Date[] {
  return [
    new Date(year, 0, 1), // New Year's Day (Thursday in 2026, window Thu Jan 1 to Mon Jan 5)
    memorialDay(year),
    new Date(year, 6, 4), // July 4 (Saturday in 2026, window Thu Jul 2 to Mon Jul 6)
    laborDay(year),
    thanksgiving(year),
    easterSunday(year),
  ];
}

/** Is this single calendar day a holiday day? */
export function isHolidayDate(date: Date): boolean {
  const d = startOfDay(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // Christmas period Dec 24 through Jan 2: continuous, every day is a holiday day.
  if ((month === 12 && day >= 24) || (month === 1 && day <= 2)) return true;

  const t = d.getTime();
  const within = (w: { start: Date; end: Date }) =>
    t >= w.start.getTime() && t <= w.end.getTime();

  // Windows can spill across the year boundary (e.g. a late December anchor
  // window running past Dec 31), so check the surrounding years too.
  for (const yy of [year - 1, year, year + 1]) {
    for (const anchor of anchorsForYear(yy)) {
      if (within(holidayWindow(anchor))) return true;
    }
  }
  return false;
}

/** Count of calendar days in [arrivalDate, departureDate] that are holiday days. */
export function getHolidaySurchargeDays(
  arrivalDate: Date,
  departureDate: Date,
): number {
  const start = startOfDay(arrivalDate);
  const end = startOfDay(departureDate);
  const endTime = end.getTime();
  if (endTime < start.getTime()) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= endTime) {
    if (isHolidayDate(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Does this stay (inclusive of arrival and departure days) fall on a holiday? */
export function isHolidayStay(arrivalDate: Date, departureDate: Date): boolean {
  return getHolidaySurchargeDays(arrivalDate, departureDate) > 0;
}
