import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { QUEST_CONFIG, generatorById, type GeneratorId } from "~/lib/questConfig";
import { isFinalPart, seriesOpener, teaseFor, type CampaignBrief, type CampaignContext } from "~/lib/campaign";
import { scanCompliance } from "~/lib/compliance";
import { buildTopicGroups, statFactFor } from "~/server/topics";

/**
 * Campaign brief and save-back (campaign manager spec, Sections 7.1 to 7.4):
 * a slot hands its brief to the forge, the forge saves its output back to
 * the slot, and generated text is scanned for compliance words.
 */

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const parseJson = <T,>(v: unknown, fallback: T): T => {
  try {
    return (JSON.parse(String(v ?? "")) ?? fallback) as T;
  } catch {
    return fallback;
  }
};

/** Planned-topic words → the topic bank group whose facts fit. Checked in order; first hit wins. */
const TOPIC_ALIASES: Array<[RegExp, string]> = [
  [/beneficiar/i, "Beneficiaries"],
  [/\bwill\b|trust|estate|probate/i, "Wills and Trusts"],
  [/work coverage|through work|employer|group life|job|benefit|leave|quit|laid off|convert/i, "Life Changes"],
  [/how much|amount|enough coverage|dime|size/i, "Life Insurance Amounts"],
  [/rider/i, "Life Insurance Riders"],
  [/term life|life insurance|coverage|policy|premium|armor|shield/i, "Term Life Insurance"],
  [/emergency|cushion|rainy day/i, "Emergency Fund"],
  [/budget|spending|where the money goes/i, "Budgeting"],
  [/debt|credit card|loan|payoff|interest rate|apr/i, "Getting Out of Debt"],
  [/credit score|credit report/i, "Building Credit"],
  [/retire|401|ira|compound/i, "Retirement Planning"],
  [/invest|market|diversif/i, "Investments"],
  [/college|education|tuition/i, "College Savings"],
  [/home|mortgage|house|rent/i, "Home Buying"],
  [/baby|kid|child|family|parent|guardian/i, "Family and Kids"],
  [/saving|save|paycheck/i, "Saving"],
  [/tax/i, "Taxes"],
  [/goal|net worth|freedom/i, "Financial Goals"],
];

/** The best fitting verified fact from the topic bank for a planned topic. John can still edit it in the picker. */
function factForTopic(topic: string): { topic: string; fact: string } {
  const groups = buildTopicGroups();
  const byName = (name: string) => groups.find((g) => g.topic.toLowerCase() === name.toLowerCase());
  // 1. An exact topic name from the bank.
  const exact = byName(topic);
  if (exact?.facts.length) return { topic: exact.topic, fact: statFactFor(exact.topic, "") ?? exact.facts[0] };
  // 2. A keyword alias.
  for (const [re, name] of TOPIC_ALIASES) {
    if (re.test(topic)) {
      const g = byName(name);
      if (g?.facts.length) return { topic: g.topic, fact: statFactFor(g.topic, "") ?? g.facts[0] };
    }
  }
  // 3. Word overlap with a topic name, ignoring short words.
  const words = topic.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  let best: { topic: string; facts: string[] } | null = null;
  let bestScore = 0;
  for (const g of groups) {
    const score = words.filter((w) => g.topic.toLowerCase().includes(w)).length;
    if (score > bestScore) {
      best = g;
      bestScore = score;
    }
  }
  if (best?.facts.length) return { topic: best.topic, fact: statFactFor(best.topic, "") ?? best.facts[0] };
  const fallback = byName("Financial Literacy") ?? groups[0];
  return { topic, fact: fallback?.facts[0] ?? "" };
}

/** "Take the free quiz at thefinancialdm.com/baby." */
export function spokenLineFor(slug: string): string {
  return `Take the free quiz at ${QUEST_CONFIG.siteDomain}/${slug}.`;
}

async function outputSummary(ref: string): Promise<string> {
  const [kind, idRaw] = ref.split(":");
  const id = Number(idRaw);
  if (!id) return "";
  try {
    if (kind === "script") {
      const r = (await sql()`SELECT title, hook FROM saved_scripts WHERE id = ${id}`) as Array<{ title: string; hook: string | null }>;
      return r[0] ? `${r[0].title}${r[0].hook ? `: ${r[0].hook}` : ""}` : "";
    }
    if (kind === "carousel") {
      const r = (await sql()`SELECT title FROM saved_carousels WHERE id = ${id}`) as Array<{ title: string }>;
      return r[0]?.title ?? "";
    }
  } catch {
    /* summary is optional */
  }
  return "";
}

export const getCampaignBrief = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { slotId: number }) => ({ slotId: Number(d?.slotId) }))
  .handler(async ({ data }): Promise<CampaignBrief | null> => {
    const slots = (await sql()`SELECT * FROM content_slots WHERE id = ${data.slotId}`) as Array<Record<string, unknown>>;
    if (!slots.length) return null;
    const s = slots[0];
    const quests = (await sql()`SELECT q.*, p.name AS profile_name, p.life_stage, p.triggers, p.pain_points, p.worries FROM quests q LEFT JOIN client_profiles p ON p.id = q.profile_id WHERE q.id = ${Number(s.quest_id)}`) as Array<Record<string, unknown>>;
    if (!quests.length) return null;
    const q = quests[0];
    const generator = (generatorById(String(s.generator))?.id ?? "script") as GeneratorId;
    const gen = generatorById(generator)!;
    const offerQuiz = q.offer_quiz === "financial" ? "financial" : "life_insurance";

    // The link the post should speak: the most specific one John set up
    // (Section 8.1). A post link tracks this one post, a series link tracks
    // the series, and otherwise the quest's own link is used.
    let slug = String(q.slug ?? "");
    let series: CampaignBrief["series"];
    if (s.series_id != null) {
      const sr = (await sql()`SELECT * FROM quest_series WHERE id = ${Number(s.series_id)}`) as Array<Record<string, unknown>>;
      if (sr.length) {
        if (sr[0].slug) slug = String(sr[0].slug);
        const kind = sr[0].kind === "multi_part" ? "multi_part" : "recurring";
        series = { name: String(sr[0].name ?? ""), kind, outline: parseJson<string[]>(sr[0].outline, []) };
        if (kind === "multi_part") {
          series.partNumber = s.part_number == null ? undefined : Number(s.part_number);
          series.totalParts = sr[0].total_parts == null ? undefined : Number(sr[0].total_parts);
          if (series.partNumber && series.partNumber > 1) {
            const prev = (await sql()`SELECT generator_output_ref, topic, hook_angle FROM content_slots WHERE series_id = ${Number(s.series_id)} AND part_number = ${series.partNumber - 1} LIMIT 1`) as Array<{ generator_output_ref: string; topic: string; hook_angle: string }>;
            if (prev[0]) {
              const fromOutput = prev[0].generator_output_ref ? await outputSummary(prev[0].generator_output_ref) : "";
              series.previousPartSummary = fromOutput || [prev[0].topic, prev[0].hook_angle].filter(Boolean).join(": ") || series.outline?.[series.partNumber - 2] || "";
            }
          }
        }
      }
    }

    if (s.post_slug) slug = String(s.post_slug);
    const spokenLine = spokenLineFor(slug);
    const url = `https://${QUEST_CONFIG.siteDomain}/${slug}`;

    const triggers = parseJson<string[]>(q.triggers, []);
    const pains = parseJson<string[]>(q.pain_points, []);
    const profileName = String(q.profile_name ?? "");
    const lifeStage = String(q.life_stage ?? "");
    const profileSummary = [profileName, lifeStage, triggers.length ? `Moments: ${triggers.join(", ")}` : "", pains.length ? `Pain points: ${pains.join(" | ")}` : "", q.worries ? `Worry: ${String(q.worries)}` : ""].filter(Boolean).join(". ");
    const topicPick = factForTopic(String(s.topic ?? ""));

    return {
      questId: Number(q.id),
      slotId: Number(s.id),
      questName: String(q.name ?? ""),
      spokenLine,
      url,
      series,
      teaseLine: QUEST_CONFIG.seriesTeaseLine,
      date: String(s.date ?? ""),
      profileSummary,
      profileName,
      lifeStage,
      topic: String(s.topic ?? "") || topicPick.topic,
      fact: topicPick.fact,
      painPoint: String(s.pain_point ?? "") || pains[0] || "",
      hookAngle: String(s.hook_angle ?? ""),
      generator,
      forgeTab: gen.forgeTab ?? null,
      generatorAvailable: gen.available,
      quizLabel: QUEST_CONFIG.quizzes[offerQuiz].label,
      status: String(s.status ?? "idea"),
      generatorOutputRef: String(s.generator_output_ref ?? ""),
    };
  });

/**
 * Attach a generator's saved output to its slot (Section 7.2): the slot
 * moves to Drafted (an approved slot goes back to Drafted, a posted one is
 * left alone), the previous draft is kept in the history, and the text is
 * scanned for compliance words.
 */
export const attachOutputToSlot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { slotId: number; ref: string; text: string }) => ({ slotId: Number(d?.slotId), ref: text(d?.ref, 80), text: text(d?.text, 20000) }))
  .handler(async ({ data }): Promise<{ ok: boolean; flags: string[]; status?: string; error?: string }> => {
    if (!data.slotId || !/^(script|carousel|cards|meme):\d+$/.test(data.ref)) return { ok: false, flags: [], error: "Nothing to attach." };
    try {
      const rows = (await sql()`SELECT status, generator_output_ref, output_history, flags FROM content_slots WHERE id = ${data.slotId}`) as Array<Record<string, unknown>>;
      if (!rows.length) return { ok: false, flags: [], error: "That slot no longer exists." };
      const cur = rows[0];
      const history = parseJson<string[]>(cur.output_history, []);
      const prevRef = String(cur.generator_output_ref ?? "");
      if (prevRef && prevRef !== data.ref) history.unshift(prevRef);
      const flags = scanCompliance(data.text);
      const prevFlags = parseJson<string[]>(cur.flags, []);
      const sameFlags = JSON.stringify(prevFlags) === JSON.stringify(flags);
      const status = cur.status === "posted" ? "posted" : "drafted";
      await sql()`
        UPDATE content_slots SET generator_output_ref = ${data.ref}, output_history = ${JSON.stringify(history.slice(0, 20))}, flags = ${JSON.stringify(flags)},
          flags_acknowledged = ${flags.length === 0 ? true : sameFlags ? Boolean(cur.flags_acknowledged) : false}, status = ${status}, updated_at = NOW()
        WHERE id = ${data.slotId}
      `;
      return { ok: true, flags, status };
    } catch (e) {
      console.error("[campaign] attach failed:", e);
      return { ok: false, flags: [], error: "Could not save to the quest." };
    }
  });

export const acknowledgeFlags = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { slotId: number }) => ({ slotId: Number(d?.slotId) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`UPDATE content_slots SET flags_acknowledged = TRUE, updated_at = NOW() WHERE id = ${data.slotId}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Prompt context for the generators ─────────────────────────────

/** Plain text appended to a generator's user message when a campaign brief is attached. */
export function campaignPromptBlock(c: CampaignContext | undefined, medium: "script" | "carousel" | "card" | "meme"): string {
  if (!c) return "";
  const lines = [`CAMPAIGN CONTEXT (quest "${c.questName}"):`];
  const opener = seriesOpener(c.series);
  if (c.series?.kind === "multi_part") {
    lines.push(`- This is ${opener}${c.series.totalParts ? ` (${c.series.totalParts} parts)` : ""}. ${medium === "script" ? "Open by naming it out loud, e.g. \"" + opener + ".\"" : "Name the part in the first slide or line."}`);
    if (c.series.outline?.length) lines.push(`- Series outline: ${c.series.outline.map((l, i) => `(${i + 1}) ${l}`).join(" ")}`);
    if (c.series.previousPartSummary) lines.push(`- The previous part covered: ${c.series.previousPartSummary}. Stay consistent with it and do not repeat it.`);
    const tease = teaseFor(c.teaseLine ?? "", c.series);
    if (medium === "script") lines.push(isFinalPart(c.series) ? `- This is the final part: close the story, then end with the spoken line below.` : `- Before the spoken line, say exactly: "${tease}"`);
  } else if (c.series?.kind === "recurring") {
    lines.push(`- This post is an episode of the show "${c.series.name}". ${medium === "script" ? "Open by saying the show's name" : "Lead with the show's name"} so viewers learn to recognize it.`);
  }
  if (medium === "script") lines.push(`- The script must END with this exact spoken line: "${c.spokenLine}" Use it as the callToAction too.`);
  else lines.push(`- Every caption and the closing line must end with: "${c.spokenLine}"`);
  lines.push(`- Never promise returns, rates, or approval.`);
  return lines.join("\n");
}
