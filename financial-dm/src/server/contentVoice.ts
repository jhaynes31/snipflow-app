/**
 * The shared voice for every content generator (script, meme, carousel,
 * social card, and later b roll). Server only: these blocks are assembled
 * into the system prompt of each Anthropic call.
 *
 * Every generator composes its prompt as:
 *   buildVoiceBlock(...)   who is speaking, tone within that character,
 *                          optional D&D flavor, plain language rules
 *   + its own REQUIREMENTS the medium specific shape (script, slides, ...)
 *   + FORMATTING_RULES / HASHTAG_RULES / CAPTION_OPTIONS_RULES
 *   + the JSON shape it expects back
 *
 * Keeping the persona and the plain language rules in one place is what
 * makes the four tools sound like the same person.
 */

// ── Tones ──────────────────────────────────────────────────────────

export const TONES = ["Informative", "Warm", "Funny", "Mix / Surprise Me"] as const;
export type Tone = (typeof TONES)[number];
export const DEFAULT_TONE: Tone = "Mix / Surprise Me";

export type Medium =
  | "script"
  | "carousel"
  | "card"
  | "meme"
  | "shot list";

// ── Persona ────────────────────────────────────────────────────────

export const PERSONA_BLOCK = `WHO IS SPEAKING (this defines every word of the output):
John's on camera character is the keeper of a medieval tavern: a warm, welcoming bartender who is genuinely helpful and talks directly to the guests in front of him. Picture someone who leans on the bar, tells you something useful about money that you did not know, and actually wants you to be better off for having heard it. He is not a salesperson, not a lecturer, and not a hype account.

Write every line as that person speaking:
- Second person, directly to one viewer ("you", "your"), like a regular who just sat down at the bar.
- Warm and caring, never condescending, never scolding. Meet the viewer where they are.
- Informative first. The viewer must leave knowing something concrete they did not know before.
- The medieval flavor lives in the warmth, the hospitality, and the direct address, not in old fashioned words. Never use "thee", "thou", "hark", "ye", "prithee", "m'lord", or similar costume language. At most one light tavern touch per piece (a nod to the bar, the fire, pulling up a stool), and only where it feels natural. It must read like a real person, not a costume.
- Keep the character consistent from the first word to the last. The hook, the body, the call to action, any on screen text, the caption, and the hashtags all sound like the same bartender.`;

// ── Plain language ─────────────────────────────────────────────────

export const PLAIN_LANGUAGE_BLOCK = `PLAIN LANGUAGE (strict): The audience is future clients, not other agents.
- Avoid insurance and finance jargon. If a term such as rider, term versus whole life, beneficiary, premium, deductible, liquidity, allocation, or compound interest has to appear, make it understandable in the same breath with everyday words (for example "a rider, which is an optional add on to a policy").
- The test: someone with no financial background reads or hears it once and both understands it and sees why it matters to them personally.
- Prefer short, concrete sentences. Use real life situations (a paycheck, the rent, a kid's school year, leaving a job) over abstractions.
- No invented statistics, studies, or figures. Use the supporting fact as given and do not add numbers it does not contain.`;

// ── Tone within the character ─────────────────────────────────────

const TONE_WITHIN_CHARACTER: Record<Tone, string> = {
  Informative:
    "TONE: INFORMATIVE ONLY. The bartender in teaching mode. Clear, steady, confident. Lead with the fact and state it plainly up front, define every term the moment you use it, and explain the why behind the advice so the viewer follows the logic. Keep the delivery matter of fact and easy to follow. NO jokes, NO wisecracks, NO emotional appeals, NO reassurance passages. His natural friendliness shows only in the direct address and the patience of the explanation; the value here is clarity.",
  Warm:
    "TONE: WARM ONLY. The bartender at his most caring. Open by acknowledging how the viewer might feel about this topic and make them feel seen. Normalize the worry, reassure, and let a gentle, unhurried rhythm carry the piece. Frame the advice as looking out for them rather than instructing them. NO jokes, NO deadpan lines, NO lecture rhythm or teacher voice. Kindness first, and the invitation at the end is an act of care.",
  Funny:
    "TONE: FUNNY ONLY. The bartender with a dry sense of humor. Wry, deadpan observations about money and adult life, delivered flat and kind, as if the punchline is simply the honest truth. Undersell everything and let the understated lines land in every section, not just the opening. The joke is never the viewer, their situation, or anyone else. NO earnest reassurance passages and NO teacher style explaining; the real advice stays clear and correct underneath the dry coating, and the invitation at the end is sincere in the same deadpan voice.",
  "Mix / Surprise Me":
    "TONE: MIX. This is the ONLY tone that blends. Teach the key point clearly, care openly, and land a light, dry joke where it fits naturally. Move among those three so the piece feels human and varied, with the informative thread carrying the facts, the warmth carrying the connection, and the humor keeping it light.",
};

export function normalizeTone(raw: unknown): Tone {
  const s = String(raw ?? "").trim();
  return (TONES as readonly string[]).includes(s) ? (s as Tone) : DEFAULT_TONE;
}

export function toneBlock(tone: string): string {
  const t = normalizeTone(tone);
  const separation =
    t === "Mix / Surprise Me"
      ? ""
      : `
ONE TONE ONLY (strict): The selected tone is ${t}. Write the ENTIRE piece, every section, caption, and hashtag set, in that single tone. Do not blend in any other tone. Do not open informative, turn warm in the middle, and close with a joke. If a sentence would fit one of the other tones better, rewrite it in the selected tone or cut it. A reader should be able to name the tone from any sentence chosen at random.`;
  return `${TONE_WITHIN_CHARACTER[t]}${separation}
Tone is a variation within the character above, never a replacement for it. "Funny" means a funny bartender, "Informative" means a bartender who is explaining well. The persona (second person, plain language, genuinely helpful) must survive the tone from the first sentence to the last, and the tone itself must be unmistakable and consistent throughout.`;
}

// ── Optional D&D flavor ────────────────────────────────────────────

export function themeBlock(dndThemed: boolean, medium: Medium): string {
  const noun = medium === "shot list" ? "shot list and on screen text" : medium;
  return dndThemed
    ? `ADDITIONAL THEME: Give the ${noun} a light Dungeons & Dragons flavor. Use light fantasy wording and gaming metaphors (quests, saving throws, treasure, dice) in a warm, beginner friendly way, the way a bartender who also runs the game night would. The financial advice must stay honest and clear beneath the fantasy dressing, and the plain language rules still apply to every game term. Do not let the theme overshadow the useful information.`
    : `ADDITIONAL THEME: No fantasy or gaming framing beyond the bartender's natural warmth. Keep the focus squarely on practical, understandable financial and life planning advice.`;
}

// ── Assembled voice block ─────────────────────────────────────────

export function buildVoiceBlock(opts: {
  tone: string;
  dndThemed: boolean;
  medium: Medium;
}): string {
  return [
    PERSONA_BLOCK,
    toneBlock(opts.tone),
    themeBlock(opts.dndThemed, opts.medium),
    PLAIN_LANGUAGE_BLOCK,
  ].join("\n\n");
}

// ── Shared output rules ────────────────────────────────────────────

export const FORMATTING_RULES = `FORMATTING RULES (strict):
- Use no em dashes, no en dashes, and no hyphens anywhere. Write ranges and relations plainly, such as "10 to 20 years" or "one to two minutes". If a hyphen would normally appear in a word, rephrase to avoid it.
- Keep numbers and claims plain, honest, and accurate. Do not invent statistics or make up figures.
- Do not be pushy or use manufactured urgency. Any call to action or invitation is friendly and optional.`;

export const HASHTAG_RULES = `HASHTAGS (required): Generate 6 to 10 relevant hashtags that match the specific topic, pain point, and tone. Mix broad, high reach tags (such as #FinancialLiteracy) with niche ones specific to the topic. Each hashtag must be a single word with a leading # and no spaces, no punctuation, and no dashes or hyphens (for example #FinancialLiteracy, not #Financial Literacy).`;

export const CAPTION_OPTIONS_RULES = `CAPTION OPTIONS (required): Write 3 different caption options for the post, each its own copy in the bartender's voice.
- Each caption expands on what the viewer learns or gains; it does not restate the hook, headline, or opening line.
- Keep the FIRST LINE of each caption UNDER 10 WORDS (platforms truncate after about one line), then put a line break.
- Vary the angle across the three options (for example one leads with the pain point, one with the useful takeaway, one with a question to the viewer).
- Each ends with a light, optional invitation to book a free call with John, a licensed life insurance agent, for example to review coverage or ask a money question.`;

export const VARIETY_RULES = `VARIETY (important): Every generation must feel fresh. Vary the opening, choose a different analogy, example, or angle, and do not repeat formulas from earlier drafts. Avoid cliches and generic filler.`;

// ── Text cleanup helpers ───────────────────────────────────────────

/** Defensively strip em dashes, en dashes, and hyphens from displayed text. */
export function cleanText(s: unknown): string {
  return String(s ?? "")
    .replace(/[—–-]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Clean a raw hashtag into a single #Word string. */
export function cleanHashtag(raw: unknown): string {
  if (!raw) return "";
  let tag = String(raw).trim().replace(/[—–-]/g, "").replace(/\s+/g, "");
  tag = tag.replace(/[^#\w]/g, "");
  tag = tag.replace(/^#+/, "#");
  if (!tag.startsWith("#")) tag = `#${tag}`;
  if (tag === "#") return "";
  return tag;
}

export function normalizeHashtags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const cleaned = cleanHashtag(item);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 10);
}

/** Normalize a list of caption options: cleaned, non empty, de duplicated, max 3. */
export function normalizeCaptions(raw: unknown, fallback?: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const c = cleanText(item);
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length === 3) break;
  }
  if (out.length === 0) {
    const fb = cleanText(fallback);
    if (fb) out.push(fb);
  }
  return out;
}

// ── Anthropic call ─────────────────────────────────────────────────

export const CONTENT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Call the Anthropic Messages API with a system prompt and one user message
 * and return the text of the first content block, or null when the key is
 * missing or the request fails. The API key is read from the server
 * environment and never leaves this module.
 */
export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens: number;
  tag: string;
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(`[${opts.tag}] ANTHROPIC_API_KEY not set`);
    return null;
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CONTENT_MODEL,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `[${opts.tag}] Anthropic API error: ${response.status} ${response.statusText}: ${errText}`,
      );
      return null;
    }
    const json = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = json.content?.find((c) => typeof c.text === "string")?.text;
    return text ?? "";
  } catch (e) {
    console.error(`[${opts.tag}] request failed:`, String(e));
    return null;
  }
}

/**
 * Parse the model's JSON reply. Tolerates markdown fences and any stray text
 * before or after the JSON object/array.
 */
export function parseJsonReply<T>(text: string | null, tag: string): T | null {
  if (text == null) return null;
  let cleaned = String(text).trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to the first balanced looking JSON block in the reply.
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    console.error(`[${tag}] Failed to parse AI JSON:`, cleaned.slice(0, 300));
    return null;
  }
}
