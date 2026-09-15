import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import {
  CAPTION_OPTIONS_RULES,
  CTA_OPTIONS_RULES,
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
import { statFactFor, topicPromptLines, type TopicSelection } from "./topics";
import { campaignPromptBlock } from "~/server/campaign";
import { ensureCtaLine, type CampaignContext } from "~/lib/campaign";


// Topic rolling lives in ./topics; keep the old names importable.
export { getRandomTopics as getRandomSocialTopics, type TopicPick } from "./topics";

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
  painPoint?: string;
  format: SocialCardFormat;
  headline: string;
  body: string;
  punchline: string;
}

export interface SocialCardGenerateInput {
  format: SocialCardFormat;
  tone: string;
  dndThemed: boolean;
  /** One card per selection (up to three). */
  topics: TopicSelection[];
  /** Optional campaign brief context (Quest Board). Without it nothing changes. */
  campaign?: CampaignContext;
}

/** A generated batch: the cards plus a shared caption and hashtag set. */
export interface SocialCardBatchResult {
  cards: SocialCard[];
  caption: string;
  captions: string[];
  hashtags: string[];
  /** The chosen call to action line, or "" when John leaves it out. */
  callToAction: string;
  /** 2 to 3 call to action options. */
  callToActions: string[];
  /** One optional call to action card per option, in the same order, ready to sit at the end of the batch. */
  ctaCards: SocialCard[];
}

export interface SavedSocialCardBatch {
  id: number;
  format: SocialCardFormat;
  tone: string;
  dndThemed: boolean;
  caption: string;
  hashtags: string[];
  cards: SocialCard[];
  /** Backdrop and border chosen in the forge; the library shows and re edits them. */
  themeBackground?: string;
  themeBorder?: string;
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
 * Truncate a string to `cap` characters at a word boundary so a cut off
 * sentence ends on a whole word (plus a clean ellipsis) instead of slicing
 * a word in half. Strings already within the cap are returned untouched.
 */
function capText(s: string, cap: number): string {
  if (!s) return s;
  if (s.length <= cap) return s;
  let cut = s.slice(0, cap);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > cap * 0.5) cut = cut.slice(0, lastSpace);
  return cut.replace(/\s+$/, "") + "…";
}

// ── Prompt ─────────────────────────────────────────────────────────

function buildSocialCardSystemPrompt(
  format: SocialCardFormat,
  tone: string,
  dndThemed: boolean,
): string {
  const formatGuidance =
    format === "trap"
      ? `FORMAT (Trap or Treasure): Each card boldly presents a common financial myth or false belief and then busts it with the truth. Write:
- headline: the MYTH, a common false belief people hold, stated as the trap. Tie it to the card's pain point so the viewer recognizes their own thinking. Make it bold and attention grabbing.
- body: the TRUTH, the clear fact that busts the myth, drawn directly from the supporting fact. State it plainly and confidently, in words anyone can follow.
- punchline: a short, satisfying closing line that lands the point, the way the bartender would send you off.
Keep the myth and the truth each short enough to fit a square social card.

LENGTH CAPS (strict, the card is a fixed square and MUST never overflow):
- headline: at most 90 characters.
- body (the truth/fact): at most 200 characters. This is the single most important cap, keep the truth under 200 characters.
- punchline: at most 60 characters.`
      : `FORMAT (Stat Card): Each card features ONE striking, verified financial statistic, big and bold. Every card comes with a "Statistic to feature" line; that line is the ONLY source of numbers. Write:
- headline: that statistic as one bold line that LEADS with the number (for example "1 in 3 adults could not cover a $400 surprise" or "$100 a paycheck is $2,400 a year"). Keep every figure exactly as written in the statistic line. Never invent, round, convert, or add a number, a year, or a source that is not in that line.
- body: a short supporting sentence (10 to 20 words) that explains why that number matters to someone in the card's pain point situation.
- punchline: a short, brand relevant kicker that ties the stat to everyday life.
If a card's statistic line says none is verified, write the headline as a bold one line claim drawn exactly from the supporting fact, with no numbers at all.

LENGTH CAPS (strict, the card is a fixed square and MUST never overflow):
- headline: at most 90 characters.
- body: at most 200 characters.
- punchline: at most 60 characters.`;

  return `You are writing square, share ready social cards for John, a licensed life insurance agent and the creator of the brand "The Financial DM" (Foster Financial Group). Every word on the cards, in the caption, and in the hashtags is written by the character described below, and card text is what a viewer reads on a phone in a few seconds.

${buildVoiceBlock({ tone, dndThemed, medium: "card" })}

${formatGuidance}

Write one card per topic supplied (in the same order), each speaking to that card's own pain point. The cards must NOT carry the call to action; that is chosen separately and John may leave it out.

${CTA_OPTIONS_RULES}
Also write one CALL TO ACTION CARD per option, in the same order, in a "ctaCards" array using the card shape: headline is the invitation as a warm question or nudge (at most 90 characters), body is the option's line (at most 200 characters), punchline is a short kicker (at most 60 characters). John can add the chosen one as the last card of the batch.

${CAPTION_OPTIONS_RULES}
The captions cover the whole batch of cards as one post.

${HASHTAG_RULES}

${VARIETY_RULES} Make each card feel fresh and distinct from the others.

${FORMATTING_RULES}

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "cards": [ { "headline": "Bold headline here", "body": "Supporting line here", "punchline": "Short kicker here" }, { "headline": "...", "body": "...", "punchline": "..." } ], "callToActions": ["Call to action option one", "Call to action option two", "Call to action option three"], "ctaCards": [ { "headline": "Inviting question", "body": "Call to action option one", "punchline": "Short kicker" }, { "headline": "...", "body": "Call to action option two", "punchline": "..." }, { "headline": "...", "body": "Call to action option three", "punchline": "..." } ], "captions": ["Caption option one", "Caption option two", "Caption option three"], "hashtags": ["#HashtagOne", "#HashtagTwo", "#HashtagThree"] }`;
}

// ── Server Functions ───────────────────────────────────────────────

export const generateSocialCards = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: SocialCardGenerateInput) => d)
  .handler(async ({ data }): Promise<SocialCardBatchResult | null> => {
    const topics = Array.isArray(data.topics) ? data.topics.slice(0, 3) : [];
    if (topics.length === 0) return null;
    const tone = normalizeTone(data.tone);
    const format: SocialCardFormat = data.format === "stat" ? "stat" : "trap";
    // Stat Cards lead with a real number. Most rolled facts are descriptive,
    // so each card gets a verified statistic for its topic (see topics.ts).
    const stats = topics.map((t) => (format === "stat" ? statFactFor(t.topic, t.fact) : null));
    const user = topics
      .map((t, i) => {
        const lines = [`Card ${i + 1}`, topicPromptLines(t)];
        if (format === "stat") {
          lines.push(
            stats[i]
              ? `Statistic to feature (verified; use these figures exactly as written): ${stats[i]}`
              : "Statistic to feature: none is verified for this topic, so state the supporting fact as a bold claim with no numbers",
          );
        }
        return lines.join("\n");
      })
      .join("\n\n") + (data.campaign ? "\n\n" + campaignPromptBlock(data.campaign, "card") : "");

    const text = await callClaude({
      tag: "socialCardGenerator",
      system: buildSocialCardSystemPrompt(format, tone, Boolean(data.dndThemed)),
      user,
      maxTokens: 2048,
    });
    const parsed = parseJsonReply<
      | {
          cards?: Array<{ headline?: unknown; body?: unknown; punchline?: unknown }>;
          captions?: unknown;
          caption?: unknown;
          hashtags?: unknown;
          callToActions?: unknown;
          callToAction?: unknown;
          ctaCards?: Array<{ headline?: unknown; body?: unknown; punchline?: unknown }>;
        }
      | Array<{ headline?: unknown; body?: unknown; punchline?: unknown }>
    >(text, "socialCardGenerator");
    if (!parsed) return null;

    // Accept both the new object shape and the older bare array shape.
    const rawCards = Array.isArray(parsed) ? parsed : parsed.cards;
    const list = Array.isArray(rawCards) ? rawCards : [];
    const cards: SocialCard[] = [];
    for (let i = 0; i < topics.length; i++) {
      const raw = list[i];
      const t = topics[i];
      if (!raw || typeof raw !== "object") continue;
      const headline = capText(cleanText(raw.headline), CARD_CAPS.headline);
      const body = capText(cleanText(raw.body), CARD_CAPS.body);
      const punchline = capText(cleanText(raw.punchline), CARD_CAPS.punchline);
      if (!headline && !body) continue;
      cards.push({
        topic: cleanText(t.topic),
        fact: cleanText(stats[i] ?? t.fact),
        painPoint: cleanText(t.painPoint),
        format,
        headline,
        body,
        punchline,
      });
    }
    // Always return exactly one card per supplied topic, filling any gap
    // with the underlying fact so the template is never empty.
    while (cards.length < topics.length) {
      const t = topics[cards.length];
      const shown = stats[cards.length] ?? t.fact;
      cards.push({
        topic: cleanText(t.topic),
        fact: cleanText(shown),
        painPoint: cleanText(t.painPoint),
        format,
        headline: capText(cleanText(shown || "Know your numbers."), CARD_CAPS.headline),
        body: "A plan built on real numbers beats guessing every time.",
        punchline: "Pull up a stool. The Financial DM has you.",
      });
    }
    const captions = Array.isArray(parsed)
      ? []
      : normalizeCaptions(parsed.captions, parsed.caption).map((x) => ensureCtaLine(x, data.campaign));
    const hashtags = Array.isArray(parsed) ? [] : normalizeHashtags(parsed.hashtags);
    // Call to action options, each with a card John can add at the end of the batch.
    const rawCtaCards = !Array.isArray(parsed) && Array.isArray(parsed.ctaCards) ? parsed.ctaCards : [];
    const callToActions = Array.isArray(parsed) ? [] : normalizeCaptions(parsed.callToActions, parsed.callToAction).map((x) => ensureCtaLine(x, data.campaign));
    const ctaCards: SocialCard[] = callToActions.map((line, i) => {
      const raw = rawCtaCards[i];
      const body = capText(ensureCtaLine(cleanText(raw?.body) || line, data.campaign), CARD_CAPS.body);
      return {
        topic: "Call to action",
        fact: "",
        painPoint: "",
        format,
        headline: capText(cleanText(raw?.headline) || "Want a straight answer?", CARD_CAPS.headline),
        body,
        punchline: capText(cleanText(raw?.punchline) || "Pull up a stool. The Financial DM has you.", CARD_CAPS.punchline),
      };
    });
    return { cards, caption: captions[0] ?? "", captions, hashtags, callToAction: callToActions[0] ?? "", callToActions, ctaCards };
  });

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
  await sql()`ALTER TABLE social_cards ADD COLUMN IF NOT EXISTS caption TEXT`;
  await sql()`ALTER TABLE social_cards ADD COLUMN IF NOT EXISTS hashtags TEXT`;
  await sql()`ALTER TABLE social_cards ADD COLUMN IF NOT EXISTS theme_background TEXT`;
  await sql()`ALTER TABLE social_cards ADD COLUMN IF NOT EXISTS theme_border TEXT`;
}

export const initSocialCardsTable = createServerFn()
  .middleware([requireAdmin])
  .handler(async () => {
    await ensureSocialCardsTable();
    return { ok: true };
  });

export interface SaveSocialCardsInput {
  format: SocialCardFormat;
  tone: string;
  dndThemed: boolean;
  caption: string;
  hashtags: string[];
  cards: SocialCard[];
  themeBackground?: string;
  themeBorder?: string;
}

const themeId = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 60) : null);

export const saveSocialCards = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: SaveSocialCardsInput) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureSocialCardsTable();
      const result = await sql()`
        INSERT INTO social_cards (format, tone, dnd_themed, cards, caption, hashtags, theme_background, theme_border)
        VALUES (${data.format}, ${data.tone}, ${data.dndThemed}, ${JSON.stringify(
          data.cards,
        )}, ${data.caption || ""}, ${(data.hashtags || []).join(" ")}, ${themeId(data.themeBackground)}, ${themeId(data.themeBorder)})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const getSavedSocialCards = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<SavedSocialCardBatch[]> => {
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
        format: (String(r.format ?? "stat") === "trap" ? "trap" : "stat") as SocialCardFormat,
        tone: String(r.tone ?? ""),
        dndThemed: Boolean(r.dnd_themed),
        caption: String(r.caption ?? ""),
        hashtags: (String(r.hashtags ?? "") || "").split(/\s+/).filter(Boolean),
        cards,
        themeBackground: themeId(r.theme_background) ?? undefined,
        themeBorder: themeId(r.theme_border) ?? undefined,
        createdAt: String(r.created_at),
      };
    });
  });

/** Update the edited cards of a saved batch, and its backdrop and border when given (used by inline editing). */
export const updateSocialCards = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; cards: SocialCard[]; themeBackground?: string; themeBorder?: string; style?: boolean }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureSocialCardsTable();
      if (data.style) {
        await sql()`UPDATE social_cards SET cards = ${JSON.stringify(data.cards)}, theme_background = ${themeId(data.themeBackground)}, theme_border = ${themeId(data.themeBorder)} WHERE id = ${data.id}`;
        return { ok: true };
      }
      await sql()`UPDATE social_cards SET cards = ${JSON.stringify(
        data.cards,
      )} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteSocialCards = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM social_cards WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
