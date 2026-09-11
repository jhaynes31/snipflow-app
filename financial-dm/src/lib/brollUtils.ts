/**
 * Client safe helpers for the b roll planner: the shot model, timing
 * estimates, labels, and the plain text shoot sheet.
 */

export const BROLL_SOURCES = ["film", "stock", "screen", "text", "clip"] as const;
export type BrollSource = (typeof BROLL_SOURCES)[number];

export const BROLL_SOURCE_META: Record<BrollSource, { label: string; icon: string; hint: string }> = {
  film: { label: "Film it", icon: "🎥", hint: "John films this himself" },
  stock: { label: "Stock clip", icon: "🎞️", hint: "Find this on a stock footage site" },
  screen: { label: "Screen recording", icon: "📱", hint: "Record a phone or computer screen" },
  text: { label: "Text card", icon: "🔤", hint: "A plain text card or simple graphic" },
  clip: { label: "Your clip", icon: "📁", hint: "A clip already in John's library" },
};

export const BROLL_STYLES = ["mixed", "library", "filmed", "stock", "textcards"] as const;
export type BrollStyle = (typeof BROLL_STYLES)[number];

export const BROLL_STYLE_META: Record<BrollStyle, { label: string; hint: string }> = {
  mixed: { label: "Mixed", hint: "Best source for each line" },
  library: { label: "Mostly my clips", hint: "Cut it from footage already in the library" },
  filmed: { label: "Mostly filmed", hint: "John is behind the camera today" },
  stock: { label: "Mostly stock", hint: "No filming, stock clips and cards" },
  textcards: { label: "Text cards only", hint: "Voice over on text and graphics" },
};

export interface BrollShot {
  /** 1 based shoot day order. */
  order: number;
  /** Exact script text this shot sits under. */
  beat: string;
  /** What to film or source. */
  shot: string;
  source: BrollSource;
  /** Eight words or fewer, bartender voice. */
  onScreenText: string;
  notes: string;
  /** Rough cue into the video, in seconds. */
  startSec: number;
  endSec: number;
  /** A clip from John's library attached to this shot. */
  clipId?: number;
  clipName?: string;
  clipUrl?: string;
  clipPosterUrl?: string;
}

/** A clip in John's b roll library (see server/clips.ts). */
export interface ClipSummary {
  id: number;
  name: string;
  description: string;
  tags: string[];
  url: string;
  posterUrl?: string;
  durationSec?: number;
  kind: "upload" | "link";
  createdAt: string;
}

const STOP = new Set("the a an and or of to in on at for with your you my me his her their our it is are was be this that as by from into over under about".split(" "));
const keywords = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

/** How well a library clip fits a shot, by shared words (tags count double). */
export function scoreClipForShot(clip: ClipSummary, shot: Pick<BrollShot, "beat" | "shot" | "onScreenText" | "notes">): number {
  const want = keywords(`${shot.shot} ${shot.beat} ${shot.onScreenText} ${shot.notes}`);
  let score = 0;
  for (const w of keywords(`${clip.name} ${clip.description}`)) if (want.has(w)) score += 1;
  for (const t of clip.tags) for (const w of keywords(t)) if (want.has(w)) score += 2;
  return score;
}

/** Library clips most likely to fit a shot, best first (only those with any match). */
export function suggestClips(clips: ClipSummary[], shot: Pick<BrollShot, "beat" | "shot" | "onScreenText" | "notes">, n = 3): ClipSummary[] {
  return clips
    .map((c) => ({ c, s: scoreClipForShot(c, shot) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.c);
}

/** Footage that can be attached to a shot: a library clip or a stock find. */
export interface Footage {
  id?: number;
  name: string;
  url: string;
  posterUrl?: string;
}

/** A stock clip found through the free footage search (Pexels). */
export interface StockClip {
  id: number;
  name: string;
  url: string;
  pageUrl: string;
  posterUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  credit: string;
}

/** Attach (or clear) footage on a shot. Library clips become source "clip", stock finds stay "stock". */
export function withClip(shot: BrollShot, footage: Footage | null, source: BrollSource = "clip"): BrollShot {
  if (!footage) {
    const { clipId: _a, clipName: _b, clipUrl: _c, clipPosterUrl: _d, ...rest } = shot;
    return { ...rest, source: shot.source === "clip" ? "film" : shot.source };
  }
  const { clipId: _a, ...rest } = shot;
  return { ...rest, source, ...(footage.id ? { clipId: footage.id } : {}), clipName: footage.name, clipUrl: footage.url, clipPosterUrl: footage.posterUrl };
}

/** Typical spoken pace for a one minute explainer. */
export const WORDS_PER_SECOND = 2.6;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (s: string) => norm(s).split(" ").filter(Boolean);

/**
 * Line each beat up with the script by word position and turn that into
 * start and end seconds. Beats that cannot be located fall back to an even
 * split of the remaining time, so every shot always gets a cue.
 */
export function estimateTiming(
  script: string,
  raw: Array<Omit<BrollShot, "order" | "startSec" | "endSec">>,
): { shots: BrollShot[]; totalSeconds: number } {
  const scriptWords = words(script);
  const total = Math.max(1, scriptWords.length);
  const totalSeconds = Math.round(total / WORDS_PER_SECOND);
  const joined = " " + scriptWords.join(" ") + " ";

  // Locate each beat's first few words in the script, searching forward
  // from the previous beat so repeated phrases resolve in order.
  const starts: Array<number | null> = [];
  let cursorChar = 0;
  for (const r of raw) {
    const bw = words(r.beat).slice(0, 6);
    let found: number | null = null;
    if (bw.length >= 2) {
      const needle = " " + bw.join(" ") + " ";
      const idx = joined.indexOf(needle, cursorChar);
      if (idx >= 0) {
        found = joined.slice(0, idx + 1).split(" ").filter(Boolean).length; // word index
        cursorChar = idx + 1;
      }
    }
    starts.push(found);
  }
  // First beat starts at 0 no matter what.
  if (raw.length) starts[0] = 0;
  // Fill unknown starts by spreading evenly between known neighbours.
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] === null) {
      let j = i;
      while (j < starts.length && starts[j] === null) j++;
      const prev = starts[i - 1] as number;
      const next = j < starts.length ? (starts[j] as number) : total;
      const gap = j - i + 1;
      for (let k = i; k < j; k++) starts[k] = Math.round(prev + ((next - prev) * (k - i + 1)) / gap);
      i = j;
    }
  }
  const shots: BrollShot[] = raw.map((r, i) => {
    const startWord = (starts[i] as number) ?? 0;
    const endWord = i + 1 < starts.length ? (starts[i + 1] as number) : total;
    const startSec = Math.round(startWord / WORDS_PER_SECOND);
    const endSec = Math.max(startSec + 1, Math.round(Math.max(endWord, startWord + 1) / WORDS_PER_SECOND));
    return { order: i + 1, ...r, startSec, endSec };
  });
  return { shots, totalSeconds };
}

export function formatCue(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, Math.round(sec % 60));
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function cueRange(shot: Pick<BrollShot, "startSec" | "endSec">): string {
  return `${formatCue(shot.startSec)} to ${formatCue(shot.endSec)}`;
}

/** Plain text shoot sheet John can print or keep on his phone. */
export function buildBrollText(plan: {
  title: string;
  topic: string;
  painPoint?: string;
  tone: string;
  style: BrollStyle;
  totalSeconds: number;
  shots: BrollShot[];
}): string {
  const parts: string[] = [
    `B roll shot list: ${plan.title}`,
    "",
    [`Topic: ${plan.topic}`, plan.painPoint ? `Pain point: ${plan.painPoint}` : "", `Tone: ${plan.tone}`, `Style: ${BROLL_STYLE_META[plan.style]?.label ?? plan.style}`, `Runtime about ${formatCue(plan.totalSeconds)}`]
      .filter(Boolean)
      .join("  |  "),
    "",
  ];
  plan.shots.forEach((s) => {
    const meta = BROLL_SOURCE_META[s.source];
    parts.push(`${s.order}. ${cueRange(s)}  [${meta?.label ?? s.source}]`);
    parts.push(`   Under the line: "${s.beat}"`);
    parts.push(`   Shot: ${s.shot}`);
    if (s.clipName) parts.push(`   Use clip: ${s.clipName}${s.clipUrl ? ` (${s.clipUrl})` : ""}`);
    parts.push(`   On screen: ${s.onScreenText}`);
    if (s.notes) parts.push(`   Notes: ${s.notes}`);
    parts.push("");
  });
  return parts.join("\n");
}

export function downloadBrollText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
