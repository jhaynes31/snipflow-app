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
  // Added 12 Sep 2026 so a hand is not all traps. Drafts for John's review, drawn from the term life facts he already uses.
  {
    id: "level_rate",
    statement: "With level term, the payment stays the same for the whole term.",
    answer: "treasure",
    reveal: "That's the point of level term: the premium is set when the policy starts and holds for the full term, whether that's 10, 20, or 30 years.",
  },
  {
    id: "no_exam",
    statement: "Some term policies don't require a medical exam.",
    answer: "treasure",
    reveal: "For smaller coverage amounts, many carriers offer simplified issue policies with health questions instead of an exam. Some approve the same day.",
  },
  {
    id: "declined_once",
    statement: "If one company turns you down, another might still say yes.",
    answer: "treasure",
    reveal: "Carriers weigh health history differently. A no from one is not a no from all, which is exactly why an agent shops more than one.",
  },
  {
    id: "probate",
    statement: "A named beneficiary usually gets the money without waiting on probate.",
    answer: "treasure",
    reveal: "When a person is named directly, the payout generally goes to them outside of probate, so the money arrives when the family needs it most.",
  },
  {
    id: "free_look",
    statement: "You can cancel a brand-new policy within the free look period and get your money back.",
    answer: "treasure",
    reveal: "Every new policy comes with a free look period, a set number of days to change your mind for a full refund. Read it, sleep on it, and keep it if it fits.",
  },
  {
    id: "health_change",
    statement: "If my health gets worse, my term rate goes up.",
    answer: "trap",
    reveal: "Once a level term policy is issued, the rate is locked. New health problems later don't raise it. That's why applying while you're healthy matters.",
  },
  {
    id: "only_kids",
    statement: "Life insurance only matters if you have kids.",
    answer: "trap",
    reveal: "Anyone with a partner who relies on their income, a mortgage, or debts a family member co-signed has someone to protect. Kids are one reason, not the only one.",
  },
];

/** Always dealt: it primes the player for the work coverage question that follows. */
export const ALWAYS_DEALT = "work_coverage";
export const CARDS_PER_GAME = 3;

/** Rotated by card position so the same line never lands twice in a row. */
export const RIGHT_LINES = ["Sharp eye!", "You've been around this tavern before.", "Nothing gets past you."];
export const WRONG_LINES = ["Gotcha. Don't feel bad, most folks fall for this one.", "Sneaky one, isn't it?", "That's why we play the game."];

export const MYTH_INTRO = "Three cards from the rumor pile. Some are traps, some are treasure. Call each one before I flip it.";

/** Every hand carries at least this many treasures, so no game is all traps. */
export const MIN_TREASURES = 1;
export const MYTH_BUTTON = "Deal the Cards";
