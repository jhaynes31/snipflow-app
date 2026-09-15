import { describe, expect, test } from "bun:test";
import { beatMillis, emphasisRuns, estimateSeconds, fallbackChunk, hashText, normalizeSettings, parseBeatSet, scriptSourceText, splitSentences, validateBeats, wordCount, type ScriptParts } from "./prompterBeats";

const parts: ScriptParts = {
  hook: "Most people think term life is money down the drain.",
  body: "They're half right. Here's the part nobody tells you: a $250,000 policy for a healthy thirty year old often costs less than a streaming bundle, and the price is locked in for the whole term, so waiting is the expensive choice.",
  cta: "If you want a straight answer about your own coverage, book a free call with John.",
};

describe("fallback chunker", () => {
  test("splits at sentences, then commas, conjunctions, and prepositions; never over 12 words", () => {
    const beats = fallbackChunk(parts);
    expect(beats.length).toBeGreaterThan(5);
    for (const b of beats) expect(wordCount(b.text)).toBeLessThanOrEqual(12);
    const avg = beats.reduce((n, b) => n + wordCount(b.text), 0) / beats.length;
    expect(avg).toBeGreaterThanOrEqual(3);
    expect(avg).toBeLessThanOrEqual(9);
    expect(beats.every((b) => b.emphasis.length === 0 && b.cue === null)).toBe(true);
  });
  test("keeps the words exactly, in order, and labels sections by part", () => {
    const beats = fallbackChunk(parts);
    expect(beats.map((b) => b.text).join(" ")).toBe(scriptSourceText(parts).replace(/\n/g, " "));
    expect(beats[0].section).toBe("hook");
    expect(beats[beats.length - 1].section).toBe("cta");
    expect(beats.some((b) => b.section === "body")).toBe(true);
  });
  test("never splits a number from its unit or an article from its noun", () => {
    const beats = fallbackChunk({ hook: "", body: "For a healthy thirty year old a $250,000 policy through the biggest carriers in the country costs less than the coffee you buy every single week of the year.", cta: "" });
    for (const b of beats) {
      expect(/\b(a|an|the)$/i.test(b.text)).toBe(false);
      expect(/\$250,000$/.test(b.text)).toBe(false);
    }
  });
  test("an empty or one-sentence script still yields beats", () => {
    expect(fallbackChunk({ hook: "", body: "", cta: "" })).toEqual([]);
    expect(fallbackChunk({ hook: "Just this.", body: "", cta: "" }).map((b) => b.text)).toEqual(["Just this."]);
    expect(splitSentences("One. Two! Three? “Four.” Five")).toEqual(["One.", "Two!", "Three?", "“Four.”", "Five"]);
  });
});

describe("AI beats validation", () => {
  test("accepts verbatim beats, assigns sections by position, keeps emphasis that appears, strips edge cues", () => {
    const raw = {
      beats: [
        { section: "hook", text: "Most people think term life", emphasis: ["term life"], cue: "lean_in" },
        { section: "hook", text: "is money down the drain.", emphasis: ["money down the drain"], cue: "pause" },
        { section: "body", text: "They're half right.", emphasis: ["half"], cue: "look_away" },
        { text: "Here's the part nobody tells you: a $250,000 policy for a healthy thirty year old often costs less than a streaming bundle, and the price is locked in for the whole term, so waiting is the expensive choice.", emphasis: ["nope"], cue: "pause" },
        { section: "cta", text: "If you want a straight answer about your own coverage, book a free call with John.", emphasis: [], cue: "gesture" },
      ],
    };
    const beats = validateBeats(raw, parts)!;
    expect(beats).not.toBeNull();
    expect(beats[0].cue).toBeNull();
    expect(beats[1].cue).toBe("pause");
    expect(beats[2].emphasis).toEqual(["half"]);
    expect(beats.slice(0, 2).every((b) => b.section === "hook")).toBe(true);
    expect(beats[beats.length - 1].section).toBe("cta");
    expect(beats[beats.length - 1].cue).toBeNull();
    // The long beat was split by the chunker and lost its bad emphasis.
    expect(beats.every((b) => wordCount(b.text) <= 12)).toBe(true);
    expect(beats.every((b) => !b.emphasis.includes("nope"))).toBe(true);
  });
  test("rejects rewording, omissions, and additions", () => {
    expect(validateBeats({ beats: [{ text: "Most people think term life is a waste." }] }, { hook: "Most people think term life is money down the drain.", body: "", cta: "" })).toBeNull();
    expect(validateBeats({ beats: [{ text: "Most people think" }] }, { hook: "Most people think term life is money down the drain.", body: "", cta: "" })).toBeNull();
    expect(validateBeats([], parts)).toBeNull();
    expect(validateBeats("nonsense", parts)).toBeNull();
  });
});

describe("timing, rendering, and settings", () => {
  test("estimate is 150 wpm plus pauses", () => {
    const beats = fallbackChunk(parts);
    const n = beats.reduce((s, b) => s + wordCount(b.text), 0);
    expect(estimateSeconds(beats)).toBe(Math.round((n / 150) * 60));
    beats[1].cue = "pause";
    expect(estimateSeconds(beats)).toBe(Math.round((n / 150) * 60 + 0.4));
    expect(beatMillis({ id: 1, section: "body", text: "one two three four five", emphasis: [], cue: "pause" }, 150)).toBe(2400);
  });
  test("emphasis runs mark only the phrases, in order", () => {
    expect(emphasisRuns("They're half right.", ["half"])).toEqual([{ text: "They're ", hit: false }, { text: "half", hit: true }, { text: " right.", hit: false }]);
    expect(emphasisRuns("plain", [])).toEqual([{ text: "plain", hit: false }]);
  });
  test("settings clamp to the allowed ranges and stored beat sets read back", async () => {
    expect(normalizeSettings({ fontSize: 500, wpm: 10, anchor: "center", mirror: 1 })).toEqual({ fontSize: 96, anchor: "center", mirror: true, voice: true, wpm: 80 });
    expect(normalizeSettings(null).fontSize).toBe(56);
    const hash = await hashText(scriptSourceText(parts));
    expect(hash.startsWith("sha256-")).toBe(true);
    expect(hash).toBe(await hashText(scriptSourceText(parts)));
    const set = parseBeatSet(JSON.stringify({ sourceHash: hash, beats: fallbackChunk(parts), source: "ai" }));
    expect(set?.beats.length).toBeGreaterThan(5);
    expect(parseBeatSet("{}")).toBeNull();
  });
});
