import { describe, expect, test } from "bun:test";
import {
  decodeCampaignCookie,
  encodeCampaignCookie,
  isLeadStatus,
  parseStatusHistory,
  pushTag,
  sourceSummary,
  tagIsFresh,
  type CampaignTag,
} from "./attribution";

const tag = (slug: string, at = "2026-09-01T12:00:00.000Z"): CampaignTag => ({ questId: 3, slug, platform: "tiktok", at });

describe("campaign cookie", () => {
  test("round-trips through the cookie encoding", () => {
    const c = pushTag(null, { ...tag("baby"), seriesId: 7 });
    const back = decodeCampaignCookie(encodeCampaignCookie(c));
    expect(back).toEqual(c);
  });

  test("most recent link wins and earlier ones go to the history", () => {
    let c = pushTag(null, tag("baby"));
    c = pushTag(c, tag("armor"));
    expect(c.current.slug).toBe("armor");
    expect(c.history.map((t) => t.slug)).toEqual(["baby"]);
  });

  test("history is capped and does not repeat the same link", () => {
    let c = pushTag(null, tag("a"));
    for (const s of ["b", "c", "d", "e", "f", "g", "a"]) c = pushTag(c, tag(s));
    expect(c.current.slug).toBe("a");
    expect(c.history.length).toBeLessThanOrEqual(5);
    expect(c.history.some((t) => t.slug === "a")).toBe(false);
  });

  test("garbage decodes to null", () => {
    expect(decodeCampaignCookie("not-a-cookie")).toBeNull();
    expect(decodeCampaignCookie("")).toBeNull();
    expect(decodeCampaignCookie(encodeCampaignCookie({ current: { slug: "" } as CampaignTag, history: [] }))).toBeNull();
  });

  test("tags expire after the attribution window", () => {
    const now = Date.parse("2026-09-20T00:00:00Z");
    expect(tagIsFresh(tag("baby", "2026-09-10T00:00:00Z"), now)).toBe(true);
    expect(tagIsFresh(tag("baby", "2026-09-01T00:00:00Z"), now)).toBe(false);
    expect(tagIsFresh(tag("baby", "garbage"), now)).toBe(false);
    expect(tagIsFresh(null, now)).toBe(false);
  });
});

describe("lead outcomes", () => {
  test("keeps the original statuses and adds the new ones", () => {
    for (const s of ["New", "Contacted", "Booked", "Showed", "Sold", "Not a fit"]) expect(isLeadStatus(s)).toBe(true);
    expect(isLeadStatus("Ghosted")).toBe(false);
  });

  test("status history tolerates bad data", () => {
    expect(parseStatusHistory(null)).toEqual([]);
    expect(parseStatusHistory("nope")).toEqual([]);
    expect(parseStatusHistory(JSON.stringify([{ status: "Booked", at: "2026-09-01" }, { nope: 1 }]))).toEqual([{ status: "Booked", at: "2026-09-01" }]);
  });

  test("source summary shows the link, then the visitor's own answer", () => {
    expect(sourceSummary({})).toBe("Direct");
    expect(sourceSummary({ campaign_slug: "baby", campaign_platform: "tiktok", found_via: "friend" })).toBe("/baby (tiktok) · Said: A friend or family member");
    expect(sourceSummary({ utm_source: "ig", found_via: "google" })).toBe("ig · Said: Google");
  });
});
