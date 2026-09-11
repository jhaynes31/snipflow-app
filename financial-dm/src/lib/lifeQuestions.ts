/**
 * The life insurance quiz's questions (Section 7). Money questions come
 * before Trap or Treasure, coverage questions after it. Amounts are brackets
 * on purpose: less friction for the player, less sensitive data stored.
 *
 * Which questions show depends on earlier answers (`when`), so the visible
 * list is always derived from the full answer set.
 */
import type { LifeAnswers } from "./armorEngine";

export type LifeQuestionKey = "age" | "income" | "mortgage" | "debts" | "education" | "employer" | "personal";

export interface LifeOption {
  id: string;
  text: string;
}

export interface LifeQuestion {
  key: LifeQuestionKey;
  group: "money" | "coverage";
  label: string;
  question: string;
  /** John's line under the question. */
  dm: string;
  options: LifeOption[];
  when?: (a: LifeAnswers) => boolean;
}

const o = (id: string, text: string): LifeOption => ({ id, text });

export const LIFE_QUESTIONS: LifeQuestion[] = [
  {
    key: "age",
    group: "money",
    label: "Thy Age",
    question: "How old are you?",
    dm: "How many winters hast thou braved? Just for context. It doesn't change your numbers.",
    options: [o("Under 25", "Under 25"), o("25 to 34", "25 to 34"), o("35 to 44", "35 to 44"), o("45 to 54", "45 to 54"), o("55+", "55+")],
  },
  {
    key: "income",
    group: "money",
    label: "Thy Earnings",
    question: "Roughly what do you earn a year?",
    dm: "No need for exact figures. A rough bracket does the job.",
    options: [
      o("lt30", "Under $30k"),
      o("30_50", "$30k–50k"),
      o("50_75", "$50k–75k"),
      o("75_100", "$75k–100k"),
      o("100_150", "$100k–150k"),
      o("150p", "$150k+"),
      o("none", "I don't earn a paycheck (stay-at-home parent or caregiver)"),
    ],
  },
  {
    key: "mortgage",
    group: "money",
    label: "Thy Keep",
    question: "What's left on your mortgage?",
    dm: "Every keep has a debt to the crown. How much is left on yours?",
    options: [o("none", "Renting or no mortgage"), o("lt100", "Under $100k"), o("100_200", "$100k–200k"), o("200_300", "$200k–300k"), o("300_400", "$300k–400k"), o("400p", "$400k+")],
  },
  {
    key: "debts",
    group: "money",
    label: "Thy Tabs",
    question: "Other debts: car, cards, student loans, personal loans?",
    dm: "Add up the smaller tabs. Rough is fine.",
    options: [o("none", "None"), o("lt10", "Under $10k"), o("10_25", "$10k–25k"), o("25_50", "$25k–50k"), o("50_100", "$50k–100k"), o("100p", "$100k+")],
  },
  {
    key: "education",
    group: "money",
    label: "Thy Apprentices",
    question: "Want to help pay for your kids' education?",
    dm: "Some parents cover the whole apprenticeship. Some cover the first few lessons. Both are fine answers.",
    options: [o("none", "No"), o("some", "Some (e.g. community college or trade school)"), o("most", "Most of it")],
    when: (a) => a.party.members.includes("kids") && !a.party.members.includes("solo"),
  },
  {
    key: "employer",
    group: "coverage",
    label: "Work Armor",
    question: "Life insurance through work?",
    dm: "Check your benefits summary if you can. Most plans list it as a multiple of your salary.",
    options: [o("none", "None"), o("1x", "1× my salary"), o("2x", "2× my salary"), o("3x", "3× or more"), o("unsure", "I have it, but I'm not sure how much")],
    when: (a) => a.income !== "none",
  },
  {
    key: "employer",
    group: "coverage",
    label: "Work Armor",
    question: "Life insurance through a job, including a partner's plan that covers you?",
    dm: "Some workplace plans cover a spouse too. If you're not sure, say so and we'll play it safe.",
    options: [o("none", "None"), o("lt50", "Under $50k"), o("50_100", "$50k–100k"), o("100_200", "$100k–200k"), o("200p", "$200k+"), o("unsure", "Not sure")],
    when: (a) => a.income === "none",
  },
  {
    key: "personal",
    group: "coverage",
    label: "Thine Own Armor",
    question: "Any life insurance you bought on your own?",
    dm: "A policy with your own name on the paperwork, separate from work.",
    options: [o("none", "None"), o("lt100", "Under $100k"), o("100_250", "$100k–250k"), o("250_500", "$250k–500k"), o("500_1m", "$500k–1M"), o("1mp", "$1M+"), o("unsure", "Not sure")],
  },
];

/** The questions that apply to these answers, in order, for one group. */
export function visibleQuestions(answers: LifeAnswers, group: LifeQuestion["group"]): LifeQuestion[] {
  return LIFE_QUESTIONS.filter((q) => q.group === group && (!q.when || q.when(answers)));
}

/** The chosen option's text for a question key (for the dashboard). */
export function optionText(key: LifeQuestionKey, id: string | undefined, answers: LifeAnswers): string {
  if (!id) return "";
  const q = LIFE_QUESTIONS.find((x) => x.key === key && (!x.when || x.when(answers)));
  return q?.options.find((op) => op.id === id)?.text ?? id;
}

export const YOUNGEST_OPTIONS: LifeOption[] = [o("under5", "Under 5"), o("5_12", "5–12"), o("13_17", "13–17"), o("18p", "18 or older")];
