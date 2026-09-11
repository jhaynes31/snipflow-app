/**
 * All the words John says during the financial health quiz's dice moments.
 * Kept in one place so they can be edited without touching the flow.
 */

export function openingRollCopy(n: number): string {
  if (n === 20) return "A natural 20! Lucky start. But luck ain't a plan, friend. Pull up a stool and let's see what you're really carrying.";
  if (n === 1) return "A 1. Good news: this one doesn't count. The dice don't decide how this story ends. Your preparation does. Pull up a stool.";
  return `A ${n}. Don't get attached to it, traveler. The dice don't decide how this story ends. Your preparation does. Pull up a stool and let's see what you're carrying.`;
}

export const OPENING_BUTTON = "Build My Character";

// ── Final saving throw ─────────────────────────────────────────────

import type { SaveEventId } from "~/lib/wealthEvents";
import type { StatKey } from "~/lib/wealthProfile";

export const SAVE_OUTCOME_COPY: Record<SaveEventId, { success: string; fail: string }> = {
  hours_cut: {
    success: "Hours got cut and you didn't even flinch. That's what a cushion's for. Solid CON, friend.",
    fail: "Oof. Fewer hours hit hard this time. But CON can be trained, and I know a few drills.",
  },
  transmission: {
    success: "Transmission's toast, but your budget saw it coming. Nimble work, traveler.",
    fail: "That bill knocked the wind out of your budget. Happens to the best of us. DEX can be trained.",
  },
  rate_jump: {
    success: "Your card's rate jumped and you barely felt it. Hard to squeeze someone who isn't carrying much.",
    fail: "That rate hike landed heavy. Debt makes every blow hit harder, but STR can be built back up.",
  },
  hot_tip: {
    success: "'Guaranteed returns'? You saw through that before your friend finished the pitch. Sharp.",
    fail: "Ah, the old 'can't lose' pitch. It got you this time. Lucky for you, INT grows fastest of all.",
  },
  market_dip: {
    success: "Market dropped 15% and you just kept pouring. That's the long game. Wise, friend.",
    fail: "That dip rattled you. Everyone flinches the first time. WIS comes with a few more rounds.",
  },
  windfall: {
    success: "A $3,000 windfall, and you actually put it to work. The bards will hear of this.",
    fail: "A $3,000 windfall... and somehow it's gone already. Next one, we make a plan first.",
  },
};

export const NATURAL_20_HEADLINE = "LEGENDARY. The bards will sing of this budget.";
export const NATURAL_1_HEADLINE = "...We don't talk about that roll. Next round's on the house.";

// ── Results screen ─────────────────────────────────────────────────

/**
 * DRAFT quest tips. John must review these for accuracy and compliance
 * before launch. Edit here; no code changes needed.
 */
export const QUESTS: Record<StatKey, string> = {
  CON: "Keep your emergency fund at a different bank than your checking. Out of sight is harder to raid, and a high-yield savings account pays you to wait.",
  DEX: "Ask payroll to split your direct deposit so a slice lands in savings before you ever see it. You can't spend what never hits checking.",
  STR: "Call your card company and ask for a lower APR. It takes ten minutes, and a surprising number of people who simply ask get one.",
  WIS: "Check whether your 401(k) has an auto-increase option. Bumping your contribution 1% a year is small enough you won't feel it, big enough your future self will.",
  INT: "You can check your credit reports from all three bureaus for free, every week, at AnnualCreditReport.com. It's the official site, and most people have never used it.",
};

export const RESULTS_CTA = "Want to train your stats? Grab a seat at John's table.";
