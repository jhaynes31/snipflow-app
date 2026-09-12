import { describe, expect, test } from "bun:test";
import { MAIL_TEMPLATES, fitResultEmail, newLeadEmail, newRecruitEmail } from "./mailTemplates";
import { scanRecruiting } from "./guildCompliance";

describe("mail templates", () => {
  test("John's lead notice carries contact details and a link, never answers or dollars", () => {
    const m = newLeadEmail({ id: 42, name: "Sam Rivera", phone: "316-555-0100", email: "sam@example.com", quizLabel: "Life Insurance Quiz", result: "Gold", source: "TikTok" });
    expect(m.subject).toBe("New lead: Sam Rivera");
    expect(m.text).toContain("316-555-0100");
    expect(m.text).toContain("/admin/leads?lead=42");
    expect(m.text).not.toMatch(/\$\d/);
    expect(m.html).toContain("Open in Leads");
  });

  test("recruit notice names the source and the fit result", () => {
    const m = newRecruitEmail({ name: "Sam Rivera", phone: "", email: "sam@example.com", source: "fit_quiz", fitClass: "bard", fitLevel: "strong" });
    expect(m.text).toContain("fit quiz");
    expect(m.text).toContain("The Bard, Strong fit");
    expect(m.text).toContain("/admin/guild");
  });

  test("the fit result email offers the interview at every level and passes the recruiting scan", () => {
    for (const level of ["strong", "worth_a_conversation", "not_right_now"] as const) {
      const m = fitResultEmail({ firstName: "Sam", guildClass: "ranger", fitLevel: level, johnName: "John Haynes", meetingCovers: "We'll walk through what the work involves, how it's paid, and whether it fits. If it's helpful, I can also answer questions about your own coverage or finances." });
      expect(m.text).toContain("INTERVIEW");
      expect(m.text).toContain("your own coverage or finances");
      expect(m.text).not.toMatch(/\$\d|salary|six figures/i);
      const flags = scanRecruiting(m.text, { industry: "Life insurance", describesMeeting: true }).filter((f) => f.kind !== "industry");
      expect(flags).toEqual([]);
    }
  });

  test("every template has a working sample", () => {
    for (const t of MAIL_TEMPLATES) {
      const s = t.sample();
      expect(s.subject.length).toBeGreaterThan(3);
      expect(s.text).toContain("The Financial DM");
    }
  });
});
