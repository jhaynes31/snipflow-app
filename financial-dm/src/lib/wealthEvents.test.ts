import { describe, expect, test } from "bun:test";
import { eligibleEvents, eventForRoll, parseDebugRolls, resolveSave, rollSaveEvent, saveModeFor, scenarioForRoll } from "./wealthEvents";
import { createScriptedRng, createSeededRng } from "./wealthRng";

describe("twist and save rules", () => {
  test("scenario ranges split the d20 evenly", () => {
    expect(scenarioForRoll(1).id).toBe("transmission");
    expect(scenarioForRoll(5).id).toBe("transmission");
    expect(scenarioForRoll(6).id).toBe("water_heater");
    expect(scenarioForRoll(15).id).toBe("vet");
    expect(scenarioForRoll(20).id).toBe("furnace");
  });
  test("event ranges", () => {
    expect(eventForRoll(4).id).toBe("hours_cut");
    expect(eventForRoll(8).id).toBe("transmission");
    expect(eventForRoll(12).id).toBe("rate_jump");
    expect(eventForRoll(16).id).toBe("hot_tip");
    expect(eventForRoll(19).id).toBe("market_dip");
    expect(eventForRoll(20).id).toBe("windfall");
  });
  test("the twist's linked event and inactive stats are ineligible", () => {
    const ids = eligibleEvents(["CON", "DEX", "STR", "WIS", "INT"], "transmission").map((e) => e.id);
    expect(ids).not.toContain("transmission");
    expect(eligibleEvents(["CON"], "vet").map((e) => e.id)).toEqual(["hours_cut"]);
    expect(eligibleEvents([], "vet")).toEqual([]);
  });
  test("rollSaveEvent rerolls past ineligible events and shows only the final value", () => {
    const rng = createScriptedRng([7, 7, 13]); // 7 = transmission (ineligible after the twist), 13 = hot tip
    const r = rollSaveEvent(rng, ["CON", "DEX", "STR", "WIS", "INT"], "transmission");
    expect(r?.roll).toBe(13);
    expect(r?.event.id).toBe("hot_tip");
    expect(rollSaveEvent(createSeededRng(1), [], undefined)).toBeNull();
  });
  test("advantage and disadvantage keep the right die", () => {
    expect(saveModeFor(2)).toBe("advantage");
    expect(saveModeFor(-2)).toBe("disadvantage");
    expect(saveModeFor(1)).toBe("normal");
    expect(resolveSave([5, 15], 2).kept).toBe(15);
    expect(resolveSave([5, 15], -2).kept).toBe(5);
    expect(resolveSave([9], 3).total).toBe(12);
    expect(resolveSave([9], 3).success).toBe(true);
    expect(resolveSave([9], 2).success).toBe(false);
  });
  test("natural 20 always succeeds and natural 1 always fails", () => {
    expect(resolveSave([20, 3], 2).success).toBe(true);
    expect(resolveSave([1], 3).success).toBe(false); // 1 + 3 = 4 anyway
    expect(resolveSave([1], 11).success).toBe(false); // would meet DC without the house rule
    expect(resolveSave([20, 1], -2).kept).toBe(1);
    expect(resolveSave([20, 1], -2).success).toBe(false);
  });
  test("debug param parsing", () => {
    expect(parseDebugRolls("?debugRolls=event:20,save:1")).toEqual({ event: 20, save: 1 });
    expect(parseDebugRolls("?debugRolls=event:99,bogus:3")).toEqual({});
    expect(parseDebugRolls("")).toEqual({});
  });
});
