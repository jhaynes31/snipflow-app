import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import {
  FORMATTING_RULES,
  buildVoiceBlock,
  callClaude,
  cleanText,
  normalizeTone,
  parseJsonReply,
} from "./contentVoice";
import { topicPromptLines } from "./topics";
import { listClips } from "./clips";
import {
  BROLL_SOURCES,
  BROLL_STYLES,
  type BrollShot,
  type BrollSource,
  type BrollStyle,
  type ClipSummary,
  estimateTiming,
} from "~/lib/brollUtils";

export type { BrollShot, BrollSource, BrollStyle } from "~/lib/brollUtils";

// ── Types ──────────────────────────────────────────────────────────

/** Everything the planner needs from a finished script. */
export interface BrollInput {
  /** saved_scripts.id when planning from the library; absent for a fresh forge. */
  scriptId?: number;
  title: string;
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  hook: string;
  /** Full script including the hook as its first line. */
  script: string;
  callToAction: string;
  /** How John wants to shoot this one. */
  style: BrollStyle;
}

export interface BrollPlan extends Omit<BrollInput, "style"> {
  style: BrollStyle;
  /** Estimated read time of the whole script, in seconds. */
  totalSeconds: number;
  shots: BrollShot[];
}

export interface SavedBrollPlan extends BrollPlan {
  id: number;
  createdAt: string;
}

// ── Prompt ─────────────────────────────────────────────────────────

const STYLE_GUIDANCE: Record<BrollStyle, string> = {
  mixed:
    "SHOOTING STYLE: MIXED. Balance shots John films himself, clips already in his library, stock clips, screen recordings, and text cards. Pick whichever source best sells each line.",
  library:
    "SHOOTING STYLE: MOSTLY MY CLIPS. John wants to cut this video from footage he already has. Use a library clip (source \"clip\" with its clipId) wherever one fits the line, even loosely, and fill only the real gaps with a text card or a stock clip. If the library is empty, plan as MIXED.",
  filmed:
    "SHOOTING STYLE: MOSTLY FILMED. John is behind the camera with a phone and simple props. Favor things he can film in a home, a kitchen, a car, or a tavern themed corner. Use stock or screen only when filming is impractical, and keep text cards to one or two.",
  stock:
    "SHOOTING STYLE: MOSTLY STOCK. John is not filming today. Favor clips he can find on a stock footage site, described with search friendly terms (for example \"person opening a paycheck envelope at a kitchen table\"), plus text cards. No shots that require John on camera.",
  textcards:
    "SHOOTING STYLE: TEXT CARDS. This video is voice over on screen text and simple graphics. Every shot is a text card or a simple graphic; the on screen text carries the whole video, so make it especially sharp.",
};

function buildBrollSystemPrompt(tone: string, dndThemed: boolean, style: BrollStyle): string {
  return `You are planning the b roll (the footage shown while the voice over plays) for a short vertical video by John, a licensed life insurance agent and the creator of the brand "The Financial DM". John has already recorded or will record the script below as voice over. Your job is a shot list he can take on a shoot day, plus the on screen text for each shot. The on screen text is what a viewer actually reads, so it must sound like the character described below.

${buildVoiceBlock({ tone, dndThemed, medium: "shot list" })}

${STYLE_GUIDANCE[style]}

SHOT LIST REQUIREMENTS:
- Walk through the script IN ORDER and split it into 6 to 8 beats. Every beat covers a contiguous run of the script. Together the beats cover the entire script from the first word of the hook to the end of the call to action, with no gaps and no overlaps.
- For each beat, "beat" is the EXACT text of the script lines it covers, copied word for word from the script (do not paraphrase, do not shorten). This is how the shot gets lined up under the voice over.
- "shot" is what to film or source for that beat, tied to what the line actually says: a concrete subject, action, and setting, 1 to 2 sentences. Never generic ("stock footage of money"). If the line mentions a paycheck, show a paycheck; if it mentions leaving a job, show a desk being cleared.
- "source" is one of: "film" (John films it himself), "stock" (a stock footage clip; describe it with search friendly terms), "screen" (a screen recording, for example a calculator or a bank app), "text" (a plain text card or simple graphic), "clip" (a clip from John's own library, listed in the message; set "clipId" to its id and say in "shot" how to use it). Prefer a library clip over stock when one fits.
- "onScreenText" is the text shown over that shot: 8 WORDS OR FEWER, plain language, in the bartender's voice, no insurance jargon left unexplained, no hashtags, no emoji. It should reinforce the line, not repeat it word for word. Every shot needs one.
- "notes" is optional: props, framing, lighting, or a tip ("shoot the hook in one take, eye level").
- The first beat is the hook and its shot should be the strongest, most stopping image in the list. The last beat is the call to action; its on screen text can name John or "book a free call".

${FORMATTING_RULES}

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "shots": [ { "beat": "exact script text this shot sits under", "shot": "what to film or source", "source": "film | stock | screen | text | clip", "clipId": null, "onScreenText": "eight words or fewer", "notes": "optional" } ] }`;
}

// ── Server Functions ───────────────────────────────────────────────

function normalizeSource(raw: unknown): BrollSource {
  const s = String(raw ?? "").trim().toLowerCase();
  return (BROLL_SOURCES as readonly string[]).includes(s) ? (s as BrollSource) : "film";
}

function normalizeStyle(raw: unknown): BrollStyle {
  const s = String(raw ?? "").trim().toLowerCase();
  return (BROLL_STYLES as readonly string[]).includes(s) ? (s as BrollStyle) : "mixed";
}

export const generateBroll = createServerFn()
  .middleware([requireAdmin])
  .validator((d: BrollInput) => d)
  .handler(async ({ data }): Promise<BrollPlan | null> => {
    const tone = normalizeTone(data.tone);
    const style = normalizeStyle(data.style);
    const script = cleanText(data.script);
    if (!script) return null;
    let clips: ClipSummary[] = [];
    try {
      clips = await listClips();
    } catch (e) {
      console.error("[brollGenerator] clip library unavailable", e);
    }
    const libraryBlock = clips.length
      ? `YOUR CLIP LIBRARY (footage John already has; when one fits a beat, use source "clip" and its clipId):\n${clips
          .slice(0, 60)
          .map((c) => `- clipId ${c.id}: "${c.name}"${c.tags.length ? ` [${c.tags.join(", ")}]` : ""}${c.description ? ` ${c.description}` : ""}${c.durationSec ? ` (${Math.round(c.durationSec)}s)` : ""}`)
          .join("\n")}`
      : "YOUR CLIP LIBRARY: empty for now.";
    const user = `${topicPromptLines(data)}

Title: ${cleanText(data.title) || "untitled"}
Tone: ${tone}

FULL SCRIPT (voice over, in order; the first line is the hook):
${script}

CALL TO ACTION (spoken last): ${cleanText(data.callToAction)}

${libraryBlock}`;

    const text = await callClaude({
      tag: "brollGenerator",
      system: buildBrollSystemPrompt(tone, Boolean(data.dndThemed), style),
      user,
      maxTokens: 2048,
    });
    const parsed = parseJsonReply<{
      shots?: Array<{
        beat?: unknown;
        shot?: unknown;
        source?: unknown;
        clipId?: unknown;
        onScreenText?: unknown;
        notes?: unknown;
      }>;
    }>(text, "brollGenerator");
    if (!parsed || !Array.isArray(parsed.shots) || parsed.shots.length === 0) return null;

    const byId = new Map(clips.map((c) => [c.id, c]));
    const raw = parsed.shots
      .map((s) => {
        const clip = byId.get(Number(s?.clipId)) ?? null;
        const source = clip ? ("clip" as BrollSource) : normalizeSource(s?.source);
        return {
          beat: cleanText(s?.beat),
          shot: cleanText(s?.shot),
          source: source === "clip" && !clip ? ("film" as BrollSource) : source,
          onScreenText: cleanText(s?.onScreenText),
          notes: cleanText(s?.notes),
          ...(clip ? { clipId: clip.id, clipName: clip.name, clipUrl: clip.url, clipPosterUrl: clip.posterUrl } : {}),
        };
      })
      .filter((s) => s.beat || s.shot)
      .slice(0, 10);

    const fullScript = [script, cleanText(data.callToAction)].filter(Boolean).join(" ");
    const { shots, totalSeconds } = estimateTiming(fullScript, raw);

    return {
      scriptId: data.scriptId,
      title: cleanText(data.title),
      topic: data.topic,
      fact: data.fact,
      painPoint: cleanText(data.painPoint),
      tone,
      dndThemed: Boolean(data.dndThemed),
      hook: cleanText(data.hook),
      script,
      callToAction: cleanText(data.callToAction),
      style,
      totalSeconds,
      shots,
    };
  });

// ── Saved plans (database) ─────────────────────────────────────────
// Mirrors saved_scripts: one row per plan, shots stored as JSON text.

async function ensureBrollTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS saved_broll (
      id SERIAL PRIMARY KEY,
      script_id INTEGER,
      title TEXT NOT NULL,
      topic TEXT,
      fact TEXT,
      pain_point TEXT,
      tone TEXT,
      dnd_themed BOOLEAN DEFAULT FALSE,
      hook TEXT,
      script TEXT NOT NULL,
      call_to_action TEXT,
      style TEXT,
      total_seconds INTEGER,
      shots TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export const initBrollTable = createServerFn()
  .middleware([requireAdmin])
  .handler(async () => {
    await ensureBrollTable();
    return { ok: true };
  });

export const saveBroll = createServerFn()
  .middleware([requireAdmin])
  .validator((d: BrollPlan) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureBrollTable();
      const result = await sql()`
        INSERT INTO saved_broll (script_id, title, topic, fact, pain_point, tone, dnd_themed, hook, script, call_to_action, style, total_seconds, shots)
        VALUES (${data.scriptId ?? null}, ${data.title}, ${data.topic}, ${data.fact}, ${data.painPoint || ""}, ${data.tone}, ${data.dndThemed}, ${data.hook}, ${data.script}, ${data.callToAction}, ${data.style}, ${Math.round(data.totalSeconds || 0)}, ${JSON.stringify(data.shots || [])})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

function parseShots(raw: unknown): BrollShot[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr.map((s: Record<string, unknown>, i: number) => ({
      order: Number(s.order ?? i + 1),
      beat: String(s.beat ?? ""),
      shot: String(s.shot ?? ""),
      source: normalizeSource(s.source),
      onScreenText: String(s.onScreenText ?? ""),
      notes: String(s.notes ?? ""),
      startSec: Number(s.startSec ?? 0),
      endSec: Number(s.endSec ?? 0),
      ...(s.clipId ? { clipId: Number(s.clipId), clipName: String(s.clipName ?? ""), clipUrl: String(s.clipUrl ?? ""), clipPosterUrl: s.clipPosterUrl ? String(s.clipPosterUrl) : undefined } : {}),
    }));
  } catch {
    return [];
  }
}

export const getSavedBroll = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<SavedBrollPlan[]> => {
    await ensureBrollTable();
    const rows = await sql()`SELECT * FROM saved_broll ORDER BY created_at DESC`;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      scriptId: r.script_id === null || r.script_id === undefined ? undefined : Number(r.script_id),
      title: String(r.title ?? ""),
      topic: String(r.topic ?? ""),
      fact: String(r.fact ?? ""),
      painPoint: String(r.pain_point ?? ""),
      tone: String(r.tone ?? ""),
      dndThemed: Boolean(r.dnd_themed),
      hook: String(r.hook ?? ""),
      script: String(r.script ?? ""),
      callToAction: String(r.call_to_action ?? ""),
      style: normalizeStyle(r.style),
      totalSeconds: Number(r.total_seconds ?? 0),
      shots: parseShots(r.shots),
      createdAt: String(r.created_at),
    }));
  });

/** Update the shots of a saved plan (inline edits to on screen text etc.). */
export const updateBrollShots = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number; shots: BrollShot[] }) => ({ id: Number(d?.id), shots: Array.isArray(d?.shots) ? d.shots : [] }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureBrollTable();
      await sql()`UPDATE saved_broll SET shots = ${JSON.stringify(data.shots)} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteBroll = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM saved_broll WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
