import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFeed, escapeText, fold } from "../core/calendar/ics.ts";

describe("calendar feed", () => {
  const base = {
    appName: "The Shire",
    siteUrl: "https://example.test",
    displayName: "Jen",
    dailyCheckInHour: 9,
    dailyCheckInMinute: 30,
    now: new Date(2026, 8, 18, 12, 0, 0),
  };

  it("has a daily floating-time check-in with an alarm", () => {
    const ics = buildFeed({ ...base, headsUps: [] });
    assert.match(ics, /BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /RRULE:FREQ=DAILY/);
    assert.match(ics, /DTSTART:20260919T093000\r\n/);
    assert.match(ics, /DTEND:20260919T093500\r\n/);
    assert.match(ics, /SUMMARY:The Shire: how are you\\, really\?/);
    assert.match(ics, /TRIGGER:PT0M/);
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  });

  it("adds a one-off UTC event per heads-up the sender put on the calendar", () => {
    const createdAt = Date.UTC(2026, 8, 18, 15, 4, 5);
    const ics = buildFeed({
      ...base,
      headsUps: [{ id: "abc", from: "John", statusLine: "Rough day; please come", urgent: true, createdAt }],
    });
    assert.match(ics, /UID:headsup-abc@the-shire/);
    assert.match(ics, /DTSTART:20260918T150405Z/);
    assert.match(ics, /SUMMARY:John sent a heads-up \(urgent\)/);
    assert.match(ics, /Rough day\; please come/);
    assert.match(ics, /URL:https:\/\/example.test\/heads-up\/abc/);
  });

  it("adds the weekly Every Box review only when the person turned it on", () => {
    const off = buildFeed({ ...base, headsUps: [] });
    assert.ok(!off.includes("every-box-weekly-review"));
    const on = buildFeed({ ...base, headsUps: [], everyBoxWeeklyReview: true });
    assert.match(on, /UID:every-box-weekly-review@the-shire/);
    assert.match(on, /RRULE:FREQ=WEEKLY;BYDAY=SU/);
    assert.match(on, /DTSTART:20260920T093000\r\n/);
    assert.match(on, /URL:https:\/\/example.test\/every-box\/review/);
  });

  it("escapes and folds per RFC 5545", () => {
    assert.equal(escapeText("a,b;c\nd\\e"), "a\\,b\;c\\nd\\\\e");
    const long = "X".repeat(150);
    const folded = fold(long);
    assert.ok(folded.split("\r\n").every((l) => l.length <= 75));
    assert.equal(folded.replace(/\r\n /g, ""), long);
  });
});
