import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarDaysBetween,
  computeFreshness,
  DAY_MS,
  describeLastTended,
  needsAttention,
  stageForRatio,
} from "../../convex/everyBox/freshness.ts";
import { ALL_THEMES_UNLOCKED, availableThemes, getTheme, THEMES } from "../../convex/everyBox/themes.ts";

describe("stageForRatio", () => {
  it("maps ratio bands to the five stages", () => {
    assert.equal(stageForRatio(0), 5);
    assert.equal(stageForRatio(0.5), 5);
    assert.equal(stageForRatio(0.51), 4);
    assert.equal(stageForRatio(1), 4);
    assert.equal(stageForRatio(1.2), 3);
    assert.equal(stageForRatio(2), 2);
    assert.equal(stageForRatio(3), 1);
  });
  it("treats unknown as dormant, never as a failure", () => {
    assert.equal(stageForRatio(null), 1);
    assert.equal(stageForRatio(Number.NaN), 1);
  });
});

describe("computeFreshness", () => {
  const now = Date.UTC(2026, 8, 14);
  it("judges weekly and monthly categories against their own cadence", () => {
    const tenDaysAgo = now - 10 * DAY_MS;
    const weekly = computeFreshness(tenDaysAgo, 7, now);
    const monthly = computeFreshness(tenDaysAgo, 30, now);
    assert.equal(weekly.stage, 3); // 10/7 ≈ 1.43 → growing
    assert.equal(monthly.stage, 5); // 10/30 ≈ 0.33 → flourishing
  });
  it("is dormant when never tended", () => {
    const f = computeFreshness(undefined, 7, now);
    assert.equal(f.stage, 1);
    assert.equal(f.stageKey, "dormant");
    assert.equal(f.ratio, null);
  });
  it("never goes negative for future timestamps", () => {
    const f = computeFreshness(now + DAY_MS, 7, now);
    assert.equal(f.daysSince, 0);
    assert.equal(f.stage, 5);
  });
  it("guards a zero cadence", () => {
    const f = computeFreshness(now - DAY_MS, 0, now);
    assert.equal(f.ratio, 1);
  });
});

describe("needsAttention", () => {
  it("is only true for sprouting and dormant", () => {
    assert.equal(needsAttention(1), true);
    assert.equal(needsAttention(2), true);
    assert.equal(needsAttention(3), false);
    assert.equal(needsAttention(5), false);
  });
});

describe("calendarDaysBetween", () => {
  it("counts calendar days, so 23 hours ago late last night is still yesterday", () => {
    const now = new Date(2026, 8, 14, 9, 0).getTime();
    const lateLastNight = new Date(2026, 8, 13, 23, 30).getTime();
    assert.equal(calendarDaysBetween(lateLastNight, now), 1);
    assert.equal(calendarDaysBetween(now - 60_000, now), 0);
    assert.equal(calendarDaysBetween(now - DAY_MS + 5_000, now), 1);
  });
});

describe("describeLastTended", () => {
  const now = Date.UTC(2026, 8, 14, 12);
  it("uses plain elapsed time and never the word overdue", () => {
    const samples = [
      describeLastTended(undefined, now),
      describeLastTended(now, now),
      describeLastTended(now - DAY_MS, now),
      describeLastTended(now - 5 * DAY_MS, now),
      describeLastTended(now - 20 * DAY_MS, now),
      describeLastTended(now - 95 * DAY_MS, now),
    ];
    assert.deepEqual(samples, [
      "Not tended yet",
      "Tended today",
      "Tended yesterday",
      "Tended 5 days ago",
      "Tended 2 weeks ago",
      "Tended about 3 months ago",
    ]);
    for (const s of samples) assert.ok(!/overdue|late|missed/i.test(s));
  });
});

describe("themes", () => {
  it("every theme has exactly five stages with labels and glyphs", () => {
    for (const theme of Object.values(THEMES)) {
      assert.equal(theme.stages.length, 5);
      for (const stage of theme.stages) {
        assert.ok(stage.label.length > 0);
        assert.ok(stage.glyph.length > 0);
      }
      assert.equal(theme.palette.stageTints.length, 5);
    }
  });
  it("premium households get every theme; free ones get all while the global unlock is on", () => {
    assert.equal(availableThemes(true).length, 7);
    if (ALL_THEMES_UNLOCKED) assert.equal(availableThemes(false).length, 7);
    else assert.deepEqual(availableThemes(false), ["garden", "aquarium", "character", "house"]);
  });
  it("falls back to the woodland village for unknown ids", () => {
    assert.equal(getTheme("nope").id, "village");
    assert.equal(getTheme(undefined).id, "village");
  });
});

describe("tenders", () => {
  it("resolves both the legacy single field and the list", async () => {
    const { tenderIdsOf, isTender, uniqueIds } = await import("../../convex/everyBox/tenders.ts");
    const a = "p_a" as never, b = "p_b" as never;
    assert.deepEqual(tenderIdsOf({ tenderId: a }), [a]);
    assert.deepEqual(tenderIdsOf({ tenderIds: [a, b] }), [a, b]);
    assert.deepEqual(tenderIdsOf({ tenderId: a, tenderIds: [b] }), [b]);
    assert.deepEqual(tenderIdsOf({ tenderIds: [] , tenderId: a }), [a]);
    assert.equal(isTender({ tenderIds: [a, b] }, b), true);
    assert.equal(isTender({ tenderId: a }, b), false);
    assert.deepEqual(uniqueIds([a, b, a]), [a, b]);
  });
});
