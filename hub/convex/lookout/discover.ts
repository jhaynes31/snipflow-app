"use node";

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { fingerprint, missingExperience, parsePay, requiresDegree, seniorInText } from "./pure";
import { htmlToText, isFeed, MANAGES_PEOPLE, RETIRED_KINDS, takeInTurns, openFromPage, parseSource, sourceUrl, titleFits, usFriendly, type Posting, type Source } from "./sources";
import { INSURANCE_PRESET, insuranceSources, insuranceTitleFits, watchSource, type InsuranceConfig } from "./insurance";

/**
 * Finding and rechecking jobs. Only public posting APIs are called (see
 * sources.ts), each at most once per search, and searches are limited to
 * one every twenty hours. Listings are kept only when the title fits one of
 * his categories, isn't a sales title, and isn't limited to another country;
 * everything else is dropped before it's stored, so the list stays short.
 */
const UA = "TheShire-Lookout/1.0 (+private household job search; one request per source per day)";
const MIN_GAP_MS = 20 * 60 * 60 * 1000;
/** "Search now" or "Refresh" by hand can run again after half an hour, light enough on the sites. */
const MANUAL_GAP_MS = 30 * 60 * 1000;

async function getJson(url: string, asText = false, extra: Record<string, string> = {}, post?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, { signal: controller.signal, method: post === undefined ? "GET" : "POST", body: post === undefined ? undefined : JSON.stringify(post), headers: { "user-agent": UA, accept: asText ? "application/rss+xml, application/xml, text/xml" : "application/json", ...(post === undefined ? {} : { "content-type": "application/json" }), ...extra } });
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

async function workdayList(url: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const first = await getJson(url, false, {}, { appliedFacets: {}, limit: 20, offset: 0, searchText: "" });
  if (!first.ok) return first;
  const second = await getJson(url, false, {}, { appliedFacets: {}, limit: 20, offset: 20, searchText: "" });
  const jobs = [...(((first.data as { jobPostings?: unknown[] }) ?? {}).jobPostings ?? []), ...(second.ok ? (((second.data as { jobPostings?: unknown[] }) ?? {}).jobPostings ?? []) : [])];
  return { ok: true, status: first.status, data: { jobPostings: jobs } };
}

/** Workday and BambooHR list jobs without their text; fetch it for the ones that fit. */
async function boardDetail(p: Posting, source: Source): Promise<Posting> {
  try {
    if (source.kind === "workday") {
      const [host, tenant, site] = source.token.split("|");
      const res = await getJson(`https://${host}/wday/cxs/${tenant}/${site}${p.sourceId}`);
      const info = ((res.data as { jobPostingInfo?: Record<string, unknown> } | null)?.jobPostingInfo) ?? {};
      const text = [htmlToText(String(info.jobDescription ?? "")), String(info.timeType ?? ""), String(info.remoteType ?? ""), String(info.location ?? "")].filter((x) => x && x !== "undefined").join("\n\n");
      return text ? { ...p, description: `${p.description}\n\n${text}` } : p;
    }
    if (source.kind === "bamboohr") {
      const res = await getJson(`https://${encodeURIComponent(source.token)}.bamboohr.com/careers/${encodeURIComponent(p.sourceId)}/detail`);
      const job = ((res.data as { result?: { jobOpening?: Record<string, unknown> } } | null)?.result?.jobOpening) ?? {};
      const text = [htmlToText(String(job.description ?? "")), job.compensation ? `Pay: ${String(job.compensation)}` : ""].filter(Boolean).join("\n\n");
      return text ? { ...p, description: `${p.description}\n\n${text}` } : p;
    }
  } catch {
    // The list entry is kept as it is.
  }
  return p;
}

interface SourceResult {
  name: string;
  found: number;
  kept: Posting[];
  /** Listings that fit but don't state pay, left out when pay is required. */
  noPay: number;
  /** Listings left out because they manage people. */
  senior?: number;
  /** Listings left out because they ask for years of experience in something he hasn't done. */
  experience?: number;
  /** Listings left out because they require a bachelor's degree or higher. */
  degree?: number;
  problem?: string;
}

interface Creds {
  usajobs: { email: string; key: string } | null;
  adzuna: { appId: string; key: string } | null;
  jooble: { key: string } | null;
}

/** What a search leaves out besides title and country, set in Settings. */
interface Rules {
  requirePay: boolean;
  allowSenior: boolean;
  allowDegree: boolean;
  /** His confirmed history and answers, for the experience check. */
  profile: string;
}

async function readSource(source: Source, keywords: string[], rules: Rules, creds: Creds): Promise<SourceResult> {
  const { usajobs, adzuna, jooble } = creds;
  const { requirePay, allowSenior, allowDegree, profile } = rules;
  const recent = Date.now() - 45 * 86400000;
  try {
    // USAJOBS asks for its key and the email it was sent to on every request.
    if (source.kind === "usajobs" && !usajobs) return { name: source.name, found: 0, kept: [], noPay: 0, problem: "waiting for the USAJOBS key (Settings, USAJOBS)" };
    if (source.kind === "adzuna" && !adzuna) return { name: source.name, found: 0, kept: [], noPay: 0, problem: "waiting for the Adzuna app ID and key (Settings, Adzuna)" };
    if (source.kind === "jooble" && !jooble) return { name: source.name, found: 0, kept: [], noPay: 0, problem: "waiting for the Jooble key (Settings, Jooble)" };
    const headers: Record<string, string> = source.kind === "usajobs" && usajobs ? { "user-agent": usajobs.email, "authorization-key": usajobs.key } : {};
    const url = source.kind === "adzuna" && adzuna ? `${sourceUrl(source)}&app_id=${encodeURIComponent(adzuna.appId)}&app_key=${encodeURIComponent(adzuna.key)}` : sourceUrl(source);
    // Workday's list is a POST, twenty at a time; two pages are read.
    const res =
      source.kind === "workday"
        ? await workdayList(url)
        : source.kind === "jooble" && jooble
          ? await getJson(`${url}${encodeURIComponent(jooble.key)}`, false, {}, { keywords: `remote ${source.token}`, location: "United States", page: "1" })
          : await getJson(url, isFeed(source.kind), headers);
    if (!res.ok) return { name: source.name, found: 0, kept: [], noPay: 0, problem: `answered ${res.status}${source.kind === "usajobs" && (res.status === 401 || res.status === 403) ? " (check the USAJOBS key and email in Settings)" : source.kind === "adzuna" && (res.status === 401 || res.status === 403) ? " (check the Adzuna app ID and key in Settings)" : source.kind === "jooble" && (res.status === 401 || res.status === 403 || res.status === 404) ? " (check the Jooble key in Settings)" : res.status === 404 ? " (check the board name)" : res.status === 403 || res.status === 429 ? " (the site turned the request away; it may work next time)" : ""}` };
    const postings = parseSource(source, res.data);
    const kept: Posting[] = [];
    // The insurance preset keeps insurance sales titles, which the main search drops on purpose.
    const insurance = source.preset === INSURANCE_PRESET;
    for (const p of postings) {
      if (insurance ? !insuranceTitleFits(p.title) : !titleFits(p.title, keywords, allowSenior)) continue;
      if (!usFriendly(p.location)) continue;
      if (p.postedAt && p.postedAt < recent) continue;
      kept.push(p);
    }
    const filled = (source.kind === "smartrecruiters" ? await Promise.all(kept.slice(0, 20).map((p) => smartRecruitersDetail(p, source.token))) : source.kind === "workday" || source.kind === "bamboohr" ? await Promise.all(kept.slice(0, 20).map((p) => boardDetail(p, source))) : kept).map((p) => ({ ...p, description: [p.description, p.payLine, p.seniority ? (/^gs-/i.test(p.seniority) ? `Grade: ${p.seniority}` : `Level: ${p.seniority}`) : ""].filter(Boolean).join("\n\n") }));
    // Jobs that don't say what they pay are left out (Jen, 2026-11-02), and counted so the log shows it.
    // Listings that manage people are above his level whatever the title says.
    // Above his level: managing people, or marked senior by the site or the listing's own words.
    const level = filled.filter((p) => !MANAGES_PEOPLE.test(p.description) && (allowSenior || !seniorInText(p.description)));
    // Years of experience in something he hasn't done (Jen, 2026-11-13).
    // The preset's fit badge reads experience asks and pay itself, so neither leaves a job out here.
    const able = insurance ? level : level.filter((p) => !missingExperience(p.description, profile));
    // Jobs that require a bachelor's degree or higher are left out (Jen, 2026-11-12).
    const noDegree = allowDegree ? able : able.filter((p) => !requiresDegree(`${p.title}\n${p.description}`));
    const paid = requirePay && !insurance ? noDegree.filter((p) => parsePay(p.description)) : noDegree;
    return { name: source.name, found: postings.length, kept: paid, noPay: noDegree.length - paid.length, senior: filled.length - level.length, experience: level.length - able.length, degree: able.length - noDegree.length, problem: postings.length === 0 ? "answered, but with no listings" : undefined };
  } catch (err) {
    return { name: source.name, found: 0, kept: [], noPay: 0, problem: err instanceof Error && err.name === "AbortError" ? "took too long to answer" : "couldn't be reached" };
  }
}

async function search(ctx: ActionCtx, ownerId: Id<"profiles">, manual: boolean): Promise<{ found: number; kept: number; fresh: number; note: string; skipped?: boolean }> {
  const plan = await ctx.runQuery(internal.lookout.data.searchPlan, { ownerId });
  if (!plan) return { found: 0, kept: 0, fresh: 0, note: "The Lookout isn't set up." };
  const s = plan.settings;
  const gap = manual ? MANUAL_GAP_MS : MIN_GAP_MS;
  if (s.lastSearchAt && Date.now() - s.lastSearchAt < gap) return { found: 0, kept: 0, fresh: 0, skipped: true, note: manual ? "Searched less than half an hour ago, so the sites weren't asked again yet. Try again in a little while." : "Searched in the last day already." };
  const creds: Creds = [...s.sources, ...((s.insurance as InsuranceConfig).enabled ? insuranceSources(s.insurance as InsuranceConfig) : [])].some((x) => x.enabled && (x.kind === "usajobs" || x.kind === "adzuna" || x.kind === "jooble")) ? await ctx.runQuery(internal.lookout.data.apiCreds, { ownerId }) : { usajobs: null, adzuna: null, jooble: null };
  const rules: Rules = { requirePay: s.requirePay, allowSenior: s.allowSenior, allowDegree: s.allowDegree, profile: plan.profile };
  // Every source at once; each is a different site, asked once.
  // The insurance preset's sources join the search while it's on (built from its words each time).
  const cfg = s.insurance as InsuranceConfig;
  const presetSources = cfg.enabled ? insuranceSources(cfg) : [];
  const results = await Promise.all([...(s.sources.filter((x) => x.enabled && !RETIRED_KINDS.includes(x.kind as Source["kind"])) as Source[]), ...presetSources].map((src) => readSource(src, s.keywords, rules, creds)));
  const found = results.reduce((n, r) => n + r.found, 0);
  const notes = results.filter((r) => r.problem).map((r) => `${r.name}: ${r.problem}.`);
  // Newest first from each source, taken in turns so one busy site can't crowd out the rest, with a ceiling per search.
  const kept = takeInTurns(results.map((r) => [...r.kept].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0))), 80);
  const batch = kept.map((p) => ({ title: p.title, employer: p.employer, url: p.url, applyUrl: p.applyUrl, location: p.location, description: p.description.slice(0, 40000), sourceKind: p.sourceKind, sourceName: p.sourceName, sourceId: p.sourceId || undefined, postedAt: p.postedAt, deadline: p.deadline, preset: p.preset }));
  const answered = results.filter((r) => r.found > 0).length;
  const noPay = results.reduce((n, r) => n + r.noPay, 0);
  const note = `Read ${results.length} sources (${answered} with listings), looked at ${found} listings, kept ${batch.length} that fit${noPay ? ` (${noPay} more fit but didn't state pay, so they were left out)` : ""}.${notes.length ? ` ${notes.join(" ")}` : ""}`;
  const bySource = results.map((r) => ({ name: r.name, found: r.found, kept: r.kept.length, noPay: r.noPay, senior: r.senior, experience: r.experience, degree: r.degree, problem: r.problem }));
  const fresh: number = await ctx.runMutation(internal.lookout.data.storeFound, { ownerId, postings: batch, note, bySource });
  return { found, kept: batch.length, fresh, note };
}

type CheckResult = { jobId: Id<"loJobs">; open: "yes" | "no" | "unknown"; fingerprint?: string; note: string };

/** Read one listing page and say whether it's still open. Saves nothing; the caller saves the answers together. */
async function checkPage(job: { id: Id<"loJobs">; url: string }): Promise<CheckResult> {
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
  return { jobId: job.id, open, fingerprint: fp, note };
}

/**
 * Check several listings and save every answer in one write. Saving them one
 * at a time made the live job list reload in full after each one (up to 40
 * times per search), which was most of the Convex database reads.
 */
async function recheckMany(ctx: ActionCtx, jobs: { id: Id<"loJobs">; url: string }[]): Promise<number> {
  const results: CheckResult[] = [];
  for (let i = 0; i < jobs.length; i += 8) results.push(...(await Promise.all(jobs.slice(i, i + 8).map(checkPage))));
  if (results.length) await ctx.runMutation(internal.lookout.data.recordChecks, { checks: results });
  return results.filter((r) => r.open === "no").length;
}

/**
 * "Search now" and "Refresh", by hand: at most once every half hour. After
 * the search, the jobs being kept are checked to see they're still open,
 * so closed ones drop out on their own.
 */
export const searchNow = action({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx): Promise<{ found: number; kept: number; fresh: number; note: string; skipped?: boolean; closed?: number }> => {
    const who = await ctx.runQuery(internal.lookout.data.whoFor, {});
    const result = await search(ctx, who.ownerId, true);
    if (result.skipped) return result;
    const jobs = await ctx.runQuery(internal.lookout.data.toRecheck, { ownerId: who.ownerId });
    const closed = await recheckMany(ctx, jobs);
    return { ...result, closed };
  },
});

/** "Is it still open?" on one job. */
export const recheck = action({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args): Promise<"yes" | "no" | "unknown"> => {
    const job = await ctx.runQuery(internal.lookout.data.oneToCheck, { jobId: args.jobId });
    const result = await checkPage(job);
    await ctx.runMutation(internal.lookout.data.recordChecks, { checks: [result] });
    return result.open;
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
        await recheckMany(ctx, jobs);
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


/**
 * "Check now" on a watchlist company: read its own board when it's on one
 * the Lookout can read (Greenhouse, Lever, and the rest), keep the
 * insurance sales titles, and store them. Doesn't count as a search, so
 * "Search now" stays available. Companies without a readable board get
 * their careers link and the words to search for instead.
 */
export const checkWatch = action({
  args: { index: v.number() },
  handler: async (ctx, args): Promise<{ readable: boolean; found: number; kept: number; fresh: number; problem?: string }> => {
    const who = await ctx.runQuery(internal.lookout.data.whoFor, {});
    const plan = await ctx.runQuery(internal.lookout.data.searchPlan, { ownerId: who.ownerId });
    if (!plan) return { readable: false, found: 0, kept: 0, fresh: 0, problem: "The Lookout isn't set up." };
    const cfg = plan.settings.insurance as InsuranceConfig;
    const entry = cfg.watchlist[Math.floor(args.index)];
    if (!entry) return { readable: false, found: 0, kept: 0, fresh: 0, problem: "That company isn't on the list." };
    const src = watchSource(entry);
    if (!src) return { readable: false, found: 0, kept: 0, fresh: 0 };
    const rules: Rules = { requirePay: false, allowSenior: plan.settings.allowSenior, allowDegree: plan.settings.allowDegree, profile: plan.profile };
    const r = await readSource(src, [], rules, { usajobs: null, adzuna: null, jooble: null });
    const batch = r.kept.map((p) => ({ title: p.title, employer: p.employer, url: p.url, applyUrl: p.applyUrl, location: p.location, description: p.description.slice(0, 40000), sourceKind: p.sourceKind, sourceName: p.sourceName, sourceId: p.sourceId || undefined, postedAt: p.postedAt, deadline: p.deadline, preset: INSURANCE_PRESET }));
    const fresh: number = await ctx.runMutation(internal.lookout.data.storeWatch, { ownerId: who.ownerId, postings: batch });
    return { readable: true, found: r.found, kept: r.kept.length, fresh, problem: r.problem };
  },
});
