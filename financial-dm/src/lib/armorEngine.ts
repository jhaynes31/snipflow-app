/**
 * The loaded dice: the life insurance quiz's coverage estimate.
 *
 * `computeArmor` is a pure function of the player's answers and the config.
 * Every "roll" the quiz shows is an animation landing on a number from here.
 * This file must never import the dice module; a test checks that.
 *
 * This is a rough educational estimate, not a quote or advice (Section 2.3).
 */
import {
  ARMOR_CONFIG,
  type AcTier,
  type ArmorConfig,
  type DebtBracket,
  type EducationChoice,
  type EmployerDollars,
  type EmployerMultiple,
  type IncomeBracket,
  type MortgageBracket,
  type PersonalBracket,
  type YoungestAge,
} from "./armorConfig";

export const PARTY_IDS = ["partner", "kids", "parent", "cosigner", "business", "pets", "solo"] as const;
export type PartyId = (typeof PARTY_IDS)[number];

export interface Party {
  members: PartyId[];
  /** Number of kids, 1 to 6 ("6+" is stored as 6). Ignored unless `kids` is a member. */
  kids: number;
  youngest?: YoungestAge;
}

export type EmployerAnswer = EmployerMultiple | EmployerDollars;

export interface LifeAnswers {
  party: Party;
  /** Kept for John's context; never used in the estimate. */
  age?: string;
  income?: IncomeBracket;
  mortgage?: MortgageBracket;
  debts?: DebtBracket;
  education?: EducationChoice;
  employer?: EmployerAnswer;
  personal?: PersonalBracket;
}

export type ArmorTier = AcTier | "traveling_light";
export type LifeLootId = "cursed_armor_decoder" | "beneficiary_check" | "party_map";

export interface ArmorResult {
  /** The four damage dice, in dollars, before rounding. */
  dice: { D: number; I: number; M: number; E: number };
  damage: number;
  shield: number;
  gap: number;
  employerShield: number;
  personalShield: number;
  acTier: ArmorTier;
  /** Work coverage is more than half of the shield. */
  cursed: boolean;
  loot: LifeLootId;
  /** Plain language notes for every "not sure" answer that was counted as something. */
  assumptions: string[];
  solo: boolean;
  hasDependents: boolean;
  sharesObligations: boolean;
  earnsPaycheck: boolean;
  kids: number;
}

export const EMPTY_PARTY: Party = { members: [], kids: 1 };

/** Solo: chose "nobody depends on me", or picked nothing but pets. */
export function isSolo(party: Party | undefined): boolean {
  const members = party?.members ?? [];
  if (members.includes("solo")) return true;
  return members.every((m) => m === "pets");
}

export function computeArmor(a: LifeAnswers, config: ArmorConfig = ARMOR_CONFIG): ArmorResult {
  const members = new Set(a.party?.members ?? []);
  const solo = isSolo(a.party);
  const hasKids = !solo && members.has("kids");
  const kids = hasKids ? Math.max(1, Math.min(6, Math.round(a.party?.kids || 1))) : 0;
  const hasDependents = !solo && (members.has("partner") || hasKids || members.has("parent"));
  const sharesObligations = hasDependents || (!solo && members.has("cosigner"));
  const earnsPaycheck = a.income !== "none";

  const income = a.income === "none" ? config.caregiverReplacementValue : a.income ? config.incomeMidpoints[a.income] : 0;
  const debts = a.debts ? config.debtMidpoints[a.debts] : 0;
  const mortgage = a.mortgage ? config.mortgageMidpoints[a.mortgage] : 0;
  const years = hasKids ? config.incomeYears[a.party?.youngest ?? "under5"] : config.incomeYears.noKids;

  const D = config.finalExpenses + (sharesObligations ? debts : 0);
  const I = hasDependents ? income * years : 0;
  const M = sharesObligations ? mortgage : 0;
  const E = hasKids && a.education ? config.educationPerChild[a.education] * kids : 0;
  const damage = D + I + M + E;

  const assumptions: string[] = [];
  let employerShield = 0;
  if (earnsPaycheck) {
    const mult = a.employer && a.employer in config.employerMultiples ? config.employerMultiples[a.employer as EmployerMultiple] : 0;
    employerShield = mult * income;
    if (a.employer === "unsure") assumptions.push("You weren't sure about your work coverage, so we counted it as 1× your salary. John can help you check.");
  } else {
    employerShield = a.employer && a.employer in config.employerDollarMidpoints ? config.employerDollarMidpoints[a.employer as EmployerDollars] : 0;
    if (a.employer === "unsure") assumptions.push("You weren't sure about coverage through a job, so we counted it as $0. John can help you check.");
  }
  const personalShield = a.personal ? config.personalMidpoints[a.personal] : 0;
  if (a.personal === "unsure") assumptions.push("You weren't sure about coverage you bought yourself, so we counted it as $0. John can help you check.");

  const shield = employerShield + personalShield;
  const gap = Math.max(0, damage - shield);
  const cursed = shield > 0 && employerShield > shield / 2;

  let acTier: ArmorTier;
  if (solo) acTier = "traveling_light";
  else if (damage <= 0) acTier = "plate";
  else {
    const ratio = shield / damage;
    const t = config.acThresholds;
    acTier = ratio < t.leather ? "unarmored" : ratio < t.chain ? "leather" : ratio < t.plate ? "chain" : "plate";
  }

  const loot: LifeLootId = cursed ? "cursed_armor_decoder" : shield > 0 ? "beneficiary_check" : "party_map";

  return { dice: { D, I, M, E }, damage, shield, gap, employerShield, personalShield, acTier, cursed, loot, assumptions, solo, hasDependents, sharesObligations, earnsPaycheck, kids };
}

/** Nearest $10,000. */
export function roundTo10k(n: number): number {
  return Math.round(n / 10_000) * 10_000;
}

/** "~$480,000". `floor` keeps the shown value from rounding down to nothing (Damage never shows below ~$10,000). */
export function approxDollars(n: number, floor = 0): string {
  const rounded = Math.max(floor, roundTo10k(n));
  return `~$${rounded.toLocaleString("en-US")}`;
}

/** For screen readers: "about 480 thousand dollars" / "about 1.2 million dollars". */
export function spokenDollars(n: number, floor = 0): string {
  const rounded = Math.max(floor, roundTo10k(n));
  if (rounded === 0) return "zero dollars";
  if (rounded >= 1_000_000) return `about ${(rounded / 1_000_000).toFixed(rounded % 1_000_000 === 0 ? 0 : 1)} million dollars`;
  return `about ${Math.round(rounded / 1000)} thousand dollars`;
}

export const TIER_NAME: Record<ArmorTier, string> = {
  unarmored: "Unarmored",
  leather: "Leather Armor",
  chain: "Chain Mail",
  plate: "Plate Armor",
  traveling_light: "Traveling Light",
};

export const PARTY_META: Record<PartyId, { label: string; icon: string; hint: string }> = {
  partner: { label: "Partner or spouse", icon: "💑", hint: "Counts toward income, mortgage, and debts." },
  kids: { label: "Kids", icon: "🧒", hint: "Counts toward income, mortgage, debts, and education." },
  parent: { label: "An aging parent you help support", icon: "🧓", hint: "Counts toward income, mortgage, and debts." },
  cosigner: { label: "Someone who co-signed a loan with you", icon: "🤝", hint: "Counts toward debts and the mortgage." },
  business: { label: "A business partner", icon: "🏪", hint: "Doesn't change the numbers; adds a note at the end." },
  pets: { label: "Pets", icon: "🐾", hint: "They count too, just not in dollars." },
  solo: { label: "Nobody depends on me right now", icon: "🧭", hint: "Traveling light." },
};

/** Short plain-language roster for the lead dashboard, e.g. "Partner, 2 kids, parent". */
export function partySummary(party: Party | undefined): string {
  if (!party || party.members.length === 0) return "";
  if (isSolo(party)) return party.members.includes("pets") ? "Nobody (pets only)" : "Nobody";
  const parts: string[] = [];
  // Fixed order regardless of the order the cards were tapped.
  for (const m of PARTY_IDS) {
    if (!party.members.includes(m)) continue;
    if (m === "partner") parts.push("partner");
    else if (m === "kids") parts.push(party.kids >= 6 ? "6+ kids" : party.kids === 1 ? "1 kid" : `${party.kids} kids`);
    else if (m === "parent") parts.push("parent");
    else if (m === "cosigner") parts.push("co-signer");
    else if (m === "business") parts.push("business partner");
    else if (m === "pets") parts.push("pets");
  }
  const out = parts.join(", ");
  return out.charAt(0).toUpperCase() + out.slice(1);
}
