/**
 * Trap or Treasure: the myth deck (Section 8). Every reveal is a DRAFT for
 * John's review. Content only; the dealing rules live in lib/lifeMyths.ts.
 */

export type MythAnswer = "trap" | "treasure";

export interface MythCard {
  id: string;
  /** The claim on the card, as the player sees it. */
  statement: string;
  answer: MythAnswer;
  /** John's reveal after the player guesses. */
  reveal: string;
}

export const MYTH_DECK: MythCard[] = [
  {
    id: "work_coverage",
    statement: "My coverage through work has me covered.",
    answer: "trap",
    reveal: "Work coverage usually ends, or has to be converted, when you leave the job, and it's often just one or two times your salary. Handy extra armor, but it rarely covers the whole party.",
  },
  {
    id: "too_expensive",
    statement: "Term life insurance is too expensive for someone like me.",
    answer: "trap",
    reveal: "Most folks guess way too high. For a lot of healthy adults, term coverage costs far less than they'd expect. Worth getting a real number before you rule it out.",
  },
  {
    id: "stay_home",
    statement: "A stay-at-home parent doesn't need life insurance.",
    answer: "trap",
    reveal: "If a stay-at-home parent is gone, someone still has to cover childcare, meals, rides, and everything else they do. That costs real money.",
  },
  {
    id: "young_healthy",
    statement: "It's smart to lock in coverage while you're young and healthy.",
    answer: "treasure",
    reveal: "Rates are generally based on your age and health when you apply, and with level term, your rate usually stays the same for the whole term.",
  },
  {
    id: "beneficiary_will",
    statement: "My will decides who gets my life insurance.",
    answer: "trap",
    reveal: "Your beneficiary designation usually wins, even over your will. Check it, especially after a marriage, divorce, or new baby.",
  },
  {
    id: "minor_beneficiary",
    statement: "I can just name my kids as my beneficiaries.",
    answer: "trap",
    reveal: "Minors generally can't receive the money directly, so a court may have to appoint someone to manage it. A trust or a custodian set up ahead of time avoids that.",
  },
  {
    id: "taxes",
    statement: "My family would owe income tax on the payout.",
    answer: "trap",
    reveal: "Life insurance payouts are generally free of federal income tax for the beneficiary. The whole amount goes to work for your family.",
  },
  {
    id: "conversion",
    statement: "Some term policies can be switched to permanent coverage later without a new medical exam.",
    answer: "treasure",
    reveal: "Many term policies include a conversion option, usually within a set window. It's worth asking about before you buy.",
  },
];

/** Always dealt: it primes the player for the work coverage question that follows. */
export const ALWAYS_DEALT = "work_coverage";
export const CARDS_PER_GAME = 3;

/** Rotated by card position so the same line never lands twice in a row. */
export const RIGHT_LINES = ["Sharp eye!", "You've been around this tavern before.", "Nothing gets past you."];
export const WRONG_LINES = ["Gotcha. Don't feel bad, most folks fall for this one.", "Sneaky one, isn't it?", "That's why we play the game."];

export const MYTH_INTRO = "Three cards from the rumor pile. Some are traps, some are treasure. Call each one before I flip it.";
export const MYTH_BUTTON = "Deal the Cards";
