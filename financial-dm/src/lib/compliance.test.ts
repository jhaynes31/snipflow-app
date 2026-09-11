import { describe, expect, test } from "bun:test";
import { scanCompliance } from "./compliance";
import { ensureSpokenEnding, ensureCtaLine, isFinalPart, seriesOpener, teaseFor } from "./campaign";

describe("compliance scan", () => {
  test("finds the starting list, case-insensitively, as whole phrases", () => {
    expect(scanCompliance("This plan is GUARANTEED to work and risk free.")).toEqual(["guaranteed", "risk-free"]);
    expect(scanCompliance("You will qualify, no exam needed, best rate in town, free money!")).toEqual(["best rate", "free money", "you will qualify", "no exam needed"]);
  });
  test("ignores clean copy and partial words", () => {
    expect(scanCompliance("A guarantee is a promise. Rates vary. Talk to John.")).toEqual([]);
    expect(scanCompliance("")).toEqual([]);
  });
});

const campaign = { questId: 1, slotId: 2, questName: "Q", spokenLine: "Take the free quiz at thefinancialdm.com/baby.", url: "https://thefinancialdm.com/baby", teaseLine: "Part {next} is coming. Follow so you don't miss it." };

describe("campaign endings", () => {
  test("adds the spoken line once", () => {
    const once = ensureSpokenEnding("Great script body.", campaign);
    expect(once.endsWith("Take the free quiz at thefinancialdm.com/baby.")).toBe(true);
    expect(ensureSpokenEnding(once, campaign)).toBe(once);
  });
  test("middle parts get the tease before the CTA; the last part does not", () => {
    const mid = { ...campaign, series: { name: "Armor", kind: "multi_part" as const, partNumber: 1, totalParts: 3 } };
    const out = ensureSpokenEnding("Body.", mid);
    expect(out).toBe("Body.\n\nPart 2 is coming. Follow so you don't miss it.\n\nTake the free quiz at thefinancialdm.com/baby.");
    const last = { ...campaign, series: { name: "Armor", kind: "multi_part" as const, partNumber: 3, totalParts: 3 } };
    expect(ensureSpokenEnding("Body.", last)).toBe("Body.\n\nTake the free quiz at thefinancialdm.com/baby.");
    // A CTA the model put before the tease is moved after it.
    expect(ensureSpokenEnding("Body. Take the free quiz at thefinancialdm.com/baby.", mid)).toBe("Body.\n\nPart 2 is coming. Follow so you don't miss it.\n\nTake the free quiz at thefinancialdm.com/baby.");
  });
  test("openers, final part, and caption CTA", () => {
    expect(seriesOpener({ name: "New Parent Armor", kind: "multi_part", partNumber: 2, totalParts: 3 })).toBe("Part 2 of New Parent Armor");
    expect(seriesOpener({ name: "Last Call", kind: "recurring" })).toBe("Last Call");
    expect(isFinalPart({ name: "A", kind: "multi_part", partNumber: 3, totalParts: 3 })).toBe(true);
    expect(isFinalPart({ name: "A", kind: "recurring" })).toBe(true);
    expect(teaseFor(campaign.teaseLine, { name: "A", kind: "multi_part", partNumber: 3, totalParts: 3 })).toBeNull();
    expect(ensureCtaLine("Caption here.", campaign)).toBe("Caption here. Take the free quiz at thefinancialdm.com/baby.");
    expect(ensureCtaLine("Already says thefinancialdm.com/baby", campaign)).toBe("Already says thefinancialdm.com/baby");
    expect(ensureCtaLine("Plain", undefined)).toBe("Plain");
  });
});
