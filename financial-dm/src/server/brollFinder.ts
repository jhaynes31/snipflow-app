import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "~/server/auth";
import { PERSONA_BLOCK, callClaude, cleanText, normalizeTone, parseJsonReply } from "./contentVoice";
import { topicPromptLines } from "./topics";
import { listClips } from "./clips";
import { searchPexels } from "./clips";
import type { ClipSummary, StockClip } from "~/lib/brollUtils";

/**
 * The B Roll finder: from a topic, pain point, and tone, the model writes a
 * handful of concrete footage ideas (each a search friendly phrase and the
 * reason it fits), then real clips are pulled for every idea from free
 * stock footage, alongside anything matching in John's own library.
 */

export interface BrollIdea {
  /** The exact script line this footage plays under. */
  beat: string;
  /** Search friendly phrase, the way a stock site would tag it. */
  query: string;
  /** Why this footage fits the line, one line. */
  why: string;
  clips: StockClip[];
}

export interface BrollFindInput {
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  /** The generated script the footage must follow, hook first. */
  script: string;
  callToAction: string;
  orientation: "portrait" | "landscape";
  /** Ideas already shown, so "new ideas" does not repeat them. */
  exclude?: string[];
}

export interface BrollFindResult {
  ideas: BrollIdea[];
  libraryMatches: ClipSummary[];
  stockEnabled: boolean;
  error?: string;
}

function buildIdeasPrompt(tone: string, dndThemed: boolean): string {
  return `You are choosing b roll (the footage shown while the voice over plays) for a short ${dndThemed ? "lightly Dungeons and Dragons flavored " : ""}social video by John, a licensed life insurance agent and the creator of "The Financial DM". John has written the script below and will record it as voice over. The tone of the video is "${tone}".

${PERSONA_BLOCK}

Walk through the script IN ORDER and pick 6 to 8 pieces of footage John can pull from a stock footage site and drop straight into his edit. Rules:
- "beat" is the EXACT script text the footage plays under, copied word for word (a sentence or two, no paraphrase). Beats run in script order, from the hook to the call to action, and together they cover the whole script.
- "query" is 2 to 5 plain words a stock site understands: a concrete subject and action, optionally a setting. Good: "opening paycheck envelope kitchen", "young couple reviewing bills", "hand stacking coins". Bad: abstract words ("financial freedom", "security"), brand names, anything with text on screen. Show what the line literally talks about; if the line mentions leaving a job, show a desk being cleared.
- Match the tone: a Funny video wants reaction faces and everyday chaos; a Warm video wants family, home, and hands; an Informative video wants desks, documents, calculators, and phone screens. Mix of the three for Mix.
- Include at least two ideas that show people and at least one close up of an object. The call to action wants a friendly face, a phone call, or a handshake.
- "why" is one short line on what the clip does for that line, in John's plain voice.
- Avoid clichés unless they truly fit (falling money, rich people on yachts).

Respond with valid JSON only, no markdown fences:
{ "ideas": [ { "beat": "exact script text", "query": "opening paycheck envelope kitchen", "why": "The hook: the moment the number feels smaller than it should" } ] }`;
}

export const findBroll = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: BrollFindInput) => d)
  .handler(async ({ data }): Promise<BrollFindResult> => {
    const tone = normalizeTone(data.tone);
    const orientation = data.orientation === "landscape" ? "landscape" : "portrait";
    const exclude = Array.isArray(data.exclude) ? data.exclude.map(String).filter(Boolean).slice(0, 40) : [];
    const script = cleanText(data.script);
    if (!script) return { ideas: [], libraryMatches: [], stockEnabled: Boolean(process.env.PEXELS_API_KEY), error: "Forge a script first." };
    const user = `${topicPromptLines(data)}

FULL SCRIPT (voice over, in order; the first line is the hook):
${script}

CALL TO ACTION (spoken last): ${cleanText(data.callToAction)}${exclude.length ? `\n\nFootage already shown, pick different searches this time (same beats are fine): ${exclude.join("; ")}` : ""}`;

    const text = await callClaude({
      tag: "brollFinder",
      system: buildIdeasPrompt(tone, Boolean(data.dndThemed)),
      user,
      maxTokens: 900,
    });
    const parsed = parseJsonReply<{ ideas?: Array<{ beat?: unknown; query?: unknown; why?: unknown }> }>(text, "brollFinder");
    const ideas: BrollIdea[] = (parsed?.ideas ?? [])
      .map((i) => ({ beat: cleanText(i?.beat).slice(0, 300), query: cleanText(i?.query).slice(0, 80), why: cleanText(i?.why).slice(0, 160), clips: [] as StockClip[] }))
      .filter((i) => i.query)
      .slice(0, 8);

    const stockEnabled = Boolean(process.env.PEXELS_API_KEY);
    let error: string | undefined;
    if (ideas.length === 0) {
      error = "The AI service did not return footage ideas. Please try again.";
    } else if (stockEnabled) {
      const results = await Promise.all(ideas.map((i) => searchPexels(i.query, orientation, 4)));
      results.forEach((r, k) => {
        ideas[k].clips = r.clips;
        if (!r.ok && !error) error = r.error;
      });
    } else {
      error = "Stock footage search is not set up yet. Add a free Pexels key (PEXELS_API_KEY) in Vercel and redeploy.";
    }

    // Anything in John's own library that matches the ideas or the topic.
    let libraryMatches: ClipSummary[] = [];
    try {
      const clips = await listClips();
      const words = new Set(
        [data.topic, data.painPoint, ...ideas.map((i) => i.query)]
          .join(" ")
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 3),
      );
      libraryMatches = clips
        .map((c) => {
          const hay = `${c.name} ${c.tags.join(" ")} ${c.description}`.toLowerCase();
          let score = 0;
          for (const w of words) if (hay.includes(w)) score += 1;
          return { c, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((x) => x.c);
    } catch (e) {
      console.error("[brollFinder] library unavailable", e);
    }

    return { ideas, libraryMatches, stockEnabled, error };
  });
