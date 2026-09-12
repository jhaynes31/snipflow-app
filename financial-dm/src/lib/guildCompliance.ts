import { GUILD_CONFIG, smsLink } from "~/lib/guildConfig";
import { QUEST_CONFIG } from "~/lib/questConfig";

/**
 * Recruiting output rules (recruiting spec, Section 6, and the trust-first
 * amendment, Section 6). Pure helpers: the word scan every recruiting
 * output goes through before John can approve it, the calls to action, and
 * the fixed topic lists the Guild forge offers.
 */

export type RecruitFlagKind = "earnings" | "hiring" | "title" | "scam" | "pay_figure" | "industry" | "disclosure";

export interface RecruitFlag {
  kind: RecruitFlagKind;
  /** The phrase found, or a short reason for the structural checks. */
  text: string;
}

export const FLAG_KIND_LABEL: Record<RecruitFlagKind, string> = {
  earnings: "Earnings hype",
  hiring: "Hiring-safe wording",
  title: "Regulated title",
  scam: "Reads like a scam post",
  pay_figure: "A figure tied to pay",
  industry: "Does not name the industry",
  disclosure: "Describes the meeting without the disclosure",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function phraseHits(text: string, words: string[]): string[] {
  const hay = text.toLowerCase();
  const found: string[] = [];
  for (const w of words) {
    const phrase = w.toLowerCase().trim();
    if (!phrase) continue;
    const re = new RegExp(`(^|[^a-z0-9])${escape(phrase).replace(/[- ]/g, "[- ]").replace(/'/g, "['’]?")}(?=$|[^a-z0-9])`, "i");
    if (re.test(hay)) found.push(w);
  }
  return found;
}

/** Sentences that mention the meeting or interview, used for the disclosure check. */
const MEETING_WORDS = /\b(interview|meeting|the conversation|sit down|hop on a call|jump on a call|zoom call|video call)\b/i;
/** The heart of the dual-purpose disclosure: both purposes named. */
const DISCLOSURE_HINT = /(your own|their own) (coverage|finances|financial)|coverage or financ/i;

export interface ScanOptions {
  /** The confirmed industry fact, so "names the industry" can be checked. */
  industry?: string;
  /** True when this kind of output is expected to describe the meeting. */
  describesMeeting?: boolean;
}

/**
 * Scan recruiting text. Flags never block generation; John must acknowledge
 * them before an output can be approved.
 */
export function scanRecruiting(text: string, opts: ScanOptions = {}): RecruitFlag[] {
  const flags: RecruitFlag[] = [];
  const body = text || "";
  for (const t of phraseHits(body, GUILD_CONFIG.earningsFlagWords)) flags.push({ kind: "earnings", text: t });
  for (const t of phraseHits(body, GUILD_CONFIG.hiringSafeFlagWords)) flags.push({ kind: "hiring", text: t });
  for (const t of phraseHits(body, GUILD_CONFIG.titleFlagWords)) flags.push({ kind: "title", text: t });
  for (const t of phraseHits(body, GUILD_CONFIG.scamPatternFlagWords)) flags.push({ kind: "scam", text: t });
  for (const t of phraseHits(body, QUEST_CONFIG.complianceFlagWords)) flags.push({ kind: "earnings", text: t });
  // Any dollar amount or percentage near pay words (Section 6.2: "any dollar amount or percentage tied to pay").
  const payFigure = /(\$\s?\d[\d,]*(\.\d+)?(k|K)?|\b\d{1,3}(\.\d+)?\s?%)/g;
  const payWords = /\b(pay|paid|earn|earning|earnings|income|commission|make|salary|per (week|month|year)|a (week|month|year))\b/i;
  let m: RegExpExecArray | null;
  while ((m = payFigure.exec(body))) {
    const window = body.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
    if (payWords.test(window)) flags.push({ kind: "pay_figure", text: m[0].trim() });
  }
  // Names the industry (amendment, Section 6).
  if (opts.industry !== undefined) {
    const ind = opts.industry.toLowerCase();
    const keyWords = ind.split(/[^a-z]+/).filter((w) => w.length > 3 && !["and", "with", "the"].includes(w));
    const named = (ind && body.toLowerCase().includes(ind)) || /\binsurance\b/i.test(body) || keyWords.some((w) => new RegExp(`\\b${escape(w)}`, "i").test(body));
    if (!named) flags.push({ kind: "industry", text: "The industry is never named" });
  }
  // Describes the meeting but leaves out the dual-purpose disclosure (amendment, Section 4).
  // The keyword in "Text INTERVIEW to ..." is the call to action, not a description of the meeting.
  const bodySansKeyword = body.replace(/\bINTERVIEW\b/g, "");
  if ((opts.describesMeeting || MEETING_WORDS.test(bodySansKeyword)) && !DISCLOSURE_HINT.test(body)) {
    flags.push({ kind: "disclosure", text: "Mentions the interview or meeting without saying it can also cover the person's own coverage or finances" });
  }
  // De-duplicate identical flags.
  const seen = new Set<string>();
  return flags.filter((f) => {
    const k = `${f.kind}:${f.text.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Calls to action (Section 6.1) ─────────────────────────────────

/** The spoken or written ending every recruiting output must carry. */
export function recruitCta(campaignSlug?: string): string {
  if (campaignSlug) return `Take the first step at ${QUEST_CONFIG.siteDomain}/${campaignSlug}, or text ${GUILD_CONFIG.smsKeyword} to ${GUILD_CONFIG.recruitPhone}.`;
  return `Text ${GUILD_CONFIG.smsKeyword} to ${GUILD_CONFIG.recruitPhone}, or visit ${QUEST_CONFIG.siteDomain}/guild.`;
}

export const GUILD_HALL_URL = `https://${QUEST_CONFIG.siteDomain}/guild`;
export { smsLink };

/** Append the CTA when the text does not already carry the number or the Guild Hall link. */
export function ensureRecruitCta(text: string, campaignSlug?: string): string {
  const t = (text || "").trim();
  const hasNumber = t.replace(/[^0-9]/g, "").includes(GUILD_CONFIG.recruitPhone.replace(/[^0-9]/g, ""));
  const hasLink = t.toLowerCase().includes(`${QUEST_CONFIG.siteDomain}/guild`) || (campaignSlug ? t.toLowerCase().includes(`${QUEST_CONFIG.siteDomain}/${campaignSlug}`) : false);
  if (hasNumber || hasLink) return t;
  return `${t}\n\n${recruitCta(campaignSlug)}`;
}

// ── Fixed topic lists (Section 6) ─────────────────────────────────

export const GUILD_SCRIPT_TOPICS = [
  { id: "day_in_job", label: "What a day in this job actually looks like", describesMeeting: false },
  { id: "why_i_started", label: "Why I got into this", describesMeeting: false },
  { id: "getting_licensed", label: "What getting licensed involves", describesMeeting: false },
  { id: "is_and_isnt", label: "What this job is and isn't", describesMeeting: false },
  { id: "the_paths", label: "The different paths: insurance, financial services, and investments", describesMeeting: false },
  { id: "the_interview", label: "What the interview is really like", describesMeeting: true },
] as const;
export type GuildScriptTopic = (typeof GUILD_SCRIPT_TOPICS)[number]["id"];

export const GUILD_CAROUSEL_TOPICS = [
  { id: "interview_to_licensed", label: "The path from interview to licensed", describesMeeting: true },
  { id: "career_paths", label: "The career paths available", describesMeeting: false },
  { id: "questions_to_ask", label: "Questions to ask before joining any team", describesMeeting: false },
] as const;
export type GuildCarouselTopic = (typeof GUILD_CAROUSEL_TOPICS)[number]["id"];

export const GUILD_OUTPUT_KINDS = [
  { id: "script", label: "📜 Script", blurb: "A TikTok script in John's voice" },
  { id: "cards", label: "🃏 Trap or Treasure", blurb: "Recruiting myths, true per the facts" },
  { id: "carousel", label: "🎠 Carousel", blurb: "Slides for a photo post" },
  { id: "flyer", label: "📄 Flyer", blurb: "Print, social, and story sizes with a QR code" },
  { id: "job_post", label: "📋 Job post", blurb: "For job boards and Facebook" },
  { id: "text_posts", label: "💬 Text posts", blurb: "Short posts for groups and boards" },
] as const;
export type GuildOutputKind = (typeof GUILD_OUTPUT_KINDS)[number]["id"];

export function kindLabel(id: string): string {
  return GUILD_OUTPUT_KINDS.find((k) => k.id === id)?.label ?? id;
}
