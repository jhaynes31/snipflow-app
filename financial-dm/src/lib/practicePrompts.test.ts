import { describe, expect, test } from "bun:test";
import { hintUserPrompt, personaUserPrompt, playSystemPrompt, profileSnapshot, recruitingTrustBlock } from "./practicePrompts";

const profile = { name: "Wants Remote Work", lifeStage: "Wants work from home", triggers: ["a long commute"], painPoints: ["I want to work from home without it being a scam."], worries: "Is this a real job?", notes: "" };
const persona = { name: "Dana", ageRange: "late 30s", household: "married, two kids", backstory: "Recently moved. Commute stopped making sense.", concern: "Being taken for a ride again." };

describe("practice prompts", () => {
  test("a persona is built only from the profile description", () => {
    const p = personaUserPrompt(profile, "recruiting", ["Sam"]);
    expect(p).toContain("Wants Remote Work");
    expect(p).toContain("a long commute");
    expect(p).toContain("Do not use these first names: Sam");
    expect(profileSnapshot(profile)).not.toMatch(/@|\$\d|\d{3}-\d{4}/);
  });

  test("the play prompt carries the rules that stop the persona from caving", () => {
    const s = playSystemPrompt({ persona, conversation: "recruiting", temperament: "scam_burned", difficulty: 4, maxTurns: 30 });
    expect(s).toMatch(/PRACTICE/);
    expect(s).toMatch(/Never agree because the conversation seems to be ending/);
    expect(s).toMatch(/Pressure alone makes you less likely to say yes/);
    expect(s).toMatch(/never changes how willing you are to be convinced/);
    expect(s).toMatch(/Enthusiasm, urgency, charm/);
    expect(s).toMatch(/still persuadable/);
    expect(s).toMatch(/Never make race, religion/);
    expect(s).toMatch(/"ended":false/);
  });

  test("the hint prompt exposes the concern and recent lines only", () => {
    const u = hintUserPrompt(persona, [{ role: "john", text: "Hi Dana" }, { role: "persona", text: "I've been burned before." }]);
    expect(u).toContain("Being taken for a ride again");
    expect(u).toContain("Dana: I've been burned before.");
  });

  test("the trust block carries public facts only", () => {
    const b = recruitingTrustBlock({ industry: "Life insurance", johnFullName: "John Haynes", compensationDetails: "SECRET NOTES", payBasis: "Commission-based." });
    expect(b).toContain("Life insurance");
    expect(b).toContain("John Haynes");
    expect(b).not.toContain("SECRET");
    expect(recruitingTrustBlock({})).toBe("");
  });
});
