/**
 * The feelings wheel and the body map (2026-09-28, Jen's ask, for both of
 * them). Pure and self-contained so the browser, the Convex bundle and the
 * tests all load it. Nothing here scores anything; it names things.
 */

export interface Core {
  key: string;
  word: string;
  /** Secondaries, each with its finer words. */
  ring: { word: string; words: string[] }[];
  hue: number;
}

/** Seven cores, the classic wheel with a calm center added; several things are usually true at once. */
export const WHEEL: Core[] = [
  { key: "angry", word: "Angry", hue: 8, ring: [
    { word: "frustrated", words: ["annoyed", "irritated", "impatient"] },
    { word: "mad", words: ["furious", "enraged", "seething"] },
    { word: "hurt", words: ["betrayed", "let down", "wronged"] },
    { word: "critical", words: ["skeptical", "dismissive", "cynical"] },
    { word: "distant", words: ["withdrawn", "cold", "shut off"] },
    { word: "resentful", words: ["bitter", "jealous", "used"] },
    { word: "hostile", words: ["provoked", "defensive", "aggressive"] },
  ] },
  { key: "sad", word: "Sad", hue: 215, ring: [
    { word: "lonely", words: ["isolated", "abandoned", "unseen"] },
    { word: "hurt", words: ["disappointed", "wounded", "rejected"] },
    { word: "guilty", words: ["ashamed", "remorseful", "embarrassed"] },
    { word: "grieving", words: ["mourning", "heavy", "bereft"] },
    { word: "hopeless", words: ["powerless", "empty", "defeated"] },
    { word: "tired", words: ["depleted", "worn down", "done"] },
    { word: "vulnerable", words: ["fragile", "exposed", "raw"] },
  ] },
  { key: "scared", word: "Scared", hue: 275, ring: [
    { word: "anxious", words: ["worried", "overwhelmed", "on edge"] },
    { word: "insecure", words: ["inadequate", "not enough", "small"] },
    { word: "unwanted", words: ["excluded", "left out", "unheard"] },
    { word: "helpless", words: ["frightened", "trapped", "stuck"] },
    { word: "threatened", words: ["nervous", "unsafe", "watched"] },
    { word: "confused", words: ["uncertain", "lost", "torn"] },
    { word: "frozen", words: ["shut down", "braced", "numb"] },
  ] },
  { key: "happy", word: "Happy", hue: 45, ring: [
    { word: "content", words: ["satisfied", "at ease", "comfortable"] },
    { word: "playful", words: ["cheeky", "free", "silly"] },
    { word: "proud", words: ["confident", "capable", "respected"] },
    { word: "hopeful", words: ["optimistic", "inspired", "expectant"] },
    { word: "loving", words: ["warm", "tender", "affectionate"] },
    { word: "grateful", words: ["thankful", "moved", "blessed"] },
    { word: "excited", words: ["eager", "energetic", "alive"] },
  ] },
  { key: "disgusted", word: "Disgusted", hue: 95, ring: [
    { word: "disapproving", words: ["judgmental", "put off", "offended"] },
    { word: "let down", words: ["appalled", "disillusioned", "cheated"] },
    { word: "repelled", words: ["revolted", "nauseated", "horrified"] },
    { word: "uneasy", words: ["hesitant", "wary", "icked out"] },
  ] },
  { key: "surprised", word: "Surprised", hue: 175, ring: [
    { word: "startled", words: ["shocked", "dismayed", "rattled"] },
    { word: "confused", words: ["perplexed", "thrown", "blindsided"] },
    { word: "amazed", words: ["astonished", "in awe", "wonder"] },
    { word: "caught off guard", words: ["flustered", "unprepared", "speechless"] },
  ] },
  { key: "calm", word: "Calm", hue: 150, ring: [
    { word: "peaceful", words: ["settled", "safe", "quiet"] },
    { word: "present", words: ["grounded", "here", "clear"] },
    { word: "relieved", words: ["lighter", "unburdened", "released"] },
    { word: "soft", words: ["open", "gentle", "receptive"] },
    { word: "steady", words: ["sure", "held", "rooted"] },
  ] },
];

export const CORE_MAP: Record<string, Core> = Object.fromEntries(WHEEL.map((c) => [c.key, c]));

/** What it's like there: sensation words, several at once. */
export const SENSATIONS: string[] = ["tight", "heavy", "hot", "cold", "numb", "buzzing", "fluttery", "aching", "hollow", "pressure", "knotted", "shaky", "sharp", "restless", "sinking", "tingling", "clenched", "warm", "light", "frozen"];

export type View = "front" | "back";

export interface BodyArea {
  key: string;
  label: string;
  view: View;
  /** SVG shape in a 200 by 440 box. */
  shape: { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number } | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number } | { kind: "path"; d: string };
}

/**
 * Left and right are the person's own. The front view faces you, so their
 * right side is on your left; the back view matches your own sides.
 */
export const BODY_AREAS: BodyArea[] = [
  { key: "head", label: "Head", view: "front", shape: { kind: "ellipse", cx: 100, cy: 42, rx: 28, ry: 30 } },
  { key: "jaw", label: "Jaw and face", view: "front", shape: { kind: "ellipse", cx: 100, cy: 62, rx: 18, ry: 10 } },
  { key: "throat", label: "Throat", view: "front", shape: { kind: "rect", x: 88, y: 74, w: 24, h: 20, r: 8 } },
  { key: "shoulders", label: "Shoulders", view: "front", shape: { kind: "path", d: "M50 104 q50 -22 100 0 v14 h-100 z" } },
  { key: "chest", label: "Chest", view: "front", shape: { kind: "rect", x: 66, y: 118, w: 68, h: 44, r: 10 } },
  { key: "heart", label: "Heart", view: "front", shape: { kind: "ellipse", cx: 112, cy: 138, rx: 12, ry: 12 } },
  { key: "belly", label: "Stomach", view: "front", shape: { kind: "rect", x: 68, y: 166, w: 64, h: 36, r: 10 } },
  { key: "gut", label: "Gut and low belly", view: "front", shape: { kind: "rect", x: 70, y: 206, w: 60, h: 30, r: 10 } },
  { key: "pelvis", label: "Pelvis and hips", view: "front", shape: { kind: "path", d: "M66 240 h68 l6 34 h-80 z" } },
  { key: "armL", label: "Right arm", view: "front", shape: { kind: "rect", x: 32, y: 120, w: 22, h: 120, r: 11 } },
  { key: "armR", label: "Left arm", view: "front", shape: { kind: "rect", x: 146, y: 120, w: 22, h: 120, r: 11 } },
  { key: "handL", label: "Right hand", view: "front", shape: { kind: "ellipse", cx: 43, cy: 256, rx: 13, ry: 16 } },
  { key: "handR", label: "Left hand", view: "front", shape: { kind: "ellipse", cx: 157, cy: 256, rx: 13, ry: 16 } },
  { key: "legL", label: "Right leg", view: "front", shape: { kind: "rect", x: 68, y: 278, w: 28, h: 120, r: 12 } },
  { key: "legR", label: "Left leg", view: "front", shape: { kind: "rect", x: 104, y: 278, w: 28, h: 120, r: 12 } },
  { key: "feet", label: "Feet", view: "front", shape: { kind: "path", d: "M64 402 h34 v22 h-40 z M102 402 h34 l6 22 h-40 z" } },
  { key: "headBack", label: "Back of the head", view: "back", shape: { kind: "ellipse", cx: 100, cy: 42, rx: 28, ry: 30 } },
  { key: "neck", label: "Neck", view: "back", shape: { kind: "rect", x: 88, y: 74, w: 24, h: 24, r: 8 } },
  { key: "shouldersBack", label: "Shoulders", view: "back", shape: { kind: "path", d: "M50 104 q50 -22 100 0 v14 h-100 z" } },
  { key: "upperBack", label: "Upper back", view: "back", shape: { kind: "rect", x: 66, y: 118, w: 68, h: 60, r: 10 } },
  { key: "lowerBack", label: "Lower back", view: "back", shape: { kind: "rect", x: 68, y: 182, w: 64, h: 52, r: 10 } },
  { key: "hipsBack", label: "Hips and glutes", view: "back", shape: { kind: "path", d: "M66 240 h68 l6 34 h-80 z" } },
  { key: "armsBack", label: "Arms", view: "back", shape: { kind: "path", d: "M32 120 h22 v120 h-22 z M146 120 h22 v120 h-22 z" } },
  { key: "legsBack", label: "Backs of the legs", view: "back", shape: { kind: "path", d: "M68 278 h28 v120 h-28 z M104 278 h28 v120 h-28 z" } },
  { key: "feetBack", label: "Feet", view: "back", shape: { kind: "path", d: "M64 402 h34 v22 h-40 z M102 402 h34 l6 22 h-40 z" } },
];

export const WHOLE_BODY = "whole";
export const AREA_LABEL: Record<string, string> = { ...Object.fromEntries(BODY_AREAS.map((a) => [a.key, a.label])), [WHOLE_BODY]: "All over" };

export interface BodyNote {
  area: string;
  words: string[];
  note?: string;
}

export interface FeltDraft {
  feelings: string[];
  body: BodyNote[];
  note?: string;
}

/** The text that lands in whatever field the wheel was opened from. */
export function feltText(d: FeltDraft): string {
  const parts: string[] = [];
  if (d.feelings.length) parts.push(d.feelings.join(", "));
  for (const b of d.body) {
    const bits = [b.words.join(", "), b.note?.trim()].filter(Boolean).join("; ");
    parts.push(`${(AREA_LABEL[b.area] ?? b.area).toLowerCase()}${bits ? `: ${bits}` : ""}`);
  }
  if (d.note?.trim()) parts.push(d.note.trim());
  return parts.join(". ");
}

/** The core a word belongs to, for coloring. */
export function coreOf(word: string): Core | undefined {
  const w = word.toLowerCase();
  return WHEEL.find((c) => c.word.toLowerCase() === w || c.ring.some((r) => r.word === w || r.words.includes(w)));
}

export interface FeltRow {
  feelings: string[];
  body: BodyNote[];
  createdAt: number;
  context?: string;
}

export interface Patterns {
  entries: number;
  areas: { area: string; label: string; times: number; feelings: { word: string; times: number }[]; words: { word: string; times: number }[] }[];
  feelings: { word: string; times: number }[];
  timesOfDay: { part: string; times: number }[];
}

const PART = (h: number) => (h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");

/** Where it shows up, in plain counts. Patterns, not scores. */
export function patterns(rows: FeltRow[], hourOf: (ms: number) => number = (ms) => new Date(ms).getHours()): Patterns {
  const tally = <T,>(items: T[], key: (t: T) => string) => {
    const m = new Map<string, number>();
    for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const areaRows = new Map<string, { feelings: string[]; words: string[]; times: number }>();
  for (const r of rows) {
    for (const b of r.body) {
      const cur = areaRows.get(b.area) ?? { feelings: [], words: [], times: 0 };
      cur.times += 1;
      cur.feelings.push(...r.feelings);
      cur.words.push(...b.words);
      areaRows.set(b.area, cur);
    }
  }
  const areas = [...areaRows.entries()]
    .map(([area, v]) => ({
      area,
      label: AREA_LABEL[area] ?? area,
      times: v.times,
      feelings: tally(v.feelings, (x) => x).slice(0, 3).map(([word, times]) => ({ word, times })),
      words: tally(v.words, (x) => x).slice(0, 3).map(([word, times]) => ({ word, times })),
    }))
    .sort((a, b) => b.times - a.times);
  return {
    entries: rows.length,
    areas,
    feelings: tally(rows.flatMap((r) => r.feelings), (x) => x).slice(0, 8).map(([word, times]) => ({ word, times })),
    timesOfDay: tally(rows, (r) => PART(hourOf(r.createdAt))).map(([part, times]) => ({ part, times })),
  };
}

/** One plain sentence about the strongest pattern, or null before there is one. */
export function patternLine(p: Patterns): string | null {
  if (p.entries < 3 || p.areas.length === 0) return null;
  const a = p.areas[0];
  const f = a.feelings[0];
  const t = p.timesOfDay[0];
  const when = t && t.times >= Math.ceil(p.entries / 2) ? `, mostly in the ${t.part}` : "";
  return `${a.label} shows up most (${a.times} of ${p.entries})${f ? `, mostly with ${f.word}` : ""}${when}.`;
}

/** A Heartwood session that fits the areas that keep showing up, if any. */
export function movementFor(p: Patterns): { key: string; why: string } | null {
  const top = p.areas.slice(0, 3).filter((a) => a.times >= 3).map((a) => a.area);
  if (top.length === 0) return null;
  if (top.some((a) => ["chest", "heart", "throat", "belly", "gut"].includes(a))) return { key: "fitness.somatic", why: "Somatic Movement settles the chest, throat and belly from the inside." };
  if (top.some((a) => ["jaw", "shoulders", "shouldersBack", "neck", "upperBack", "head", "headBack"].includes(a))) return { key: "fitness.fascia", why: "Fascia Release ends at the jaw and neck on purpose." };
  if (top.some((a) => ["pelvis", "hipsBack", "lowerBack", "gut"].includes(a))) return { key: "fitness.pelvic", why: "The pelvic floor holds what the low belly and hips hold." };
  return null;
}
