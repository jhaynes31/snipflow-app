/**
 * Client safe helpers for the b roll planner: the shot model, timing
 * estimates, labels, and the plain text shoot sheet.
 */

export const BROLL_SOURCES = ["film", "stock", "screen", "text"] as const;
export type BrollSource = (typeof BROLL_SOURCES)[number];

export const BROLL_SOURCE_META: Record<BrollSource, { label: string; icon: string; hint: string }> = {
  film: { label: "Film it", icon: "🎥", hint: "John films this himself" },
  stock: { label: "Stock clip", icon: "🎞️", hint: "Find this on a stock footage site" },
  screen: { label: "Screen recording", icon: "📱", hint: "Record a phone or computer screen" },
  text: { label: "Text card", icon: "🔤", hint: "A plain text card or simple graphic" },
};

export const BROLL_STYLES = ["mixed", "filmed", "stock", "textcards"] as const;
export type BrollStyle = (typeof BROLL_STYLES)[number];

export const BROLL_STYLE_META: Record<BrollStyle, { label: string; hint: string }> = {
  mixed: { label: "Mixed", hint: "Best source for each line" },
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
