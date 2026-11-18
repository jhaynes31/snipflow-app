import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanEvidence, entryLine, evidenceOf, letterDraft, monthKey, pickHardDay, WAYS } from "../convex/reCentered/noticedPure.ts";

describe("Noticed", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, "0")}`, ways: [WAYS[i % WAYS.length]], didWell: i % 3 === 0 ? `did well ${i}` : undefined, grateful: i % 5 === 0 ? `grateful ${i}` : undefined, createdAt: i * 86_400_000 }));
  it("picks a steady handful for the day, spread across the log, different on another day", () => {
    const a = pickHardDay(rows, "2026-11-16");
    const b = pickHardDay(rows, "2026-11-16");
    const c = pickHardDay(rows, "2026-11-17");
    assert.equal(a.length, 5);
    assert.deepEqual(a.map((r) => r.day), b.map((r) => r.day));
    assert.notDeepEqual(a.map((r) => r.day), c.map((r) => r.day));
    assert.ok(a[0].createdAt < a[4].createdAt, "spread from early to late");
    assert.equal(pickHardDay(rows.slice(0, 3), "x").length, 3);
  });
  it("writes a line per entry and a letter from a month", () => {
    assert.equal(entryLine({ day: "d", ways: ["Texted first"], didWell: "Fixed the door", createdAt: 0 }), "texted first. Fixed the door");
    const letter = letterDraft("John", rows, "2026-10");
    assert.match(letter, /^John,/);
    assert.match(letter, /October 2026/);
    assert.match(letter, /The ways you showed up/);
    assert.match(letter, /did well 27/);
    assert.match(letter, /I see you/);
    assert.equal(monthKey(Date.UTC(2026, 10, 16)), "2026-11");
  });
  it("carries several old lines, each with how it went against them", () => {
    const e = { day: "d", ways: [], didWell: "Came back", evidence: [{ line: "he doesn't care", note: "He drove home early to sit with me" }, { line: "I'm too much" }], createdAt: 0 };
    assert.equal(entryLine(e), 'Came back. Against "he doesn\'t care": He drove home early to sit with me');
    assert.deepEqual(evidenceOf({ evidenceAgainst: "old", evidence: [{ line: "new" }] }).map((x) => x.line), ["old", "new"]);
    assert.deepEqual(evidenceOf({ evidenceAgainst: "same", evidence: [{ line: "same", note: "n" }] }), [{ line: "same", note: "n" }]);
    assert.deepEqual(cleanEvidence([{ line: " a ", note: " " }, { line: "a" }, { line: "", note: "x" }, { line: "b", note: " why " }]), [{ line: "a" }, { line: "b", note: "why" }]);
    assert.equal(cleanEvidence(undefined), undefined);
  });
  it("has no scorekeeping words in the ways", () => {
    for (const w of WAYS) assert.ok(!/points|score|streak|count/i.test(w), w);
  });
});
