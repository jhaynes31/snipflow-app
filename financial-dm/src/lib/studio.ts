/**
 * The Recording Studio, shared shapes (Recording Studio spec). One video
 * project holds everything about a video: where it came from, its script,
 * its background, its takes, its edits, and its status. Client safe: no
 * database, no AI, no browser APIs.
 */
import type { BrollShot } from "./brollUtils";

export type StudioStep = "script" | "record" | "edit" | "save";
export type StudioSource = "script" | "broll" | "guild" | "freestyle";
export type StudioStatus = "draft" | "ready" | "posted";
export type BackgroundMode = "none" | "blur" | "preset" | "custom" | "green";

export interface StudioScript {
  hook: string;
  body: string;
  cta: string;
}

export interface StudioBackground {
  mode: BackgroundMode;
  /** Preset scene id, when mode is "preset". */
  preset?: string;
  /** Uploaded picture, when mode is "custom". */
  imageUrl?: string;
}

/** What an entry point hands to the Studio. Nothing here is retyped later. */
export interface StudioHandoff {
  source: StudioSource;
  /** Guild recruiting videos are filed separately in the library. */
  recruiting: boolean;
  title: string;
  topic: string;
  painPoint: string;
  tone: string;
  script: StudioScript;
  scriptId?: number | null;
  brollId?: number | null;
  guildOutputId?: number | null;
  /** B roll picks, each tagged to the script line it belongs with. */
  shots?: BrollShot[];
}

export interface VideoProject extends StudioHandoff {
  id: number;
  status: StudioStatus;
  step: StudioStep;
  /** John chose to record without a prompter. */
  noScript: boolean;
  background: StudioBackground;
  chosenTakeId: number | null;
  durationSec: number | null;
  exportUrl: string | null;
  thumbnailUrl: string | null;
  captionText: string;
  hashtags: string[];
  /** Bumped on every save; a stale save is refused rather than clobbering a newer one. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const STUDIO_STEPS: Array<{ id: StudioStep; label: string; blurb: string }> = [
  { id: "script", label: "Script", blurb: "What you will say, or nothing at all." },
  { id: "record", label: "Record", blurb: "Camera, background, and the prompter." },
  { id: "edit", label: "Edit", blurb: "Trim, captions, and B roll." },
  { id: "save", label: "Save", blurb: "Library, download, and status." },
];

export const STUDIO_SOURCES: Record<StudioSource, { label: string; icon: string }> = {
  script: { label: "Script forge", icon: "📜" },
  broll: { label: "B roll", icon: "🎞️" },
  guild: { label: "Guild", icon: "🛡️" },
  freestyle: { label: "Freestyle", icon: "🎤" },
};

export const STUDIO_STATUSES: Record<StudioStatus, { label: string; blurb: string }> = {
  draft: { label: "Draft", blurb: "Recorded or still being edited." },
  ready: { label: "Ready", blurb: "Exported and waiting to be posted." },
  posted: { label: "Posted", blurb: "Up on TikTok." },
};

export const STUDIO_CONFIG = {
  /** Autosave debounce. */
  autosaveMs: 800,
  /** Unkept takes are deleted after this many days to hold storage costs down. */
  unusedTakeDays: 30,
  softWarnSeconds: 60,
  hardStopSeconds: 600,
  width: 1080,
  height: 1920,
  fps: 30,
  wpm: 150,
} as const;

export const isStudioStep = (v: unknown): v is StudioStep => v === "script" || v === "record" || v === "edit" || v === "save";
export const isStudioSource = (v: unknown): v is StudioSource => v === "script" || v === "broll" || v === "guild" || v === "freestyle";
export const isStudioStatus = (v: unknown): v is StudioStatus => v === "draft" || v === "ready" || v === "posted";
export const isBackgroundMode = (v: unknown): v is BackgroundMode => v === "none" || v === "blur" || v === "preset" || v === "custom" || v === "green";

export const stepIndex = (step: StudioStep): number => Math.max(0, STUDIO_STEPS.findIndex((s) => s.id === step));
export const nextStep = (step: StudioStep): StudioStep => STUDIO_STEPS[Math.min(STUDIO_STEPS.length - 1, stepIndex(step) + 1)].id;
export const prevStep = (step: StudioStep): StudioStep => STUDIO_STEPS[Math.max(0, stepIndex(step) - 1)].id;

const clean = (v: unknown, max = 20000): string => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);

export function normalizeScript(raw: unknown): StudioScript {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<StudioScript>;
  return { hook: clean(o.hook, 2000), body: clean(o.body, 12000), cta: clean(o.cta, 1000) };
}

export function normalizeBackground(raw: unknown): StudioBackground {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<StudioBackground>;
  const mode = isBackgroundMode(o.mode) ? o.mode : "none";
  return { mode, preset: mode === "preset" ? clean(o.preset, 80) || undefined : undefined, imageUrl: mode === "custom" ? clean(o.imageUrl, 2000) || undefined : undefined };
}

/** The full script as spoken: hook, body, call to action. */
export function scriptText(s: StudioScript): string {
  return [s.hook, s.body, s.cta].map((p) => p.trim()).filter(Boolean).join("\n\n");
}

export const wordCount = (t: string): number => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Rough spoken length at the prompter's default pace. */
export function estimateSeconds(s: StudioScript): number {
  return Math.round((wordCount(scriptText(s)) / STUDIO_CONFIG.wpm) * 60);
}

/** A video's title defaults to its hook (spec, Section "Saving"). */
export function defaultTitle(h: { title?: string; script?: Partial<StudioScript> }): string {
  const t = clean(h.title, 120);
  if (t) return t;
  const hook = clean(h.script?.hook, 200);
  if (hook) {
    const words = hook.split(/\s+/);
    return words.length > 10 ? `${words.slice(0, 10).join(" ")}…` : hook;
  }
  return "Untitled video";
}

export function fmtLength(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface LibraryFilter {
  status?: StudioStatus | "all";
  source?: StudioSource | "all";
  /** "dm" hides Guild recruiting videos; "guild" shows only them. */
  shelf?: "all" | "dm" | "guild";
  topic?: string;
  q?: string;
}

/** Library filters and search (title or script text), newest first as given. */
export function filterVideos<T extends Pick<VideoProject, "status" | "source" | "recruiting" | "topic" | "title" | "script">>(list: T[], f: LibraryFilter): T[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return list.filter((v) => {
    if (f.status && f.status !== "all" && v.status !== f.status) return false;
    if (f.source && f.source !== "all" && v.source !== f.source) return false;
    if (f.shelf === "dm" && v.recruiting) return false;
    if (f.shelf === "guild" && !v.recruiting) return false;
    if (f.topic && v.topic !== f.topic) return false;
    if (q && !`${v.title}\n${scriptText(v.script)}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function topicsOf(list: Array<{ topic: string }>): string[] {
  return Array.from(new Set(list.map((v) => v.topic.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

/** Where a video opens. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const studioLink = (video?: number) => ({ to: "/admin/studio", search: video ? { video } : {} }) as any;
