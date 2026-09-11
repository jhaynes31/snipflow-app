import { QUEST_CONFIG } from "~/lib/questConfig";

/**
 * Campaign attribution (Quest Board spec, Section 8). Pure helpers shared by
 * the campaign link redirect, the lead save, and the dashboard. First-party
 * only: one cookie on John's own site, nothing from a third party.
 */

/** Cookie that remembers which campaign link a visitor came through (HttpOnly). */
export const CAMPAIGN_COOKIE = "fdm_quest";
/** A marker the browser can read, so quiz pages only report events when a link was used. */
export const CAMPAIGN_MARKER_COOKIE = "fdm_quest_on";

export interface CampaignTag {
  questId: number | null;
  slug: string;
  platform: string;
  /** Only when a series link was used. */
  seriesId?: number;
  /** Only when a per-post link was used. */
  slotId?: number;
  /** ISO time of the visit. */
  at: string;
}

export interface CampaignCookie {
  current: CampaignTag;
  /** Earlier links this visitor came through, newest first (Section 8.2). */
  history: CampaignTag[];
}

export const MAX_TAG_HISTORY = 5;

/** The most recent link wins; earlier ones are kept in the history. */
export function pushTag(existing: CampaignCookie | null, tag: CampaignTag): CampaignCookie {
  if (!existing) return { current: tag, history: [] };
  const history = [existing.current, ...existing.history].filter((t) => t.slug !== tag.slug).slice(0, MAX_TAG_HISTORY);
  return { current: tag, history };
}

/** True while the tag is inside the attribution window (config, 14 days). */
export function tagIsFresh(tag: CampaignTag | null | undefined, now = Date.now(), days = QUEST_CONFIG.attributionWindowDays): boolean {
  if (!tag?.at) return false;
  const at = Date.parse(tag.at);
  if (!Number.isFinite(at)) return false;
  return now - at <= days * 86_400_000 && at <= now + 60_000;
}

const b64 = {
  enc: (s: string) => (typeof Buffer !== "undefined" ? Buffer.from(s, "utf8").toString("base64url") : btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")),
  dec: (s: string) => {
    if (typeof Buffer !== "undefined") return Buffer.from(s, "base64url").toString("utf8");
    const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  },
};

/** Cookie-safe text for the tag record. */
export function encodeCampaignCookie(c: CampaignCookie): string {
  return b64.enc(JSON.stringify(c));
}

function cleanTag(v: unknown): CampaignTag | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const slug = String(o.slug ?? "").slice(0, 40);
  if (!slug) return null;
  const num = (x: unknown) => {
    const n = Number(x);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  };
  return {
    questId: num(o.questId) ?? null,
    slug,
    platform: String(o.platform ?? "").slice(0, 40),
    seriesId: num(o.seriesId),
    slotId: num(o.slotId),
    at: String(o.at ?? "").slice(0, 40),
  };
}

/** Null for anything malformed, so a bad cookie never breaks a lead save. */
export function decodeCampaignCookie(raw: string | undefined | null): CampaignCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(b64.dec(raw)) as Record<string, unknown>;
    const current = cleanTag(parsed.current);
    if (!current) return null;
    const history = Array.isArray(parsed.history) ? parsed.history.map(cleanTag).filter((t): t is CampaignTag => Boolean(t)).slice(0, MAX_TAG_HISTORY) : [];
    return { current, history };
  } catch {
    return null;
  }
}

// ── "Where did you find John?" (Section 8.3) ──────────────────────

export const FOUND_VIA_OPTIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "friend", label: "A friend or family member" },
  { id: "google", label: "Google" },
  { id: "other", label: "Other" },
] as const;

export type FoundVia = (typeof FOUND_VIA_OPTIONS)[number]["id"];

export function foundViaLabel(id: string | undefined | null): string {
  return FOUND_VIA_OPTIONS.find((o) => o.id === id)?.label ?? (id ? String(id) : "");
}

export function isFoundVia(v: unknown): v is FoundVia {
  return FOUND_VIA_OPTIONS.some((o) => o.id === v);
}

// ── Lead outcomes (Section 8.4) ───────────────────────────────────

/**
 * The dashboard's status column, extended. The first three keep their
 * original names and meanings; the last three are new.
 */
export const LEAD_STATUSES = ["New", "Contacted", "Booked", "Showed", "Sold", "Not a fit"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(v: unknown): v is LeadStatus {
  return LEAD_STATUSES.includes(v as LeadStatus);
}

export const NOT_A_FIT_REASONS = [
  { id: "not_ready", label: "Not ready yet" },
  { id: "just_curious", label: "Just curious" },
  { id: "already_covered", label: "Already covered" },
  { id: "outside_area", label: "Outside John's area" },
  { id: "price", label: "Price" },
  { id: "other", label: "Other" },
] as const;
export type NotAFitReason = (typeof NOT_A_FIT_REASONS)[number]["id"];

export const PRODUCT_TYPES = [
  { id: "term_life", label: "Term life" },
  { id: "other", label: "Other" },
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number]["id"];

export function reasonLabel(id: string | undefined | null): string {
  return NOT_A_FIT_REASONS.find((r) => r.id === id)?.label ?? "";
}

export function productLabel(id: string | undefined | null): string {
  return PRODUCT_TYPES.find((p) => p.id === id)?.label ?? "";
}

export interface StatusChange {
  status: string;
  at: string;
}

/** Parse the stored history, tolerating an empty or damaged value. */
export function parseStatusHistory(raw: unknown): StatusChange[] {
  try {
    const p = JSON.parse(String(raw ?? ""));
    if (!Array.isArray(p)) return [];
    return p
      .map((x) => (x && typeof x === "object" ? { status: String((x as StatusChange).status ?? ""), at: String((x as StatusChange).at ?? "") } : null))
      .filter((x): x is StatusChange => Boolean(x && x.status));
  } catch {
    return [];
  }
}

/** Short text for the source column: link first, then the visitor's own answer. */
export function sourceSummary(lead: { campaign_slug?: string | null; campaign_platform?: string | null; found_via?: string | null; utm_source?: string; utm_medium?: string; utm_campaign?: string }): string {
  const parts: string[] = [];
  if (lead.campaign_slug) parts.push(`/${lead.campaign_slug}${lead.campaign_platform ? ` (${lead.campaign_platform})` : ""}`);
  const utm = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ");
  if (utm) parts.push(utm);
  if (lead.found_via) parts.push(`Said: ${foundViaLabel(lead.found_via)}`);
  return parts.length ? parts.join(" · ") : "Direct";
}
