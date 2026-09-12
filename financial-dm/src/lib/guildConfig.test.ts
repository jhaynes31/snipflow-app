import { describe, expect, test } from "bun:test";
import { GUILD_FACT_FIELDS, GUILD_FAQ, HEARD_ABOUT_OPTIONS, checkInterest, guildIsLive, missingFacts, requiredFactKeys, smsLink, type GuildFacts } from "./guildConfig";

const allConfirmed = (): GuildFacts => Object.fromEntries(requiredFactKeys().map((k) => [k, { key: k, value: "John's words", confirmed: true }]));

describe("guild facts gate", () => {
  test("every required fact and every FAQ answer must be filled and confirmed", () => {
    expect(requiredFactKeys().length).toBe(GUILD_FACT_FIELDS.filter((f) => f.required).length + GUILD_FAQ.length);
    expect(guildIsLive({})).toBe(false);
    expect(guildIsLive(allConfirmed())).toBe(true);
  });
  test("a filled but unconfirmed fact keeps the page hidden", () => {
    const facts = allConfirmed();
    facts.recruitCosts = { key: "recruitCosts", value: "None", confirmed: false };
    expect(missingFacts(facts)).toEqual(["recruitCosts"]);
    expect(guildIsLive(facts)).toBe(false);
  });
  test("a confirmed but empty fact keeps the page hidden", () => {
    const facts = allConfirmed();
    facts.faq_pay = { key: "faq_pay", value: "   ", confirmed: true };
    expect(missingFacts(facts)).toEqual(["faq_pay"]);
  });
  test("optional facts never block going live", () => {
    expect(requiredFactKeys()).not.toContain("johnFullName");
    expect(requiredFactKeys()).not.toContain("licenseLookup");
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
