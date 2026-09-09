import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import {
  CAPTION_OPTIONS_RULES,
  FORMATTING_RULES,
  HASHTAG_RULES,
  VARIETY_RULES,
  buildVoiceBlock,
  callClaude,
  cleanText,
  normalizeCaptions,
  normalizeHashtags,
  normalizeTone,
  parseJsonReply,
} from "./contentVoice";
import { topicPromptLines } from "./topics";
import { parseSavedDeck, serializeDeck, type EditableSlide } from "~/lib/slideEditor";

export type { EditableSlide, SlideElement, SlideKind, ElementRole } from "~/lib/slideEditor";
// Topic rolling lives in ./topics; keep the old names importable.
export { getRandomTopics as getRandomCarouselTopics, type TopicPick } from "./topics";

// ── Types ──────────────────────────────────────────────────────────

export interface CarouselInput {
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
}

export interface CarouselSlide {
  heading: string;
  body: string;
}

export interface CarouselResult {
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  title: string;
  /** Selected caption (defaults to captions[0]). */
  caption: string;
  /** 2 to 3 caption options. */
  captions: string[];
  callToAction: string;
  hashtags: string[];
  slides: CarouselSlide[];
}

export interface SavedCarousel {
  id: number;
  title: string;
  caption: string;
  callToAction: string;
  hashtags: string[];
  topic: string;
  tone: string;
  dndThemed: boolean;
  fact: string;
  painPoint: string;
  slides: EditableSlide[];
  createdAt: string;
}

/** Data saved for a carousel: the original AI result plus the edited deck. */
export interface SaveCarouselInput extends CarouselResult {
  deck: EditableSlide[];
}

// ── Prompt ─────────────────────────────────────────────────────────

function buildCarouselSystemPrompt(tone: string, dndThemed: boolean): string {
  return `You are writing a scrollable social media slideshow post (a carousel) for John, a licensed life insurance agent and the creator of the brand "The Financial DM". Every slide, the caption, and the hashtags are written by the character described below, and slide text is what a viewer actually reads on a phone screen.

${buildVoiceBlock({ tone, dndThemed, medium: "carousel" })}

Create a financial carousel for the given topic, using the supporting fact as the talking point and the pain point as the viewer's situation to speak to.

REQUIREMENTS:
- Provide a short, catchy cover title for the carousel (a few words).
- Provide 4 to 6 content slides. Each slide has a heading of at most 8 words and a short, scannable body line of roughly 10 to 25 words. Slide text must read cleanly on a phone at a glance: one idea per slide, plain words, no jargon left unexplained.
- The first content slide should name the pain point so the viewer feels seen, the middle slides teach the key point, and the last content slide gives the viewer one concrete thing to do.
- End with a clear, friendly call to action inviting the viewer to book a free call with John, a licensed life insurance agent, to review their coverage, ask a financial question, or plan for the future.

${CAPTION_OPTIONS_RULES}
Captions preview the carousel and invite the viewer to swipe; they must not simply repeat the cover title.

${HASHTAG_RULES}

${VARIETY_RULES} Keep each carousel distinct in structure and wording.

${FORMATTING_RULES}

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "title": "Catchy title here", "captions": ["Caption option one", "Caption option two", "Caption option three"], "callToAction": "A short friendly closing line inviting the viewer to book a free call with John.", "hashtags": ["#HashtagOne", "#HashtagTwo", "#HashtagThree"], "slides": [ { "heading": "Slide heading", "body": "Short scannable body line" }, { "heading": "Slide heading", "body": "Short scannable body line" } ] }`;
}

// ── Server Functions ───────────────────────────────────────────────

export const generateCarousel = createServerFn()
  .middleware([requireAdmin])
  .validator((d: CarouselInput) => d)
  .handler(async ({ data }): Promise<CarouselResult | null> => {
    const tone = normalizeTone(data.tone);
    const dndThemed = Boolean(data.dndThemed);
    const painPoint = cleanText(data.painPoint);
    const text = await callClaude({
      tag: "carouselGenerator",
      system: buildCarouselSystemPrompt(tone, dndThemed),
      user: topicPromptLines({ ...data, painPoint }),
      maxTokens: 2048,
    });
    const parsed = parseJsonReply<{
      title?: unknown;
      caption?: unknown;
      captions?: unknown;
      callToAction?: unknown;
      hashtags?: unknown;
      slides?: Array<{ heading?: unknown; body?: unknown }>;
    }>(text, "carouselGenerator");
    if (!parsed) return null;

    const slides: CarouselSlide[] = Array.isArray(parsed.slides)
      ? parsed.slides
          .map((s) => ({
            heading: cleanText(s?.heading),
            body: cleanText(s?.body),
          }))
          .filter((s) => s.heading || s.body)
          .slice(0, 6)
      : [];
    const captions = normalizeCaptions(parsed.captions, parsed.caption);

    return {
      topic: data.topic,
      fact: data.fact,
      painPoint,
      tone,
      dndThemed,
      title: cleanText(parsed.title),
      caption: captions[0] ?? "",
      captions,
      callToAction: cleanText(parsed.callToAction),
      hashtags: normalizeHashtags(parsed.hashtags),
      slides,
    };
  });

// ── Saved Carousel Library (database) ──────────────────────────────

async function ensureCarouselsTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS saved_carousels (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      call_to_action TEXT NOT NULL,
      hashtags TEXT,
      topic TEXT,
      tone TEXT,
      dnd_themed BOOLEAN DEFAULT FALSE,
      fact TEXT,
      slides TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql()`ALTER TABLE saved_carousels ADD COLUMN IF NOT EXISTS pain_point TEXT`;
}

/** Create the saved_carousels table if it does not exist. Idempotent. */
export const initCarouselsTable = createServerFn()
  .middleware([requireAdmin])
  .handler(async () => {
    await ensureCarouselsTable();
    return { ok: true };
  });

/** Persist a generated carousel. Mirrors saveScript. */
export const saveCarousel = createServerFn()
  .middleware([requireAdmin])
  .validator((d: SaveCarouselInput) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureCarouselsTable();
      const result = await sql()`
        INSERT INTO saved_carousels (title, caption, call_to_action, hashtags, topic, tone, dnd_themed, fact, slides, pain_point)
        VALUES (${data.title}, ${data.caption}, ${data.callToAction}, ${(data.hashtags || []).join(" ")}, ${data.topic}, ${data.tone}, ${data.dndThemed}, ${data.fact}, ${serializeDeck(data.deck)}, ${data.painPoint || ""})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** List saved carousels, newest first. */
export const getSavedCarousels = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<SavedCarousel[]> => {
    await ensureCarouselsTable();
    const rows = await sql()`
      SELECT * FROM saved_carousels ORDER BY created_at DESC
    `;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      caption: String(r.caption ?? ""),
      callToAction: String(r.call_to_action ?? ""),
      hashtags: (String(r.hashtags ?? "") || "").split(/\s+/).filter(Boolean),
      topic: String(r.topic ?? ""),
      tone: String(r.tone ?? ""),
      dndThemed: Boolean(r.dnd_themed),
      fact: String(r.fact ?? ""),
      painPoint: String(r.pain_point ?? ""),
      slides: parseSavedDeck(r.slides, {
        title: String(r.title ?? ""),
        fact: String(r.fact ?? ""),
        callToAction: String(r.call_to_action ?? ""),
      }),
      createdAt: String(r.created_at),
    }));
  });

/** Update the editable slides of a saved carousel (used by inline editing). */
export const updateCarouselSlides = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number; slides: EditableSlide[] }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureCarouselsTable();
      await sql()`UPDATE saved_carousels SET slides = ${serializeDeck(data.slides)} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Delete a saved carousel by id. */
export const deleteCarousel = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM saved_carousels WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
