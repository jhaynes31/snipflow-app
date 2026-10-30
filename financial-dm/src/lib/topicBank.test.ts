import { describe, expect, test } from "bun:test";
import { TOPIC_BANK, TOPIC_NAMES } from "../server/seed-facts";
import { TOPICS } from "./questSuggestions";

/**
 * Guards for the content bank behind every generator. These keep the four
 * layers complete for every topic and keep the retired Dave Ramsey era
 * advice from creeping back in as a recommendation.
 */

const RETIRED_AS_ADVICE = [
  /10 to 12 times/i,
  /pay yourself first/i,
  /latte/i,
  /beans and rice/i,
  /cash envelope/i,
  /cut up (your|the) cards?/i,
];

// A topic may name a retired rule in order to retire it (the facts for
// "Where the Money Goes" and "Life Insurance Amounts" do). These are the
// only places a retired phrase may appear, and only in a critical sentence.
const ALLOWED_CRITIQUE: Record<string, RegExp[]> = {
  "Life Insurance Amounts": [/10 to 12 times/i],
};

describe("topic bank", () => {
  test("every topic has all four layers", () => {
    expect(TOPIC_NAMES.length).toBeGreaterThanOrEqual(30);
    for (const name of TOPIC_NAMES) {
      const t = TOPIC_BANK[name];
      expect(t.facts.length, `${name} facts`).toBeGreaterThanOrEqual(5);
      expect(t.painPoints.length, `${name} pain points`).toBeGreaterThanOrEqual(3);
      expect(t.stats.length, `${name} stats`).toBeGreaterThanOrEqual(2);
      expect(t.moves.length, `${name} moves`).toBeGreaterThanOrEqual(4);
    }
  });

  test("every stat carries a real number so a Stat Card can lead with it", () => {
    for (const name of TOPIC_NAMES) {
      for (const s of TOPIC_BANK[name].stats) expect(/\d/.test(s), `${name}: ${s}`).toBe(true);
    }
  });

  test("house style: no em dashes, hyphens, double quotes, or contractions in the text", () => {
    for (const name of TOPIC_NAMES) {
      const t = TOPIC_BANK[name];
      for (const line of [...t.facts, ...t.painPoints, ...t.stats, ...t.moves]) {
        expect(line, `${name}: ${line}`).not.toMatch(/[—–"]/);
        expect(line, `${name}: ${line}`).not.toMatch(/\w-\w/);
        expect(line, `${name}: ${line}`).not.toMatch(/\b\w+n't\b|\b(it|that|there|he|she|what)'s\b|\b(I|you|we|they)'(m|re|ve|ll|d)\b/);
      }
    }
  });

  test("retired advice does not come back as a recommendation", () => {
    for (const name of TOPIC_NAMES) {
      const t = TOPIC_BANK[name];
      const allowed = ALLOWED_CRITIQUE[name] ?? [];
      for (const line of [...t.facts, ...t.stats, ...t.moves]) {
        for (const re of RETIRED_AS_ADVICE) {
          if (allowed.some((a) => a.source === re.source)) continue;
          expect(line, `${name}: ${line}`).not.toMatch(re);
        }
      }
    }
  });

  test("the Quest Board topic suggestions match the bank", () => {
    for (const t of TOPICS) expect(TOPIC_NAMES, t).toContain(t);
    expect(TOPICS.length).toBe(TOPIC_NAMES.length);
  });
});
