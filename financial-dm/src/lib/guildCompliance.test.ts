import { describe, expect, test } from "bun:test";
import { ensureRecruitCta, recruitCta, scanRecruiting } from "./guildCompliance";

const kinds = (t: string, o = {}) => scanRecruiting(t, o).map((f) => f.kind);

describe("recruiting flag scan", () => {
  test("earnings hype, hiring-safe words, regulated titles, and scam patterns are flagged", () => {
    const t = "Unlimited income for young, energetic recent grads. Become a financial advisor. Message me for details.";
    const f = scanRecruiting(t);
    expect(f.some((x) => x.kind === "earnings" && x.text === "unlimited income")).toBe(true);
    expect(f.filter((x) => x.kind === "hiring").map((x) => x.text)).toEqual(expect.arrayContaining(["young", "energetic", "recent grads"]));
    expect(f.some((x) => x.kind === "title" && x.text === "financial advisor")).toBe(true);
    expect(f.some((x) => x.kind === "scam" && x.text === "message me for details")).toBe(true);
  });
  test("dollar amounts or percentages near pay words are flagged; other numbers are not", () => {
    expect(kinds("You can earn $5,000 a month here.")).toContain("pay_figure");
    expect(kinds("Commission is 80% on every policy.")).toContain("pay_figure");
    expect(kinds("The exam has 150 questions and takes 2 hours.")).not.toContain("pay_figure");
  });
  test("the industry must be named when the scan knows it", () => {
    expect(kinds("Join our team and grow with us.", { industry: "life insurance and financial services" })).toContain("industry");
    expect(kinds("We help families with life insurance.", { industry: "life insurance and financial services" })).not.toContain("industry");
    expect(kinds("Join our team.", {})).not.toContain("industry");
  });
  test("describing the interview without the dual-purpose disclosure is flagged", () => {
    expect(kinds("The interview is a short video call where we talk about the role.")).toContain("disclosure");
    expect(kinds("The interview covers the work and how it's paid, and I can also answer questions about your own coverage or finances.")).not.toContain("disclosure");
    expect(kinds("Here is what a day looks like: calls, follow-ups, and paperwork.")).not.toContain("disclosure");
    expect(kinds("Come say hi.", { describesMeeting: true })).toContain("disclosure");
  });
  test("clean copy passes", () => {
    const t = "I help families with life insurance. Text INTERVIEW to 316-633-3330 and we'll talk about whether it fits, and I can answer questions about your own coverage or finances too.";
    expect(scanRecruiting(t, { industry: "life insurance and financial services" })).toEqual([]);
  });
});

describe("call to action", () => {
  test("defaults to the text number and the Guild Hall, or the quest link when given", () => {
    expect(recruitCta()).toContain("316-633-3330");
    expect(recruitCta()).toContain("thefinancialdm.com/guild");
    expect(recruitCta("join")).toContain("thefinancialdm.com/join");
  });
  test("ensureRecruitCta appends only when missing", () => {
    expect(ensureRecruitCta("Hello there.")).toContain("Text INTERVIEW to 316-633-3330");
    const already = "Text INTERVIEW to 316-633-3330 today.";
    expect(ensureRecruitCta(already)).toBe(already);
    const link = "Start at thefinancialdm.com/guild.";
    expect(ensureRecruitCta(link)).toBe(link);
  });
});
