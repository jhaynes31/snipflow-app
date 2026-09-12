import { describe, expect, test } from "bun:test";
import { GUILD_FACT_FIELDS, GUILD_FAQ, HEARD_ABOUT_OPTIONS, MEETING_COVERS_DRAFT, checkInterest, guildIsLive, missingFacts, publicFactKeys, publicFacts, requiredFactKeys, smsLink, type GuildFacts } from "./guildConfig";

const allConfirmed = (): GuildFacts => Object.fromEntries(requiredFactKeys().map((k) => [k, { key: k, value: "John's words", confirmed: true }]));

describe("guild facts gate", () => {
  test("every required trust fact and every FAQ answer must be filled and confirmed", () => {
    expect(requiredFactKeys().length).toBe(GUILD_FACT_FIELDS.filter((f) => f.tier === "trust" && f.required).length + GUILD_FAQ.length);
    for (const k of ["industry", "johnFullName", "licensingRequired", "costToInterview", "meetingCovers", "payBasis"]) expect(requiredFactKeys()).toContain(k);
    // John keeps startup costs for the interview, so these two are optional.
    expect(requiredFactKeys()).not.toContain("recruitCosts");
    expect(requiredFactKeys()).not.toContain("investmentPathExists");
    expect(GUILD_FAQ.length).toBe(5);
    expect(guildIsLive({})).toBe(false);
    expect(guildIsLive(allConfirmed())).toBe(true);
  });
  test("a filled but unconfirmed fact keeps the page hidden", () => {
    const facts = allConfirmed();
    facts.costToInterview = { key: "costToInterview", value: "Free", confirmed: false };
    expect(missingFacts(facts)).toEqual(["costToInterview"]);
    expect(guildIsLive(facts)).toBe(false);
  });

  test("the pause switch hides the page without touching the answers", () => {
    const facts = allConfirmed();
    expect(guildIsLive(facts)).toBe(true);
    facts.guildHallPaused = { key: "guildHallPaused", value: "yes", confirmed: true };
    expect(guildIsLive(facts)).toBe(false);
    expect(missingFacts(facts)).toEqual([]);
    facts.guildHallPaused = { key: "guildHallPaused", value: "no", confirmed: false };
    expect(guildIsLive(facts)).toBe(true);
  });
  test("a confirmed but empty fact keeps the page hidden", () => {
    const facts = allConfirmed();
    facts.faq_pay = { key: "faq_pay", value: "   ", confirmed: true };
    expect(missingFacts(facts)).toEqual(["faq_pay"]);
  });
  test("optional trust facts and presentation notes never block going live", () => {
    expect(requiredFactKeys()).not.toContain("licenseLookup");
    expect(requiredFactKeys()).not.toContain("guildHallPaused");
    expect(requiredFactKeys()).not.toContain("statesServed");
    for (const f of GUILD_FACT_FIELDS.filter((x) => x.tier === "presentation")) expect(requiredFactKeys()).not.toContain(f.key);
  });
  test("presentation facts never reach the public, and unconfirmed trust facts do not either", () => {
    const facts = allConfirmed();
    facts.compensationDetails = { key: "compensationDetails", value: "secret notes", confirmed: true };
    facts.winStage = { key: "winStage", value: "contracted", confirmed: true };
    facts.licenseLookup = { key: "licenseLookup", value: "https://example.com", confirmed: false };
    const pub = publicFacts(facts);
    expect(pub).not.toHaveProperty("compensationDetails");
    expect(pub).not.toHaveProperty("winStage");
    expect(pub).not.toHaveProperty("licenseLookup");
    expect(pub.industry).toBe("John's words");
    for (const k of publicFactKeys()) expect(GUILD_FACT_FIELDS.find((f) => f.key === k)?.tier ?? "trust").toBe("trust");
  });
  test("the meeting disclosure draft names both purposes and the no-cost promise", () => {
    expect(MEETING_COVERS_DRAFT).toContain("your own coverage or finances");
    expect(MEETING_COVERS_DRAFT).toContain("costs you nothing");
    expect(GUILD_FACT_FIELDS.find((f) => f.key === "meetingCovers")?.suggested).toBe(MEETING_COVERS_DRAFT);
  });
  test("legitimacy questions are marked so they can never be deferred", () => {
    expect(GUILD_FAQ.filter((q) => q.legitimacy).map((q) => q.key)).toEqual(["faq_legit", "faq_experience_license", "faq_costs", "faq_interview"]);
  });
  test("no fact field ships with a role detail filled in", () => {
    for (const f of GUILD_FACT_FIELDS) expect(f).not.toHaveProperty("value");
  });
});

describe("interest form", () => {
  test("collects only the allowed fields and needs one way to reach the person", () => {
    const r = checkInterest({ name: "Sam Rivers", email: "", phone: "", state: "KS", confirmed18: true });
    expect(r.ok).toBe(false);
    expect(r.errors.contact).toBeTruthy();
  });
  test("18 or older is required", () => {
    const r = checkInterest({ name: "Sam Rivers", email: "sam@gmail.com", confirmed18: false });
    expect(r.errors.confirmed18).toBeTruthy();
  });
  test("a good submission cleans and passes, consent stays false unless ticked", () => {
    const r = checkInterest({ name: "  Sam Rivers ", email: "Sam@Gmail.com", phone: "4158675309", state: "Kansas", bestTime: "Evenings", heardAbout: "flyer", note: "Saw the flyer at the library", confirmed18: true });
    expect(r.ok).toBe(true);
    expect(r.clean.name).toBe("Sam Rivers");
    expect(r.clean.email).toBe("sam@gmail.com");
    expect(r.clean.heardAbout).toBe("flyer");
    expect(r.clean.emailConsent).toBe(false);
    expect(Object.keys(r.clean).sort()).toEqual(["bestTime", "confirmed18", "email", "emailConsent", "heardAbout", "name", "note", "phone", "state"]);
  });
  test("unknown heard-about values are dropped, the flyer option exists", () => {
    expect(checkInterest({ name: "Sam Rivers", email: "sam@gmail.com", heardAbout: "tv", confirmed18: true }).clean.heardAbout).toBe("");
    expect(HEARD_ABOUT_OPTIONS.map((o) => o.id)).toContain("flyer");
    expect(HEARD_ABOUT_OPTIONS.map((o) => o.id)).toContain("tiktok");
  });
});

describe("text link", () => {
  test("uses the cross-platform sms form with the keyword prefilled", () => {
    expect(smsLink()).toBe("sms:+13166333330?&body=INTERVIEW");
  });
});
