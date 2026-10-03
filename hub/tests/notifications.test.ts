import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AREAS, areaFromUrl, channelsFor, cleanEmail, cleanPhone } from "../convex/push/channels.ts";
import { reminderDue } from "../convex/everyBox/remindersPure.ts";

const DAY = 24 * 60 * 60 * 1000;

describe("notification channels", () => {
  it("maps a link to its area, falling back to other", () => {
    assert.equal(areaFromUrl("/every-box/box/abc"), "every-box");
    assert.equal(areaFromUrl("/heads-up/123"), "heads-up");
    assert.equal(areaFromUrl("/seasons/ours"), "seasons");
    assert.equal(areaFromUrl("/mantel"), "other");
    assert.ok(AREAS.some((a) => a.key === "other"));
  });
  it("defaults to push only and respects a chosen mix", () => {
    assert.deepEqual(channelsFor(undefined, "tend"), { push: true, email: false, text: false });
    assert.deepEqual(channelsFor({ tend: { push: false, email: true, text: true } }, "tend"), { push: false, email: true, text: true });
    assert.deepEqual(channelsFor({ other: { push: true, email: true, text: false } }, "seasons"), { push: true, email: true, text: false });
  });
  it("cleans a phone number and an email", () => {
    assert.equal(cleanPhone("(555) 555-0123"), "+15555550123");
    assert.equal(cleanPhone("+44 20 7946 0958"), "+442079460958");
    assert.equal(cleanPhone("hello"), null);
    assert.equal(cleanEmail(" Jen@Example.com "), "jen@example.com");
    assert.equal(cleanEmail("nope"), null);
  });
});

describe("every box reminders", () => {
  const box = { lastTendedAt: 0, createdAt: -10 * DAY };
  it("fires only at the chosen hour, once the days have passed", () => {
    const r = { afterDays: 3, hour: 9, everyDay: false };
    assert.equal(reminderDue(r, box, 9, 2 * DAY), false, "too soon");
    assert.equal(reminderDue(r, box, 8, 3 * DAY), false, "wrong hour");
    assert.equal(reminderDue(r, box, 9, 3 * DAY), true);
  });
  it("sends once per untended spell unless asked for every day", () => {
    const once = { afterDays: 1, hour: 9, everyDay: false, lastSentAt: 2 * DAY };
    assert.equal(reminderDue(once, box, 9, 3 * DAY), false);
    assert.equal(reminderDue(once, { ...box, lastTendedAt: 2.5 * DAY }, 9, 4 * DAY), true, "tended since the last reminder, then left again");
    const daily = { ...once, everyDay: true };
    assert.equal(reminderDue(daily, box, 9, 3 * DAY), true);
    assert.equal(reminderDue(daily, box, 9, 2 * DAY + 60 * 60 * 1000), false, "sent an hour ago");
  });
  it("counts from when the box was made if it was never tended, and never for a resting box", () => {
    const r = { afterDays: 7, hour: 9, everyDay: true };
    assert.equal(reminderDue(r, { createdAt: -8 * DAY }, 9, 0), true);
    assert.equal(reminderDue(r, { createdAt: -8 * DAY, archivedAt: -1 }, 9, 0), false);
  });
});
