import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkInOpen,
  compareWaitlist,
  defaultDropInSlots,
  dropInQuote,
  extraHoursPrice,
  goalsDue,
  HOUR_MS,
  noShowOutcome,
  planMemberBooking,
  sessionHours,
  slotsLeft,
  type Block,
} from "../convex/rules.ts";

const BLOCKS: Block[] = [
  { kind: "bookend", category: "Opening circle", hours: 0.5 },
  { kind: "work", category: "Business", hours: 1 },
  { kind: "work", category: "Play", hours: 1 },
  { kind: "work", category: "Clean", hours: 1 },
  { kind: "bookend", category: "Closing circle", hours: 0.5 },
];

describe("session shape", () => {
  it("adds up to a 4-hour session", () => {
    assert.equal(sessionHours(BLOCKS), 4);
  });
  it("reserves 2 drop-in seats, 3 once there are 10", () => {
    assert.equal(defaultDropInSlots(8), 2);
    assert.equal(defaultDropInSlots(9), 2);
    assert.equal(defaultDropInSlots(10), 3);
  });
  it("never shows negative seats", () => {
    assert.deepEqual(slotsLeft({ memberSlots: 6, dropInSlots: 2, membersTaken: 7, dropInsTaken: 1 }), { members: 0, dropIns: 1 });
  });
});

describe("member hours", () => {
  it("uses included hours first", () => {
    assert.deepEqual(planMemberBooking({ includedLeft: 8, extraHours: 4 }, 4), { ok: true, fromIncluded: 4, fromExtra: 0 });
  });
  it("tops up from extra hours", () => {
    assert.deepEqual(planMemberBooking({ includedLeft: 2, extraHours: 4 }, 4), { ok: true, fromIncluded: 2, fromExtra: 2 });
  });
  it("says how many hours are missing", () => {
    assert.deepEqual(planMemberBooking({ includedLeft: 0, extraHours: 1 }, 4), { ok: false, shortBy: 3 });
  });
  it("prices extra hours at $12/hr or $40 per 4", () => {
    assert.deepEqual(extraHoursPrice(4), { packs: 1, loose: 0, cents: 4000 });
    assert.deepEqual(extraHoursPrice(2), { packs: 0, loose: 2, cents: 2400 });
    assert.deepEqual(extraHoursPrice(6), { packs: 1, loose: 2, cents: 6400 });
    // 4 loose hours would be $48, so one pack wins.
    assert.deepEqual(extraHoursPrice(8), { packs: 2, loose: 0, cents: 8000 });
  });
});

describe("drop-ins", () => {
  it("charges $70 for the full session", () => {
    assert.deepEqual(dropInQuote(BLOCKS, { kind: "full" }), { cents: 7000, hours: 4 });
  });
  it("charges $18/hr for work blocks", () => {
    assert.deepEqual(dropInQuote(BLOCKS, { kind: "hourly", blockIndexes: [1, 3] }), { cents: 3600, hours: 2 });
  });
  it("won't sell a bookend by the hour", () => {
    assert.ok("error" in dropInQuote(BLOCKS, { kind: "hourly", blockIndexes: [0] }));
    assert.ok("error" in dropInQuote(BLOCKS, { kind: "hourly", blockIndexes: [] }));
  });
});

describe("waitlist and missed sessions", () => {
  it("orders by join time, paused-priority members last", () => {
    const list = [
      { id: "paused-early", priorityPaused: true, joinedAt: 1 },
      { id: "late", priorityPaused: false, joinedAt: 3 },
      { id: "early", priorityPaused: false, joinedAt: 2 },
    ];
    assert.deepEqual(list.sort(compareWaitlist).map((x) => x.id), ["early", "late", "paused-early"]);
  });
  it("first miss is a friendly reminder, then priority pauses", () => {
    assert.equal(noShowOutcome(0), "none");
    assert.equal(noShowOutcome(1), "gentleReminder");
    assert.equal(noShowOutcome(2), "pausePriority");
    assert.equal(noShowOutcome(5), "pausePriority");
  });
});

describe("timing", () => {
  const start = Date.UTC(2026, 9, 1, 17);
  it("opens goals 48 hours ahead", () => {
    assert.equal(goalsDue(start, start - 49 * HOUR_MS), false);
    assert.equal(goalsDue(start, start - 47 * HOUR_MS), true);
    assert.equal(goalsDue(start, start), false);
  });
  it("opens check-in 15 minutes early, through the end", () => {
    assert.equal(checkInOpen(start, 4, start - 20 * 60_000), false);
    assert.equal(checkInOpen(start, 4, start - 10 * 60_000), true);
    assert.equal(checkInOpen(start, 4, start + 4 * HOUR_MS + 1), false);
  });
});
