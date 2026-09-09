import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { FACTS } from "./seed-facts";
import { EXTRA_TOPICS } from "./scriptGenerator";
import {
  buildEditableDeck,
  parseSavedDeck,
  serializeDeck,
  type EditableSlide,
} from "~/lib/slideEditor";

export type { EditableSlide, SlideElement, SlideKind, ElementRole } from "~/lib/slideEditor";

// ── Types ──────────────────────────────────────────────────────────

export interface TopicPick {
  topic: string;
  fact: string;
}

export interface CarouselInput {
  topic: string;
  fact: string;
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
  tone: string;
  dndThemed: boolean;
  title: string;
  caption: string;
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
  slides: EditableSlide[];
  createdAt: string;
}

/** Data saved for a carousel: the original AI result plus the edited deck. */
export interface SaveCarouselInput extends CarouselResult {
  deck: EditableSlide[];
}

// ── Topic pool ─────────────────────────────────────────────────────
// Reuses the exact same pool as the script generator (FACTS seed bank
// plus the curated EXTRA_TOPICS from scriptGenerator.ts).

function buildCarouselPool(): TopicPick[] {
  const pool: TopicPick[] = [];
  for (const [category, facts] of Object.entries(FACTS)) {
    for (const f of facts) {
      pool.push({ topic: category, fact: f });
    }
  }
  for (const t of EXTRA_TOPICS) {
    pool.push(t);
  }
  return pool;
}

// ── Server Functions ───────────────────────────────────────────────

/**
 * Pick three distinct TopicPick entries from the pool. Uses the same
 * Fisher-Yates distinct-topic logic as getRandomTopics so the carousel
 * tool offers the same varied, non-repeating topics as the script tool.
 */
export const getRandomCarouselTopics = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<TopicPick[]> => {
    const pool = buildCarouselPool();
    if (pool.length === 0) {
      return [
        {
          topic: "Financial Literacy",
          fact: "Understanding the basics of money helps you make confident decisions.",
        },
      ];
    }

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const count = Math.min(3, shuffled.length);
    const picks: TopicPick[] = [];
    const seenTopics = new Set<string>();

    for (const item of shuffled) {
      if (picks.length === count) break;
      if (!seenTopics.has(item.topic)) {
        seenTopics.add(item.topic);
        picks.push(item);
      }
    }

    const seenPairs = new Set(picks.map((p) => `${p.topic}\u0000${p.fact}`));
    for (const item of shuffled) {
      if (picks.length === count) break;
      const key = `${item.topic}\u0000${item.fact}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        picks.push(item);
      }
    }

    return picks;
  },
);

// The exact same four tone voices as the script generator, copied
// verbatim so the two tools speak with identical character.
const TONE_GUIDANCE: Record<string, string> = {
  Informative:
    "WRITE THE ENTIRE CAROUSEL AS A CRISP, CONFIDENT TEACHER STYLE EXPLAINER. Lead with the fact and state it clearly up front. Define every term in plain words the moment you use it. Use short, direct sentences in a steady, credible rhythm. Explain the why behind the advice so the viewer understands the logic. Keep the delivery matter of fact, assured, and easy to follow. Skip jokes, charm, and emotional appeals. Do not add warmth or humor, just teach the concept cleanly and confidently. End with a direct invitation to book a free call to learn more.",
  Warm:
    "WRITE THE ENTIRE CAROUSEL AS A TRUSTED FRIEND TALKING ONE ON ONE. Open with empathy, acknowledge how the viewer might feel about the topic, and make them feel seen. Use the word you often and speak directly to them. Reassure and comfort, normalize their worries, and let a gentle, unhurried rhythm carry the carousel. Kindness comes first. Frame the advice as support and care rather than instruction. Soften every point and end with a warm, gentle invitation to book a free call, presented as an act of looking out for them.",
  Funny:
    "WRITE THE ENTIRE CAROUSEL AS DEADPAN, DRY, AND SLIGHTLY DARK SELF AWARE HUMOR. Say bleak or wry truths about money and adulthood in a completely flat, matter of fact, unbothered delivery, as if the punchline is simply the reality itself. Undersell everything. Keep an even, steady rhythm with sudden understated punchlines that land because of what is left unsaid. Be wry and dryly cynical about the absurdity of financial life, never mean or mocking toward the viewer, their situation, or anyone else. Let the comedy come from the deadpan delivery and the grim honesty of the observation, not from funny sounding words or forced jokes. Keep the real advice clear and correct beneath the dry coating. Land the call to action in the same flat, dry tone, as a deadpan but still sincere invite.",
  "Mix / Surprise Me":
    "BLEND THE INFORMATIVE, WARM, AND FUNNY VOICES INTO ONE ENGAGING CAROUSEL. Teach the key point clearly and confidently, speak with kindness and reassurance, and keep it playful and approachable. Move naturally among the three so the carousel feels human and varied. Let the balance feel organic, with the informative thread carrying the facts, warmth carrying the connection, and humor keeping it light. The result should be engaging, warm, and easy to enjoy from start to finish.",
};

function buildCarouselSystemPrompt(tone: string, dndThemed: boolean): string {
  const theme = dndThemed
    ? `
ADDITIONAL THEME: Set the carousel in a light Dungeons & Dragons flavor. Use light fantasy wording and gaming metaphors (such as quests, saving throws, treasure, and dice) in a warm, beginner friendly way. The financial advice must stay honest and clear beneath the fantasy dressing. Do not let the theme overshadow the useful information.`
    : `
ADDITIONAL THEME: Use plain, every day language with no fantasy or gaming framing. Keep the focus squarely on practical, understandable financial and life planning advice.`;

  return `You are a financial literacy content coach helping John, a licensed life insurance agent and the creator of the brand "The Financial DM". John creates scrollable social media slideshow posts (carousels) about financial literacy and life planning, and he needs a fresh carousel for his next post.

Create a financial carousel for the given topic, using the supporting fact as a talking point.

TONE (strict): Write the ENTIRE carousel in the selected tone below. The tone must be unmistakable and consistent from the first slide to the last. Do not blend in any other voice unless the selected tone itself asks for a blend.
${TONE_GUIDANCE[tone] ?? TONE_GUIDANCE["Mix / Surprise Me"]}
${theme}

REQUIREMENTS:
- Provide a short, catchy cover title for the carousel.
- Provide a short social post caption that previews the carousel and invites engagement.
- Provide 4 to 6 content slides. Each slide has a heading and a short, scannable body line of roughly 10 to 25 words.
- End with a clear, friendly call to action inviting the viewer to book a free call with John, a licensed life insurance agent, to review their coverage, ask a financial question, or plan for the future.

HASHTAGS (required): Also generate 6 to 10 relevant hashtags for the carousel that match the specific topic and tone. Mix broad, high reach tags (such as #FinancialLiteracy) with niche ones specific to the topic. Each hashtag must be a single word with a leading # and no spaces, no punctuation, and no dashes or hyphens (for example #FinancialLiteracy, not #Financial Literacy).

VARIETY (important): Every generation must feel fresh. Vary the opening, choose a different angle or example, and do not simply repeat formulas from earlier drafts. Avoid cliches and generic filler. Keep each carousel distinct in structure and wording.

FORMATTING RULES (strict):
- Use no em dashes, no en dashes, and no hyphens anywhere. Write ranges and relations plainly, such as "10 to 20 years" or "one to two minutes". If a hyphen would normally appear in a word, rephrase to avoid it.
- Keep numbers and claims plain, honest, and accurate. Do not invent statistics or make up figures.
- Do not be pushy or use manufactured urgency. The call to action should be a friendly, optional invitation.

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "title": "Catchy title here", "caption": "Short social caption here", "callToAction": "A short friendly closing line inviting the viewer to book a free call with John.", "hashtags": ["#HashtagOne", "#HashtagTwo", "#HashtagThree"], "slides": [ { "heading": "Slide heading", "body": "Short scannable body line" }, { "heading": "Slide heading", "body": "Short scannable body line" } ] }`;
}

/** Defensively strip em dashes, en dashes, and hyphens from displayed text. */
function cleanText(s: string): string {
  return (s || "").replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHashtag(raw: string): string {
  if (!raw) return "";
  let tag = String(raw).trim().replace(/[—–-]/g, "").replace(/\s+/g, "");
  tag = tag.replace(/[^#\w]/g, "");
  tag = tag.replace(/^#+/, "#");
  if (tag === "#" || tag === "") return "";
  return tag.toUpperCase() === "#" ? "" : tag;
}

function normalizeHashtags(raw: Array<unknown> | undefined | null): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const cleaned = cleanHashtag(String(item ?? ""));
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 10);
}

export const generateCarousel = createServerFn().middleware([requireAdmin]).handler(
  async ({ data }: { data: CarouselInput }): Promise<CarouselResult | null> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[carouselGenerator] ANTHROPIC_API_KEY not set");
      return null;
    }

    const systemPrompt = buildCarouselSystemPrompt(data.tone, data.dndThemed);
    const userContent = `Topic: ${data.topic}\n\nSupporting fact: ${data.fact}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[carouselGenerator] Anthropic API error: ${response.status} ${response.statusText}: ${errText}`,
        );
        return null;
      }

      const json = (await response.json()) as {
        content: Array<{ text: string }>;
      };
      const text = json.content?.[0]?.text || "";

      let cleaned = String(text).trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }

      let parsed: {
        title?: string;
        caption?: string;
        callToAction?: string;
        hashtags?: Array<unknown>;
        slides?: Array<{ heading?: string; body?: string }>;
      };
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error(
          "[carouselGenerator] Failed to parse AI JSON:",
          String(parseErr),
        );
        return null;
      }

      const slides: CarouselSlide[] = Array.isArray(parsed.slides)
        ? parsed.slides
            .map((s) => ({
              heading: cleanText(String(s?.heading ?? "")),
              body: cleanText(String(s?.body ?? "")),
            }))
            .filter((s) => s.heading || s.body)
            .slice(0, 6)
        : [];

      return {
        topic: data.topic,
        fact: data.fact,
        tone: data.tone,
        dndThemed: data.dndThemed,
        title: cleanText(parsed.title ?? ""),
        caption: cleanText(parsed.caption ?? ""),
        callToAction: cleanText(parsed.callToAction ?? ""),
        hashtags: normalizeHashtags(parsed.hashtags),
        slides,
      };
    } catch (e) {
      console.error(
        "[carouselGenerator] Failed to generate carousel:",
        String(e),
        e instanceof Error ? e.stack : "",
      );
      return null;
    }
  },
);

// ── Saved Carousel Library (database) ──────────────────────────────

/** Create the saved_carousels table if it does not exist. Idempotent. */
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
}

export const initCarouselsTable = createServerFn().middleware([requireAdmin]).handler(async () => {
  await ensureCarouselsTable();
  return { ok: true };
});

/** Persist a generated carousel. Mirrors saveScript. */
export const saveCarousel = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: SaveCarouselInput;
  }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureCarouselsTable();
      const result = await sql()`
        INSERT INTO saved_carousels (title, caption, call_to_action, hashtags, topic, tone, dnd_themed, fact, slides)
        VALUES (${data.title}, ${data.caption}, ${data.callToAction}, ${(data.hashtags || []).join(" ")}, ${data.topic}, ${data.tone}, ${data.dndThemed}, ${data.fact}, ${serializeDeck(data.deck)})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

function parseSlides(
  raw: unknown,
  src: { title: string; fact: string; callToAction: string },
): EditableSlide[] {
  return parseSavedDeck(raw, src);
}

/** List saved carousels, newest first. */
export const getSavedCarousels = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<SavedCarousel[]> => {
    await ensureCarouselsTable();
    const rows = await sql()`
      SELECT * FROM saved_carousels ORDER BY created_at DESC
    `;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      caption: String(r.caption ?? ""),
      callToAction: String(r.call_to_action ?? ""),
      hashtags: (String(r.hashtags ?? "") || "")
        .split(/\s+/)
        .filter(Boolean),
      topic: String(r.topic ?? ""),
      tone: String(r.tone ?? ""),
      dndThemed: Boolean(r.dnd_themed),
      fact: String(r.fact ?? ""),
      slides: parseSlides(r.slides, {
        title: String(r.title ?? ""),
        fact: String(r.fact ?? ""),
        callToAction: String(r.call_to_action ?? ""),
      }),
      createdAt: String(r.created_at),
    })) as SavedCarousel[];
  },
);

/** Update the editable slides of a saved carousel (used by inline editing). */
export const updateCarouselSlides = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { id: number; slides: EditableSlide[] };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureCarouselsTable();
      await sql()`UPDATE saved_carousels SET slides = ${serializeDeck(data.slides)} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

/** Delete a saved carousel by id. */
export const deleteCarousel = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { id: number };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM saved_carousels WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);