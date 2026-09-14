import { describe, expect, test } from "bun:test";
import { normalizeSections, parseBody, parseRuns, plainBody, sameSections, totalTargetMinutes, wordCount } from "./dmScreen";

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
