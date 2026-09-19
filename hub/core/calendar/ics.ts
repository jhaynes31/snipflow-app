/**
 * Pure iCalendar builder for the per-person feed. The daily check-in is a
 * floating local time (no time zone) so it lands at the chosen wall-clock
 * time wherever the calendar lives. Heads-up events are UTC instants.
 */
export interface FeedInput {
  displayName: string;
  appName: string;
  siteUrl: string;
  dailyCheckInHour: number;
  dailyCheckInMinute: number;
  headsUps: { id: string; from: string; statusLine: string; urgent: boolean; createdAt: number }[];
  /** Every Box's optional weekly review event (Sundays at the check-in time). */
  everyBoxWeeklyReview?: boolean;
  /** Kept Word: my open words with a day, as all-day events with a morning alarm. */
  words?: { id: string; text: string; dueDay: string }[];
  /** The Storehouse: bills due monthly on a day, as repeating all-day events. */
  bills?: { id: string; name: string; dueDay: number; minimum: number }[];
  /** For tests. Defaults to now. */
  now?: Date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function floating(d: Date, hour: number, minute: number): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(minute)}00`;
}

function utc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** RFC 5545 text escaping. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space. */
export function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildFeed(input: FeedInput): string {
  const now = input.now ?? new Date();
  const stamp = utc(now.getTime());
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  const endMinutes = input.dailyCheckInHour * 60 + input.dailyCheckInMinute + 5;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeText(input.appName)}//Feed//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(input.appName)}`,
    "BEGIN:VEVENT",
    `UID:daily-checkin@${slug(input.appName)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${floating(start, input.dailyCheckInHour, input.dailyCheckInMinute)}`,
    `DTEND:${floating(start, Math.floor(endMinutes / 60) % 24, endMinutes % 60)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${escapeText(`${input.appName}: how are you, really?`)}`,
    `DESCRIPTION:${escapeText(`A minute to check in with yourself. Nothing to prepare. ${input.siteUrl}/check-in`)}`,
    `URL:${input.siteUrl}/check-in`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText("How are you, really?")}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];

  for (const w of input.words ?? []) {
    const day = w.dueDay.replace(/-/g, "");
    const next = new Date(Date.UTC(Number(w.dueDay.slice(0, 4)), Number(w.dueDay.slice(5, 7)) - 1, Number(w.dueDay.slice(8, 10)) + 1));
    const nextDay = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:kept-word-${w.id}@${slug(input.appName)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      `SUMMARY:${escapeText(`Kept Word: ${w.text}`)}`,
      `DESCRIPTION:${escapeText(`Your word, in your words. ${input.siteUrl}/kept-word`)}`,
      `URL:${input.siteUrl}/kept-word`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(`Kept Word: ${w.text}`)}`,
      "TRIGGER:-PT15H",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  for (const b of input.bills ?? []) {
    // Anchor on the next occurrence of the due day, then repeat monthly.
    const anchor = new Date(Date.UTC(now.getFullYear(), now.getMonth(), Math.min(b.dueDay, 28)));
    if (anchor.getTime() < Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) anchor.setUTCMonth(anchor.getUTCMonth() + 1);
    const day = `${anchor.getUTCFullYear()}${pad(anchor.getUTCMonth() + 1)}${pad(anchor.getUTCDate())}`;
    const next = new Date(anchor.getTime() + 86_400_000);
    const nextDay = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:storehouse-bill-${b.id}@${slug(input.appName)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      `RRULE:FREQ=MONTHLY;BYMONTHDAY=${Math.min(b.dueDay, 28)}`,
      `SUMMARY:${escapeText(`Bill: ${b.name}`)}`,
      `DESCRIPTION:${escapeText(`Minimum ${Math.round(b.minimum)}. ${input.siteUrl}/storehouse/debts`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(`Bill: ${b.name}`)}`,
      "TRIGGER:-P2D",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  if (input.everyBoxWeeklyReview) {
    // Next Sunday from tomorrow, floating local time, 10 minutes.
    const sunday = new Date(start);
    while (sunday.getDay() !== 0) sunday.setDate(sunday.getDate() + 1);
    const endMin = input.dailyCheckInHour * 60 + input.dailyCheckInMinute + 10;
    lines.push(
      "BEGIN:VEVENT",
      `UID:every-box-weekly-review@${slug(input.appName)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${floating(sunday, input.dailyCheckInHour, input.dailyCheckInMinute)}`,
      `DTEND:${floating(sunday, Math.floor(endMin / 60) % 24, endMin % 60)}`,
      "RRULE:FREQ=WEEKLY;BYDAY=SU",
      `SUMMARY:${escapeText("Every Box weekly review")}`,
      `DESCRIPTION:${escapeText(`A minute or two together: look over what changed this week. Nothing to prepare. ${input.siteUrl}/every-box/review`)}`,
      `URL:${input.siteUrl}/every-box/review`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText("Every Box weekly review")}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  for (const h of input.headsUps) {
    const summary = `${h.from} sent a heads-up${h.urgent ? " (urgent)" : ""}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:headsup-${h.id}@${slug(input.appName)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(h.createdAt)}`,
      `DTEND:${utc(h.createdAt + 15 * 60 * 1000)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(`"${h.statusLine}" ${input.siteUrl}/heads-up/${h.id}`)}`,
      `URL:${input.siteUrl}/heads-up/${h.id}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(summary)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
