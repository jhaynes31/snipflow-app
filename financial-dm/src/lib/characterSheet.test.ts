import { describe, expect, test } from "bun:test";
import { armorLineFor, combinedShareText, isFullSheet, readCharacterSheet, recordArmorComplete, recordFinancialComplete } from "./characterSheet";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), dump: () => Object.fromEntries(m) };
};

describe("character sheet storage", () => {
  test("records only tier names and completion times", () => {
    const store = memory();
    recordFinancialComplete("Seasoned Adventurer", store);
    const rec = recordArmorComplete("Chain Mail", store);
    expect(rec.financial?.tier).toBe("Seasoned Adventurer");
    expect(rec.armor?.tier).toBe("Chain Mail");
    expect(isFullSheet(rec)).toBe(true);
    const raw = store.dump()["fdm_character_v1"];
    expect(raw).not.toMatch(/\$|partner|kids|CON|DEX|income|shield|damage/i);
    expect(raw.replace(/"at":"[^"]*"/g, "")).not.toMatch(/\d{3,}/); // nothing numeric besides the timestamps
    expect(Object.keys(JSON.parse(raw).armor).sort()).toEqual(["at", "tier"]);
  });
  test("half a sheet is not full; garbage in storage reads as empty", () => {
    const store = memory();
    expect(isFullSheet(recordArmorComplete("Leather Armor", store))).toBe(false);
    store.setItem("fdm_character_v1", "{not json");
    expect(readCharacterSheet(store)).toEqual({});
    expect(readCharacterSheet(null)).toEqual({});
  });
  test("armor shows on the combined card only for Chain Mail, Plate, or Traveling Light", () => {
    expect(armorLineFor({ armor: { tier: "Plate Armor", at: "" } })).toBe("Armor: Plate Armor");
    expect(armorLineFor({ armor: { tier: "Traveling Light", at: "" } })).toBe("Armor: Traveling Light");
    expect(armorLineFor({ armor: { tier: "Leather Armor", at: "" } })).toBe("Armor: being forged");
    expect(armorLineFor({ armor: { tier: "Unarmored", at: "" } })).toBe("Armor: being forged");
    expect(armorLineFor({})).toBe("Armor: being forged");
  });
  test("combined share text carries the financial tier and the armor line only", () => {
    const t = combinedShareText({ financial: { tier: "Legendary Hero", at: "" }, armor: { tier: "Unarmored", at: "" } });
    expect(t).toBe("Full character sheet complete at the Financial DM's tavern: Legendary Hero, armor: being forged. Roll yours.");
  });
});
