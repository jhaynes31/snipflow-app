/**
 * The DM Screen (presentation script spec). Types, config, and the plain
 * text markers the body uses. John owns every word here: nothing in this
 * file generates or rewrites content (Rule 2.2). Pure, so the editor, the
 * presenter view, and the Sparring Dummy all read a script the same way.
 */

export type ScriptAudience = "client" | "recruit";

/** Section 4.4: recruit sections can be marked as public trust facts or conversation-only presentation facts. */
export type SectionTag = "" | "trust" | "presentation";

export interface ScriptSection {
  id: string;
  order: number;
  title: string;
  /** Free text: "Slide 4", "4-6". */
  slideRef: string;
  /** What John says. Markers: **bold**, *italic*, and a line starting with "- " for a bullet. */
  body: string;
  /** Reminders he does not say aloud. */
  notes: string;
  targetMinutes: number | null;
  tag: SectionTag;
}

export interface DmScript {
  id: number;
  name: string;
  audience: ScriptAudience;
  version: number;
  isDefault: boolean;
  archived: boolean;
  sections: ScriptSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ScriptVersion {
  id: number;
  version: number;
  name: string;
  sectionCount: number;
  savedAt: string;
}

export const DM_SCREEN_CONFIG = {
  /** Section 4.2: saves kept per script for restore. */
  versionsKept: 20,
  /** Autosave debounce. */
  autosaveMs: 900,
  maxSections: 80,
  maxBodyChars: 12000,
  maxNotesChars: 4000,
  /** A presenter view writes a heartbeat this often; the editor pauses autosave while one is fresh (Rule 2.1). */
  presenterHeartbeatMs: 5000,
} as const;

export const AUDIENCE_LABEL: Record<ScriptAudience, string> = { client: "Client", recruit: "Recruit" };

export const BODY_HELP = "Plain text. **bold**, *italic*, and a line that starts with \"- \" makes a bullet. Nothing else, so it stays readable on the presenter view.";

const text = (v: unknown, max: number) => String(v ?? "").replace(/\r\n?/g, "\n").slice(0, max);

export function newSectionId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function blankSection(order: number): ScriptSection {
  return { id: newSectionId(), order, title: "", slideRef: "", body: "", notes: "", targetMinutes: null, tag: "" };
}

/** Accepts anything a form or an older row might hold and returns clean, ordered sections with unique ids. */
export function normalizeSections(raw: unknown): ScriptSection[] {
  let arr: unknown[] = [];
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(v)) arr = v;
  } catch {
    arr = [];
  }
  const seen = new Set<string>();
  const out: ScriptSection[] = [];
  for (const item of arr.slice(0, DM_SCREEN_CONFIG.maxSections)) {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    let id = text(o.id, 40).trim();
    if (!id || seen.has(id)) id = newSectionId();
    seen.add(id);
    const tm = o.targetMinutes == null || o.targetMinutes === "" ? null : Number(o.targetMinutes);
    const tag = o.tag === "trust" || o.tag === "presentation" ? o.tag : "";
    out.push({
      id,
      order: out.length,
      title: text(o.title, 160).trim(),
      slideRef: text(o.slideRef, 40).trim(),
      body: text(o.body, DM_SCREEN_CONFIG.maxBodyChars),
      notes: text(o.notes, DM_SCREEN_CONFIG.maxNotesChars),
      targetMinutes: tm != null && Number.isFinite(tm) && Math.round(tm * 10) / 10 > 0 ? Math.min(180, Math.round(tm * 10) / 10) : null,
      tag,
    });
  }
  return out;
}

export function totalTargetMinutes(sections: ScriptSection[]): number {
  return Math.round(sections.reduce((n, s) => n + (s.targetMinutes ?? 0), 0) * 10) / 10;
}

/** True when two section lists say the same thing, ignoring order numbers. */
export function sameSections(a: ScriptSection[], b: ScriptSection[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => {
    const t = b[i];
    return s.id === t.id && s.title === t.title && s.slideRef === t.slideRef && s.body === t.body && s.notes === t.notes && s.targetMinutes === t.targetMinutes && s.tag === t.tag;
  });
}

// ── Body markers ────────────────────────────────────────────────────

export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
}

export interface Block {
  kind: "p" | "bullet";
  runs: Run[];
}

/** Inline markers: **bold** and *italic*. An unclosed marker is shown as typed. */
export function parseRuns(line: string): Run[] {
  const runs: Run[] = [];
  let bold = false;
  let italic = false;
  let buf = "";
  const flush = () => {
    if (buf) runs.push({ text: buf, bold, italic });
    buf = "";
  };
  let i = 0;
  while (i < line.length) {
    if (line.startsWith("**", i)) {
      const close = line.indexOf("**", i + 2);
      if (!bold && close > i + 2) {
        flush();
        bold = true;
        i += 2;
        continue;
      }
      if (bold) {
        flush();
        bold = false;
        i += 2;
        continue;
      }
    }
    if (line[i] === "*" && !line.startsWith("**", i)) {
      const close = line.indexOf("*", i + 1);
      if (!italic && close > i + 1 && line[i + 1] !== " ") {
        flush();
        italic = true;
        i += 1;
        continue;
      }
      if (italic) {
        flush();
        italic = false;
        i += 1;
        continue;
      }
    }
    buf += line[i];
    i += 1;
  }
  flush();
  return runs;
}

/** Each non-empty line is a paragraph; "- " or "• " at the start makes it a bullet. Blank lines separate, nothing more. */
export function parseBody(body: string): Block[] {
  return String(body ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const m = /^\s*(?:-|•)\s+(.*)$/.exec(l);
      return m ? { kind: "bullet" as const, runs: parseRuns(m[1]) } : { kind: "p" as const, runs: parseRuns(l.trim()) };
    });
}

/** The body with markers stripped, for word counts and scans. */
export function plainBody(body: string): string {
  return parseBody(body)
    .map((b) => b.runs.map((r) => r.text).join(""))
    .join("\n");
}

export function wordCount(body: string): number {
  const t = plainBody(body).trim();
  return t ? t.split(/\s+/).length : 0;
}

export const presenterHeartbeatKey = (scriptId: number) => `dm-screen:presenting:${scriptId}`;

// ── Presenter view storage (Section 5.3 and 5.5): all local, never the network ──

export type PresenterDevice = "phone" | "monitor";
export const presenterPosKey = (scriptId: number) => `dm-screen:pos:${scriptId}`;
export const presenterSizeKey = (device: PresenterDevice) => `dm-screen:size:${device}`;
export const presenterThemeKey = "dm-screen:theme";
/** The editor writes the new version here on every save; an open presenter view in the same browser notices, silently. */
export const scriptSavedKey = (scriptId: number) => `dm-screen:saved:${scriptId}`;

export const PRESENTER_CONFIG = {
  /** Text scale limits and step for + and -. */
  minScale: 0.7,
  maxScale: 2.4,
  scaleStep: 0.1,
  defaultScale: { phone: 1, monitor: 1.2 } as Record<PresenterDevice, number>,
  /** Below this width the phone layout is used. */
  phoneMaxWidth: 760,
  /** A horizontal swipe longer than this advances or goes back. */
  swipeMinPx: 60,
} as const;

export function clampScale(v: number): number {
  const x = Math.round(v * 10) / 10;
  return Math.min(PRESENTER_CONFIG.maxScale, Math.max(PRESENTER_CONFIG.minScale, Number.isFinite(x) ? x : 1));
}

/** mm:ss, or h:mm:ss past an hour. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

