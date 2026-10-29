import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { INTAKE, MUST_HAVE_FOR_DOCUMENTS, nextQuestion } from "../convex/lookout/intake.ts";
import { vetChange } from "../convex/lookout/adminPure.ts";
import { chooseSearch, rescanFacts, verificationNote, verificationQuestions, dedupeKey, FACT_KEYS, hardChecks, hourlyOf, MANUAL_MOVES, mergeFacts, normalizeUrl, parseHours, parsePay, rank, scanListing, STATUSES, type Facts } from "../convex/lookout/pure.ts";
import { IMPORT_SYSTEM, importSchema, LETTER_SYSTEM, READABLE, readerSchema, RESUME_ANSWER_KEYS, RESUME_SYSTEM } from "../convex/lookout/prompts.ts";
import { openFromPage, parseSource, titleFits, usFriendly } from "../convex/lookout/sources.ts";
import { blocking, findDashes, renderResume, reviewDocument, scrubDashes } from "../convex/lookout/writing.ts";

// Sample listings for the acceptance tests. Fictional employers; the shapes are what real postings look like.
const GOOD = `Knowledge Base Specialist (Remote, US). Fully remote. We hire in all 50 states and you can work from anywhere in the US.
This is a back office role: you'll write and maintain help articles from tickets, with no customer contact. We work async, with few meetings and documented processes.
Schedule: set your own hours, as long as weekly deadlines are met. 30 hours per week. Pay range: $27 to $31 per hour, base pay. W2 employee with health insurance and paid time off.`;

const verifiedGood: Facts = {
  ...scanListing(GOOD).facts,
  travelOk: { state: "yes", source: "verified", note: "Recruiter confirmed by email: any US state is fine while traveling." },
  coldCalling: { state: "no", source: "verified" },
  salesQuota: { state: "no", source: "verified" },
  phoneHeavy: { state: "no", source: "verified" },
  meetingsFrequent: { state: "no", source: "verified" },
  realtimeConstant: { state: "no", source: "verified" },
  noOffice: { state: "yes", source: "verified" },
  commissionOnly: { state: "no", source: "verified" },
  legitimate: { state: "yes", source: "verified", note: "Careers page on the company's domain; listing matches." },
};

describe("1. relevant jobs beyond obvious customer service titles", () => {
  it("keeps documentation, operations, order, quality, claims, and records titles", () => {
    for (const t of ["Knowledge Base Specialist", "Order Processing Associate", "Claims Processor", "Support Operations Specialist", "Quality Assurance Analyst, Service", "CRM Data Coordinator", "Records Administrator", "Content Moderator", "Back Office Support Specialist"]) assert.ok(titleFits(t), t);
  });
  it("drops sales titles before reading further, and unrelated titles", () => {
    for (const t of ["Account Executive", "Inside Sales Representative", "Business Development Rep", "Customer Success Manager, Sales", "Senior Software Engineer"]) assert.equal(titleFits(t), false, t);
  });
  it("keeps US or unrestricted locations and drops other countries", () => {
    assert.ok(usFriendly("Remote, USA"));
    assert.ok(usFriendly(undefined));
    assert.equal(usFriendly("UK only"), false);
  });
});

describe("2. jobs that violate a mandatory requirement are rejected", () => {
  it("a fully verified good job passes and is ranked", () => {
    const r = rank(verifiedGood, { jobText: GOOD });
    assert.equal(r.verdict, "eligible", JSON.stringify(r.checks.filter((c) => c.result !== "pass")));
    assert.ok(r.score !== null && r.score >= 70, String(r.score));
  });
  const fails: [string, string][] = [
    ["commission only", "Remote sales support. 100% commission, unlimited earning potential."],
    ["low pay", "Remote. Fully remote. $18 per hour base pay, 30 hours per week."],
    ["40 hours", "Fully remote order specialist. 40 hours per week, $28 per hour base pay."],
    ["cold calling", "Fully remote. You will cold call small businesses. $30 per hour base pay. 30 hours per week."],
    ["office", "Hybrid role, in office 2 days a week. $30 per hour base pay. 30 hours per week."],
    ["phone heavy", "Fully remote. Answering inbound calls in our call center. $26 per hour base pay. 32 hours per week."],
  ];
  for (const [name, text] of fails) {
    it(`rejects: ${name}`, () => {
      const r = rank({ ...verifiedGood, ...scanListing(text).facts }, { jobText: text });
      assert.equal(r.verdict, "rejected", name);
      assert.equal(r.score, null, "a rejected job has no score to outweigh it");
    });
  }
  it("annual salary is judged per hour at the stated weekly hours", () => {
    assert.equal(Math.round(hourlyOf({ payMin: { state: "yes", value: "52000", source: "listing" }, payUnit: { state: "yes", value: "year", source: "listing" }, hours: { state: "yes", value: "35", source: "listing" } })!), 29);
    assert.equal(hourlyOf({ payMin: { state: "yes", value: "52000", source: "listing" }, payUnit: { state: "yes", value: "year", source: "listing" } }), null, "no hours, no guess");
  });
  it("an employer's confirmed reduced schedule rescues a 40 hour listing, nothing else does", () => {
    const f: Facts = { ...verifiedGood, hours: { state: "yes", value: "40", source: "listing" } };
    assert.equal(hardChecks(f).find((c) => c.key === "hours")!.result, "fail");
    assert.equal(hardChecks({ ...f, reducedHoursOk: { state: "yes", source: "verified", note: "Hiring manager: 32 hours is fine." } }).find((c) => c.key === "hours")!.result, "pass");
  });
});

describe("3. West Virginia eligibility and travel", () => {
  it("a state list without West Virginia means no", () => {
    assert.equal(scanListing("Remote. We can hire in the following states: Texas, Florida, Ohio, Georgia, Arizona.").facts.wvEligible?.state, "no");
  });
  it("a state list with West Virginia means yes", () => {
    assert.equal(scanListing("Remote. We can hire in the following states: Ohio, Pennsylvania, West Virginia.").facts.wvEligible?.state, "yes");
  });
  it("Virginia alone is not West Virginia", () => {
    assert.equal(scanListing("Remote. We can hire in the following states: Virginia, Maryland, Ohio, Texas.").facts.wvEligible?.state, "no");
  });
  it("an exclusion naming West Virginia means no", () => {
    assert.equal(scanListing("Remote in the US. We are not able to hire in California, Hawaii, or West Virginia at this time.").facts.wvEligible?.state, "no");
  });
  it("one fixed address means no travel, and that rejects", () => {
    const text = "Fully remote. You must work from your registered address at all times.";
    const f = { ...verifiedGood, travelOk: undefined, ...scanListing(text).facts };
    delete (f as Record<string, unknown>).travelOk;
    Object.assign(f, scanListing(text).facts);
    assert.equal(f.travelOk?.state, "no");
    assert.equal(rank(f).verdict, "rejected");
  });
  it("remote alone doesn't prove travel is allowed: unknown means check, never pass", () => {
    const f: Facts = { ...verifiedGood };
    delete f.travelOk;
    const r = rank(f);
    assert.equal(r.verdict, "check");
    assert.ok(r.uncertain.some((u) => /traveling/.test(u)));
  });
});

describe("4. sales roles and heavy interaction", () => {
  it("sales disguised as customer service is caught and flagged", () => {
    const text = "Customer Service Associate. Help customers and upsell our premium plans to hit monthly retention targets. Remote.";
    const s = scanListing(text);
    assert.equal(s.facts.salesQuota?.state, "yes");
    assert.ok(s.warnings.some((w) => /customer service/i.test(w)));
  });
  it("frequent meetings and live chat queues are found", () => {
    assert.equal(scanListing("Daily standups on camera. Camera must be on.").facts.meetingsFrequent?.state, "yes");
    assert.equal(scanListing("Handle 4 concurrent chats in our real-time support queue.").facts.realtimeConstant?.state, "yes");
  });
  it("earning potential is not guaranteed pay", () => {
    assert.ok(scanListing("Earning potential up to $90k!").warnings.some((w) => /earning potential/i.test(w)));
  });
});

describe("negation", () => {
  it("a listing that rules something out says no, not yes", () => {
    const s = scanListing("Fully remote, no commute. No cold calling, no quotas, and never any phone support. Not hybrid.");
    assert.equal(s.facts.coldCalling?.state, "no");
    assert.equal(s.facts.salesQuota?.state, "no");
    assert.equal(s.facts.phoneHeavy?.state, "no");
    assert.equal(s.facts.remote?.state, "yes");
    assert.equal(s.facts.noOffice, undefined);
  });
});

describe("5. expired, duplicate, and suspicious listings", () => {
  it("a 404, a 410, or a page saying it's filled is closed", () => {
    assert.equal(openFromPage(404, ""), "no");
    assert.equal(openFromPage(410, ""), "no");
    assert.equal(openFromPage(200, "<h1>Sorry, this position has been filled.</h1>"), "no");
    assert.equal(openFromPage(200, "<h1>Order Specialist</h1><p>Apply now</p>"), "yes");
    assert.equal(openFromPage(503, ""), "unknown");
  });
  it("the same job from two places is one job", () => {
    assert.equal(dedupeKey("Acme, Inc.", "Order Specialist (Remote)"), dedupeKey("ACME", "Order Specialist Remote US"));
    assert.equal(normalizeUrl("https://www.jobs.example.com/123/?utm_source=x&gh_src=y"), normalizeUrl("https://jobs.example.com/123"));
  });
  it("scam signs mark the employer as not legitimate, which rejects", () => {
    for (const text of ["We will send you a check to deposit to buy equipment.", "Interview via Telegram with our HR team.", "Buy gift cards for the office.", "Please send your bank login to set up payroll."]) {
      const s = scanListing(text);
      assert.equal(s.facts.legitimate?.state, "no", text);
      assert.equal(rank({ ...verifiedGood, legitimate: s.facts.legitimate }).verdict, "rejected");
    }
  });
});

describe("6. truthful, tailored documents", () => {
  const roles = [{ id: "r1", employer: "Mountain Supply Co", title: "Customer Service Representative", start: "2014-03", end: "2024-11", confirmed: true }];
  const source = "Customer Service Representative at Mountain Supply Co, 2014-03 to 2024-11. Answered about 60 emails a day. Zendesk, Excel.";
  it("employers, titles, and dates come from the history exactly", () => {
    const text = renderResume({ name: "Sam Rivers", email: "sam@example.com" }, { summary: "Ten years of careful written support.", skills: ["Zendesk", "Excel"], roles: [{ roleId: "r1", bullets: ["Answered about 60 emails a day"] }, { roleId: "invented", bullets: ["Ran a team of 40"] }], education: [] }, roles);
    assert.match(text, /Customer Service Representative, Mountain Supply Co/);
    assert.match(text, /March 2014 to November 2024/);
    assert.doesNotMatch(text, /team of 40/, "a role the history doesn't have is never printed");
  });
  it("a number that isn't in his profile blocks the document", () => {
    const issues = reviewDocument("• Answered 90 emails a day and raised satisfaction by 25%.", { sourceText: source, kind: "resume" });
    assert.ok(blocking(issues));
    assert.ok(issues.some((i) => i.text.includes("90")));
    assert.ok(issues.some((i) => i.text.includes("25%")));
    assert.equal(blocking(reviewDocument("EXPERIENCE\n• Answered about 60 emails a day.", { sourceText: source, kind: "resume" })), false);
  });
  it("health details are blocked unless he chose to share them", () => {
    assert.ok(blocking(reviewDocument("As an ADHD professional I focus deeply.", { sourceText: "", kind: "letter" })));
    assert.equal(blocking(reviewDocument("As an ADHD professional I focus deeply.", { sourceText: "", kind: "letter", allowHealthDisclosure: true })), false);
  });
  it("template phrases are flagged", () => {
    assert.ok(reviewDocument("I am a results-driven team player.", { sourceText: "", kind: "letter" }).some((i) => i.level === "fix"));
  });
  it("the writer is told never to invent, never to use dashes, and to ask instead", () => {
    for (const p of [RESUME_SYSTEM, LETTER_SYSTEM]) {
      assert.match(p, /Never invent/);
      assert.match(p, /without any hyphen or dash/);
      assert.match(p, /questions/);
      assert.match(p, /no claims about AI detection/i);
    }
  });
});

describe("7. no dash characters, and grammar kept", () => {
  const cases: [string, string][] = [
    ["Jan 2019 – Present", "Jan 2019 to Present"],
    ["2016-2019", "2016 to 2019"],
    ["Handled 60–80 tickets a day", "Handled 60 to 80 tickets a day"],
    ["Fixed it — then documented it", "Fixed it, then documented it"],
    ["Detail-oriented and self-starter", "Detail oriented and self starter"],
    ["Sent e-mail follow-ups", "Sent email follow ups"],
    ["Monday–Friday", "Monday to Friday"],
    ["Re-organized the non-profit's files", "Reorganized the nonprofit's files"],
    ["Call 304-555-0123", "Call 304.555.0123"],
    ["- Kept records", "• Kept records"],
    ["customer-facing, cross-functional work", "customer facing, cross functional work"],
  ];
  for (const [input, want] of cases) {
    it(`"${input}"`, () => {
      const out = scrubDashes(input);
      assert.equal(out, want);
      assert.equal(findDashes(out).length, 0);
    });
  }
  it("catches every kind of dash, including the rare ones", () => {
    const all = "a‐b a‑b a‒b a–b a—b a―b 5−2 a﹣b a－b x­y ---";
    assert.equal(findDashes(scrubDashes(all)).length, 0);
    assert.ok(findDashes(all).length >= 10);
  });
  it("a whole resume comes out with none", () => {
    const text = renderResume({ name: "Sam Rivers", email: "sam@example.com", phone: "304-555-0123", location: "West Virginia (Remote)" }, { summary: "Detail-oriented support pro — ten years.", skills: ["E-mail support", "Follow-up"], roles: [{ roleId: "r1", bullets: ["Cut response time 2019–2021"] }], education: ["Certificate — 2015"] }, [{ id: "r1", employer: "Blue-Ridge Supply", title: "Rep", start: "2014-03", confirmed: true }]);
    assert.equal(findDashes(text).length, 0, text);
    assert.match(text, /Blue Ridge Supply/);
    assert.match(text, /March 2014 to Present/);
  });
});

describe("8. asks instead of guessing", () => {
  it("an unknown critical fact sends a job to checking, never to approval", () => {
    assert.equal(rank({}).verdict, "check");
    for (const c of hardChecks({})) assert.notEqual(c.result, "pass", c.key);
  });
  it("the reader may only answer yes or no with the listing's own words, and never judges legitimacy", () => {
    const schema = readerSchema() as { required: string[] };
    assert.deepEqual(schema.required, READABLE);
    assert.ok(!READABLE.includes("legitimate") && !READABLE.includes("open"));
  });
  it("documents need his name and email from the interview first", () => {
    assert.deepEqual(MUST_HAVE_FOR_DOCUMENTS, ["name", "email"]);
    for (const k of MUST_HAVE_FOR_DOCUMENTS) assert.ok(INTAKE.some((q) => q.key === k));
  });
  it("a guess never overwrites a verified fact", () => {
    const merged = mergeFacts({ travelOk: { state: "yes", source: "verified" } }, { travelOk: { state: "no", source: "ai", note: "?" } });
    assert.equal(merged.travelOk?.source, "verified");
    const better = mergeFacts({ hours: { state: "yes", value: "40", source: "ai" } }, { hours: { state: "yes", value: "30", source: "listing" } });
    assert.equal(better.hours?.value, "30");
  });
  it("the interview asks one question at a time, skipped ones last", () => {
    assert.equal(nextQuestion(new Set(), new Set())?.key, "name");
    assert.equal(nextQuestion(new Set(), new Set(["name"]))?.key, "email");
    assert.equal(nextQuestion(new Set(INTAKE.map((q) => q.key).filter((k) => k !== "name")), new Set(["name"]))?.key, "name");
    assert.equal(new Set(INTAKE.map((q) => q.key)).size, INTAKE.length);
  });
});

describe("verification note", () => {
  it("asks only what's unknown, and asks nothing once everything is known", () => {
    const qs = verificationQuestions({ wvEligible: { state: "yes", source: "verified" } });
    assert.ok(!qs.some((q) => /West Virginia/.test(q)));
    assert.ok(qs.some((q) => /traveling/.test(q)));
    const note = verificationNote({}, { title: "Order Specialist", employer: "Acme" }, "Sam Rivers")!;
    assert.match(note, /Order Specialist role at Acme/);
    assert.doesNotMatch(note, /ADHD|autis|neurodiver/i);
  });
});

describe("9 to 11. approval, preserved documents, accurate status", () => {
  it("no hand move can mark a job approved or submitted; those have their own checked steps", () => {
    for (const s of STATUSES) for (const to of MANUAL_MOVES[s]) assert.ok(to !== "approved" && to !== "submitted" && to !== "ready", `${s} to ${to}`);
  });
  it("every status has a move list", () => {
    for (const s of STATUSES) assert.ok(Array.isArray(MANUAL_MOVES[s]));
  });
});

describe("12. his data can be deleted", () => {
  it("deleting a search clears every Lookout table", () => {
    const schema = readFileSync(new URL("../convex/schema.ts", import.meta.url), "utf8");
    const data = readFileSync(new URL("../convex/lookout/data.ts", import.meta.url), "utf8");
    const tables = [...schema.matchAll(/^ {2}(lo[A-Z]\w*): defineTable/gm)].map((m) => m[1]);
    assert.ok(tables.length >= 8);
    const line = data.split("\n").find((l) => l.includes("export const LOOKOUT_TABLES"))!;
    for (const t of tables) assert.ok(line.includes(`"${t}"`), t);
  });
});

describe("both of them can reach a search", () => {
  it("shows the partner's search when you have none, and yours when they have none", () => {
    assert.equal(chooseSearch({ mine: false, partnerOpen: true }), "partner");
    assert.equal(chooseSearch({ mine: true, partnerOpen: false }), "self");
    assert.equal(chooseSearch({ mine: false, partnerOpen: false }), null);
  });
  it("remembers the choice when both are open, and never shows one that isn't", () => {
    assert.equal(chooseSearch({ mine: true, partnerOpen: true, want: "partner" }), "partner");
    assert.equal(chooseSearch({ mine: true, partnerOpen: true, want: "self" }), "self");
    assert.equal(chooseSearch({ mine: true, partnerOpen: false, want: "partner" }), "self");
  });
});

describe("resume upload", () => {
  it("is told to copy only what the resume says, and its answers only cover what a resume can", () => {
    assert.match(IMPORT_SYSTEM, /Never add, infer, round, or improve/);
    const schema = importSchema() as { properties: { answers: { required: string[] } } };
    assert.deepEqual(schema.properties.answers.required, [...RESUME_ANSWER_KEYS]);
    for (const k of RESUME_ANSWER_KEYS) assert.ok(INTAKE.some((q) => q.key === k), k);
    assert.ok(!(RESUME_ANSWER_KEYS as readonly string[]).includes("disclose"));
  });
});

describe("pay and hours parsing", () => {
  it("reads ranges, single rates, salaries, and k", () => {
    assert.deepEqual(parsePay("Pay: $27 to $31 per hour")?.min, 27);
    assert.equal(parsePay("$55,000 - $65,000 a year")?.unit, "year");
    assert.equal(parsePay("$60k to $70k")?.min, 60000);
    assert.equal(parsePay("Pay range: $50000 to $60000 USD per year")?.min, 50000);
    assert.equal(parsePay("$26.50/hr")?.min, 26.5);
  });
  it("reads hours, and treats plain full time as a question, not a rejection", () => {
    assert.equal(parseHours("30 to 35 hours per week")?.hours, 35);
    assert.equal(parseHours("This is a full-time role"), null);
    const f = scanListing("Fully remote. This is a full_time role.").facts;
    assert.equal(f.hours?.state, "unknown");
    assert.equal(hardChecks(f).find((c) => c.key === "hours")!.result, "unknown");
    assert.equal(parseHours("Part-time, 25 hours a week")?.hours, 25);
  });
});

describe("source parsers", () => {
  it("Greenhouse", () => {
    const p = parseSource({ kind: "greenhouse", token: "acme", name: "Acme", enabled: true }, { jobs: [{ id: 1, title: "Support Operations Specialist", absolute_url: "https://boards.greenhouse.io/acme/jobs/1", location: { name: "Remote, US" }, content: "&lt;p&gt;Fully remote.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Write SOPs&lt;/li&gt;&lt;/ul&gt;", updated_at: "2026-10-01T00:00:00Z" }] });
    assert.equal(p[0].title, "Support Operations Specialist");
    assert.match(p[0].description, /Fully remote\./);
    assert.match(p[0].description, /• Write SOPs/);
  });
  it("Lever, with its salary range", () => {
    const p = parseSource({ kind: "lever", token: "acme", name: "Acme", enabled: true }, [{ id: "x", text: "Order Specialist", hostedUrl: "https://jobs.lever.co/acme/x", applyUrl: "https://jobs.lever.co/acme/x/apply", categories: { location: "Remote", commitment: "Part-time" }, descriptionPlain: "Process orders.", lists: [], createdAt: 1790000000000, salaryRange: { min: 26, max: 30, currency: "USD", interval: "per-hour-wage" } }]);
    assert.equal(p[0].applyUrl, "https://jobs.lever.co/acme/x/apply");
    assert.equal(parsePay(p[0].payLine!)?.unit, "hour");
  });
  it("Ashby, Remotive, and Himalayas", () => {
    assert.equal(parseSource({ kind: "ashby", token: "a", name: "A", enabled: true }, { jobs: [{ title: "Claims Processor", jobUrl: "https://jobs.ashbyhq.com/a/1", descriptionPlain: "Remote." }] }).length, 1);
    assert.equal(parseSource({ kind: "remotive", token: "c", name: "R", enabled: true }, { jobs: [{ id: 5, url: "https://remotive.com/x", title: "Email Support Specialist", company_name: "B", description: "<p>Hi</p>", publication_date: "2026-10-20T10:00:00" }] })[0].employer, "B");
    assert.equal(parseSource({ kind: "himalayas", token: "q", name: "H", enabled: true }, { jobs: [{ title: "Data Entry Specialist", companyName: "C", applicationLink: "https://c.example/apply", minSalary: 52000, locationRestrictions: ["United States"], pubDate: 1790000000 }] })[0].payLine, "Salary range: $52000 USD per year");
  });
  it("an unexpected answer gives an empty list, not an error", () => {
    assert.deepEqual(parseSource({ kind: "greenhouse", token: "x", name: "X", enabled: true }, "<html>"), []);
  });
});

describe("facts", () => {
  it("every fact has a label and the reader covers all but the human checks", () => {
    assert.equal(READABLE.length, FACT_KEYS.length - 2);
  });
});

describe("the assistant", () => {
  const ctx = { roles: [{ id: "r1", employer: "Acme", title: "Rep", start: "2019-03", confirmed: true }], answerKeys: INTAKE.map((q) => q.key), notes: [{ id: "n1" }], jobs: [{ id: "j1", status: "new" }] };
  const base = { summary: "x", roleId: "", jobId: "", noteId: "", key: "", status: "", text: "", employer: "", title: "", start: "", endAction: "unchanged", end: "", location: "", duties: "", achievements: "", tools: "", sales: "unchanged" };
  it("marks a job ended with a real date, and nothing without one", () => {
    assert.ok(vetChange({ ...base, kind: "roleUpdate", roleId: "r1", endAction: "set", end: "2025-06" }, ctx));
    assert.equal(vetChange({ ...base, kind: "roleUpdate", roleId: "r1", endAction: "set", end: "" }, ctx), null);
    assert.equal(vetChange({ ...base, kind: "roleUpdate", roleId: "r1", endAction: "set", end: "June" }, ctx), null);
    assert.equal(vetChange({ ...base, kind: "roleUpdate", roleId: "r1", endAction: "set", end: "2018" }, ctx), null, "an end before the start");
  });
  it("only touches things that exist, and only allowed steps", () => {
    assert.equal(vetChange({ ...base, kind: "roleRemove", roleId: "nope" }, ctx), null);
    assert.equal(vetChange({ ...base, kind: "jobStatus", jobId: "j1", status: "submitted" }, ctx), null);
    assert.ok(vetChange({ ...base, kind: "jobStatus", jobId: "j1", status: "passed" }, ctx));
    assert.equal(vetChange({ ...base, kind: "answerSet", key: "disclose", text: "yes" }, ctx), null, "never the privacy answer");
    assert.equal(vetChange({ ...base, kind: "roleUpdate", roleId: "r1" }, ctx), null, "a change that changes nothing");
    assert.equal(vetChange({ ...base, kind: "bogus" }, ctx), null);
  });
});

describe("re-reading stored listings", () => {
  it("replaces old readings but keeps what a person verified", () => {
    const old = { hours: { state: "yes" as const, value: "40", source: "listing" as const }, travelOk: { state: "yes" as const, source: "verified" as const }, open: { state: "yes" as const, source: "listing" as const } };
    const r = rescanFacts(old, "Fully remote. A full-time role.", "West Virginia");
    assert.equal(r.facts.hours?.state, "unknown");
    assert.equal(r.facts.travelOk?.source, "verified");
    assert.equal(r.facts.open?.state, "yes");
  });
});
