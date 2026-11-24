import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { employerLocationFacts } from "../convex/lookout/pure.ts";
import { parseEmployerPosting, postingFromUrl, postingUrl } from "../convex/lookout/sources.ts";

describe("the employer's own posting", () => {
  it("finds the posting behind an apply link on each readable board", () => {
    const wd = postingFromUrl("https://edwards.wd5.myworkdayjobs.com/en-US/EdwardsCareers/job/USA---Illinois---Chicago/Representative--Technical-Product-Customer-Support---IHFM_Req-52371");
    assert.deepEqual(wd, { kind: "workday", token: "edwards.wd5.myworkdayjobs.com|edwards|EdwardsCareers", id: "/job/USA---Illinois---Chicago/Representative--Technical-Product-Customer-Support---IHFM_Req-52371" });
    assert.equal(postingUrl(wd!), "https://edwards.wd5.myworkdayjobs.com/wday/cxs/edwards/EdwardsCareers/job/USA---Illinois---Chicago/Representative--Technical-Product-Customer-Support---IHFM_Req-52371");
    assert.deepEqual(postingFromUrl("https://boards.greenhouse.io/acme/jobs/4567890"), { kind: "greenhouse", token: "acme", id: "4567890" });
    assert.deepEqual(postingFromUrl("https://jobs.lever.co/acme/1a2b3c4d-1234-5678-9abc-def012345678/apply"), { kind: "lever", token: "acme", id: "1a2b3c4d-1234-5678-9abc-def012345678" });
    assert.deepEqual(postingFromUrl("https://jobs.ashbyhq.com/acme/1a2b3c4d-1234-5678-9abc-def012345678"), { kind: "ashby", token: "acme", id: "1a2b3c4d-1234-5678-9abc-def012345678" });
    assert.deepEqual(postingFromUrl("https://apply.workable.com/acme/j/AB12CD34EF/"), { kind: "workable", token: "acme", id: "AB12CD34EF" });
    assert.deepEqual(postingFromUrl("https://jobs.smartrecruiters.com/AcmeInc/744000012345-support-specialist"), { kind: "smartrecruiters", token: "AcmeInc", id: "744000012345" });
    assert.deepEqual(postingFromUrl("https://acme.bamboohr.com/careers/123"), { kind: "bamboohr", token: "acme", id: "123" });
    assert.deepEqual(postingFromUrl("https://acme.recruitee.com/o/support-specialist"), { kind: "recruitee", token: "acme", id: "support-specialist" });
    assert.equal(postingFromUrl("https://himalayas.app/companies/edwards/jobs/representative"), null, "a job board's own page isn't the employer's posting");
    assert.equal(postingFromUrl("https://boards.greenhouse.io/acme"), null, "a board, not a posting");
  });
  it("reads a Workday posting's locations and remote type", () => {
    const p = parseEmployerPosting({ kind: "workday", token: "x|y|z", id: "/job/a/b" }, { jobPostingInfo: { title: "Rep", location: "USA - Illinois - Chicago", additionalLocations: ["USA - Missouri - Kansas City", "USA - Texas - Dallas"], jobDescription: "<p>Support customers.</p>", timeType: "Full time" } });
    assert.equal(p?.title, "Rep");
    assert.deepEqual(p?.locations, ["USA - Illinois - Chicago", "USA - Missouri - Kansas City", "USA - Texas - Dallas"]);
    assert.equal(p?.remoteType, undefined);
    assert.match(p?.description ?? "", /Support customers/);
    assert.equal(parseEmployerPosting({ kind: "workday", token: "x|y|z", id: "/job/a/b" }, { error: "nope" }), null);
    const gh = parseEmployerPosting({ kind: "greenhouse", token: "acme", id: "1" }, { title: "Agent", location: { name: "Remote - US" }, offices: [{ name: "Austin", location: "Austin, TX" }], content: "&lt;p&gt;Hi&lt;/p&gt;" });
    assert.deepEqual(gh?.locations, ["Remote - US", "Austin, TX"]);
    const lv = parseEmployerPosting({ kind: "lever", token: "acme", id: "1" }, { text: "Agent", categories: { location: "Denver", allLocations: ["Denver", "Remote"] }, workplaceType: "hybrid", descriptionPlain: "Hi" });
    assert.equal(lv?.remoteType, "hybrid");
  });
  it("the Edwards case: office cities and no remote word means not remote, and not open to West Virginia", () => {
    const r = employerLocationFacts({ locations: ["USA - Illinois - Chicago", "USA - Missouri - Kansas City", "USA - Texas - Dallas", "USA - Washington - Seattle"], description: "Support customers by phone. Full time." });
    assert.equal(r.facts.remote?.state, "no");
    assert.equal(r.facts.noOffice?.state, "no");
    assert.equal(r.facts.wvEligible?.state, "no");
    assert.match(r.facts.remote?.note ?? "", /never says remote/);
    assert.match(r.summary, /Not a remote job/);
  });
  it("the employer's own remote word and a state list are read as they are", () => {
    assert.equal(employerLocationFacts({ locations: ["USA - Illinois - Chicago"], remoteType: "Remote", description: "Anything." }).facts.remote?.state, "yes");
    assert.equal(employerLocationFacts({ locations: ["Denver, CO"], remoteType: "Hybrid", description: "Anything." }).facts.remote?.state, "no");
    const us = employerLocationFacts({ locations: ["Remote - United States"], description: "Fully remote." });
    assert.equal(us.facts.remote?.state, "yes");
    assert.equal(us.facts.wvEligible?.state, "yes");
    const states = employerLocationFacts({ locations: ["Remote - TX", "Remote - FL", "Remote - AZ"], description: "Remote within our states." });
    assert.equal(states.facts.remote?.state, "yes");
    assert.equal(states.facts.wvEligible?.state, "no", "three states, none his");
    const wv = employerLocationFacts({ locations: ["Remote - West Virginia", "Remote - Ohio"], description: "Remote." });
    assert.equal(wv.facts.wvEligible?.state, "yes");
    const said = employerLocationFacts({ locations: [], description: "This is a fully remote position open to residents of all 50 states." });
    assert.equal(said.facts.remote?.state, "yes");
    assert.equal(said.facts.wvEligible?.state, "yes");
    const mixed = employerLocationFacts({ locations: ["Austin, TX"], description: "Remote position; hybrid for those near Austin." });
    assert.equal(mixed.facts.remote, undefined, "says both remote and hybrid: nothing is claimed, so it stays a thing to check");
  });
});
