/**
 * Everything John says during the life insurance quiz's dice and party
 * moments. One place, so his words can be edited without touching the flow.
 * All of it is a DRAFT for John's review.
 */

export const LOADED_ROLL_1 = "A natural 20. Beginner's luck?";
export const LOADED_ROLL_1_BUTTON = "Roll Again";
export const LOADED_ROLL_2 =
  "Noticed that, did you? These dice are loaded. In this dungeon, that's good news. The numbers we roll tonight aren't luck, they're math. And math can be planned for.";
export const LOADED_ROLL_2_BUTTON = "Gather Your Party";
export const LOADED_TAGLINE = "You can't know when. But you can know how much.";

export const PARTY_PROMPT = "Who's at your table? Pick everyone who counts on you.";
export const PETS_LINE = "They count too. They won't change your numbers, but they'll judge you if you leave them out.";
export const SOLO_LINE = "Traveling light. We'll keep this short, then.";
export const YOUNGEST_PROMPT = "How old is your youngest?";
export const PARTY_BUTTON = "Seat the Party";

// ── Damage roll (Section 10) ───────────────────────────────────────

export const DAMAGE_INTRO = "Time for the damage roll. Loaded dice, remember. This number won't change with luck, which means it can be covered.";
export const DAMAGE_LABELS = { D: "Debts & final expenses", I: "Income to replace", M: "Mortgage", E: "Education" } as const;
export const SOLO_DAMAGE_LABEL = "Even solo adventurers leave a tab behind";
export const NO_DAMAGE = "No damage here.";
export const DAMAGE_BUTTON = "Reveal My Armor";

// ── Armor Class reveal (Section 11) ────────────────────────────────

import type { ArmorTier } from "~/lib/armorEngine";

export const TIER_COPY: Record<ArmorTier, string> = {
  plate: "Plate armor! Your party's well protected. Worth a checkup whenever life changes, but you're in great shape.",
  chain: "Chain mail. Solid protection, with a few gaps a sharp blade could find.",
  leather: "Leather armor. It's a start, but a big hit would get through.",
  unarmored: "No armor yet, traveler. That's more fixable than most folks think.",
  traveling_light:
    "You're a solo adventurer right now, with nobody depending on you, so you may not need much armor yet. Just know that changes fast: a partner, a kid, a mortgage, or co-signing a loan. And coverage is generally cheaper the younger and healthier you are when you apply.",
};
export const TIER_ICON: Record<ArmorTier, string> = { plate: "🛡️", chain: "⛓️", leather: "🧥", unarmored: "👕", traveling_light: "🎒" };
export const CURSED_LINE = "Careful, some of that armor is cursed. Work coverage usually vanishes or has to be converted when you leave the job.";
export const GAP_LABEL = "Where damage gets through";
export const NO_GAP_LINE = "Nothing gets through. Your shield covers the whole hit.";
export const ARMOR_BUTTON = "See My Results";

// ── Results (Section 12) ───────────────────────────────────────────

export const BUSINESS_NOTE = "You've got a business partner at your table. Ask John about coverage that protects the business if something happens to one of you.";
/** DRAFT: John, and his agency or carrier compliance if required, must approve. */
export const RESULTS_DISCLAIMER =
  "This is a rough educational estimate based on a common rule of thumb called the DIME method. It isn't a quote, a recommendation, or financial advice, and it doesn't account for things like savings, Social Security survivor benefits, or your family's specific plans. Talk with a licensed agent for a personalized review.";
export function ctaCopy(tier: ArmorTier): string {
  if (tier === "traveling_light") return "When your party grows, John's saving you a seat.";
  if (tier === "plate") return "Want a second set of eyes on your armor? Grab a seat at John's table.";
  return "Let's forge the rest of your armor. Grab a seat at John's table.";
}
export const CHARACTER_SHEET_LINK = "Your Armor Class is measured. Complete your character sheet in the Financial Health Quiz.";
