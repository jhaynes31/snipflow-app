/**
 * Every number behind the life insurance quiz's coverage estimate (the DIME
 * method: Debts, Income, Mortgage, Education). All of it is a PLACEHOLDER
 * until John confirms it. While `confirmedByJohn` is false the quiz shows a
 * dev-only banner; production never shows the banner, but the flag makes it
 * hard to launch unconfirmed numbers by accident.
 *
 * Nothing in here is random and nothing in here may import the dice.
 */

export type IncomeBracket = "lt30" | "30_50" | "50_75" | "75_100" | "100_150" | "150p" | "none";
export type MortgageBracket = "none" | "lt100" | "100_200" | "200_300" | "300_400" | "400p";
export type DebtBracket = "none" | "lt10" | "10_25" | "25_50" | "50_100" | "100p";
export type EducationChoice = "none" | "some" | "most";
export type YoungestAge = "under5" | "5_12" | "13_17" | "18p";
/** Work coverage for paycheck earners: a multiple of salary. */
export type EmployerMultiple = "none" | "1x" | "2x" | "3x" | "unsure";
/** Work coverage for people without a paycheck (for example a partner's plan): dollars. */
export type EmployerDollars = "none" | "lt50" | "50_100" | "100_200" | "200p" | "unsure";
export type PersonalBracket = "none" | "lt100" | "100_250" | "250_500" | "500_1m" | "1mp" | "unsure";
export type AcTier = "unarmored" | "leather" | "chain" | "plate";

export interface ArmorConfig {
  /** Flip to true only once John has signed off on every value below. */
  confirmedByJohn: boolean;
  incomeMidpoints: Record<Exclude<IncomeBracket, "none">, number>;
  /** Yearly value of a stay-at-home parent or caregiver's work. */
  caregiverReplacementValue: number;
  mortgageMidpoints: Record<MortgageBracket, number>;
  debtMidpoints: Record<DebtBracket, number>;
  finalExpenses: number;
  educationPerChild: Record<EducationChoice, number>;
  /** Years of income to replace, by the youngest child's age; `noKids` applies with a partner or parent only. */
  incomeYears: Record<YoungestAge, number> & { noKids: number };
  /** "unsure" counts as 1× salary (Section 7.3). */
  employerMultiples: Record<EmployerMultiple, number>;
  /** "unsure" counts as $0 (Section 7.3). */
  employerDollarMidpoints: Record<EmployerDollars, number>;
  /** "unsure" counts as $0 (Section 7.3). */
  personalMidpoints: Record<PersonalBracket, number>;
  /** Shield ÷ Damage cut-offs: below `leather` is Unarmored, below `chain` is Leather, below `plate` is Chain Mail, else Plate. */
  acThresholds: { leather: number; chain: number; plate: number };
}

export const ARMOR_CONFIG: ArmorConfig = {
  confirmedByJohn: false,
  incomeMidpoints: { lt30: 25_000, "30_50": 40_000, "50_75": 62_500, "75_100": 87_500, "100_150": 125_000, "150p": 175_000 },
  caregiverReplacementValue: 40_000,
  mortgageMidpoints: { none: 0, lt100: 50_000, "100_200": 150_000, "200_300": 250_000, "300_400": 350_000, "400p": 450_000 },
  debtMidpoints: { none: 0, lt10: 5_000, "10_25": 17_500, "25_50": 37_500, "50_100": 75_000, "100p": 125_000 },
  finalExpenses: 15_000,
  educationPerChild: { none: 0, some: 25_000, most: 100_000 },
  incomeYears: { under5: 15, "5_12": 10, "13_17": 5, "18p": 5, noKids: 5 },
  employerMultiples: { none: 0, "1x": 1, "2x": 2, "3x": 3, unsure: 1 },
  employerDollarMidpoints: { none: 0, lt50: 25_000, "50_100": 75_000, "100_200": 150_000, "200p": 250_000, unsure: 0 },
  personalMidpoints: { none: 0, lt100: 50_000, "100_250": 175_000, "250_500": 375_000, "500_1m": 750_000, "1mp": 1_250_000, unsure: 0 },
  acThresholds: { leather: 0.25, chain: 0.6, plate: 0.9 },
};
