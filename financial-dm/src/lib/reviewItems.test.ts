import { describe, expect, test } from "bun:test";
import { REVIEW_ITEMS, flattenConfig, looksLikePlaceholder } from "./reviewItems";

describe("settings review helpers", () => {
  test("placeholder detection", () => {
    expect(looksLikePlaceholder("TODO(John): fill in")).toBe(true);
    expect(looksLikePlaceholder("")).toBe(true);
    expect(looksLikePlaceholder("https://example.com/x.pdf")).toBe(true);
    expect(looksLikePlaceholder("Commission-based.")).toBe(false);
    expect(looksLikePlaceholder(42)).toBe(false);
  });

  test("config flattens to rows with placeholders flagged, functions skipped", () => {
    const rows = flattenConfig({ a: 1, b: { c: "ok", d: "TBD" }, e: ["x", "lorem ipsum"], f: () => 1 });
    expect(rows.map((r) => r.path)).toEqual(["a", "b.c", "b.d", "e[0]", "e[1]"]);
    expect(rows.filter((r) => r.placeholder).map((r) => r.path)).toEqual(["b.d", "e[1]"]);
  });

  test("every review item points at a settings view", () => {
    for (const r of REVIEW_ITEMS) expect(["quizzes", "loot", "flags", "platforms"]).toContain(r.view);
    expect(new Set(REVIEW_ITEMS.map((r) => r.key)).size).toBe(REVIEW_ITEMS.length);
  });
});
