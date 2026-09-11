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
import { layoutGuideLines, slotsFor } from "~/lib/memeLayouts";

// ── Types ──────────────────────────────────────────────────────────

export interface MemeConcept {
  template: string;
  /** One line per text slot of the template, in the template's slot order. */
  texts: string[];
  /** First and last slot, kept for older callers and the saved table. */
  topText: string;
  bottomText: string;
  /** Selected caption (defaults to captions[0]). */
  caption: string;
  /** 2 to 3 caption options. */
  captions: string[];
  hashtags: string[];
}

export interface MemeGenerateInput {
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
}

export interface SavedMemeConcept {
  id: number;
  fact: string;
  category: string;
  pain_point: string;
  tone: string;
  template: string;
  top_text: string;
  bottom_text: string;
  caption: string;
  hashtags: string[];
  platform: string;
  is_used: boolean;
  is_favorite: boolean;
  text_boxes?: string | null;
  created_at: string;
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  /** How many text boxes imgflip says this template normally carries. */
  boxCount: number;
}

// ── Imgflip Template Cache (module scope) ──────────────────────────

let _templatesCache: MemeTemplate[] | null = null;

async function loadMemeTemplates(): Promise<MemeTemplate[]> {
  if (_templatesCache) return _templatesCache;
  try {
    const response = await fetch("https://api.imgflip.com/get_memes");
    if (!response.ok) {
      console.error("imgflip API error:", response.status);
      return [];
    }
    const json = (await response.json()) as {
      data?: {
        memes?: Array<{
          id: string;
          name: string;
          url: string;
          width: number;
          height: number;
          box_count?: number;
        }>;
      };
    };
    const memes = json?.data?.memes || [];
    _templatesCache = memes.map((m) => ({
      id: String(m.id),
      name: String(m.name),
      url: String(m.url),
      width: Number(m.width),
      height: Number(m.height),
      boxCount: Number(m.box_count ?? 2) || 2,
    }));
    console.log(`[memeGenerator] Cached ${_templatesCache.length} imgflip templates`);
    return _templatesCache;
  } catch (e) {
    console.error("Failed to fetch imgflip templates:", e);
    return [];
  }
}

function matchTemplate(templates: MemeTemplate[], templateName: string): MemeTemplate | null {
  const name = templateName.toLowerCase().trim();
  if (!name || !templates.length) return null;
  // 1. Direct substring match (either direction)
  let match = templates.find(
    (t) => t.name.toLowerCase().includes(name) || name.includes(t.name.toLowerCase()),
  );
  // 2. Try removing common words and match individual significant words
  if (!match) {
    const words = name
      .split(/[\s,]+/)
      .filter((w) => w.length > 3)
      .filter((w) => !["meme", "template", "blank"].includes(w));
    for (const word of words) {
      match = templates.find((t) => t.name.toLowerCase().includes(word));
      if (match) break;
    }
  }
  return match || null;
}

// ── Server Functions ───────────────────────────────────────────────

export const fetchMemeTemplates = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<MemeTemplate[]> => loadMemeTemplates());

export const findTemplateImage = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { templateName: string }) => ({ templateName: String(d?.templateName ?? "") }))
  .handler(async ({ data }): Promise<MemeTemplate | null> =>
    matchTemplate(await loadMemeTemplates(), data.templateName),
  );

function buildMemeSystemPrompt(tone: string, dndThemed: boolean, templates: MemeTemplate[]): string {
  return `You are writing meme concepts for John, a licensed life insurance agent and the creator of the brand "The Financial DM". The text on each meme, its caption, and its hashtags are all written by the character described below. Meme text is read in two seconds on a phone, so every word has to earn its place.

${buildVoiceBlock({ tone, dndThemed, medium: "meme" })}

Given a topic, a supporting fact, and the viewer's pain point, generate 3 meme concepts. For each concept, pick a template from the guide below, write one line for EACH of its text slots (in slot order, so the words land on the right part of the picture), plus caption options and hashtags.

MEME TEXT REQUIREMENTS:
- Fill every slot listed for the template, in order, one entry per slot. The slot's role tells you what that part of the picture means in the joke; write the text that belongs there. A slot marked optional may be a short phrase or an empty string.
- Together the slots tell one small, true story about money that the viewer recognizes from the pain point. Set up first, land the point last.
- Each line is short (aim for under 8 words, under 5 for labels on people or objects), plain language, and still sounds like the bartender talking to you. The humor is the recognizable truth, never mockery of the viewer.
- The meme must still teach or reveal the useful point from the supporting fact; a viewer should be a little smarter after reading it.

TEMPLATE VARIETY: Use a different template for each concept. Mix classics with less common ones; do not default to the same two or three every time.

${CAPTION_OPTIONS_RULES}
Captions may be a little shorter for memes (keep each under 200 characters) and must not repeat the meme text.

${HASHTAG_RULES}

${VARIETY_RULES}

${FORMATTING_RULES}

Return your response as valid JSON only. No other text, no markdown fences. Use this exact structure:
{ "concepts": [ { "template": "Template Name exactly as listed", "texts": ["slot 1 text", "slot 2 text"], "captions": ["Caption option one", "Caption option two", "Caption option three"], "hashtags": ["#HashtagOne", "#HashtagTwo"] } ] }

TEMPLATE GUIDE (name, how it is used, and its text slots in order):
${layoutGuideLines(templates)}`;
}

export const generateMemeConcepts = createServerFn()
  .middleware([requireAdmin])
  .validator((d: MemeGenerateInput) => d)
  .handler(async ({ data }): Promise<MemeConcept[]> => {
    // Fetch real imgflip templates so Claude can suggest actual, varied templates
    const templates = await loadMemeTemplates();
    const tone = normalizeTone(data.tone);
    const painPoint = cleanText(data.painPoint);

    const text = await callClaude({
      tag: "memeGenerator",
      system: buildMemeSystemPrompt(tone, Boolean(data.dndThemed), templates),
      user: topicPromptLines({ ...data, painPoint }),
      maxTokens: 2048,
    });
    const parsed = parseJsonReply<{
      concepts?: Array<{
        template?: unknown;
        texts?: unknown;
        topText?: unknown;
        bottomText?: unknown;
        caption?: unknown;
        captions?: unknown;
        hashtags?: unknown;
      }>;
    }>(text, "memeGenerator");
    if (!parsed || !Array.isArray(parsed.concepts)) return [];
    return parsed.concepts
      .map((c) => {
        const captions = normalizeCaptions(c?.captions, c?.caption);
        const template = cleanText(c?.template);
        // One entry per slot. Older replies (or a model that ignores the
        // guide) come back as top/bottom, which map to the first and last slot.
        const slotCount = slotsFor(matchTemplate(templates, template) ?? { name: template }).length;
        let texts = Array.isArray(c?.texts) ? (c.texts as unknown[]).map((t) => cleanText(t)) : [];
        if (texts.length === 0) texts = [cleanText(c?.topText), cleanText(c?.bottomText)].filter(Boolean);
        texts = texts.slice(0, Math.max(slotCount, 1));
        while (texts.length < slotCount) texts.push("");
        const filled = texts.filter(Boolean);
        return {
          template,
          texts,
          topText: filled[0] ?? "",
          bottomText: filled.length > 1 ? filled[filled.length - 1] : "",
          caption: captions[0] ?? "",
          captions,
          hashtags: normalizeHashtags(c?.hashtags),
        };
      })
      .filter((c) => c.template || c.texts.some(Boolean))
      .slice(0, 3);
  });

// ── Database Operations ────────────────────────────────────────────

async function ensureMemesTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS meme_concepts (
      id SERIAL PRIMARY KEY,
      fact TEXT NOT NULL,
      category TEXT NOT NULL,
      template TEXT NOT NULL,
      top_text TEXT NOT NULL,
      bottom_text TEXT NOT NULL,
      caption TEXT NOT NULL,
      platform TEXT DEFAULT '',
      is_used BOOLEAN DEFAULT FALSE,
      is_favorite BOOLEAN DEFAULT FALSE,
      text_boxes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // Add columns if the table already existed without them (idempotent).
  await sql()`ALTER TABLE meme_concepts ADD COLUMN IF NOT EXISTS text_boxes TEXT`;
  await sql()`ALTER TABLE meme_concepts ADD COLUMN IF NOT EXISTS hashtags TEXT`;
  await sql()`ALTER TABLE meme_concepts ADD COLUMN IF NOT EXISTS pain_point TEXT`;
  await sql()`ALTER TABLE meme_concepts ADD COLUMN IF NOT EXISTS tone TEXT`;
}

export const initMemesTable = createServerFn()
  .middleware([requireAdmin])
  .handler(async () => {
    await ensureMemesTable();
    return { ok: true };
  });

export interface SaveConceptInput {
  fact: string;
  category: string;
  painPoint?: string;
  tone?: string;
  template: string;
  topText: string;
  bottomText: string;
  caption: string;
  hashtags?: string[];
  platform?: string;
  isUsed?: boolean;
  isFavorite?: boolean;
  textBoxesJson?: string;
}

export const saveConcept = createServerFn()
  .middleware([requireAdmin])
  .validator((d: SaveConceptInput) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      // Ensure the table exists. The Forge tab may be the first thing used on a fresh DB
      await ensureMemesTable();
      const result = await sql()`
        INSERT INTO meme_concepts (fact, category, template, top_text, bottom_text, caption, platform, is_used, is_favorite, text_boxes, hashtags, pain_point, tone)
        VALUES (${data.fact}, ${data.category}, ${data.template}, ${data.topText}, ${data.bottomText}, ${data.caption}, ${data.platform || ""}, ${data.isUsed || false}, ${data.isFavorite || false}, ${data.textBoxesJson || null}, ${(data.hashtags || []).join(" ")}, ${data.painPoint || ""}, ${data.tone || ""})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const getSavedConcepts = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<SavedMemeConcept[]> => {
    await ensureMemesTable();
    const rows = await sql()`SELECT * FROM meme_concepts ORDER BY created_at DESC`;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      fact: String(r.fact ?? ""),
      category: String(r.category ?? ""),
      pain_point: String(r.pain_point ?? ""),
      tone: String(r.tone ?? ""),
      template: String(r.template ?? ""),
      top_text: String(r.top_text ?? ""),
      bottom_text: String(r.bottom_text ?? ""),
      caption: String(r.caption ?? ""),
      hashtags: (String(r.hashtags ?? "") || "").split(/\s+/).filter(Boolean),
      platform: String(r.platform ?? ""),
      is_used: Boolean(r.is_used),
      is_favorite: Boolean(r.is_favorite),
      text_boxes: r.text_boxes ? String(r.text_boxes) : null,
      created_at: String(r.created_at),
    }));
  });

export interface UpdateConceptInput {
  id: number;
  updates: {
    platform?: string;
    is_used?: boolean;
    is_favorite?: boolean;
    top_text?: string;
    bottom_text?: string;
    text_boxes?: string | null;
  };
}

export const updateConcept = createServerFn()
  .middleware([requireAdmin])
  .validator((d: UpdateConceptInput) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];
      const u = data.updates || {};
      if (u.platform !== undefined) {
        sets.push("platform");
        params.push(u.platform);
      }
      if (u.is_used !== undefined) {
        sets.push("is_used");
        params.push(u.is_used);
      }
      if (u.is_favorite !== undefined) {
        sets.push("is_favorite");
        params.push(u.is_favorite);
      }
      if (u.top_text !== undefined) {
        sets.push("top_text");
        params.push(u.top_text);
      }
      if (u.bottom_text !== undefined) {
        sets.push("bottom_text");
        params.push(u.bottom_text);
      }
      if (u.text_boxes !== undefined) {
        sets.push("text_boxes");
        params.push(u.text_boxes);
      }
      if (sets.length === 0) return { ok: true };

      // Build a dynamic query since we don't know which fields to update.
      // Column names come from the fixed list above, never from the client.
      const setClauses = sets.map((col, i) => col + " = $" + (i + 1));
      params.push(data.id);
      await sql().query(
        `UPDATE meme_concepts SET ${setClauses.join(", ")} WHERE id = $${params.length}`,
        params,
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteConcept = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM meme_concepts WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
