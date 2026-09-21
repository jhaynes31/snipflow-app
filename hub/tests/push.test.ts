import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deviceLabel, hourIn, isQuietHour } from "../convex/push/pure.ts";

describe("notification quiet hours", () => {
  it("is never quiet without a window", () => {
    assert.equal(isQuietHour(3), false);
    assert.equal(isQuietHour(3, 22, undefined), false);
    assert.equal(isQuietHour(3, 7, 7), false);
  });
  it("handles a window inside one day and one that crosses midnight", () => {
    assert.equal(isQuietHour(14, 13, 15), true);
    assert.equal(isQuietHour(15, 13, 15), false);
    assert.equal(isQuietHour(23, 22, 7), true);
    assert.equal(isQuietHour(3, 22, 7), true);
    assert.equal(isQuietHour(7, 22, 7), false);
    assert.equal(isQuietHour(12, 22, 7), false);
  });
  it("reads the hour in the person's time zone", () => {
    const noonUtc = Date.UTC(2026, 8, 21, 12, 0, 0);
    assert.equal(hourIn("UTC", noonUtc), 12);
    assert.equal(hourIn("America/Chicago", noonUtc), 7);
    assert.equal(hourIn("Not/AZone", noonUtc), 12);
  });
  it("names a device plainly", () => {
    assert.equal(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"), "iPhone, Safari");
    assert.equal(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"), "Windows computer, Chrome or Brave");
  });
});
