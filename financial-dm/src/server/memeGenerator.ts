import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { FACTS } from "./seed-facts";

// ── Types ──────────────────────────────────────────────────────────

export interface MemeConcept {
  template: string;
  topText: string;
  bottomText: string;
  caption: string;
}

export interface SavedMemeConcept {
  id: number;
  fact: string;
  category: string;
  template: string;
  top_text: string;
  bottom_text: string;
  caption: string;
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
}

// ── Seed facts (static module, no file I/O) ────────────────────────
// FACTS is imported from ./seed-facts.ts (auto-generated from seed-facts.md)

function getFacts(): Record<string, string[]> {
  return FACTS;
}

// ── Imgflip Template Cache (module scope) ──────────────────────────

let _templatesCache: MemeTemplate[] | null = null;

// ── Server Functions ───────────────────────────────────────────────

async function loadMemeTemplates(): Promise<MemeTemplate[]> {
    if (_templatesCache) return _templatesCache;

    try {
      const response = await fetch("https://api.imgflip.com/get_memes");
      if (!response.ok) {
        console.error("imgflip API error:", response.status);
        return [];
      }
      const json = (await response.json()) as {
        data?: { memes?: Array<{
          id: string;
          name: string;
          url: string;
          width: number;
          height: number;
        }> };
      };
      const memes = json?.data?.memes || [];
      _templatesCache = memes.map((m) => ({
        id: String(m.id),
        name: String(m.name),
        url: String(m.url),
        width: Number(m.width),
        height: Number(m.height),
      }));
      console.log(`[memeGenerator] Cached ${_templatesCache.length} imgflip templates`);
      return _templatesCache;
    } catch (e) {
      console.error("Failed to fetch imgflip templates:", e);
      return [];
    }
}

export const fetchMemeTemplates = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<MemeTemplate[]> => loadMemeTemplates(),
);

export const findTemplateImage = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { templateName: string };
  }): Promise<MemeTemplate | null> => {
    const templates = await loadMemeTemplates();
    if (!templates.length) return null;

    const name = data.templateName.toLowerCase().trim();
    if (!name) return null;

    // 1. Direct substring match (either direction)
    let match = templates.find(
      (t) =>
        t.name.toLowerCase().includes(name) ||
        name.includes(t.name.toLowerCase()),
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
  },
);

export const getRandomFact = createServerFn().middleware([requireAdmin]).handler(
  async ({ data }: { data: { category: string } }): Promise<string> => {
    const facts = getFacts();
    const categoryFacts = facts[data.category];
    if (!categoryFacts || categoryFacts.length === 0) {
      return "No facts available for this category.";
    }
    const idx = Math.floor(Math.random() * categoryFacts.length);
    return categoryFacts[idx];
  },
);

export const generateMemeConcepts = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { fact: string };
  }): Promise<MemeConcept[]> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not set");
      return [];
    }

    // Fetch real imgflip templates so Claude can suggest actual, varied templates
    const templates = await loadMemeTemplates();
    const templateNames = templates.map((t) => t.name).join(", ");

    const systemPrompt = `You are a D&D Dungeon Master who also happens to be a financial guide and licensed life insurance agent. Given a financial fact, generate 3 meme concepts. For each concept, suggest a popular meme template, the text overlay (top/bottom), and a social media caption. Make them funny, shareable, and D&D-themed where appropriate. Keep captions under 200 characters.

For each concept, pick a different template from the list below. Prioritize variety. Try to suggest templates that are not the most obvious or overused ones. Mix classic and less common templates.

Return your response as valid JSON only. No other text, no markdown fences. Use this exact structure:
{ "concepts": [ { "template": "Template Name", "topText": "Top text here", "bottomText": "Bottom text here", "caption": "Caption here under 200 chars" } ] }

Available meme templates (choose from these for variety. Avoid repeating the same ones across concepts):
${templateNames}`;

    try {
      console.log("[memeGenerator] Calling Anthropic API with key prefix:", apiKey.substring(0, 8) + "...");
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
          messages: [{ role: "user", content: data.fact }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}: ${errText}`,
        );
        return [];
      }

      const json = (await response.json()) as {
        content: Array<{ text: string }>;
      };
      const text = json.content?.[0]?.text || "";

      // Extract JSON from the response. It may be wrapped in markdown fences
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleaned) as { concepts: MemeConcept[] };
      return parsed.concepts || [];
    } catch (e) {
      console.error("Failed to generate meme concepts:", String(e), e instanceof Error ? e.stack : "");
      return [];
    }
  },
);

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
  // Add text_boxes column if table already existed without it
  await sql()`ALTER TABLE meme_concepts ADD COLUMN IF NOT EXISTS text_boxes TEXT`;
}

export const initMemesTable = createServerFn().middleware([requireAdmin]).handler(async () => {
  await ensureMemesTable();
  return { ok: true };
});

export const saveConcept = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: {
      fact: string;
      category: string;
      template: string;
      topText: string;
      bottomText: string;
      caption: string;
      platform?: string;
      isUsed?: boolean;
      isFavorite?: boolean;
      textBoxesJson?: string;
    };
  }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      // Ensure the table exists. The Forge tab may be the first thing used on a fresh DB
      await ensureMemesTable();
      const result = await sql()`
        INSERT INTO meme_concepts (fact, category, template, top_text, bottom_text, caption, platform, is_used, is_favorite, text_boxes)
        VALUES (${data.fact}, ${data.category}, ${data.template}, ${data.topText}, ${data.bottomText}, ${data.caption}, ${data.platform || ""}, ${data.isUsed || false}, ${data.isFavorite || false}, ${data.textBoxesJson || null})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

export const getSavedConcepts = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<SavedMemeConcept[]> => {
    const rows = await sql()`SELECT * FROM meme_concepts ORDER BY created_at DESC`;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      fact: String(r.fact ?? ""),
      category: String(r.category ?? ""),
      template: String(r.template ?? ""),
      top_text: String(r.top_text ?? ""),
      bottom_text: String(r.bottom_text ?? ""),
      caption: String(r.caption ?? ""),
      platform: String(r.platform ?? ""),
      is_used: Boolean(r.is_used),
      is_favorite: Boolean(r.is_favorite),
      text_boxes: r.text_boxes ? String(r.text_boxes) : null,
      created_at: String(r.created_at),
    })) as SavedMemeConcept[];
  },
);

export const updateConcept = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: {
      id: number;
      updates: {
        platform?: string;
        is_used?: boolean;
        is_favorite?: boolean;
        top_text?: string;
        bottom_text?: string;
        text_boxes?: string | null;
      };
    };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];

      if (data.updates.platform !== undefined) {
        sets.push("platform");
        params.push(data.updates.platform);
      }
      if (data.updates.is_used !== undefined) {
        sets.push("is_used");
        params.push(data.updates.is_used);
      }
      if (data.updates.is_favorite !== undefined) {
        sets.push("is_favorite");
        params.push(data.updates.is_favorite);
      }
      if (data.updates.top_text !== undefined) {
        sets.push("top_text");
        params.push(data.updates.top_text);
      }
      if (data.updates.bottom_text !== undefined) {
        sets.push("bottom_text");
        params.push(data.updates.bottom_text);
      }
      if (data.updates.text_boxes !== undefined) {
        sets.push("text_boxes");
        params.push(data.updates.text_boxes);
      }

      if (sets.length === 0) return { ok: true };

      // Build dynamic query since we don't know which fields to update
      const setClauses = sets.map((col, i) => col + " = $" + (i + 1));
      params.push(data.id);

      await sql().query(
        `UPDATE meme_concepts SET ${setClauses.join(", ")} WHERE id = ${
          params.length
        }`,
        params,
      );

      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

export const deleteConcept = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { id: number };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM meme_concepts WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);
