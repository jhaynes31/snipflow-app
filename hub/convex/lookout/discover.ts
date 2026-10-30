"use node";

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { fingerprint } from "./pure";
import { htmlToText, isFeed, takeInTurns, openFromPage, parseSource, sourceUrl, titleFits, usFriendly, type Posting, type Source } from "./sources";

/**
 * Finding and rechecking jobs. Only public posting APIs are called (see
 * sources.ts), each at most once per search, and searches are limited to
 * one every twenty hours. Listings are kept only when the title fits one of
 * his categories, isn't a sales title, and isn't limited to another country;
 * everything else is dropped before it's stored, so the list stays short.
 */
const UA = "TheShire-Lookout/1.0 (+private household job search; one request per source per day)";
const MIN_GAP_MS = 20 * 60 * 60 * 1000;
/** "Search now" by hand can run again after two hours, so a new source can be tried the same day. */
const MANUAL_GAP_MS = 2 * 60 * 60 * 1000;

async function getJson(url: string, asText = false): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": UA, accept: asText ? "application/rss+xml, application/xml, text/xml" : "application/json" } });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: asText ? await res.text() : await res.json() };
  } finally {
    clearTimeout(timer);
  }
}

/** SmartRecruiters lists jobs without their text; fetch it for the few that fit. */
async function smartRecruitersDetail(p: Posting, token: string): Promise<Posting> {
  try {
    const res = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings/${encodeURIComponent(p.sourceId)}`);
    const sections = ((res.data as { jobAd?: { sections?: Record<string, { text?: string }> } } | null)?.jobAd?.sections) ?? {};
    const text = Object.values(sections).map((x) => htmlToText(x?.text ?? "")).filter(Boolean).join("\n\n");
    return text ? { ...p, description: `${p.description}\n\n${text}` } : p;
  } catch {
    return p;
  }
}

interface SourceResult {
  name: string;
  found: number;
  kept: Posting[];
  problem?: string;
}

async function readSource(source: Source, keywords: string[]): Promise<SourceResult> {
  const recent = Date.now() - 45 * 86400000;
  try {
    const res = await getJson(sourceUrl(source), isFeed(source.kind));
    if (!res.ok) return { name: source.name, found: 0, kept: [], problem: `answered ${res.status}${res.status === 404 ? " (check the board name)" : res.status === 403 || res.status === 429 ? " (the site turned the request away; it may work next time)" : ""}` };
    const postings = parseSource(source, res.data);
    const kept: Posting[] = [];
    for (const p of postings) {
      if (!titleFits(p.title, keywords)) continue;
      if (!usFriendly(p.location)) continue;
      if (p.postedAt && p.postedAt < recent) continue;
      kept.push(p);
    }
    const filled = source.kind === "smartrecruiters" ? await Promise.all(kept.slice(0, 20).map((p) => smartRecruitersDetail(p, source.token))) : kept;
    return { name: source.name, found: postings.length, kept: filled.map((p) => ({ ...p, description: [p.description, p.payLine].filter(Boolean).join("\n\n") })), problem: postings.length === 0 ? "answered, but with no listings" : undefined };
  } catch (err) {
    return { name: source.name, found: 0, kept: [], problem: err instanceof Error && err.name === "AbortError" ? "took too long to answer" : "couldn't be reached" };
  }
}

async function search(ctx: ActionCtx, ownerId: Id<"profiles">, manual: boolean): Promise<{ found: number; kept: number; fresh: number; note: string }> {
  const plan = await ctx.runQuery(internal.lookout.data.searchPlan, { ownerId });
  if (!plan) return { found: 0, kept: 0, fresh: 0, note: "The Lookout isn't set up." };
  const s = plan.settings;
  const gap = manual ? MANUAL_GAP_MS : MIN_GAP_MS;
  if (s.lastSearchAt && Date.now() - s.lastSearchAt < gap) return { found: 0, kept: 0, fresh: 0, note: manual ? "Searched less than two hours ago, so the sites weren't asked again yet." : "Searched in the last day already." };
  // Every source at once; each is a different site, asked once.
  const results = await Promise.all((s.sources.filter((x) => x.enabled) as Source[]).map((src) => readSource(src, s.keywords)));
  const found = results.reduce((n, r) => n + r.found, 0);
  const notes = results.filter((r) => r.problem).map((r) => `${r.name}: ${r.problem}.`);
  // Newest first from each source, taken in turns so one busy site can't crowd out the rest, with a ceiling per search.
  const kept = takeInTurns(results.map((r) => [...r.kept].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0))), 80);
  const batch = kept.map((p) => ({ title: p.title, employer: p.employer, url: p.url, applyUrl: p.applyUrl, location: p.location, description: p.description.slice(0, 40000), sourceKind: p.sourceKind, sourceName: p.sourceName, sourceId: p.sourceId || undefined, postedAt: p.postedAt, deadline: p.deadline }));
  const answered = results.filter((r) => r.found > 0).length;
  const note = `Read ${results.length} sources (${answered} with listings), looked at ${found} listings, kept ${batch.length} that fit.${notes.length ? ` ${notes.join(" ")}` : ""}`;
  const bySource = results.map((r) => ({ name: r.name, found: r.found, kept: r.kept.length, problem: r.problem }));
  const fresh: number = await ctx.runMutation(internal.lookout.data.storeFound, { ownerId, postings: batch, note, bySource });
  return { found, kept: batch.length, fresh, note };
}

async function recheckOne(ctx: ActionCtx, job: { id: Id<"loJobs">; url: string }): Promise<"yes" | "no" | "unknown"> {
  let open: "yes" | "no" | "unknown" = "unknown";
  let fp: string | undefined;
  let note = "Couldn't reach the listing.";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(job.url, { signal: controller.signal, redirect: "follow", headers: { "user-agent": UA, accept: "text/html,application/json" } });
    clearTimeout(timer);
    const body = await res.text();
    open = openFromPage(res.status, body);
    fp = res.ok ? fingerprint(body.replace(/<[^>]+>/g, " ").slice(0, 200000)) : undefined;
    note = open === "no" ? `The listing page says it's closed (checked ${new Date().toISOString().slice(0, 10)}).` : open === "yes" ? `The listing page answered (checked ${new Date().toISOString().slice(0, 10)}).` : `The listing page answered ${res.status}.`;
  } catch {
    // Left unknown.
  }
  await ctx.runMutation(internal.lookout.data.recordCheck, { jobId: job.id, open, fingerprint: fp, note });
  return open;
}

/** "Search now", by hand. At most once every two hours, to stay light on the sites. */
export const searchNow = action({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx): Promise<{ found: number; kept: number; fresh: number; note: string }> => {
    const who = await ctx.runQuery(internal.lookout.data.whoFor, {});
    return await search(ctx, who.ownerId, true);
  },
});

/** "Is it still open?" on one job. */
export const recheck = action({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args): Promise<"yes" | "no" | "unknown"> => {
    const job = await ctx.runQuery(internal.lookout.data.oneToCheck, { jobId: args.jobId });
    return await recheckOne(ctx, job);
  },
});

/** The scheduled search, when he turned it on: new listings, then a recheck of the ones he's keeping. */
export const tick = internalAction({
  args: {},
  handler: async (ctx) => {
    const owners: Id<"profiles">[] = await ctx.runQuery(internal.lookout.data.scheduledOwners, {});
    for (const ownerId of owners) {
      try {
        const result = await search(ctx, ownerId, false);
        const jobs = await ctx.runQuery(internal.lookout.data.toRecheck, { ownerId });
        for (const j of jobs) await recheckOne(ctx, j);
        const strong: number = await ctx.runQuery(internal.lookout.data.strongNew, { ownerId });
        // One quiet note, only when there's something worth opening.
        if (result.fresh > 0 && strong > 0) {
          await ctx.runMutation(internal.push.notify.send, { profileId: ownerId, title: "The Lookout found something", body: strong === 1 ? "One new job looks like a strong match." : `${strong} new jobs look like strong matches.`, url: "/lookout", tag: "lookout-digest" });
        }
      } catch (err) {
        console.error("Lookout: scheduled search failed", err instanceof Error ? err.message : err);
      }
    }
  },
});
