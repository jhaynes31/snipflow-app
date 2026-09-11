/**
 * Ready-made options for every free-text field on the Quest Board. John can
 * pick one or type his own; a pick just fills the box. Lists that depend on
 * context (a profile, a quiz) are functions.
 */
import { QUEST_CONFIG, type QuizId } from "./questConfig";
import { suggestSlug } from "./questPlan";

export const PROFILE_NAMES = ["New Parents", "First-Time Homeowners", "Job Changers", "Young Couples Starting Out", "Single Parents", "Small Business Owners", "Freelancers and Gig Workers", "Empty Nesters", "Caregivers of Aging Parents", "Recent Graduates", "Newly Divorced", "Ten Years from Retirement"];

export const LIFE_STAGES = [
  "Just had, or expecting, a baby",
  "Bought, or about to buy, a first home",
  "Starting a new job, laid off, or going out on their own",
  "Newly married or moving in together",
  "Raising kids on one income",
  "Running a small business",
  "Kids just left home",
  "Helping an aging parent",
  "First real job after school",
  "Five to ten years from retirement",
  "Recently separated or divorced",
];

export const TRIGGERS = ["new baby on the way", "getting married", "moving in together", "divorce or separation", "new job with new benefits", "layoff or severance", "going freelance or 1099", "buying a first home", "refinancing", "co-signing a loan", "kids starting school", "kids leaving home", "caring for a parent", "a big raise", "a big medical bill", "starting a business", "an inheritance", "a milestone birthday", "leaving an old 401(k) behind", "going from two incomes to one"];

export const WORRIES = [
  "If something happened to me, could my family keep the house?",
  "Are we saving enough, or just hoping it works out?",
  "What happens to my coverage if I leave this job?",
  "Would my kids be okay if one of us were gone?",
  "Am I already behind, and is it too late to fix?",
  "Who would take care of everything if I couldn't?",
  "Is the debt going to follow us forever?",
  "Did I just lose coverage I didn't know I was counting on?",
];

export function questNames(profileName: string): string[] {
  const p = profileName.trim();
  const base = p ? [`${p.replace(/s$/, "")} Armor`, `${p} Quest`, `The ${p.replace(/s$/, "")} Shield`, `Trap or Treasure: ${p}`] : [];
  return [...base, "New Parent Armor", "Job Change Checkup", "First Home, First Shield", "The Two Income Trap", "Starting Out Strong"].filter((v, i, a) => a.indexOf(v) === i);
}

export function testingIdeas(profileName: string): string[] {
  const p = profileName.trim() || "this profile";
  return [
    `Do ${p.toLowerCase()} hooks book calls?`,
    "Does a multi-part series book more calls than standalone posts?",
    "Does the work-coverage angle book calls?",
    "Does naming the life event in the first line book calls?",
    "Does Trap or Treasure drive quiz completions?",
    "Do scripts beat carousels for bookings?",
    "Does a spoken link at the end get typed in?",
  ];
}

export function lootHighlights(quiz: QuizId): string[] {
  return quiz === "life_insurance"
    ? ["The Cursed Armor Decoder", "The Beneficiary Check", "The Party Map"]
    : ["Emergency Fund Starter Guide", "Savings Booster Checklist", "One Page Budget Worksheet", "Paycheck Split Plan", "Debt Payoff Battle Plan", "Lower Your Rate Call Script", "Compound Growth Calculator", "Retirement Saving Basics", "Free Credit Report Guide", "Money Words, Decoded"];
}

export function slugIdeas(questName: string, profileName: string): string[] {
  const fromNames = [suggestSlug(questName), suggestSlug(profileName)].filter((s) => s && s.length >= 3);
  const pool = ["baby", "nest", "home", "keys", "job", "switch", "armor", "shield", "vault", "budget", "debt", "retire", "crew", "party", "map", "start"];
  return [...fromNames, ...pool].filter((v, i, a) => v && a.indexOf(v) === i && !QUEST_CONFIG.reservedSlugs.includes(v)).slice(0, 12);
}

export const RETRO_STARTERS = ["What booked calls: ", "What got views but no calls: ", "Best hook angle: ", "Next time, test: ", "Not-a-fit reasons we heard: "];

export const SHOW_NAMES = ["Trap or Treasure Tuesday", "Last Call", "Myth Monday", "Two Minute Tavern", "Ask the DM", "Loot Drop Friday", "Boss Fight Breakdown", "Tavern Tab Thursday"];
export const SHOW_DESCRIPTIONS = [
  "A myth vs. fact post. John reads a common belief and calls it a trap or a treasure.",
  "One quick, useful tip to end the week. Short, warm, and worth saving.",
  "A viewer question answered in under a minute.",
  "One money term explained the tavern way.",
  "A common money mistake and the fix, told as a boss fight.",
];
export function seriesNames(profileName: string): string[] {
  const p = profileName.trim().replace(/s$/, "");
  return [p ? `${p} Armor` : "New Parent Armor", "The Coverage Gap", "Three Traps of the First Home", "Job Change Survival Kit", "One Income, Whole Family", "The Beneficiary Files"].filter((v, i, a) => a.indexOf(v) === i);
}
export const SERIES_DESCRIPTIONS = [
  "One story told across three posts: the problem, the real numbers, the fix.",
  "Each part answers one question the last part raised.",
  "Part one names the trap, part two shows the cost, part three hands over the loot.",
];

/** Topic names from the fact bank, so slots use names the forge already knows. */
export const TOPICS = ["Term Life Insurance", "Life Changes", "Life Insurance Amounts", "Beneficiaries", "Wills and Trusts", "Estate Planning", "Emergency Fund", "Budgeting", "Saving", "Paying Yourself First", "Getting Out of Debt", "Building Credit", "Retirement Planning", "Compound Growth", "Investments", "Home Buying", "Renting vs Buying", "Family and Kids", "College Savings", "Career Planning", "Health Coverage", "Disability Protection", "Taxes", "Financial Goals", "Net Worth", "Talking to Family About Money", "Financial Literacy"];

export const HOOK_ANGLES = [
  "The letter from HR nobody reads",
  "The day your work coverage stops",
  "What one income actually covers",
  "The form that beats your will",
  "The bill that follows the house",
  "The benefits page you skipped",
  "Why waiting a year costs more than you think",
  "The number most families guess wrong",
  "What the cheapest policy leaves out",
  "The question nobody asks at closing",
];

export const GENERATOR_REASONS: Record<string, string[]> = {
  script: ["Scripts carry a story best on TikTok.", "A talking-head explanation earns trust here.", "Series parts read best as scripts."],
  carousel: ["A checklist reads well as a photo post.", "Step-by-step beats talking for this one.", "Saves and shares come from swipeable steps."],
  insight_card: ["A myth vs. fact card lands in one glance.", "A single stat, boldly shown."],
  social_card: ["One punchy stat or tip, no scrolling needed.", "Quick to make, easy to save."],
  meme: ["Humor lands the relatable moment.", "A light touch for a heavy topic."],
};

export const SLOT_NOTES = ["Film outdoors if the light's good.", "Pin the quiz link in the first comment.", "Reply to comments within the hour.", "Reuse the hook from the best-performing post."];
