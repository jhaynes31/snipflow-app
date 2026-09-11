/**
 * Narrative events for the financial health quiz: the mid quiz plot twist,
 * the final saving throw, and the pure rules that resolve them from dice
 * values that were rolled elsewhere and stored. Nothing here changes the
 * score; scoring lives in wealthProfile.ts.
 */
import type { ProfileQuestion, StatKey } from "./wealthProfile";
import type { Rng } from "./wealthRng";

// ── Plot twist ─────────────────────────────────────────────────────

export interface TwistScenario {
  id: "transmission" | "water_heater" | "vet" | "furnace";
  text: string;
  /** A final event with this id is off the table after this scenario. */
  linkedEventId?: SaveEventId;
}

export const TWIST_SCENARIOS: TwistScenario[] = [
  { id: "transmission", text: "Your transmission just died. The bill: $2,800.", linkedEventId: "transmission" },
  { id: "water_heater", text: "Your water heater just flooded the basement. Replacing it: $1,900." },
  { id: "vet", text: "Your dog swallowed a sock. Emergency vet bill: $2,200." },
  { id: "furnace", text: "Your furnace quit in January. The repair: $2,400." },
];

/** d20 mapped evenly: 1 to 5, 6 to 10, 11 to 15, 16 to 20. */
export function scenarioForRoll(d20: number): TwistScenario {
  const idx = Math.max(0, Math.min(3, Math.ceil(d20 / 5) - 1));
  return TWIST_SCENARIOS[idx];
}

export const TWIST_PROMPT = "How do you cover it?";

/** The twist is a question like any other: its answer moves the stats. */
export const TWIST_QUESTION: ProfileQuestion = {
  key: "twist",
  options: [
    { id: "savings", label: "Pay it from savings. That's what it's there for.", points: 0, modifiers: { CON: 1 } },
    { id: "card_payoff", label: "Put it on a card and pay it off this month.", points: 0, modifiers: { DEX: 1 } },
    { id: "card_carry", label: "Put it on a card and chip away at it over time.", points: 0, modifiers: { STR: -1 } },
    { id: "borrow", label: "Borrow from family or a friend.", points: 0, modifiers: { CON: -1 } },
    { id: "unsure", label: "Honestly? No idea.", points: 0, modifiers: { CON: -1 } },
  ],
};

// ── Final saving throw ─────────────────────────────────────────────

export type SaveEventId = "hours_cut" | "transmission" | "rate_jump" | "hot_tip" | "market_dip" | "windfall";

export interface SaveEvent {
  id: SaveEventId;
  name: string;
  tests: StatKey;
  /** Inclusive d20 range. */
  range: [number, number];
}

export const SAVE_EVENTS: SaveEvent[] = [
  { id: "hours_cut", name: "Your hours get cut at work", tests: "CON", range: [1, 4] },
  { id: "transmission", name: "The transmission dies", tests: "DEX", range: [5, 8] },
  { id: "rate_jump", name: "Your card's interest rate jumps", tests: "STR", range: [9, 12] },
  { id: "hot_tip", name: "A friend pitches a \"guaranteed\" investment", tests: "INT", range: [13, 16] },
  { id: "market_dip", name: "The market dips 15%", tests: "WIS", range: [17, 19] },
  { id: "windfall", name: "Unexpected windfall: a $3,000 refund", tests: "WIS", range: [20, 20] },
];

export const SAVE_DC = 12;

export function eventForRoll(d20: number): SaveEvent {
  return SAVE_EVENTS.find((e) => d20 >= e.range[0] && d20 <= e.range[1]) ?? SAVE_EVENTS[0];
}

export function eligibleEvents(activeStats: StatKey[], twistScenarioId?: string): SaveEvent[] {
  const linked = TWIST_SCENARIOS.find((s) => s.id === twistScenarioId)?.linkedEventId;
  return SAVE_EVENTS.filter((e) => activeStats.includes(e.tests) && e.id !== linked);
}

/**
 * Roll the encounter die until it lands on an eligible event. The animation
 * only ever shows the final value. Returns null when nothing is eligible.
 */
export function rollSaveEvent(rng: Rng, activeStats: StatKey[], twistScenarioId?: string): { roll: number; event: SaveEvent } | null {
  const ok = eligibleEvents(activeStats, twistScenarioId);
  if (ok.length === 0) return null;
  for (let i = 0; i < 200; i++) {
    const roll = rng.d20();
    const event = eventForRoll(roll);
    if (ok.some((e) => e.id === event.id)) return { roll, event };
  }
  // Astronomically unlikely; fall back to the first eligible event's low roll.
  return { roll: ok[0].range[0], event: ok[0] };
}

export type SaveMode = "normal" | "advantage" | "disadvantage";

export function saveModeFor(modifier: number): SaveMode {
  if (modifier >= 2) return "advantage";
  if (modifier <= -2) return "disadvantage";
  return "normal";
}

/** Roll the save dice: one d20, or two under advantage or disadvantage. */
export function rollSaveDice(rng: Rng, mode: SaveMode): number[] {
  return mode === "normal" ? [rng.d20()] : [rng.d20(), rng.d20()];
}

export interface SaveResult {
  mode: SaveMode;
  dice: number[];
  kept: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  natural20: boolean;
  natural1: boolean;
}

/** Pure: resolve a save from stored dice and the tested stat's value. */
export function resolveSave(dice: number[], modifier: number, dc = SAVE_DC): SaveResult {
  const mode = saveModeFor(modifier);
  const kept = mode === "advantage" ? Math.max(...dice) : mode === "disadvantage" ? Math.min(...dice) : dice[0];
  const total = kept + modifier;
  const natural20 = kept === 20;
  const natural1 = kept === 1;
  // House rules: a natural 20 always succeeds and a natural 1 always fails.
  const success = natural20 ? true : natural1 ? false : total >= dc;
  return { mode, dice, kept, modifier, total, dc, success, natural20, natural1 };
}

// ── QA overrides (dev and preview builds only) ─────────────────────

export type DebugRolls = Partial<{ intro: number; twist: number; event: number; save: number; save2: number }>;

/**
 * `?debugRolls=event:20,save:1` lets Jen reach the natural 20, natural 1,
 * and windfall screens on purpose. Callers must only consult this when
 * debugging is enabled for the build (see isDebugBuild).
 */
export function parseDebugRolls(search: string): DebugRolls {
  const raw = new URLSearchParams(search).get("debugRolls");
  if (!raw) return {};
  const out: DebugRolls = {};
  for (const part of raw.split(",")) {
    const [k, v] = part.split(":").map((s) => s.trim());
    const n = Number(v);
    if (["intro", "twist", "event", "save", "save2"].includes(k) && Number.isInteger(n) && n >= 1 && n <= 20) {
      out[k as keyof DebugRolls] = n;
    }
  }
  return out;
}
