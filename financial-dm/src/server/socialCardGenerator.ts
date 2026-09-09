import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { FACTS } from "./seed-facts";
import { EXTRA_TOPICS } from "./scriptGenerator";

// ── Types ──────────────────────────────────────────────────────────
export type SocialCardFormat = "trap" | "stat";

/**
 * A single share ready social card. Both formats share the same four
 * editable text fields; the renderer arranges them differently based on
 * `format`. `headline` is the myth (trap) or the bold stat (stat); `body`
 * is the truth (trap) or the supporting sentence (stat); `punchline` is a
 * short closing kicker.
 */
export interface SocialCard {
  topic: string;
  fact: string;
  format: SocialCardFormat;
  headline: string;
  body: string;
  punchline: string;
}

export interface TopicPick {
  topic: string;
  fact: string;
}

export interface SocialCardGenerateInput {
  format: SocialCardFormat;
  tone: string;
  dndThemed: boolean;
  topics: TopicPick[];
}

export interface SavedSocialCardBatch {
  id: number;
  format: SocialCardFormat;
  tone: string;
  dndThemed: boolean;
  cards: SocialCard[];
  createdAt: string;
}

// ── Character caps ─────────────────────────────────────────────────
// The card is a fixed 1:1 square, so every text field is hard capped at
// generation so the whole content block ALWAYS fits within the frame.
// `body` is the truth/fact and the owner's explicit recommendation is 200.
export const CARD_CAPS = {
  headline: 90,
  body: 200,
  punchline: 60,
} as const;

/**
 * Truncate a string to `cap` characters at a word boundary so a cut-off
 * sentence ends on a whole word (plus a clean ellipsis) instead of slicing
 * a word in half. Strings already within the cap are returned untouched.
 */
function capText(s: string, cap: number): string {
  if (!s) return s;
  if (s.length <= cap) return s;
  let cut = s.slice(0, cap);
  const lastSpace = cut.lastIndexOf(" ");
  // Only back up if it lands on a real word boundary reasonably late in the
  // string, otherwise accept the hard cut (very long unbroken token).
  if (lastSpace > cap * 0.5) cut = cut.slice(0, lastSpace);
  return cut.replace(/\s+$/, "") + "…";
}

// ── Topic pool ─────────────────────────────────────────────────────
// Reuses the exact same pool as the script and carousel generators.
function buildSocialCardPool(): TopicPick[] {
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

/** Pick three distinct TopicPick entries from the pool. */
export const getRandomSocialTopics = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<TopicPick[]> => {
    const pool = buildSocialCardPool();
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

// The exact same four tone voices as the script and carousel generators.
const TONE_GUIDANCE: Record<string, string> = {
  Informative:
    "WRITE EACH CARD AS A CRISP, CONFIDENT TEACHER EXPLAINER. Lead with the claim and state it clearly up front. Define every term in plain words the moment you use it. Use short, direct sentences in a steady, credible rhythm. Explain the why so the viewer understands the logic. Keep the delivery matter of fact, assured, and easy to follow. Skip jokes, charm, and emotional appeals.",
  Warm:
    "WRITE EACH CARD AS A TRUSTED FRIEND TALKING ONE ON ONE. Open with empathy, acknowledge how the viewer might feel about the topic, and make them feel seen. Use the word you often and speak directly to them. Reassure and comfort, normalize their worries, and let a gentle, unhurried rhythm carry the card. Kindness comes first. Frame the advice as support and care rather than instruction.",
  Funny:
    "WRITE EACH CARD AS DEADPAN, DRY, AND SLIGHTLY DARK SELF AWARE HUMOR. Say bleak or wry truths about money and adulthood in a completely flat, matter of fact, unbothered delivery, as if the punchline is simply the reality itself. Undersell everything. Keep an even, steady rhythm with sudden understated punchlines that land because of what is left unsaid. Be wry but never mean toward the viewer, their situation, or anyone else. Keep the real advice clear and correct beneath the dry coating.",
  "Mix / Surprise Me":
    "WRITE EACH CARD WITH A WARM, PLAYFUL, UNHURRIED VOICE THAT FEELS LIKE A KNOWING FRIEND AND A CLEVER TEACHER AT ONCE. Be approachable and a little witty, use plain conversational words, keep the rhythm steady, and make the reader feel smarter by the end. Never be pushy or preachy.",
};

function buildSocialCardSystemPrompt(
  format: SocialCardFormat,
  tone: string,
  dndThemed: boolean,
): string {
  const theme = dndThemed
    ? `ADDITIONAL THEME: Set the cards in a light Dungeons & Dragons flavor. Use light fantasy wording and gaming metaphors (such as quests, saving throws, treasure, and dice) in a warm, beginner friendly way. The financial advice must stay honest and clear beneath the fantasy dressing.`
    : `ADDITIONAL THEME: Use plain, every day language with no fantasy or gaming framing. Keep the focus squarely on practical, understandable financial advice.`;

  const formatGuidance =
    format === "trap"
      ? `FORMAT (Trap or Treasure): Each card boldly presents a common financial myth or false belief and then busts it with the truth. Write:
- headline: the MYTH, a common false belief people hold, stated as the trap. Make it bold and attention grabbing.
- body: the TRUTH, the clear fact that busts the myth, drawn directly from the supporting fact. State it plainly and confidently.
- punchline: a short, satisfying closing line that lands the point like a Dungeon Master rewarding the party.
Keep the myth and the truth each short enough to fit a square social card.

LENGTH CAPS (strict, the card is a fixed square and MUST never overflow):
- headline: at most 90 characters.
- body (the truth/fact): at most 200 characters. This is the single most important cap, keep the truth under 200 characters.
- punchline: at most 60 characters.`
      : `FORMAT (Stat Card): Each card features ONE striking financial statistic or fact from the supporting fact, big and bold. Write:
- headline: the ONE bold statistic or fact, presented big and striking. If the supporting fact is qualitative rather than numeric, turn it into a bold, direct one line claim drawn exactly from that fact. Do not invent numbers.
- body: a short supporting sentence (10 to 20 words) that explains or grounds the headline.
- punchline: a short, brand relevant kicker that ties the stat to everyday life.

LENGTH CAPS (strict, the card is a fixed square and MUST never overflow):
- headline: at most 90 characters.
- body: at most 200 characters.
- punchline: at most 60 characters.`;

  return `You are a financial content creator helping John, a licensed life insurance agent and the creator of the brand "The Financial DM" (Foster Financial Group). John needs three square, share ready social cards for his social channels.

TONE (strict): Write ALL cards in the selected tone below. The tone must be unmistakable and consistent across every card.
${TONE_GUIDANCE[tone] ?? TONE_GUIDANCE["Mix / Surprise Me"]}
${theme}
${formatGuidance}
VARIETY (important): Make each of the three cards feel fresh and distinct from the others. Vary the opening and the angle. Avoid cliches and generic filler.

FORMATTING RULES (strict):
- Use no em dashes, no en dashes, and no hyphens anywhere. Write ranges and relations plainly, such as "10 to 20 years" or "one to two minutes". If a hyphen would normally appear in a word, rephrase to avoid it.
- Keep numbers and claims plain, honest, and accurate. Do not invent statistics or make up figures.
- Do not be pushy or use manufactured urgency.

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape, an array with one object per card (one for each of the three topics supplied):
[ { "headline": "Bold headline here", "body": "Supporting line here", "punchline": "Short kicker here" }, { "headline": "...", "body": "...", "punchline": "..." }, { "headline": "...", "body": "...", "punchline": "..." } ]`;
}

/** Defensively strip em dashes, en dashes, and hyphens from displayed text. */
function cleanText(s: string): string {
  return (s || "").replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
}

export const generateSocialCards = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: SocialCardGenerateInput;
  }): Promise<SocialCard[] | null> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[socialCardGenerator] ANTHROPIC_API_KEY not set");
      return null;
    }
    const topics = Array.isArray(data.topics) ? data.topics.slice(0, 3) : [];
    if (topics.length === 0) return null;
    const systemPrompt = buildSocialCardSystemPrompt(
      data.format,
      data.tone,
      data.dndThemed,
    );
    const userContent = topics
      .map(
        (t, i) =>
          `Card ${i + 1}\nTopic: ${t.topic}\nSupporting fact: ${t.fact}`,
      )
      .join("\n\n");
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
          `[socialCardGenerator] Anthropic API error: ${response.status} ${response.statusText}: ${errText}`,
        );
        return null;
      }
      const json = (await response.json()) as {
        content: Array<{ text: string }>;
      };
      const text = json.content?.[0]?.text || "";
      let cleaned = String(text).trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "");
      }
      let parsed: Array<{
        headline?: unknown;
        body?: unknown;
        punchline?: unknown;
      }>;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error(
          "[socialCardGenerator] Failed to parse AI JSON:",
          String(parseErr),
        );
        return null;
      }
      if (!Array.isArray(parsed)) return null;
      const cards: SocialCard[] = [];
      for (let i = 0; i < topics.length; i++) {
        const raw = parsed[i];
        const t = topics[i];
        if (!raw || typeof raw !== "object") continue;
        const headline = capText(
          cleanText(String(raw.headline ?? "")),
          CARD_CAPS.headline,
        );
        const body = capText(
          cleanText(String(raw.body ?? "")),
          CARD_CAPS.body,
        );
        const punchline = capText(
          cleanText(String(raw.punchline ?? "")),
          CARD_CAPS.punchline,
        );
        if (!headline && !body) continue;
        cards.push({
          topic: cleanText(t.topic),
          fact: cleanText(t.fact),
          format: data.format,
          headline,
          body,
          punchline,
        });
      }
      // Always return exactly one card per supplied topic, filling any gap
      // with the underlying fact so the template is never empty.
      while (cards.length < topics.length) {
        const t = topics[cards.length];
        cards.push({
          topic: cleanText(t.topic),
          fact: cleanText(t.fact),
          format: data.format,
          headline: capText(
            cleanText(t.fact || "Know your numbers."),
            CARD_CAPS.headline,
          ),
          body: "A plan built on real numbers beats guessing every time.",
          punchline: "Roll for wisdom with The Financial DM.",
        });
      }
      return cards;
    } catch (e) {
      console.error(
        "[socialCardGenerator] Failed to generate cards:",
        String(e),
        e instanceof Error ? e.stack : "",
      );
      return null;
    }
  },
);

// ── Saved library (database) ───────────────────────────────────────
async function ensureSocialCardsTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS social_cards (
      id SERIAL PRIMARY KEY,
      format TEXT NOT NULL,
      tone TEXT,
      dnd_themed BOOLEAN DEFAULT FALSE,
      cards TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export const initSocialCardsTable = createServerFn().middleware([requireAdmin]).handler(async () => {
  await ensureSocialCardsTable();
  return { ok: true };
});

export const saveSocialCards = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: {
      format: SocialCardFormat;
      tone: string;
      dndThemed: boolean;
      cards: SocialCard[];
    };
  }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureSocialCardsTable();
      const result = await sql()`
        INSERT INTO social_cards (format, tone, dnd_themed, cards)
        VALUES (${data.format}, ${data.tone}, ${data.dndThemed}, ${JSON.stringify(
          data.cards,
        )})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

export const getSavedSocialCards = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<SavedSocialCardBatch[]> => {
    await ensureSocialCardsTable();
    const rows = await sql()`
      SELECT * FROM social_cards ORDER BY created_at DESC
    `;
    return rows.map((r: Record<string, unknown>) => {
      let cards: SocialCard[] = [];
      try {
        const parsed = JSON.parse(String(r.cards ?? "[]"));
        if (Array.isArray(parsed)) cards = parsed as SocialCard[];
      } catch {
        cards = [];
      }
      return {
        id: Number(r.id),
        format: String(r.format ?? "stat") as SocialCardFormat,
        tone: String(r.tone ?? ""),
        dndThemed: Boolean(r.dnd_themed),
        cards,
        createdAt: String(r.created_at),
      };
    }) as SavedSocialCardBatch[];
  },
);

/** Update the edited cards of a saved batch (used by inline editing). */
export const updateSocialCards = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { id: number; cards: SocialCard[] };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureSocialCardsTable();
      await sql()`UPDATE social_cards SET cards = ${JSON.stringify(
        data.cards,
      )} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

export const deleteSocialCards = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { id: number };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM social_cards WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);
