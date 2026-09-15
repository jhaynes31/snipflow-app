import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { callClaudeChat, parseJsonObject } from "~/server/aiChat.server";
import { fallbackChunk, hashText, makeBeatSet, parseBeatSet, scriptSourceText, validateBeats, type BeatSet, type ScriptParts } from "~/lib/prompterBeats";

/**
 * The beats pass (Step 4: Perform spec, Section 4). One AI call turns a
 * script into short phrases with a little emphasis and a few cues. It never
 * rewrites: the result is accepted only if it is the script word for word,
 * otherwise the local chunker takes over, so the prompter always runs.
 * Beats are kept on the saved script with a hash of the text they came
 * from, so a changed script is noticed rather than served stale beats.
 */

const BEATS_MODEL = process.env.PROMPTER_MODEL || "claude-sonnet-5";
const text = (v: unknown, max: number) => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);

let ready: Promise<void> | null = null;
function ensureColumn(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      try {
        await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS beats TEXT`;
      } catch {
        /* the scripts table appears on first save; until then beats live in the browser */
      }
    })();
  }
  return ready;
}

const SYSTEM = `PROMPTER BEATS
You split a short spoken video script into prompter beats for John, a friendly bartender in a medieval tavern who happens to be a licensed life insurance agent. He reads one beat at a time from a screen behind his phone, so each beat must be short enough to take in at a glance.

You are a chunker, not a rewriter. Keep the script's exact wording. Do not fix grammar, do not shorten, do not change tone, do not add or drop a single word. Read in order, your beats must reproduce the script word for word.

CHUNKING
- Target 3 to 9 words per beat; 12 is the hard maximum.
- Break at natural breath boundaries: clause ends, before conjunctions, before prepositional phrases.
- Never split a number from its unit, a name from its title, or an article from its noun. "$250,000 policy" stays together; "the" never ends a beat.
- One idea per beat. A sentence carrying two ideas becomes two beats.

EMPHASIS
- Mark 0 to 2 phrases per beat, copied verbatim from that beat, and only where stress genuinely changes meaning. Most beats should have none. Over-marking makes the screen noisy.

CUES
- Insert cues sparingly, roughly one every 4 to 6 beats, from: "pause", "look_away", "lean_in", "gesture". A cue fires after the beat is spoken.
- "look_away" belongs at natural thinking moments (after a rhetorical question, before a reveal). "lean_in" belongs before a key point. "pause" belongs after a punchline or a number. Never put a cue on the first or last beat.
- Cues should feel like a bartender leaning on the bar, not a news anchor.

SECTIONS
- Beats from the HOOK are "hook", from the BODY "body", from the CALL TO ACTION "cta".

Return JSON only, with no prose and no markdown fences, in exactly this shape:
{"beats":[{"section":"hook","text":"...","emphasis":[],"cue":null}]}`;

export interface BuildBeatsResult {
  ok: boolean;
  error?: string;
  beats?: BeatSet;
  /** True when the stored beats matched the current text and no call was made. */
  cached?: boolean;
}

/**
 * Beats for a script. With a saved script id, stored beats whose hash
 * matches are returned as they are; otherwise the beats pass runs (AI first,
 * local chunker if it fails or strays) and the result is stored.
 */
export const buildBeats = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { hook: string; body: string; cta: string; scriptId?: number; force?: boolean }) => ({
    parts: { hook: text(d?.hook, 2000), body: text(d?.body, 6000), cta: text(d?.cta, 1000) } as ScriptParts,
    scriptId: Number(d?.scriptId) > 0 ? Number(d?.scriptId) : null,
    force: Boolean(d?.force),
  }))
  .handler(async ({ data }): Promise<BuildBeatsResult> => {
    const source = scriptSourceText(data.parts);
    if (!source) return { ok: false, error: "There is no script text to prompt from." };
    const sourceHash = await hashText(source);
    await ensureColumn();
    if (data.scriptId && !data.force) {
      try {
        const rows = (await sql()`SELECT beats FROM saved_scripts WHERE id = ${data.scriptId}`) as Array<{ beats: unknown }>;
        const stored = rows.length ? parseBeatSet(rows[0].beats) : null;
        if (stored && stored.sourceHash === sourceHash) return { ok: true, beats: stored, cached: true };
      } catch {
        /* fall through to a fresh pass */
      }
    }
    let beats: BeatSet;
    try {
      const user = `HOOK:\n${data.parts.hook || "(none)"}\n\nBODY:\n${data.parts.body || "(none)"}\n\nCALL TO ACTION:\n${data.parts.cta || "(none)"}`;
      const reply = await callClaudeChat({ system: SYSTEM, messages: [{ role: "user", content: user }], maxTokens: 2500, model: BEATS_MODEL, tag: "prompter-beats" });
      const parsed = reply ? parseJsonObject<{ beats?: unknown }>(reply) : null;
      const valid = parsed ? validateBeats(parsed, data.parts) : null;
      beats = valid ? makeBeatSet(valid, sourceHash, "ai") : makeBeatSet(fallbackChunk(data.parts), sourceHash, "fallback");
    } catch {
      beats = makeBeatSet(fallbackChunk(data.parts), sourceHash, "fallback");
    }
    if (data.scriptId) {
      try {
        await sql()`UPDATE saved_scripts SET beats = ${JSON.stringify(beats)} WHERE id = ${data.scriptId}`;
      } catch {
        /* keeping them is a convenience, not a requirement */
      }
    }
    return { ok: true, beats };
  });
