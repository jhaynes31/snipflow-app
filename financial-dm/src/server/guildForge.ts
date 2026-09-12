import { createServerFn } from "@tanstack/react-start";
import { JOHN_TITLE_LINE } from "~/lib/johnTitles";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { ensureGuildTables } from "~/server/guild";
import { PERSONA_BLOCK, callClaude, normalizeHashtags, parseJsonReply } from "~/server/contentVoice";
import { GUILD_CONFIG, GUILD_FACT_FIELDS, factLabel, guildIsLive, missingFacts, publicFacts, type GuildFacts } from "~/lib/guildConfig";
import {
  GUILD_CAROUSEL_TOPICS,
  GUILD_OUTPUT_KINDS,
  GUILD_SCRIPT_TOPICS,
  ensureRecruitCta,
  recruitCta,
  scanRecruiting,
  type GuildOutputKind,
  type RecruitFlag,
} from "~/lib/guildCompliance";
import { QUEST_CONFIG } from "~/lib/questConfig";

/**
 * Recruiting mode for the generators (recruiting spec, Section 6, and the
 * trust-first amendment, Section 6). Every prompt is built from John's
 * confirmed trust facts and nothing else: no presentation facts, no
 * invented role details, no recruit data. Every output ends with the call
 * to action, is scanned for flag words, and cannot be approved until John
 * has acknowledged any flags.
 */

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * Tidy model text without harming hyphens: the phone number, "commission-based",
 * and "pre-licensing" must survive. Em and en dashes become commas, per the
 * house style; paragraph breaks are kept.
 */
function cleanText(v: unknown): string {
  return String(v ?? "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Output shapes ─────────────────────────────────────────────────

export interface GuildScriptBody { hook: string; body: string; caption: string; hashtags: string[]; topic: string }
export interface GuildCardsBody { cards: Array<{ myth: string; verdict: "trap" | "treasure"; truth: string; supportedBy: string }>; caption: string }
export interface GuildCarouselBody { slides: Array<{ title: string; body: string }>; caption: string; topic: string }
export interface GuildJobPostBody { text: string; platform: "job_board" | "facebook" }
export interface GuildTextPostsBody { posts: string[] }
export interface GuildFlyerBody { headline: string; roleTitle: string; industry: string; summary: string; requirements: string[]; phone: string; url: string }
export type GuildBody = GuildScriptBody | GuildCardsBody | GuildCarouselBody | GuildJobPostBody | GuildTextPostsBody | GuildFlyerBody;

export interface GuildDraft {
  kind: GuildOutputKind;
  title: string;
  body: GuildBody;
  flags: RecruitFlag[];
  /** Plain text of everything a viewer would read, for the flag panel. */
  plain: string;
}

export interface GuildOutput extends GuildDraft {
  id: number;
  flagsAcknowledged: boolean;
  approved: boolean;
  createdAt: string;
}

export type ForgeResult = { ok: true; draft: GuildDraft } | { ok: false; error: string };

// ── Facts and the shared prompt ───────────────────────────────────

async function loadTrustFacts(): Promise<{ facts: Record<string, string>; ready: boolean; missing: string[] }> {
  await ensureGuildTables();
  const rows = (await sql()`SELECT key, value, confirmed FROM guild_facts`) as Array<{ key: string; value: string; confirmed: boolean }>;
  const all: GuildFacts = {};
  for (const r of rows) all[r.key] = { key: r.key, value: String(r.value ?? ""), confirmed: Boolean(r.confirmed) };
  return { facts: publicFacts(all), ready: guildIsLive(all), missing: missingFacts(all) };
}

const NOT_READY = "The Guild facts are not all confirmed yet. Finish them in the Guild tab first; the recruiting forge only ever uses John's confirmed words.";

function factsBlock(facts: Record<string, string>): string {
  const lines = GUILD_FACT_FIELDS.filter((f) => f.tier === "trust" && facts[f.key]).map((f) => `- ${f.label}: ${facts[f.key]}`);
  return `THE ONLY FACTS YOU MAY STATE ABOUT THE ROLE (John's confirmed words; quote or paraphrase these and nothing else):\n${lines.join("\n")}`;
}

function rulesBlock(facts: Record<string, string>, campaignSlug?: string): string {
  return `RECRUITING RULES (strict, every one):
- Never state any detail about pay, costs, training, licensing, schedule, or the business that is not in the facts above. If a fact is not listed, do not invent it; say that is what the conversation is for.
- No earnings figures, income ranges, percentages, or lifestyle promises. Never say or imply: ${GUILD_CONFIG.earningsFlagWords.join(", ")}, or any dollar amount or percentage tied to pay.
- Hiring-safe: never express a preference or requirement based on age (beyond 18 or older), race, religion, sex, national origin, disability, pregnancy, family status, sexual orientation, or gender identity. Never use words like ${GUILD_CONFIG.hiringSafeFlagWords.slice(0, 7).join(", ")}. Describe situations and interests instead: wants remote work, changing careers, enjoys helping people, has customer service experience.
- Never use the protected titles ${GUILD_CONFIG.titleFlagWords.join(", ")}. Never call anyone a ${GUILD_CONFIG.roleTitleFlagWords.join(", ")} on its own, and never offer the role to recruits that way: a new recruit starts as "${facts.roleTitle}". Investment work is only ever "an optional path you can get licensed for later"; never imply anyone can advise on or sell investments before they are properly licensed; never mention returns, performance, or products.
- Always name the industry plainly: ${facts.industry}.
- Never write "${GUILD_CONFIG.scamPatternFlagWords.slice(0, 3).join('", "')}" or similar. Be specific about legitimacy, general about the opportunity.
- Whenever you describe the interview or meeting, include this disclosure in substance: "${facts.meetingCovers}"
- John's titles are exactly "${JOHN_TITLE_LINE}", written that way and never shortened to "financial advisor" on its own. He works with ${GUILD_CONFIG.presentedBy}.
- End with this call to action, word for word: "${recruitCta(campaignSlug)}"
- Plain language, no em dashes, no jargon, no hype. Warm, straight, a little wry.`;
}

async function ask<T>(tag: string, system: string, user: string, maxTokens = 1400): Promise<T | null> {
  const reply = await callClaude({ system, user, maxTokens, tag });
  return parseJsonReply<T>(reply, tag);
}

function plainOf(kind: GuildOutputKind, body: GuildBody): string {
  switch (kind) {
    case "script": {
      const b = body as GuildScriptBody;
      return [b.hook, b.body, b.caption, b.hashtags.join(" ")].join("\n\n");
    }
    case "cards": {
      const b = body as GuildCardsBody;
      return [...b.cards.map((c) => `${c.myth}\n${c.verdict === "trap" ? "Trap" : "Treasure"}: ${c.truth}`), b.caption].join("\n\n");
    }
    case "carousel": {
      const b = body as GuildCarouselBody;
      return [...b.slides.map((s) => `${s.title}\n${s.body}`), b.caption].join("\n\n");
    }
    case "job_post":
      return (body as GuildJobPostBody).text;
    case "text_posts":
      return (body as GuildTextPostsBody).posts.join("\n\n---\n\n");
    case "flyer": {
      const b = body as GuildFlyerBody;
      return [b.headline, b.roleTitle, b.industry, b.summary, ...b.requirements, b.phone, b.url].join("\n");
    }
  }
}

function finish(kind: GuildOutputKind, title: string, body: GuildBody, facts: Record<string, string>, describesMeeting: boolean): GuildDraft {
  const plain = plainOf(kind, body);
  const flags = scanRecruiting(plain, { industry: facts.industry, describesMeeting });
  return { kind, title, body, flags, plain };
}

// ── Status ────────────────────────────────────────────────────────

export const getGuildForgeStatus = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<{ ready: boolean; missing: string[]; facts: Record<string, string> }> => {
    const { facts, ready, missing } = await loadTrustFacts();
    return { ready, missing: missing.map(factLabel), facts: ready ? facts : {} };
  });

// ── Scripts ───────────────────────────────────────────────────────

export const forgeGuildScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { topic: string; campaignSlug?: string }) => ({
    topic: (GUILD_SCRIPT_TOPICS.find((t) => t.id === d?.topic) ?? GUILD_SCRIPT_TOPICS[0]).id,
    campaignSlug: text(d?.campaignSlug, 30),
  }))
  .handler(async ({ data }): Promise<ForgeResult> => {
    const { facts, ready } = await loadTrustFacts();
    if (!ready) return { ok: false, error: NOT_READY };
    const topic = GUILD_SCRIPT_TOPICS.find((t) => t.id === data.topic)!;
    const system = `GUILD FORGE · script\n${PERSONA_BLOCK}\n\n${factsBlock(facts)}\n\n${rulesBlock(facts, data.campaignSlug || undefined)}\n\nReturn JSON only: {"hook":"one spoken opening line","body":"the spoken script, 45 to 70 seconds, short paragraphs, ending with the call to action","caption":"a short caption ending with the call to action","hashtags":["6 to 8 single-word tags with #"]}`;
    const user = `Topic: ${topic.label}\nAudience: someone scrolling who might want this work: changing careers, wants remote or flexible work, likes helping people. Speak to their situation, never to who they are.${topic.describesMeeting ? "\nThis script describes the interview, so the disclosure about also covering their own coverage or finances must be in it." : ""}`;
    const parsed = await ask<Record<string, unknown>>("guild-script", system, user);
    if (!parsed) return { ok: false, error: "No script came back. Try again." };
    const body: GuildScriptBody = {
      topic: topic.id,
      hook: cleanText(parsed.hook),
      body: ensureRecruitCta(cleanText(parsed.body), data.campaignSlug || undefined),
      caption: ensureRecruitCta(cleanText(parsed.caption), data.campaignSlug || undefined),
      hashtags: normalizeHashtags(parsed.hashtags),
    };
    if (!body.body) return { ok: false, error: "The script came back empty. Try again." };
    return { ok: true, draft: finish("script", topic.label, body, facts, topic.describesMeeting) };
  });

// ── Trap or Treasure cards ────────────────────────────────────────

export const forgeGuildCards = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { campaignSlug?: string }) => ({ campaignSlug: text(d?.campaignSlug, 30) }))
  .handler(async ({ data }): Promise<ForgeResult> => {
    const { facts, ready } = await loadTrustFacts();
    if (!ready) return { ok: false, error: NOT_READY };
    const keys = GUILD_FACT_FIELDS.filter((f) => f.tier === "trust" && facts[f.key]).map((f) => f.key);
    const system = `GUILD FORGE · cards\n${PERSONA_BLOCK}\n\n${factsBlock(facts)}\n\n${rulesBlock(facts, data.campaignSlug || undefined)}\n\nTrap or Treasure is John's myth-versus-fact format. A Trap is a common belief that is false; a Treasure is a belief that is true. Every card's truth must be directly supported by ONE of the facts above. If a myth's answer is not covered by the facts, do not write that card.\nFact keys you may cite: ${keys.join(", ")}.\nReturn JSON only: {"cards":[{"myth":"the belief, in the person's words","verdict":"trap|treasure","truth":"one or two sentences, only what the cited fact says","supportedBy":"one fact key from the list"}],"caption":"a short caption ending with the call to action"}. Write 3 to 5 cards.`;
    const parsed = await ask<{ cards?: Array<Record<string, unknown>>; caption?: unknown }>("guild-cards", system, "Write the recruiting Trap or Treasure cards.");
    if (!parsed) return { ok: false, error: "No cards came back. Try again." };
    const cards = (Array.isArray(parsed.cards) ? parsed.cards : [])
      .map((c) => ({ myth: cleanText(c.myth), verdict: (c.verdict === "treasure" ? "treasure" : "trap") as "trap" | "treasure", truth: cleanText(c.truth), supportedBy: String(c.supportedBy ?? "") }))
      // Rule: a card without a real supporting fact is dropped, never shown.
      .filter((c) => c.myth && c.truth && keys.includes(c.supportedBy))
      .slice(0, 5);
    if (cards.length === 0) return { ok: false, error: "None of the cards could be backed by a confirmed fact, so none were kept. Try again." };
    const body: GuildCardsBody = { cards, caption: ensureRecruitCta(cleanText(parsed.caption), data.campaignSlug || undefined) };
    return { ok: true, draft: finish("cards", "Recruiting Trap or Treasure", body, facts, false) };
  });

// ── Carousels ─────────────────────────────────────────────────────

export const forgeGuildCarousel = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { topic: string; campaignSlug?: string }) => ({
    topic: (GUILD_CAROUSEL_TOPICS.find((t) => t.id === d?.topic) ?? GUILD_CAROUSEL_TOPICS[0]).id,
    campaignSlug: text(d?.campaignSlug, 30),
  }))
  .handler(async ({ data }): Promise<ForgeResult> => {
    const { facts, ready } = await loadTrustFacts();
    if (!ready) return { ok: false, error: NOT_READY };
    const topic = GUILD_CAROUSEL_TOPICS.find((t) => t.id === data.topic)!;
    const system = `GUILD FORGE · carousel\n${PERSONA_BLOCK}\n\n${factsBlock(facts)}\n\n${rulesBlock(facts, data.campaignSlug || undefined)}\n\nReturn JSON only: {"slides":[{"title":"3 to 6 words","body":"one or two short sentences"}],"caption":"a short caption ending with the call to action"}. Write 5 to 7 slides: a hook slide, the content, and a final slide that is the call to action.`;
    const user = `Carousel topic: ${topic.label}${topic.id === "questions_to_ask" ? "\nThis one is general advice for anyone weighing any team, not claims about John's role: what to ask about costs, licensing, how pay works, and who they would report to. It should still name the industry and end with the call to action." : ""}${topic.describesMeeting ? "\nThis describes the interview, so the disclosure about also covering their own coverage or finances must appear on a slide." : ""}`;
    const parsed = await ask<{ slides?: Array<Record<string, unknown>>; caption?: unknown }>("guild-carousel", system, user);
    if (!parsed) return { ok: false, error: "No slides came back. Try again." };
    const slides = (Array.isArray(parsed.slides) ? parsed.slides : []).map((s) => ({ title: cleanText(s.title), body: cleanText(s.body) })).filter((s) => s.title || s.body).slice(0, 8);
    if (slides.length < 3) return { ok: false, error: "Too few slides came back. Try again." };
    const body: GuildCarouselBody = { topic: topic.id, slides, caption: ensureRecruitCta(cleanText(parsed.caption), data.campaignSlug || undefined) };
    return { ok: true, draft: finish("carousel", topic.label, body, facts, topic.describesMeeting) };
  });

// ── Job posts and text posts ──────────────────────────────────────

export const forgeGuildJobPost = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { platform?: string; campaignSlug?: string }) => ({
    platform: (d?.platform === "facebook" ? "facebook" : "job_board") as "job_board" | "facebook",
    campaignSlug: text(d?.campaignSlug, 30),
  }))
  .handler(async ({ data }): Promise<ForgeResult> => {
    const { facts, ready } = await loadTrustFacts();
    if (!ready) return { ok: false, error: NOT_READY };
    const system = `GUILD FORGE · job post\n${PERSONA_BLOCK}\n\n${factsBlock(facts)}\n\n${rulesBlock(facts, data.campaignSlug || undefined)}\n\nA written job post must include, in this order and in John's words from the facts: the role title, the industry, what the work involves, the work arrangement, how pay is based (general terms only), whether a license is required, what recruits pay for to get started, the requirements (18 or older, pass a background check, internet access, a laptop or phone), and how to apply (the call to action). Include the interview format and the disclosure about the conversation. Job boards remove vague listings, so be concrete but only with the facts given.\nReturn JSON only: {"text":"the full post, short paragraphs, plain text"}`;
    const user = data.platform === "facebook" ? "Write the post for a Facebook jobs group: friendly, first person, under 220 words." : "Write the post for a job board like Indeed: clear headings in plain text, under 320 words.";
    const parsed = await ask<{ text?: unknown }>("guild-job-post", system, user, 1600);
    const post = cleanText(parsed?.text);
    if (!post) return { ok: false, error: "No post came back. Try again." };
    const body: GuildJobPostBody = { text: ensureRecruitCta(post, data.campaignSlug || undefined), platform: data.platform };
    return { ok: true, draft: finish("job_post", data.platform === "facebook" ? "Facebook job post" : "Job board post", body, facts, true) };
  });

export const forgeGuildTextPosts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { campaignSlug?: string }) => ({ campaignSlug: text(d?.campaignSlug, 30) }))
  .handler(async ({ data }): Promise<ForgeResult> => {
    const { facts, ready } = await loadTrustFacts();
    if (!ready) return { ok: false, error: NOT_READY };
    const system = `GUILD FORGE · text posts\n${PERSONA_BLOCK}\n\n${factsBlock(facts)}\n\n${rulesBlock(facts, data.campaignSlug || undefined)}\n\nText-only versions of the recruiting flyer for Facebook groups, bulletin boards, and community boards. Each names the industry, says what the work is in one line, names ${GUILD_CONFIG.presentedBy}, mentions that interviewing is free, and ends with the call to action.\nReturn JSON only: {"posts":["three variations, 40 to 90 words each, plain text"]}`;
    const parsed = await ask<{ posts?: unknown }>("guild-text-posts", system, "Write three variations.");
    const posts = (Array.isArray(parsed?.posts) ? parsed!.posts : []).map((p) => ensureRecruitCta(cleanText(p), data.campaignSlug || undefined)).filter(Boolean).slice(0, 3);
    if (!posts.length) return { ok: false, error: "No posts came back. Try again." };
    return { ok: true, draft: finish("text_posts", "Text-only flyer posts", { posts }, facts, false) };
  });

/** The flyer needs no AI: it is the confirmed facts laid out in the flyer's design. */
export const forgeGuildFlyer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { campaignSlug?: string }) => ({ campaignSlug: text(d?.campaignSlug, 30) }))
  .handler(async ({ data }): Promise<ForgeResult> => {
    const { facts, ready } = await loadTrustFacts();
    if (!ready) return { ok: false, error: NOT_READY };
    const url = `https://${QUEST_CONFIG.siteDomain}/${data.campaignSlug || "guild"}`;
    const body: GuildFlyerBody = {
      headline: "The Guild Is Expanding",
      roleTitle: facts.roleTitle,
      industry: facts.industry,
      summary: facts.roleSummary,
      requirements: GUILD_CONFIG.requirements.map((r) => r.text),
      phone: GUILD_CONFIG.recruitPhone,
      url,
    };
    return { ok: true, draft: finish("flyer", "Recruiting flyer", body, facts, false) };
  });

// ── Saved outputs ─────────────────────────────────────────────────

let outputsReady: Promise<void> | null = null;
function ensureOutputs(): Promise<void> {
  if (!outputsReady) {
    outputsReady = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS guild_outputs (
          id SERIAL PRIMARY KEY,
          kind TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL DEFAULT '{}',
          flags TEXT NOT NULL DEFAULT '[]',
          flags_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
          approved BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`;
    })().catch((e) => {
      outputsReady = null;
      throw e;
    });
  }
  return outputsReady;
}

const parseJson = <T,>(v: unknown, fallback: T): T => {
  try {
    return (JSON.parse(String(v ?? "")) ?? fallback) as T;
  } catch {
    return fallback;
  }
};

function rowToOutput(r: Record<string, unknown>): GuildOutput {
  const kind = (GUILD_OUTPUT_KINDS.some((k) => k.id === r.kind) ? r.kind : "script") as GuildOutputKind;
  const body = parseJson<GuildBody>(r.body, { text: "", platform: "job_board" } as GuildJobPostBody);
  return {
    id: Number(r.id),
    kind,
    title: String(r.title ?? ""),
    body,
    flags: parseJson<RecruitFlag[]>(r.flags, []),
    plain: plainOf(kind, body),
    flagsAcknowledged: Boolean(r.flags_acknowledged),
    approved: Boolean(r.approved),
    createdAt: String(r.created_at ?? ""),
  };
}

export const saveGuildOutput = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { kind: string; title: string; body: GuildBody; flags: RecruitFlag[] }) => ({
    kind: (GUILD_OUTPUT_KINDS.some((k) => k.id === d?.kind) ? d.kind : "script") as GuildOutputKind,
    title: text(d?.title, 120),
    body: d?.body ?? ({} as GuildBody),
    flags: Array.isArray(d?.flags) ? d.flags.slice(0, 40) : [],
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; id?: number }> => {
    try {
      await ensureOutputs();
      // Re-scan on the server so the stored flags cannot be trimmed client-side.
      const { facts } = await loadTrustFacts();
      const flags = scanRecruiting(plainOf(data.kind, data.body), { industry: facts.industry, describesMeeting: data.kind === "job_post" });
      const rows = (await sql()`INSERT INTO guild_outputs (kind, title, body, flags) VALUES (${data.kind}, ${data.title}, ${JSON.stringify(data.body).slice(0, 60000)}, ${JSON.stringify(flags)}) RETURNING id`) as Array<{ id: number }>;
      return { ok: true, id: Number(rows[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const getGuildOutputs = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<GuildOutput[]> => {
    await ensureOutputs();
    const rows = (await sql()`SELECT * FROM guild_outputs ORDER BY created_at DESC LIMIT 200`) as Array<Record<string, unknown>>;
    return rows.map(rowToOutput);
  });

export const acknowledgeGuildFlags = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await ensureOutputs();
    await sql()`UPDATE guild_outputs SET flags_acknowledged = TRUE WHERE id = ${data.id}`;
    return { ok: true };
  });

/** Approval needs every flag acknowledged first (Section 6.2). Only John approves. */
export const setGuildOutputApproved = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; approved: boolean }) => ({ id: Number(d?.id), approved: Boolean(d?.approved) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    await ensureOutputs();
    if (data.approved) {
      const rows = (await sql()`SELECT flags, flags_acknowledged FROM guild_outputs WHERE id = ${data.id}`) as Array<{ flags: string; flags_acknowledged: boolean }>;
      if (!rows.length) return { ok: false, error: "That output no longer exists." };
      const flags = parseJson<RecruitFlag[]>(rows[0].flags, []);
      if (flags.length && !rows[0].flags_acknowledged) return { ok: false, error: "Read and acknowledge the flagged words before approving." };
    }
    await sql()`UPDATE guild_outputs SET approved = ${data.approved} WHERE id = ${data.id}`;
    return { ok: true };
  });

export const deleteGuildOutput = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await ensureOutputs();
    await sql()`DELETE FROM guild_outputs WHERE id = ${data.id}`;
    return { ok: true };
  });
