import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanConfig, cleanScreening, defaultInsurance, fitOf, insuranceSources, insuranceTitleFits, isBlocked, mergeWatchlist, payAsListed, screeningAvoid, SCREENING, WATCHLIST_VERSION, watchSource } from "../convex/lookout/insurance.ts";
import { INSURANCE_VIEW } from "../modules/lookout/views.ts";

const cfg = defaultInsurance();
const job = (title: string, description: string, employer = "Some Insurance Co") => ({ title, employer, description });

describe("Insurance Sales, Inbound/W-2 preset", () => {
  it("scores a W-2 inbound job with paid training as a strong fit, with the reasons as tags", () => {
    const f = fitOf(job("Inbound Insurance Sales Consultant", "W-2 employee. $18 per hour base pay plus commission. All calls are inbound; warm transfers from our marketing team. Paid training, and we pay for your licensing exam. Health insurance and 401(k)."), cfg);
    assert.equal(f.badge, "strong");
    for (const t of ["W-2 employee", "Hourly wage", "Base pay", "Inbound calls", "Warm transfers", "Paid training", "Licensing paid", "Benefits"]) assert.ok(f.green.includes(t), t);
    assert.deepEqual(f.red, []);
    assert.ok(f.score! >= 80);
  });
  it("reads 'no cold calling' as a green flag, never a red one", () => {
    const f = fitOf(job("Licensed Life Insurance Agent", "Hourly base plus commission, W-2. No cold calling: every lead is provided at no cost to you."), cfg);
    assert.ok(f.green.includes("No cold calling"));
    assert.ok(f.green.includes("Leads provided"));
    assert.ok(!f.red.includes("Cold calling"));
    assert.equal(f.badge, "strong");
    const g = fitOf(job("Life Insurance Agent", "Base pay. Zero cold calls. You will never pay for leads."), cfg);
    assert.ok(g.green.includes("No cold calling"), "zero cold calls");
    assert.ok(g.green.includes("Leads provided"), "never pay for leads is a provided-leads flag");
    assert.ok(!g.red.includes("You pay for leads"));
  });
  it("marks cold calling, 1099, commission only, lead costs, recruiting, warm market, and travel as Avoid", () => {
    assert.equal(fitOf(job("Insurance Agent", "You'll be cold calling leads daily."), cfg).badge, "avoid");
    assert.ok(fitOf(job("Insurance Agent", "This is a 1099 independent contractor position."), cfg).red.includes("1099 or contractor"));
    assert.ok(fitOf(job("Insurance Agent", "Commission only; unlimited income."), cfg).red.includes("Commission only"));
    assert.ok(fitOf(job("Insurance Agent", "Agents invest in leads; lead cost is $20 each."), cfg).red.includes("You pay for leads"));
    assert.ok(fitOf(job("Insurance Agent", "Build your own team and earn overrides."), cfg).red.includes("Recruiting or team building"));
    assert.ok(fitOf(job("Insurance Agent", "Start by making a list of friends and family."), cfg).red.includes("Warm market"));
    assert.ok(fitOf(job("Insurance Agent", "Door-to-door sales in your assigned territory."), cfg).red.includes("Travel or door-to-door"));
  });
  it("hype language alone is Maybe, not Avoid", () => {
    const f = fitOf(job("Insurance Sales", "Be your own boss with unlimited income potential. Hourly base pay, inbound calls."), cfg);
    assert.equal(f.badge, "maybe");
    assert.ok(f.red.includes("Hype language"));
  });
  it("a job that says nothing about pay or leads is Maybe, with a plain reason", () => {
    const f = fitOf(job("Insurance Sales Agent", "Join our growing team selling life insurance to customers nationwide."), cfg);
    assert.equal(f.badge, "maybe");
    assert.match(f.why, /Ask/);
  });
  it("an established carrier is a green flag; a blocklisted company is marked", () => {
    assert.ok(fitOf(job("Inbound Sales", "Hourly.", "Mutual of Omaha"), cfg).green.includes("Established carrier"));
    assert.equal(isBlocked("Globe Life Liberty National Division", cfg.blocklist), "Globe Life");
    assert.equal(isBlocked("American Income Life Insurance Company", cfg.blocklist), "American Income Life");
    assert.equal(isBlocked("Primerica Financial Services", cfg.blocklist), "Primerica");
    assert.equal(isBlocked("Ethos", cfg.blocklist), null);
    assert.equal(fitOf(job("Agent", "W-2 hourly inbound.", "Primerica"), cfg).blocked, "Primerica");
  });
  it("the screening checklist's critical answers mark a job Avoid and say why", () => {
    assert.equal(SCREENING.length, 6);
    const answers = cleanScreening([{ key: "w2", asked: true, answer: "bad", note: "" }, { key: "leads", asked: true, answer: "good", note: "company pays" }, { key: "bogus", asked: true, answer: "bad", note: "" }]);
    assert.equal(answers.length, 6);
    assert.ok(!answers.some((a) => a.key === "bogus"));
    assert.deepEqual(screeningAvoid(answers), ["Screening: it's 1099"]);
    const f = fitOf(job("Inbound Insurance Sales", "W-2, hourly, inbound, paid training."), cfg, answers);
    assert.equal(f.badge, "avoid");
    assert.ok(f.red.includes("Screening: it's 1099"));
    assert.deepEqual(screeningAvoid(cleanScreening([{ key: "hourly", asked: true, answer: "bad", note: "" }])), [], "the hourly question isn't critical on its own");
  });
  it("a company he passed on before is never Strong again on its own, and says so", () => {
    const strong = job("Inbound Insurance Sales", "W-2 hourly base pay, inbound calls, paid training.");
    assert.equal(fitOf(strong, cfg).badge, "strong");
    const again = fitOf(strong, cfg, [], { passedBefore: true });
    assert.equal(again.badge, "maybe");
    assert.ok(again.red.includes("Passed on this company before"));
    assert.ok(again.score! < fitOf(strong, cfg).score!);
  });
  it("the Insurance sales group leaves out hidden, passed, closed, and (by default) blocklisted jobs", () => {
    const row = (o: Partial<Parameters<typeof INSURANCE_VIEW.test>[0]>) => ({ status: "new" as const, verdict: "check", preset: "insurance", fit: { blocked: null }, ...o });
    assert.ok(INSURANCE_VIEW.test(row({})));
    assert.ok(!INSURANCE_VIEW.test(row({ shelved: true })), "hidden or refreshed away");
    assert.ok(!INSURANCE_VIEW.test(row({ status: "passed" })), "not for me");
    assert.ok(!INSURANCE_VIEW.test(row({ status: "closed" })));
    assert.ok(!INSURANCE_VIEW.test(row({ fit: { blocked: "Primerica" } })), "blocklisted, hidden by default");
    assert.ok(INSURANCE_VIEW.test(row({ fit: { blocked: "Primerica" } }), true), "shown when asked");
    assert.ok(!INSURANCE_VIEW.test(row({ preset: undefined })), "not an insurance job");
  });
  it("new watchlist companies join a saved config once, by name, without touching the rest", () => {
    const old = { ...cfg, version: 1, watchlist: [cfg.watchlist[0], { name: "GoHealth", url: "https://example.com/x", enabled: false }], blocklist: ["Mine"] };
    const merged = mergeWatchlist(old);
    assert.equal(merged.version, WATCHLIST_VERSION);
    assert.ok(merged.watchlist.some((w) => w.name === "eHealth"));
    assert.equal(merged.watchlist.filter((w) => w.name === "GoHealth").length, 1, "an entry he already has, even edited, isn't doubled");
    assert.equal(merged.watchlist.find((w) => w.name === "GoHealth")!.url, "https://example.com/x");
    assert.deepEqual(merged.blocklist, ["Mine"]);
    assert.equal(mergeWatchlist(merged), merged, "nothing to merge the second time");
  });
  it("keeps insurance sales titles and drops managers, recruiters, and other sales work", () => {
    assert.ok(insuranceTitleFits("Inbound Insurance Sales Consultant"));
    assert.ok(insuranceTitleFits("Licensed Life Insurance Agent (Remote)"));
    assert.ok(insuranceTitleFits("Medicare Sales Representative"));
    assert.ok(insuranceTitleFits("Licensed Inbound Sales Agent"));
    assert.ok(!insuranceTitleFits("Insurance Sales Manager"));
    assert.ok(!insuranceTitleFits("Agency Recruiter"));
    assert.ok(!insuranceTitleFits("Account Executive, SaaS"));
    assert.ok(!insuranceTitleFits("Claims Adjuster"));
    assert.ok(!insuranceTitleFits("Customer Support Specialist"));
  });
  it("builds its sources from the words and the readable watchlist boards, all tagged with the preset", () => {
    const srcs = insuranceSources(cfg);
    assert.ok(srcs.every((s) => s.preset === "insurance"));
    assert.ok(srcs.some((s) => s.kind === "adzuna" && s.token === "inbound insurance sales"), "his own words are searched");
    assert.ok(srcs.some((s) => s.kind === "adzuna" && s.token === "insurance sales"), "and the short ones");
    assert.ok(srcs.some((s) => s.kind === "remoteok") && srcs.some((s) => s.kind === "workingnomads") && srcs.filter((s) => s.kind === "himalayas").length >= 6, "the remote boards are read for insurance titles too");
    assert.ok(srcs.some((s) => s.kind === "greenhouse" && s.token === "ethoslife" && s.name === "Ethos"), "Ethos's Greenhouse board is read");
    assert.ok(!srcs.some((s) => s.name === "Mutual of Omaha"), "a link-only company isn't a source");
    assert.equal(watchSource(cfg.watchlist[0]), null);
    assert.equal(watchSource(cfg.watchlist[2])?.kind, "greenhouse");
  });
  it("labels pay as listed on the day it was read", () => {
    assert.match(payAsListed("Pay: $18 to $22 per hour plus commission.", Date.UTC(2026, 10, 20, 12)) ?? "", /as listed on Nov 20, 2026/);
    assert.equal(payAsListed("Great earning potential.", Date.now()), null);
  });
  it("cleans a settings change without losing what wasn't changed", () => {
    const next = cleanConfig({ blocklist: [" Globe Life ", "", "Primerica"], watchlist: [{ name: "X", url: "not a link", enabled: true }, { name: "Y", url: "https://jobs.lever.co/y", enabled: true }] }, cfg);
    assert.deepEqual(next.blocklist, ["Globe Life", "Primerica"]);
    assert.deepEqual(next.keywords, cfg.keywords);
    assert.deepEqual(next.watchlist.map((w) => w.name), ["Y"]);
    assert.equal(next.enabled, false);
  });
});
