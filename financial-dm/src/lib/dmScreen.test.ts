import { describe, expect, test } from "bun:test";
import { clampScale, formatClock, normalizeSections, outlineToSections, scanScript, scriptToPresentation, parseBody, parseRuns, plainBody, sameSections, totalTargetMinutes, wordCount } from "./dmScreen";

describe("DM Screen body markers", () => {
  test("bold, italic, and bullets, nothing else", () => {
    const blocks = parseBody("Welcome, **everyone**.\n- First *point*\n- Second point\n\nPlain line with a lone * star");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "bullet", "bullet", "p"]);
    expect(blocks[0].runs).toEqual([
      { text: "Welcome, ", bold: false, italic: false },
      { text: "everyone", bold: true, italic: false },
      { text: ".", bold: false, italic: false },
    ]);
    expect(blocks[1].runs).toEqual([
      { text: "First ", bold: false, italic: false },
      { text: "point", bold: false, italic: true },
    ]);
    expect(blocks[3].runs).toEqual([{ text: "Plain line with a lone * star", bold: false, italic: false }]);
  });

  test("unclosed markers are shown as typed", () => {
    expect(parseRuns("**still bold")).toEqual([{ text: "**still bold", bold: false, italic: false }]);
    expect(parseRuns("2 * 3 = 6")).toEqual([{ text: "2 * 3 = 6", bold: false, italic: false }]);
  });

  test("plain text and word counts strip the markers", () => {
    expect(plainBody("**One** two\n- three")).toBe("One two\nthree");
    expect(wordCount("**One** two\n- three")).toBe(3);
    expect(wordCount("")).toBe(0);
  });
});

describe("DM Screen sections", () => {
  test("normalize orders, trims, gives ids, and drops nonsense", () => {
    const out = normalizeSections([
      { id: "a", title: "  Opening ", slideRef: "Slide 1", body: "Hi", notes: "", targetMinutes: "2.55", tag: "trust" },
      { title: "No id", body: "x", targetMinutes: -4, tag: "bogus" },
      { id: "a", title: "Duplicate id", body: "" },
      "garbage",
    ]);
    expect(out.length).toBe(4);
    expect(out[0]).toMatchObject({ id: "a", order: 0, title: "Opening", targetMinutes: 2.6, tag: "trust" });
    expect(out[1].id.length).toBeGreaterThan(3);
    expect(out[1]).toMatchObject({ order: 1, title: "No id", targetMinutes: null, tag: "" });
    expect(normalizeSections([{ id: "t", title: "Tiny", targetMinutes: 0.02 }])[0].targetMinutes).toBeNull();
    expect(out[2].id).not.toBe("a");
    expect(out[3]).toMatchObject({ title: "", body: "" });
  });

  test("a stored JSON string parses the same way", () => {
    expect(normalizeSections('[{"id":"z","title":"T","body":"B"}]')[0]).toMatchObject({ id: "z", title: "T", body: "B" });
    expect(normalizeSections("not json")).toEqual([]);
  });

  test("target time adds up and equality ignores order numbers", () => {
    const a = normalizeSections([{ id: "1", title: "A", targetMinutes: 3 }, { id: "2", title: "B", targetMinutes: 4.5 }]);
    expect(totalTargetMinutes(a)).toBe(7.5);
    const b = a.map((s) => ({ ...s, order: 99 }));
    expect(sameSections(a, b)).toBe(true);
    expect(sameSections(a, [...a].reverse())).toBe(false);
    expect(sameSections(a, a.map((s, i) => (i === 0 ? { ...s, body: "changed" } : s)))).toBe(false);
  });
});

describe("presenter helpers", () => {
  test("clock reads mm:ss and grows past an hour", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(3_725_000)).toBe("1:02:05");
    expect(formatClock(-5)).toBe("0:00");
  });
  test("text scale stays within the limits", () => {
    expect(clampScale(0.2)).toBe(0.7);
    expect(clampScale(9)).toBe(2.4);
    expect(clampScale(1.25)).toBe(1.3);
    expect(clampScale(NaN)).toBe(1);
  });
});

describe("flags, tags, and the practice read shape", () => {
  const sections = normalizeSections([
    { id: "a", title: "Open", body: "You are **guaranteed** approval, and the rate is locked.", notes: "unlimited income (a note, never scanned)" },
    { id: "b", title: "Pay", body: "- Honestly, unlimited income if you work it\n- We want young energetic people" },
    { id: "c", title: "Clean", body: "Term coverage is a promise for a set number of years." },
  ]);
  test("client scripts flag guarantees; recruit scripts also flag income and hiring words; notes are never scanned", () => {
    const client = scanScript(sections, "client");
    expect(client.map((f) => `${f.sectionIndex}:${f.ruleId}`)).toEqual(["0:guarantee", "1:income"]);
    const recruit = scanScript(sections, "recruit");
    expect(recruit.some((f) => f.ruleId === "hiring" && f.sectionIndex === 1)).toBe(true);
    expect(recruit.every((f) => f.sectionIndex !== 2)).toBe(true);
    expect(recruit.every((f) => !f.quote.includes("a note"))).toBe(true);
  });
  test("a script becomes a practice outline with a negative id and its bullets as points", () => {
    const pres = scriptToPresentation({ id: 7, name: "Recruit walkthrough", audience: "recruit", version: 3, isDefault: true, archived: false, sections, createdAt: "", updatedAt: "" });
    expect(pres.id).toBe(-7);
    expect(pres.conversation).toBe("recruiting");
    expect(pres.source).toBe("dmScreen");
    expect(pres.sections[1].points).toEqual(["Honestly, unlimited income if you work it", "We want young energetic people"]);
    expect(pres.sections[0].points[0]).toBe("You are guaranteed approval, and the rate is locked.");
  });
  test("an outline carries over as bulleted sections with the target minutes", () => {
    const out = outlineToSections([{ id: "x", title: "Intro", minMinutes: 3, maxMinutes: 5, points: ["Who I am", "Why we are here"] }]);
    expect(out[0]).toMatchObject({ id: "x", title: "Intro", body: "- Who I am\n- Why we are here", targetMinutes: 5 });
    expect(out[0].notes).toContain("3 to 5 minutes");
  });
});

