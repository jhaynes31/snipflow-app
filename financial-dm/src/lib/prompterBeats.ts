/**
 * The prompter's beats (Step 4: Perform spec). A script becomes a list of
 * short phrases John reads one at a time, so his eyes sit on one point
 * instead of scanning. Pure: the AI pass and the local fallback both end
 * here, and the prompter renders whatever passes validation. The wording
 * is always the script's own (Section 4: a chunker, not a rewriter).
 */

export type BeatSection = "hook" | "body" | "cta";
export type BeatCue = null | "pause" | "look_away" | "lean_in" | "gesture";

export interface Beat {
  id: number;
  section: BeatSection;
  text: string;
  /** Substrings of `text`, rendered in the accent colour. */
  emphasis: string[];
  /** Fires after the beat is spoken. */
  cue: BeatCue;
}

export interface BeatSet {
  sourceHash: string;
  generatedAt: string;
  estimatedSeconds: number;
  beats: Beat[];
  /** "ai" when the beats pass shaped them; "fallback" when the local chunker did. */
  source: "ai" | "fallback";
}

/** The three parts of a script the prompter reads, in order. */
export interface ScriptParts {
  hook: string;
  body: string;
  cta: string;
}

export const PROMPTER_CONFIG = {
  /** Words per beat: the target band and the hard ceiling (Section 3). */
  targetMin: 3,
  targetMax: 9,
  hardMax: 12,
  /** Timer mode and the duration estimate. */
  wpm: 150,
  pauseSeconds: 0.4,
  wpmMin: 80,
  wpmMax: 260,
  wpmStep: 10,
  /** Font size in px (Section 5). */
  fontMin: 32,
  fontMax: 96,
  fontDefault: 56,
  countdownSeconds: 3,
  chromeHideMs: 3000,
  transitionMs: 120,
  /** Beats kept in the DOM around the current one (Section 9: very long scripts). */
  windowBuffer: 1,
} as const;

export const CUES: Exclude<BeatCue, null>[] = ["pause", "look_away", "lean_in", "gesture"];
export const CUE_LABEL: Record<Exclude<BeatCue, null>, string> = { pause: "pause", look_away: "glance away", lean_in: "lean in", gesture: "gesture" };

const SECTIONS: BeatSection[] = ["hook", "body", "cta"];

export const normalizeSpace = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();
export const words = (s: string) => normalizeSpace(s).split(" ").filter(Boolean);
export const wordCount = (s: string) => words(s).length;

/** The text the hash covers: all three parts, whitespace-normalized, in order. */
export function scriptSourceText(parts: ScriptParts): string {
  return [parts.hook, parts.body, parts.cta].map(normalizeSpace).filter(Boolean).join("\n");
}

/** SHA-256 hex of the source text. Web Crypto exists in the browser, Node, and Bun. */
export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `sha256-${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// ── Local chunker (Section 4, deterministic fallback) ───────────────

const CONJUNCTIONS = new Set(["and", "but", "or", "so", "yet", "nor"]);
const PREPOSITIONS = new Set(["in", "on", "at", "to", "for", "with", "from", "about", "into", "over", "after", "before", "under", "between", "through", "without", "because", "when", "if", "while", "unless", "until"]);
const ARTICLES = new Set(["a", "an", "the"]);
const isNumberish = (w: string) => /^\$?\d[\d,.]*%?$/.test(w.replace(/[.,;:!?]+$/, ""));

/** Sentence pieces, punctuation kept with the sentence. */
export function splitSentences(text: string): string[] {
  const t = normalizeSpace(text);
  if (!t) return [];
  return t.split(/(?<=[.!?…]["”’)]?)\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);
}

/** A split may not fall right after an article, a number, or a title, and never splits a number from its unit. */
function splittable(ws: string[], i: number): boolean {
  if (i <= 0 || i >= ws.length) return false;
  const before = ws[i - 1].toLowerCase().replace(/[^a-z$\d.,%]/g, "");
  if (ARTICLES.has(before)) return false;
  if (isNumberish(before)) return false;
  if (/^(mr|mrs|ms|dr|st)\.?$/.test(before)) return false;
  return true;
}

/** Best split point of a kind, nearest the middle, with at least two words on each side. */
function splitAt(ws: string[], want: (w: string, next: string) => boolean): number {
  const mid = ws.length / 2;
  let best = -1;
  for (let i = 2; i <= ws.length - 2; i++) {
    if (want(ws[i - 1], ws[i]) && splittable(ws, i) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return best;
}

function chunkWords(ws: string[]): string[][] {
  if (ws.length <= PROMPTER_CONFIG.targetMax) return [ws];
  let cut = splitAt(ws, (prev) => /[,;:]$/.test(prev));
  if (cut < 0) cut = splitAt(ws, (_prev, next) => CONJUNCTIONS.has(next.toLowerCase()));
  if (cut < 0) cut = splitAt(ws, (_prev, next) => PREPOSITIONS.has(next.toLowerCase()));
  if (cut < 0) {
    if (ws.length <= PROMPTER_CONFIG.hardMax) return [ws];
    cut = Math.ceil(ws.length / 2);
    while (cut > 2 && !splittable(ws, cut)) cut -= 1;
  }
  return [...chunkWords(ws.slice(0, cut)), ...chunkWords(ws.slice(cut))];
}

/** Section 4, steps 1 to 4. No emphasis, no cues. */
export function fallbackChunk(parts: ScriptParts): Beat[] {
  const out: Beat[] = [];
  for (const section of SECTIONS) {
    for (const sentence of splitSentences(parts[section])) {
      for (const piece of chunkWords(words(sentence))) out.push({ id: out.length + 1, section, text: piece.join(" "), emphasis: [], cue: null });
    }
  }
  return out;
}

// ── Validation of the AI pass ───────────────────────────────────────

/** Section 4: 150 wpm plus 0.4 s per pause cue. */
export function estimateSeconds(beats: Beat[]): number {
  const n = beats.reduce((sum, b) => sum + wordCount(b.text), 0);
  const pauses = beats.filter((b) => b.cue === "pause").length;
  return Math.round((n / PROMPTER_CONFIG.wpm) * 60 + pauses * PROMPTER_CONFIG.pauseSeconds);
}

const tokensOf = (s: string) => normalizeSpace(s).toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").split(" ").filter(Boolean);

/**
 * Accepts the AI's beats only when, read in order, they are the script word
 * for word. Sections come from where each beat falls in the source, so the
 * progress bar is always right; emphasis must be present in its beat; cues
 * come from the fixed list and never sit on the first or last beat. Any
 * beat over the hard maximum is split by the local chunker.
 */
export function validateBeats(raw: unknown, parts: ScriptParts): Beat[] | null {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { beats?: unknown }).beats) ? (raw as { beats: unknown[] }).beats : null;
  if (!list || !list.length) return null;
  const candidates: Array<{ text: string; emphasis: string[]; cue: BeatCue }> = [];
  for (const item of list) {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const text = normalizeSpace(String(o.text ?? ""));
    if (!text) continue;
    const emphasis = (Array.isArray(o.emphasis) ? o.emphasis : []).map((e) => normalizeSpace(String(e ?? ""))).filter((e) => e && text.includes(e)).slice(0, 2);
    const cue = CUES.includes(o.cue as Exclude<BeatCue, null>) ? (o.cue as BeatCue) : null;
    const ws = words(text);
    if (ws.length > PROMPTER_CONFIG.hardMax) {
      for (const piece of chunkWords(ws)) candidates.push({ text: piece.join(" "), emphasis: emphasis.filter((e) => piece.join(" ").includes(e)), cue: null });
    } else candidates.push({ text, emphasis, cue });
  }
  if (!candidates.length) return null;
  // Verbatim and complete: the beats, in order, are exactly the script.
  const source = tokensOf(scriptSourceText(parts).replace(/\n/g, " "));
  const got = tokensOf(candidates.map((c) => c.text).join(" "));
  if (source.length !== got.length || source.some((w, i) => w !== got[i])) return null;
  // Sections by word position.
  const bounds = { hook: wordCount(parts.hook), body: wordCount(parts.hook) + wordCount(parts.body) };
  let pos = 0;
  const beats: Beat[] = candidates.map((c, i) => {
    const start = pos;
    pos += wordCount(c.text);
    const section: BeatSection = start < bounds.hook ? "hook" : start < bounds.body ? "body" : "cta";
    return { id: i + 1, section, text: c.text, emphasis: c.emphasis, cue: c.cue };
  });
  if (beats.length) {
    beats[0].cue = null;
    beats[beats.length - 1].cue = null;
  }
  return beats;
}

export function makeBeatSet(beats: Beat[], sourceHash: string, source: BeatSet["source"]): BeatSet {
  return { sourceHash, generatedAt: new Date().toISOString(), estimatedSeconds: estimateSeconds(beats), beats, source };
}

/** Reads a stored beat set defensively. */
export function parseBeatSet(raw: unknown): BeatSet | null {
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<BeatSet> | null;
    if (!o || !Array.isArray(o.beats) || !o.sourceHash) return null;
    const beats: Beat[] = o.beats
      .map((b, i) => ({ id: i + 1, section: (SECTIONS.includes(b?.section as BeatSection) ? b.section : "body") as BeatSection, text: normalizeSpace(String(b?.text ?? "")), emphasis: Array.isArray(b?.emphasis) ? b.emphasis.map(String) : [], cue: CUES.includes(b?.cue as Exclude<BeatCue, null>) ? (b.cue as BeatCue) : null }))
      .filter((b) => b.text);
    if (!beats.length) return null;
    return { sourceHash: String(o.sourceHash), generatedAt: String(o.generatedAt ?? ""), estimatedSeconds: Number(o.estimatedSeconds) || estimateSeconds(beats), beats, source: o.source === "ai" ? "ai" : "fallback" };
  } catch {
    return null;
  }
}

// ── Rendering helpers ───────────────────────────────────────────────

/** The beat split into plain and accented runs. */
export function emphasisRuns(text: string, emphasis: string[]): Array<{ text: string; hit: boolean }> {
  const marks = emphasis.filter(Boolean);
  if (!marks.length) return [{ text, hit: false }];
  const runs: Array<{ text: string; hit: boolean }> = [];
  let rest = text;
  while (rest) {
    let best: { at: number; mark: string } | null = null;
    for (const m of marks) {
      const at = rest.indexOf(m);
      if (at >= 0 && (!best || at < best.at)) best = { at, mark: m };
    }
    if (!best) {
      runs.push({ text: rest, hit: false });
      break;
    }
    if (best.at > 0) runs.push({ text: rest.slice(0, best.at), hit: false });
    runs.push({ text: best.mark, hit: true });
    rest = rest.slice(best.at + best.mark.length);
  }
  return runs;
}

/** Timer mode: how long a beat stays up (Section 6). */
export function beatMillis(beat: Beat, wpm: number): number {
  const base = (wordCount(beat.text) / Math.max(40, wpm)) * 60_000;
  return Math.round(Math.max(700, base) + (beat.cue === "pause" ? PROMPTER_CONFIG.pauseSeconds * 1000 : 0));
}

/** Words per section, for the segmented progress bar. */
export function sectionShares(beats: Beat[]): Array<{ section: BeatSection; count: number }> {
  return SECTIONS.map((s) => ({ section: s, count: beats.filter((b) => b.section === s).length })).filter((x) => x.count > 0);
}

export function formatSeconds(total: number): string {
  const t = Math.max(0, Math.round(total));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

// ── Settings (Section 8) ────────────────────────────────────────────

export interface PrompterSettings {
  fontSize: number;
  anchor: "top" | "center";
  mirror: boolean;
  voice: boolean;
  wpm: number;
}

export const DEFAULT_PROMPTER_SETTINGS: PrompterSettings = { fontSize: PROMPTER_CONFIG.fontDefault, anchor: "top", mirror: false, voice: true, wpm: PROMPTER_CONFIG.wpm };
export const PROMPTER_SETTINGS_KEY = "prompter:settings";

export function normalizeSettings(raw: unknown): PrompterSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<PrompterSettings>;
  const clamp = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
  return {
    fontSize: clamp(o.fontSize, PROMPTER_CONFIG.fontMin, PROMPTER_CONFIG.fontMax, PROMPTER_CONFIG.fontDefault),
    anchor: o.anchor === "center" ? "center" : "top",
    mirror: Boolean(o.mirror),
    voice: o.voice === undefined ? true : Boolean(o.voice),
    wpm: clamp(o.wpm, PROMPTER_CONFIG.wpmMin, PROMPTER_CONFIG.wpmMax, PROMPTER_CONFIG.wpm),
  };
}
