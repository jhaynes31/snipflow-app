import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWeeks, describeLine, noticesFor, readKeptWordSettings, weekStartOf, type WordLike } from "../convex/keptWord/pure.ts";
import { buildFeed } from "../core/calendar/ics.ts";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const T = Date.UTC(2026, 8, 16, 12); // Wednesday 2026-09-16

function word(over: Partial<WordLike>): WordLike {
  return { _id: "w", ownerId: "john", text: "Call the plumber", area: "home", forWhom: "us", status: "open", createdAt: T, ...over };
}

describe("Kept Word weeks", () => {
  it("starts weeks on Monday", () => {
    assert.equal(weekStartOf("2026-09-16"), "2026-09-14");
    assert.equal(weekStartOf("2026-09-14"), "2026-09-14");
    assert.equal(weekStartOf("2026-09-20"), "2026-09-14");
    assert.equal(weekStartOf("2026-09-21"), "2026-09-21");
  });
  it("groups closed words by the week they were closed, newest week first, in due-day order", () => {
    const weeks = buildWeeks(
      [
        word({ _id: "a", status: "kept", dueDay: "2026-09-18", closedAt: T }),
        word({ _id: "b", status: "didnt", reason: "forgot", whatNow: "smaller", dueDay: "2026-09-15", closedAt: T }),
        word({ _id: "c", status: "kept", dueDay: "2026-09-10", closedAt: Date.UTC(2026, 8, 10, 12) }),
      ],
      dayOf,
    );
    assert.equal(weeks.length, 2);
    assert.equal(weeks[0].weekStart, "2026-09-14");
    assert.equal(weeks[0].weekEnd, "2026-09-20");
    assert.deepEqual(weeks[0].lines.map((l) => l.dueDay), ["2026-09-15", "2026-09-18"]);
    assert.equal(weeks[1].weekStart, "2026-09-07");
  });
  it("describes a line in plain words with no counts", () => {
    const line = describeLine({ giverId: "john", text: "Call the plumber", status: "didnt", dueDay: "2026-09-15", reason: "forgot", whatNow: "smaller" }, "John");
    assert.equal(line, "John: Call the plumber (by 2026-09-15). Didn't: i forgot. Then: say it again, smaller, with a new day.");
    assert.doesNotMatch(line, /%|\d+ of \d+/);
  });
});

describe("Kept Word pattern notices (private to the giver)", () => {
  it("stays quiet until there is enough closed history", () => {
    assert.deepEqual(noticesFor([word({ status: "didnt", reason: "forgot" }), word({ status: "didnt", reason: "forgot" })]), []);
  });
  it("names a repeated area and a dominant reason", () => {
    const words = [
      word({ _id: "1", status: "didnt", reason: "forgot", area: "home" }),
      word({ _id: "2", status: "didnt", reason: "forgot", area: "home" }),
      word({ _id: "3", status: "didnt", reason: "avoided", area: "home" }),
      word({ _id: "4", status: "kept", area: "us" }),
    ];
    const notices = noticesFor(words);
    assert.ok(notices.some((n) => n.kind === "repeatedArea" && n.area === "home" && /3 times/.test(n.text)));
    assert.ok(notices.some((n) => n.kind === "mostlyForgot"));
    assert.ok(notices.every((n) => !/%/.test(n.text)));
  });
  it("reads settings with on-by-default values", () => {
    assert.deepEqual(readKeptWordSettings(undefined), { notices: true, wordsOnCalendar: true });
    assert.equal(readKeptWordSettings({ keptWord: { notices: false } }).notices, false);
  });
});

describe("Kept Word on the calendar feed", () => {
  it("adds an all-day event with an evening-before alarm per open word with a day", () => {
    const ics = buildFeed({
      appName: "The Shire",
      siteUrl: "https://example.test",
      displayName: "John",
      dailyCheckInHour: 9,
      dailyCheckInMinute: 0,
      headsUps: [],
      words: [{ id: "abc", text: "Call the plumber, tonight", dueDay: "2026-09-30" }],
      now: new Date(2026, 8, 18, 12, 0, 0),
    });
    assert.match(ics, /UID:kept-word-abc@the-shire/);
    assert.match(ics, /DTSTART;VALUE=DATE:20260930\r\n/);
    assert.match(ics, /DTEND;VALUE=DATE:20261001\r\n/);
    assert.match(ics, /SUMMARY:Kept Word: Call the plumber\\, tonight/);
    assert.match(ics, /TRIGGER:-PT15H/);
  });
});

describe("Kept Word theme", () => {
  it("text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#8B5E3C") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#D9A276") >= AA_NORMAL_TEXT);
  });
});
