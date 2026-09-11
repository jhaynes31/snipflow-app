/**
 * The campaign brief (campaign manager spec, Section 7.1): what a planned
 * slot hands to a generator. Shared by the server (which builds it and
 * writes it into prompts) and the forge (which prefills from it).
 * Campaign context is always optional: without it every generator behaves
 * exactly as it does today.
 */
import type { GeneratorId } from "./questConfig";

export interface CampaignSeries {
  name: string;
  kind: "multi_part" | "recurring";
  partNumber?: number;
  totalParts?: number;
  outline?: string[];
  /** Multi-part only: what the previous part covered. */
  previousPartSummary?: string;
}

/** The part of the brief a generator's server call needs. */
export interface CampaignContext {
  questId: number;
  slotId: number;
  questName: string;
  /** Said out loud at the end, e.g. "Take the free quiz at thefinancialdm.com/baby." */
  spokenLine: string;
  /** The campaign link, e.g. https://thefinancialdm.com/baby */
  url: string;
  series?: CampaignSeries;
  /** For every multi-part part but the last, spoken before the CTA. */
  teaseLine?: string;
}

export interface CampaignBrief extends CampaignContext {
  date: string;
  profileSummary: string;
  profileName: string;
  lifeStage: string;
  topic: string;
  /** A verified fact from the topic bank that fits the topic, so the forge has its talking point. */
  fact: string;
  painPoint: string;
  hookAngle: string;
  generator: GeneratorId;
  forgeTab: "script" | "carousel" | "card" | "meme" | null;
  generatorAvailable: boolean;
  quizLabel: string;
  status: string;
  generatorOutputRef: string;
}

/** Is this the last part of a multi-part series (or not a series at all)? */
export function isFinalPart(series?: CampaignSeries): boolean {
  if (!series || series.kind !== "multi_part") return true;
  return !series.partNumber || !series.totalParts || series.partNumber >= series.totalParts;
}

/** "Part 2 of New Parent Armor" for scripts to open with; the show's name for recurring shows. */
export function seriesOpener(series?: CampaignSeries): string | null {
  if (!series) return null;
  if (series.kind === "multi_part" && series.partNumber) return `Part ${series.partNumber} of ${series.name}`;
  return series.name;
}

/** Fill {next} in the tease line for the part after this one. */
export function teaseFor(template: string, series?: CampaignSeries): string | null {
  if (!series || isFinalPart(series) || !series.partNumber) return null;
  return template.replace("{next}", String(series.partNumber + 1));
}

/** Make sure a spoken script ends with the tease (if any) and the CTA line, without doubling them. */
export function ensureSpokenEnding(body: string, campaign: CampaignContext | undefined): string {
  if (!campaign) return body;
  let out = (body || "").trimEnd();
  const tease = teaseFor(campaign.teaseLine ?? "", campaign.series);
  const hasCta = out.toLowerCase().includes(campaign.spokenLine.toLowerCase().replace(/\.$/, ""));
  const hasTease = tease ? out.toLowerCase().includes(tease.toLowerCase().replace(/\.$/, "")) : true;
  if (hasCta && hasTease) return out;
  // Strip a CTA that landed before the tease so the order is tease, then CTA.
  if (hasCta && !hasTease) {
    const idx = out.toLowerCase().lastIndexOf(campaign.spokenLine.toLowerCase().replace(/\.$/, ""));
    out = out.slice(0, idx).trimEnd().replace(/[\s\n]*$/, "");
  }
  if (tease && !hasTease) out = `${out}\n\n${tease}`;
  return `${out}\n\n${campaign.spokenLine}`;
}

/** Captions and closing lines end with the spoken CTA line. */
export function ensureCtaLine(text: string, campaign: CampaignContext | undefined): string {
  if (!campaign) return text;
  const t = (text || "").trim();
  return t.toLowerCase().includes(campaign.url.replace(/^https?:\/\//, "").toLowerCase()) ? t : `${t} ${campaign.spokenLine}`.trim();
}

/** The server-call subset of a brief. */
export function contextOf(b: CampaignBrief): CampaignContext {
  return { questId: b.questId, slotId: b.slotId, questName: b.questName, spokenLine: b.spokenLine, url: b.url, series: b.series, teaseLine: b.teaseLine };
}
