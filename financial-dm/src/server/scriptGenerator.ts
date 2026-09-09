import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { FACTS } from "./seed-facts";

// ── Types ──────────────────────────────────────────────────────────

export interface TopicPick {
  topic: string;
  fact: string;
}

export interface ScriptInput {
  topic: string;
  fact: string;
  tone: string;
  dndThemed: boolean;
  hookType: string;
  targetViewer: string;
  payoff: string;
  abTest: boolean;
}

export interface ScriptResult {
  topic: string;
  fact: string;
  tone: string;
  dndThemed: boolean;
  hookType: string;
  targetViewer: string;
  payoff: string;
  title: string;
  hook: string;
  script: string;
  callToAction: string;
  caption: string;
  hashtags: string[];
  /** Second hook variant, present only when abTest was on. */
  hookB?: string;
  /** Mechanism used for the second hook variant. */
  hookBType?: string;
}

export interface SavedScript {
  id: number;
  title: string;
  hook: string;
  script: string;
  callToAction: string;
  caption: string;
  hashtags: string[];
  topic: string;
  tone: string;
  dndThemed: boolean;
  fact: string;
  kind: "script";
  hookType: string;
  targetViewer: string;
  payoff: string;
  createdAt: string;
}

// ── Hook mechanism helpers ────────────────────────────────────────
// Canonical values are stored in the DB. Labels are for display only.

export const HOOK_TYPE_VALUES = [
  "curiosity_gap",
  "direct_callout",
  "contrarian",
  "number_specific",
  "mix",
] as const;

export const HOOK_TYPE_LABELS: Record<string, string> = {
  curiosity_gap: "Curiosity Gap",
  direct_callout: "Direct Callout",
  contrarian: "Contrarian",
  number_specific: "Number Specific",
  mix: "Mix",
};

/** Normalize a raw hook type string to a canonical value (or empty). */
export function normalizeHookType(raw: unknown): string {
  const v = String(raw ?? "").trim().toLowerCase();
  return (HOOK_TYPE_VALUES as readonly string[]).includes(v) ? v : "";
}

// ── Curated extra life-planning topics ────────────────────────────
// Plain language, accurate, factual. No invented statistics, no em
// dashes or hyphens. These complement the FACTS seed bank below so the
// topic pool spans saving, budgeting, retirement, riders, home buying,
// taxes, estate planning, and life-planning areas like career/family.

export const EXTRA_TOPICS: TopicPick[] = [
  {
    topic: "Saving",
    fact:
      "Saving a little from each paycheck, even a small amount, builds a cushion over time.",
  },
  {
    topic: "Budgeting",
    fact:
      "A simple budget tracks what you earn and what you spend each month so you can see where your money really goes.",
  },
  {
    topic: "Emergency Fund",
    fact:
      "An emergency fund of three to six months of living expenses can cover surprise costs without turning to credit cards.",
  },
  {
    topic: "Retirement Planning",
    fact:
      "Money held in a retirement account has time to grow, and starting even a few years earlier can make a meaningful difference.",
  },
  {
    topic: "Life Insurance Riders",
    fact:
      "Riders are optional add ons that customize a life insurance policy, such as converting it later or waiving premiums if you become disabled.",
  },
  {
    topic: "Home Buying",
    fact:
      "Buying a home usually involves a down payment, closing costs, and ongoing costs like property taxes and maintenance.",
  },
  {
    topic: "Taxes",
    fact:
      "Contributing to tax advantaged accounts can lower your taxable income for the year.",
  },
  {
    topic: "Estate Planning",
    fact:
      "Estate planning is about making sure your money and belongings pass to the people you intend, in the way you intend.",
  },
  {
    topic: "Beneficiaries",
    fact:
      "Naming a beneficiary on a policy or account helps that money pass directly to the right person.",
  },
  {
    topic: "Career Planning",
    fact:
      "A clear career goal paired with a realistic savings plan can guide both your income and your lifestyle choices.",
  },
  {
    topic: "Family and Kids",
    fact:
      "Having kids changes your financial picture, from child care and education costs to the need for life insurance and college savings.",
  },
  {
    topic: "College Savings",
    fact:
      "Saving for education through a dedicated college account can grow money in a tax advantaged way.",
  },
  {
    topic: "Health Coverage",
    fact:
      "Having health coverage protects you from large medical bills and can make routine care more affordable.",
  },
  {
    topic: "Disability Protection",
    fact:
      "Disability insurance replaces part of your income if you cannot work due to illness or injury.",
  },
  {
    topic: "Financial Goals",
    fact:
      "Writing down a specific financial goal with a realistic timeline makes it easier to stay motivated and on track.",
  },
  {
    topic: "Net Worth",
    fact:
      "Your net worth is what you own minus what you owe, and it rises as you pay down debt and grow your savings.",
  },
  {
    topic: "Paying Yourself First",
    fact:
      "Putting a set amount into savings the moment you get paid makes saving automatic instead of optional.",
  },
  {
    topic: "Wills and Trusts",
    fact:
      "A will states who should receive your assets, while a trust can add control over how and when they receive them.",
  },
  {
    topic: "Life Insurance Amounts",
    fact:
      "A common rule of thumb is coverage worth 10 to 12 times your annual income to protect the people who depend on you.",
  },
  {
    topic: "Building Credit",
    fact:
      "A good credit history can help you qualify for lower rates on loans, and it takes time and consistent payments to build.",
  },
  {
    topic: "Renting vs Buying",
    fact:
      "Whether to rent or buy a home depends on your timeline, your budget, and how long you plan to stay in one place.",
  },
  {
    topic: "Financial Literacy",
    fact:
      "Understanding the basics of income, spending, saving, and investing helps you make confident money decisions.",
  },
  {
    topic: "Healthcare Directives",
    fact:
      "A healthcare directive names someone to make medical decisions for you if you cannot speak for yourself.",
  },
  {
    topic: "Compound Growth",
    fact:
      "Compound growth means you earn returns not just on what you put in, but on the returns you already earned.",
  },
  {
    topic: "Life Changes",
    fact:
      "Major life events like a marriage, a new baby, or a new home are good times to review your insurance and estate plans.",
  },
  {
    topic: "Talking to Family About Money",
    fact:
      "Open conversations with family about money and life insurance help everyone plan and reduce surprises later.",
  },
  {
    topic: "Savings & CDs",
    fact:
      "A certificate of deposit, or CD, locks your money in for a set term and typically pays a fixed interest rate, with a penalty for early withdrawal.",
  },
  {
    topic: "Savings & CDs",
    fact:
      "A high yield savings account is a savings or money market account that pays a higher interest rate than a typical brick and mortar savings account, often with no fixed term.",
  },
  {
    topic: "Savings & CDs",
    fact:
      "A money market account or money market fund can offer a higher rate than a standard savings account, often with check writing or debit card access.",
  },
  {
    topic: "Savings & CDs",
    fact:
      "A Treasury bill, or T bill, is a short term government debt with maturities of one year or less, bought at a discount and paid at full face value at maturity.",
  },
  {
    topic: "Savings & CDs",
    fact:
      "I bonds are US savings bonds whose interest rate adjusts for inflation, making them a way to protect savings from inflation over time.",
  },
  {
    topic: "Savings & CDs",
    fact:
      "Short term savings are a good fit for money you may need within a few years, since the balance is not tied to stock market ups and downs.",
  },
];

// ── Topic pool ─────────────────────────────────────────────────────
// Reuses the FACTS seed bank (Insurance, Investments, Debt, Financial
// Freedom) and adds the curated life-planning topics above.

function buildTopicPool(): TopicPick[] {
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
 * Pick three distinct TopicPick entries from the pool. Prefers three
 * distinct topics (differing by topic string) when the pool allows it,
 * and only falls back to distinct topic+fact pairs if the pool cannot
 * supply three distinct topics. Uses a Fisher-Yates shuffle on a copy
 * so results are varied and non-repeating.
 */
export const getRandomTopics = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<TopicPick[]> => {
    const pool = buildTopicPool();
    if (pool.length === 0) {
      return [
        {
          topic: "Financial Literacy",
          fact: "Understanding the basics of money helps you make confident decisions.",
        },
      ];
    }

    // Fisher-Yates shuffle on a copy.
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const count = Math.min(3, shuffled.length);
    const picks: TopicPick[] = [];
    const seenTopics = new Set<string>();

    // First pass: gather distinct topics (differing by topic string).
    for (const item of shuffled) {
      if (picks.length === count) break;
      if (!seenTopics.has(item.topic)) {
        seenTopics.add(item.topic);
        picks.push(item);
      }
    }

    // Fallback: if we still need more, fill with distinct topic+fact pairs.
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

function buildSystemPrompt(
  tone: string,
  dndThemed: boolean,
  abTest: boolean,
): string {
  const toneGuidance: Record<string, string> = {
    Informative:
      "WRITE THE ENTIRE SCRIPT AS A CRISP, CONFIDENT TEACHER STYLE EXPLAINER. Lead with the fact and state it clearly up front. Define every term in plain words the moment you use it. Use short, direct sentences in a steady, credible rhythm. Explain the why behind the advice so the viewer understands the logic. Keep the delivery matter of fact, assured, and easy to follow. Skip jokes, charm, and emotional appeals. Do not add warmth or humor, just teach the concept cleanly and confidently. End with a direct invitation to book a free call to learn more.",
    Warm:
      "WRITE THE ENTIRE SCRIPT AS A TRUSTED FRIEND TALKING ONE ON ONE. Open with empathy, acknowledge how the viewer might feel about the topic, and make them feel seen. Use the word you often and speak directly to them. Reassure and comfort, normalize their worries, and let a gentle, unhurried rhythm carry the script. Kindness comes first. Frame the advice as support and care rather than instruction. Soften every point and end with a warm, gentle invitation to book a free call, presented as an act of looking out for them.",
    Funny:
      "WRITE THE ENTIRE SCRIPT AS DEADPAN, DRY, AND SLIGHTLY DARK SELF AWARE HUMOR. Say bleak or wry truths about money and adulthood in a completely flat, matter of fact, unbothered delivery, as if the punchline is simply the reality itself. Undersell everything. Keep an even, steady rhythm with sudden understated punchlines that land because of what is left unsaid. Be wry and dryly cynical about the absurdity of financial life, never mean or mocking toward the viewer, their situation, or anyone else. Let the comedy come from the deadpan delivery and the grim honesty of the observation, not from funny sounding words or forced jokes. Keep the real advice clear and correct beneath the dry coating. Land the call to action in the same flat, dry tone, as a deadpan but still sincere invite.",
    "Mix / Surprise Me":
      "BLEND THE INFORMATIVE, WARM, AND FUNNY VOICES INTO ONE ENGAGING SCRIPT. Teach the key point clearly and confidently, speak with kindness and reassurance, and keep it playful and approachable. Move naturally among the three so the script feels human and varied. Let the balance feel organic, with the informative thread carrying the facts, warmth carrying the connection, and humor keeping it light. The result should be engaging, warm, and easy to enjoy from start to finish.",
  };

  const theme = dndThemed
    ? `
ADDITIONAL THEME: Set the script in a light Dungeons & Dragons flavor. Use light fantasy wording and gaming metaphors (such as quests, saving throws, treasure, and dice) in a warm, beginner friendly way. The financial advice must stay honest and clear beneath the fantasy dressing. Do not let the theme overshadow the useful information.`
    : `
ADDITIONAL THEME: Use plain, every day language with no fantasy or gaming framing. Keep the focus squarely on practical, understandable financial and life planning advice.`;

  const promptText = `You are a financial literacy content coach helping John, a licensed life insurance agent and the creator of the brand "The Financial DM". John records short, roughly one minute long videos about financial literacy and life planning, and he needs a fresh posting package for his next video.

Write a complete, cohesive posting package for the given topic, using the supporting fact as a talking point. The package includes the video script plus its matching hook, post caption, and hashtags, all derived from the same single topic, fact, and tone so they read as one coherent set for the same video.

TONE (strict): Write the ENTIRE package (title, hook, script, call to action, and caption) in the selected tone below. The tone must be unmistakable and consistent from the first sentence to the last. Do not blend in any other voice unless the selected tone itself asks for a blend.
${toneGuidance[tone] ?? toneGuidance["Mix / Surprise Me"]}
${theme}

REQUIREMENTS:
- TITLE: a short, catchy title for the post (a few words).
- SCRIPT: the full roughly 150 to 180 word script, about one minute read aloud. OPEN with the hook line verbatim as the first spoken line, teach the key point clearly, and keep it engaging and honest.
- CALL TO ACTION: a clear closing line telling the viewer to book a free call with John, a licensed life insurance agent, for example to review their coverage, ask a financial question, or plan for the future. Make it a friendly, optional invitation.
- All pieces must read as ONE cohesive posting set for the same video, all written in the same tone around the same single topic and fact.

H O O K  (see the HOOK GENERATION RULE section below for the strict rule you must follow).

HOOK GENERATION RULE (strict, applies to every hook you produce):
- The user picks a hook_type from: curiosity_gap, direct_callout, contrarian, number_specific, or mix. When it is mix, YOU choose the single best mechanism for this hook and report which one you used in the "used_hook_type" field.
- The hook must be the FIRST LINE of the spoken script and UNDER 12 WORDS. It must, in its first 1 to 2 seconds of reading, either create a curiosity gap, name the exact viewer situation, make a contrarian claim, or lead with a concrete number or timeframe.
- Match the declared hook_type exactly:
  * curiosity_gap: state a surprising fact or a striking result WITHOUT yet giving the reason. The viewer must be left wanting the why. Withhold the explanation.
  * direct_callout: open with "If you" or "If your" and name the EXACT target viewer situation, then imply the consequence they have not considered. No generic openers.
  * contrarian: state the counter intuitive claim as plain fact, directly and confidently. No "actually", no "surprisingly", no hedging words.
  * number_specific: lead with a concrete number, dollar amount, or timeframe within the FIRST 5 WORDS of the hook.
- BANNED generic openers, never use these and regenerate if you produce one: "Let's talk about", "Here's what you need to know", "Did you know", "In this video".
- The hook must be answerable as "What does this make the viewer want to know?" If there is no clear gap or named situation or surprising claim, the hook failed, so regenerate it.
- target_viewer names exactly who this hook is for. Aim the hook at that person and, for direct_callout, name their exact situation.
- payoff is INTERNAL ONLY. It names what the video actually delivers. The hook must promise that area and nothing the script will not deliver, so the viewer is not tricked. NEVER write the payoff itself into the hook, and never reveal payoff as a label, heading, or internal note in the output.

SELF CHECK (do this before finalizing the hook and regenerate until all are yes):
  (a) Does this hook match its declared hook_type?
  (b) Does it avoid every banned generic opener?
  (c) Would a viewer with no context want to know what happens next?
  If any answer is no, write a new hook and recheck.

CAPTION (strict, separate copy from the hook):
- Write the caption as its OWN copy that EXPANDS ON THE PAYOFF: what the viewer learns or gains in the video. Do NOT restate the hook's wording, sentence, or phrasing.
- Keep the FIRST LINE of the caption UNDER 10 WORDS (platforms truncate after about one line). Put a line break after that short first line.
- Keep it friendly and useful, on brand with John's voice, and end with a light optional invitation to book a free call with John (for example to review coverage or ask a financial question).

HASHTAGS (required): Also generate 6 to 10 relevant hashtags for the post that match the specific topic and tone. Mix broad, high reach tags (such as #FinancialLiteracy) with niche ones specific to the topic. Each hashtag must be a single word with a leading # and no spaces, no punctuation, and no dashes or hyphens (for example #FinancialLiteracy, not #Financial Literacy).

VARIETY (important): Every generation must feel fresh. Vary the opening hook, choose a different analogy or storytelling angle, and do not simply repeat formulas from earlier drafts. Avoid cliches and generic filler. Keep each package distinct in structure and wording.

FORMATTING RULES (strict):
- Use no em dashes, no en dashes, and no hyphens anywhere. Write ranges and relations plainly, such as "10 to 20 years" or "one to two minutes". If a hyphen would normally appear in a word, rephrase to avoid it.
- Keep numbers and claims plain, honest, and accurate. Do not invent statistics or make up figures.
- Do not be pushy or use manufactured urgency. The call to action and caption invitation should be friendly and optional.

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "title": "Catchy title here", "hook": "The hook here, under 12 words, matching the chosen hook_type", "script": "The full 150 to 180 word script here, opening with the hook as the first line", "callToAction": "A short friendly closing line inviting the viewer to book a free call with John.", "caption": "The caption here, first line under 10 words then a line break, expanding on the payoff, not repeating the hook", "hashtags": ["#HashtagOne", "#HashtagTwo", "#HashtagThree"], "used_hook_type": "the mechanism you used when hook_type is mix, else omit" }`;

  // When A/B testing is on, ask the model for a second hook variant. It must
  // use a DIFFERENT mechanism than the primary hook, and the script, call to
  // action, and caption stay the same (the caption expands the payoff, so it
  // works for either hook).
  if (abTest) {
    return `${promptText}\n\nA/B VARIANT (required because A/B testing is on): in addition to the primary "hook" above, also produce a "hookB" field: a second, DIFFERENT hook for the same script, using a DIFFERENT hook_type mechanism than the primary "hook". Follow the same HOOK GENERATION RULE and SELF CHECK for hookB. Also produce "hookBType" naming which mechanism hookB uses (curiosity_gap, direct_callout, contrarian, or number_specific). The script, callToAction, and caption must remain identical to the primary ones (only the hook differs). The output JSON then uses exactly this shape:\n{ "title": "...", "hook": "...", "used_hook_type": "mechanism used for the primary hook when hook_type is mix, else omit", "hookB": "...", "hookBType": "...", "script": "...", "callToAction": "...", "caption": "...", "hashtags": [...] }`;
  }
  return promptText;
}

/** Defensively strip em dashes, en dashes, and hyphens from displayed text. */
function cleanText(s: string): string {
  return (s || "").replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Clean a raw hashtag into a single #Word string. Removes any dashes,
 * spaces, and punctuation, and enforces a single leading hash.
 */
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

export const generateScript = createServerFn().middleware([requireAdmin]).handler(
  async ({ data }: { data: ScriptInput }): Promise<ScriptResult | null> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[scriptGenerator] ANTHROPIC_API_KEY not set");
      return null;
    }

    const systemPrompt = buildSystemPrompt(
      data.tone,
      data.dndThemed,
      data.abTest,
    );
    // The payoff is internal only: if John did not type one, fall back to the
    // supporting fact so the model still knows what the video delivers.
    const payoff = (data.payoff || "").trim() || data.fact;
    const userContent = `Topic: ${data.topic}

Supporting fact: ${data.fact}

Hook type: ${data.hookType}
Target viewer: ${data.targetViewer || "no target written"}
What this video delivers (payoff, internal only, do not reveal in the hook): ${payoff}`;

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
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[scriptGenerator] Anthropic API error: ${response.status} ${response.statusText}: ${errText}`,
        );
        return null;
      }

      const json = (await response.json()) as {
        content: Array<{ text: string }>;
      };
      const text = json.content?.[0]?.text || "";

      // Extract JSON from the response. It may be wrapped in markdown fences.
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(cleaned) as {
        title?: string;
        hook?: string;
        script?: string;
        callToAction?: string;
        caption?: string;
        hashtags?: Array<unknown>;
        used_hook_type?: unknown;
        hookB?: string;
        hookBType?: unknown;
      };

      // When the chosen type is "mix", the model reports which mechanism it used.
      const effectiveHookType =
        data.hookType === "mix"
          ? normalizeHookType(parsed.used_hook_type) || "mix"
          : normalizeHookType(data.hookType) || "direct_callout";
      const hookBType = normalizeHookType(parsed.hookBType);

      return {
        topic: data.topic,
        fact: data.fact,
        tone: data.tone,
        dndThemed: data.dndThemed,
        hookType: effectiveHookType,
        targetViewer: data.targetViewer,
        payoff,
        title: cleanText(parsed.title ?? ""),
        hook: cleanText(parsed.hook ?? ""),
        script: cleanText(parsed.script ?? ""),
        callToAction: cleanText(parsed.callToAction ?? ""),
        caption: cleanText(parsed.caption ?? ""),
        hashtags: normalizeHashtags(parsed.hashtags),
        hookB: cleanText(parsed.hookB ?? ""),
        hookBType,
      };
    } catch (e) {
      console.error(
        "[scriptGenerator] Failed to generate posting package:",
        String(e),
        e instanceof Error ? e.stack : "",
      );
      return null;
    }
  },
);

// ── Saved Script Library (database) ────────────────────────────────

/** Create the saved_scripts table if it does not exist. Idempotent. */
async function ensureScriptsTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS saved_scripts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      script TEXT NOT NULL,
      call_to_action TEXT NOT NULL,
      hashtags TEXT,
      topic TEXT,
      tone TEXT,
      dnd_themed BOOLEAN DEFAULT FALSE,
      fact TEXT,
      kind TEXT NOT NULL DEFAULT 'script',
      hook TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // Add the columns on pre existing tables (idempotent).
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'script'`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS hook TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS caption TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS hook_type TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS target_viewer TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS payoff TEXT`;
}

export const initScriptsTable = createServerFn().middleware([requireAdmin]).handler(async () => {
  await ensureScriptsTable();
  return { ok: true };
});

/** Persist a generated posting package. Mirrors saveConcept. */
export const saveScript = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: ScriptResult;
  }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      // Ensure the table exists. The Forge tab may be the first thing used on a fresh DB.
      await ensureScriptsTable();
      const result = await sql()`
        INSERT INTO saved_scripts (title, hook, script, call_to_action, caption, hashtags, topic, tone, dnd_themed, fact, kind, hook_type, target_viewer, payoff)
        VALUES (${data.title}, ${data.hook}, ${data.script}, ${data.callToAction}, ${data.caption}, ${(data.hashtags || []).join(" ")}, ${data.topic}, ${data.tone}, ${data.dndThemed}, ${data.fact}, 'script', ${data.hookType}, ${data.targetViewer}, ${data.payoff})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);

/** List saved scripts, newest first. */
export const getSavedScripts = createServerFn().middleware([requireAdmin]).handler(
  async (): Promise<SavedScript[]> => {
    await ensureScriptsTable();
    const rows = await sql()`
      SELECT * FROM saved_scripts ORDER BY created_at DESC
    `;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      hook: String(r.hook ?? ""),
      script:
        // Old caption rows stored the caption in the script column; keep that
        // text rendering gracefully for pre package saved items.
        String(r.script ?? ""),
      callToAction: String(r.call_to_action ?? ""),
      caption: String(r.caption ?? ""),
      hashtags: (String(r.hashtags ?? "") || "")
        .split(/\s+/)
        .filter(Boolean),
      topic: String(r.topic ?? ""),
      tone: String(r.tone ?? ""),
      dndThemed: Boolean(r.dnd_themed),
      fact: String(r.fact ?? ""),
      kind: "script",
      hookType: String(r.hook_type ?? ""),
      targetViewer: String(r.target_viewer ?? ""),
      payoff: String(r.payoff ?? ""),
      createdAt: String(r.created_at),
    })) as SavedScript[];
  },
);

/** Delete a saved script by id. */
export const deleteScript = createServerFn().middleware([requireAdmin]).handler(
  async ({
    data,
  }: {
    data: { id: number };
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM saved_scripts WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
);
