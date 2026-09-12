import { describe, expect, test } from "bun:test";
import { clockTime, dayLine, dayWord, daysUntil, isCold, waitingFor, weekStartIso, ymdInZone } from "./home";

describe("home helpers", () => {
  test("the week starts Monday at midnight Central, whatever day it is", () => {
    const cfg = { weekday: 1, hour: 0, timeZone: "America/Chicago" } as const;
    // Saturday 12 Sep 2026, 19:00 UTC (14:00 Central, daylight time, UTC-5): Monday 7 Sep 00:00 Central is 05:00 UTC.
    expect(weekStartIso(new Date("2026-09-12T19:00:00Z"), cfg)).toBe("2026-09-07T05:00:00.000Z");
    // Monday 7 Sep at 03:00 UTC is still Sunday evening Central, so the week is the previous one.
    expect(weekStartIso(new Date("2026-09-07T03:00:00Z"), cfg)).toBe("2026-08-31T05:00:00.000Z");
    // Monday 7 Sep at 06:00 UTC is 01:00 Central: the new week.
    expect(weekStartIso(new Date("2026-09-07T06:00:00Z"), cfg)).toBe("2026-09-07T05:00:00.000Z");
  });

  test("waiting-for text is plain", () => {
    const now = new Date("2026-09-12T12:00:00Z");
    expect(waitingFor("2026-09-12T11:59:30Z", now)).toBe("just now");
    expect(waitingFor("2026-09-12T11:20:00Z", now)).toBe("40 min");
    expect(waitingFor("2026-09-12T09:00:00Z", now)).toBe("3 hours");
    expect(waitingFor("2026-09-10T09:00:00Z", now)).toBe("2 days");
  });

  test("cold after seven days at Contacted", () => {
    const now = new Date("2026-09-12T12:00:00Z");
    expect(isCold("2026-09-06T12:00:00Z", now)).toBe(false);
    expect(isCold("2026-09-05T11:00:00Z", now)).toBe(true);
  });

  test("day words", () => {
    expect(daysUntil("2026-09-15", "2026-09-12")).toBe(3);
    expect(dayWord("2026-09-12", "2026-09-12")).toBe("today");
    expect(dayWord("2026-09-13", "2026-09-12")).toBe("tomorrow");
    expect(dayWord("2026-09-18", "2026-09-12")).toBe("Friday");
    expect(dayWord("2026-09-10", "2026-09-12")).toBe("2 days ago");
    expect(dayWord("2026-10-02", "2026-09-12")).toBe("Oct 2");
  });

  test("the day line is built from counts, in order, with no urgency words", () => {
    const base = { newLeads: 0, filmSoon: 0, coldLeads: 0, recruitsWaiting: 0, questsEnding: [] as string[], needsRetro: 0, todayYmd: "2026-09-12" };
    expect(dayLine(base)).toBeNull();
    expect(dayLine({ ...base, newLeads: 3, filmSoon: 2, questsEnding: ["2026-09-18"] })).toBe("3 new leads, 2 posts to film, and one quest wrapping up Friday.");
    expect(dayLine({ ...base, newLeads: 1 })).toBe("One new lead.");
    expect(dayLine({ ...base, coldLeads: 2, recruitsWaiting: 1 })).toBe("2 leads going cold and one recruit waiting.");
    const full = dayLine({ ...base, newLeads: 1, filmSoon: 1, coldLeads: 1, recruitsWaiting: 1, questsEnding: ["2026-09-13"], needsRetro: 2 })!;
    expect(full.split(",").length).toBeLessThanOrEqual(4);
    expect(full).not.toMatch(/urgent|hurry|asap|now!|don't miss/i);
  });

  test("today's calls lead the day line, and clock times read in Eastern time", () => {
    const base = { newLeads: 1, filmSoon: 0, coldLeads: 0, recruitsWaiting: 0, questsEnding: [] as string[], needsRetro: 0, todayYmd: "2026-09-12" };
    expect(dayLine({ ...base, appointmentsToday: 2 })).toBe("2 calls today and one new lead.");
    expect(dayLine({ ...base, appointmentsToday: 1, newLeads: 0 })).toBe("One call today.");
    // Eastern time: 19:00 UTC is 3:00 PM, and 03:30 UTC is still the previous evening.
    expect(clockTime("2026-09-12T19:00:00Z")).toBe("3:00 PM");
    expect(ymdInZone("2026-09-13T03:30:00Z")).toBe("2026-09-12");
  });
});
