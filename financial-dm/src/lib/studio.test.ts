import { describe, expect, test } from "bun:test";
import { defaultTitle, estimateSeconds, filterVideos, fmtLength, nextStep, normalizeBackground, normalizeScript, prevStep, scriptText, stepIndex, topicsOf, type VideoProject } from "./studio";

const mk = (o: Partial<VideoProject>): VideoProject => ({
  id: 1, source: "script", recruiting: false, title: "T", topic: "Term life", painPoint: "", tone: "warm",
  script: { hook: "h", body: "b", cta: "c" }, status: "draft", step: "script", noScript: false,
  background: { mode: "none" }, chosenTakeId: null, durationSec: null, exportUrl: null, thumbnailUrl: null,
  captionText: "", hashtags: [], version: 1, createdAt: "", updatedAt: "", ...o,
});

describe("studio shapes", () => {
  test("script text, estimate, and title default to the hook", () => {
    const s = normalizeScript({ hook: " Your job's policy quits when you do. ", body: "Body\r\nline", cta: "" });
    expect(scriptText(s)).toBe("Your job's policy quits when you do.\n\nBody\nline");
    expect(estimateSeconds({ hook: "", body: Array(150).fill("word").join(" "), cta: "" })).toBe(60);
    expect(defaultTitle({ title: "", script: s })).toBe("Your job's policy quits when you do.");
    expect(defaultTitle({ title: "", script: { hook: "one two three four five six seven eight nine ten eleven" } })).toBe("one two three four five six seven eight nine ten…");
    expect(defaultTitle({})).toBe("Untitled video");
    expect(defaultTitle({ title: "Keep me", script: s })).toBe("Keep me");
  });
  test("steps move one at a time and stop at the ends", () => {
    expect(stepIndex("edit")).toBe(2);
    expect(nextStep("script")).toBe("record");
    expect(nextStep("save")).toBe("save");
    expect(prevStep("script")).toBe("script");
    expect(fmtLength(47)).toBe("0:47");
    expect(fmtLength(125.4)).toBe("2:05");
    expect(fmtLength(null)).toBe("");
  });
  test("background normalizes to a known mode and drops stray fields", () => {
    expect(normalizeBackground({ mode: "preset", preset: "tavern", imageUrl: "x" })).toEqual({ mode: "preset", preset: "tavern", imageUrl: undefined });
    expect(normalizeBackground({ mode: "weird" })).toEqual({ mode: "none", preset: undefined, imageUrl: undefined });
  });
  test("library filters: status, source, the Guild shelf, topic, and search in title or script", () => {
    const list = [
      mk({ id: 1, title: "Term life truth", topic: "Term life" }),
      mk({ id: 2, title: "Join the team", topic: "Recruiting", source: "guild", recruiting: true, status: "ready" }),
      mk({ id: 3, title: "Freestyle Friday", topic: "", source: "freestyle", status: "posted", script: { hook: "", body: "coffee money", cta: "" } }),
    ];
    const ids = (f: Parameters<typeof filterVideos>[1]) => filterVideos(list, f).map((v) => v.id);
    expect(ids({})).toEqual([1, 2, 3]);
    expect(ids({ shelf: "dm" })).toEqual([1, 3]);
    expect(ids({ shelf: "guild" })).toEqual([2]);
    expect(ids({ status: "posted" })).toEqual([3]);
    expect(ids({ source: "guild" })).toEqual([2]);
    expect(ids({ topic: "Term life" })).toEqual([1]);
    expect(ids({ q: "COFFEE" })).toEqual([3]);
    expect(ids({ q: "team" })).toEqual([2]);
    expect(topicsOf(list)).toEqual(["Recruiting", "Term life"]);
  });
});
