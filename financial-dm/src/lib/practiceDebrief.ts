import { scanCompliance } from "./compliance";
import { GUILD_CONFIG } from "./guildConfig";
import { scanRecruiting } from "./guildCompliance";
import type { Conversation, Outcome } from "./practiceConfig";

/**
 * The debrief (AI practice spec, Section 8). Compliance flags come from the
 * project's own word lists, applied only to what John actually said, and
 * quote the line with the rule it touches (Rule 2.5). Rubric notes are
 * judged only against John's rubric. Nothing here scores or grades.
 */

export type RuleId = "income" | "guarantee" | "title" | "pay_figure" | "hiring" | "scam_pattern" | "dodge";

export const RULE_TEXT: Record<RuleId, string> = {
  income: "No income claims or lifestyle promises (Guild rules, Section 6.2)",
  guarantee: "No guarantees about rates, approval, or returns (Quest Board rules, Section 7.4)",
  title: "Only John's approved titles; no regulated or bare advisor titles (Guild rules, Section 6.2)",
  pay_figure: "No dollar amount or percentage tied to pay (Guild rules, Section 6.2)",
  hiring: "Hiring-safe wording: no preference by age or protected trait (Guild rules, Section 6.2)",
  scam_pattern: "Phrases that make a legitimate offer read as a scam (trust amendment, Section 6)",
  dodge: "Legitimacy questions get a full answer, never 'that's for the interview' (trust amendment, Section 2)",
};

export interface ComplianceFlag {
  /** John's words, verbatim. */
  quote: string;
  /** The phrase or reason that tripped it. */
  matched: string;
  ruleId: RuleId;
  rule: string;
}

export interface RubricNote {
  item: string;
  met: "yes" | "partly" | "no" | "not_seen";
  /** John's words, verbatim, or empty when the AI could not point to a line. */
  evidence: string;
}

export interface Debrief {
  outcome: Outcome;
  summary: string;
  flags: ComplianceFlag[];
  concern: string;
  concernAddressed: boolean;
  concernNote: string;
  rubric: RubricNote[];
  hintsUsed: number;
  tryNext: string;
  /** Presentation mode only. */
  presentation?: import("./practicePresentation").PresentationSummary;
  generatedAt: string;
}

const flag = (quote: string, matched: string, ruleId: RuleId): ComplianceFlag => ({ quote, matched, ruleId, rule: RULE_TEXT[ruleId] });

/** Deterministic flags from the project's word lists, one per line and rule. Only John's lines are scanned. */
export function scanJohnLines(lines: string[], conversation: Conversation): ComplianceFlag[] {
  const out: ComplianceFlag[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const seen = new Set<string>();
    const add = (matched: string, ruleId: RuleId) => {
      const k = `${ruleId}|${matched.toLowerCase()}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push(flag(line, matched, ruleId));
    };
    for (const w of scanCompliance(line)) add(w, "guarantee");
    for (const w of scanCompliance(line, GUILD_CONFIG.earningsFlagWords)) add(w, "income");
    for (const w of scanCompliance(line, GUILD_CONFIG.titleFlagWords)) add(w, "title");
    if (conversation === "recruiting") {
      for (const f of scanRecruiting(line)) {
        if (f.kind === "title") add(f.text, "title");
        else if (f.kind === "pay_figure") add(f.text, "pay_figure");
        else if (f.kind === "hiring") add(f.text, "hiring");
        else if (f.kind === "scam") add(f.text, "scam_pattern");
      }
    }
  }
  return out;
}

/** Section 8.2 seeds, labeled so John knows to make them his own. */
export const RUBRIC_SEEDS: Record<Conversation, string[]> = {
  coverage: [
    "Example: edit or delete · Asked about their family before presenting anything",
    "Example: edit or delete · Explained the work coverage gap in plain words",
    "Example: edit or delete · Offered a concrete next step without promising a rate or approval",
  ],
  recruiting: [
    "Example: edit or delete · Named the industry and the company in the first minute",
    "Example: edit or delete · Said interviewing is free and what recruits pay for, before being asked twice",
    "Example: edit or delete · Kept pay general: commission-based, details are for the conversation",
    "Example: edit or delete · Answered the pyramid question directly",
  ],
};

export function normalizeRubric(raw: unknown): string[] {
  const lines = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split("\n") : [];
  return lines.map((l) => String(l ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 20);
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** True when the quote is really something John said (whitespace and case aside). */
export function saidByJohn(quote: string, johnLines: string[]): boolean {
  const q = squash(quote);
  if (q.length < 4) return false;
  return johnLines.some((l) => squash(l).includes(q));
}

export interface AiDebrief {
  summary?: string;
  concernAddressed?: boolean;
  concernNote?: string;
  rubric?: Array<{ item?: string; met?: string; evidence?: string }>;
  dodges?: Array<{ quote?: string; question?: string }>;
  tryNext?: string;
}

/**
 * Keeps only what the rules allow: rubric notes for John's own items, with
 * evidence that is really his words; dodge flags that quote him verbatim;
 * no scores. Anything the AI invented is dropped.
 */
export function validateDebrief(ai: AiDebrief | null, rubricItems: string[], johnLines: string[]): { summary: string; concernAddressed: boolean; concernNote: string; rubric: RubricNote[]; dodges: ComplianceFlag[]; tryNext: string } {
  const clean = (s: unknown, max: number) => String(s ?? "").replace(/\b\d+\s*(\/|out of)\s*\d+\b|\bscore\b|\bgrade\b/gi, "").replace(/\s+/g, " ").trim().slice(0, max);
  const rubric: RubricNote[] = rubricItems.map((item) => {
    const hit = (ai?.rubric ?? []).find((r) => squash(String(r.item ?? "")) === squash(item));
    const met = hit?.met === "yes" || hit?.met === "partly" || hit?.met === "no" ? hit.met : "not_seen";
    const evidence = hit?.evidence && saidByJohn(String(hit.evidence), johnLines) ? String(hit.evidence).trim().slice(0, 300) : "";
    return { item, met, evidence };
  });
  const dodges: ComplianceFlag[] = (ai?.dodges ?? [])
    .filter((d) => d?.quote && saidByJohn(String(d.quote), johnLines))
    .slice(0, 5)
    .map((d) => flag(String(d.quote).trim().slice(0, 300), clean(d.question, 120) || "a legitimacy question", "dodge"));
  return {
    summary: clean(ai?.summary, 300),
    concernAddressed: Boolean(ai?.concernAddressed),
    concernNote: clean(ai?.concernNote, 300),
    rubric,
    dodges,
    tryNext: clean(ai?.tryNext, 300),
  };
}
