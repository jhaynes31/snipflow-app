import type { NextRequest } from "next/server";

/**
 * A recurring "Every Box check-in" calendar invite. Times are written as
 * floating local times (no timezone) so the event lands at the chosen wall
 * clock time wherever the calendar lives.
 */
const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const freq = q.get("freq") ?? "daily";
  const hour = clampInt(q.get("hour"), 0, 23, 8);
  const minute = clampInt(q.get("minute"), 0, 59, 0);
  const dayParam = (q.get("day") ?? "SU").toUpperCase();
  const day = (DAY_CODES as readonly string[]).includes(dayParam) ? dayParam : "SU";

  let rrule: string;
  let firstDays: string[];
  switch (freq) {
    case "weekdays":
      rrule = "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
      firstDays = ["MO", "TU", "WE", "TH", "FR"];
      break;
    case "mwf":
      rrule = "FREQ=WEEKLY;BYDAY=MO,WE,FR";
      firstDays = ["MO", "WE", "FR"];
      break;
    case "weekly":
      rrule = `FREQ=WEEKLY;BYDAY=${day}`;
      firstDays = [day];
      break;
    default:
      rrule = "FREQ=DAILY";
      firstDays = [...DAY_CODES];
  }

  // First occurrence: the next matching day from tomorrow (server-local date is
  // fine; the RRULE carries the pattern and the time is floating).
  const start = new Date();
  start.setDate(start.getDate() + 1);
  for (let i = 0; i < 7; i++) {
    if (firstDays.includes(DAY_CODES[start.getDay()])) break;
    start.setDate(start.getDate() + 1);
  }
  const dt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(hour)}${pad(minute)}00`;
  const endMinutes = hour * 60 + minute + (freq === "weekly" ? 10 : 5);
  const dtEnd = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(Math.floor(endMinutes / 60) % 24)}${pad(endMinutes % 60)}00`;
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const url = `${request.nextUrl.origin}/everybox`;
  const summary = freq === "weekly" ? "Every Box weekly review" : "Every Box check-in";
  const description =
    freq === "weekly"
      ? "A minute or two together: look over what changed this week. Nothing to prepare."
      : "A quick glance at the garden. No decisions required.";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Every Box//Check-in//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:everybox-${freq}-${hour}${minute}-${day}@everybox`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt}`,
    `DTEND:${dtEnd}`,
    `RRULE:${rrule}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description} ${url}`,
    `URL:${url}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${summary}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="every-box-check-in.ics"',
      "Cache-Control": "no-store",
    },
  });
}
