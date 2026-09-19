/**
 * The Crossroads questionnaire. Each person answers alone; the app shows
 * where they match and where they differ. Every question has an
 * importance (how much this matters to me, 0 to 5) and, where it fits, a
 * preference. Factor keys line up with the destination ratings.
 */
export type Factor =
  | "cost"
  | "safety"
  | "faithCommunity"
  | "religiousFreedom"
  | "governmentReach"
  | "transit"
  | "healthcare"
  | "language"
  | "climate"
  | "nature"
  | "water"
  | "family"
  | "visaEase"
  | "taxes"
  | "internet"
  | "work"
  | "community"
  | "pace"
  | "housing"
  | "food";

export const FACTOR_LABEL: Record<Factor, string> = {
  cost: "Cost of living",
  safety: "Safety and crime",
  faithCommunity: "A living Christian community",
  religiousFreedom: "Freedom to practice faith openly",
  governmentReach: "Limited government reach",
  transit: "Public transportation",
  healthcare: "Healthcare that's affordable and good",
  language: "English gets you by",
  climate: "The climate we'd want",
  nature: "Nature close at hand",
  water: "Water: coast, lakes, rivers",
  family: "Reachable from family",
  visaEase: "A realistic path for Americans to stay",
  taxes: "Reasonable taxes for us",
  internet: "Reliable fast internet",
  work: "Room for John's business and remote work",
  community: "Easy to find people and belong",
  pace: "A slower pace of life",
  housing: "Housing we could actually afford",
  food: "Food and daily life we'd enjoy",
};

export interface Question {
  key: string;
  section: string;
  text: string;
  hint?: string;
  /** Which destination factor this weighs, if any. */
  factor?: Factor;
  /** Free text, an importance slider, or both. */
  kind: "importance" | "text" | "both";
}

export const QUESTIONS: Question[] = [
  // Life
  { key: "lifeLook", section: "The life we want", text: "Describe an ordinary Tuesday, five years from now, in the place you'd choose.", hint: "Morning to night. Who's there, what you do, what it feels like.", kind: "text" },
  { key: "why", section: "The life we want", text: "Why are we thinking about leaving, in your own words?", hint: "Be honest, even if the reasons differ from each other's.", kind: "text" },
  { key: "stayCase", section: "The life we want", text: "What would make staying the right call?", kind: "text" },
  { key: "pace", section: "The life we want", text: "A slower pace of life", factor: "pace", kind: "importance" },
  { key: "community", section: "The life we want", text: "Being able to find people and belong", factor: "community", kind: "importance" },
  { key: "food", section: "The life we want", text: "Food and daily life we'd enjoy", factor: "food", kind: "importance" },
  // Faith
  { key: "faithCommunity", section: "Faith", text: "A living Christian community around us", hint: "Churches you'd actually go to, people who share the faith.", factor: "faithCommunity", kind: "both" },
  { key: "religiousFreedom", section: "Faith", text: "Freedom to practice faith openly", factor: "religiousFreedom", kind: "importance" },
  { key: "faithLook", section: "Faith", text: "What do you want church and faith community to look like there?", kind: "text" },
  // Safety and government
  { key: "safety", section: "Safety and government", text: "Safety and low crime", factor: "safety", kind: "importance" },
  { key: "governmentReach", section: "Safety and government", text: "Limited government reach into daily life", hint: "Speech, property, travel, medical choices, schooling.", factor: "governmentReach", kind: "both" },
  { key: "stability", section: "Safety and government", text: "What kind of instability would be a deal-breaker for you?", kind: "text" },
  // Money
  { key: "cost", section: "Money", text: "A lower cost of living", factor: "cost", kind: "importance" },
  { key: "housing", section: "Money", text: "Housing we could actually afford", factor: "housing", kind: "importance" },
  { key: "taxes", section: "Money", text: "Reasonable taxes for us", hint: "US citizens file US taxes wherever they live; the foreign earned income exclusion and treaties matter.", factor: "taxes", kind: "importance" },
  { key: "budget", section: "Money", text: "What could we live on per month, realistically, in dollars?", kind: "text" },
  // Work
  { key: "work", section: "Work", text: "Room for John's business and remote work", factor: "work", kind: "both" },
  { key: "internet", section: "Work", text: "Reliable fast internet", factor: "internet", kind: "importance" },
  { key: "workLook", section: "Work", text: "How would each of us earn a living there?", kind: "text" },
  // Health
  { key: "healthcare", section: "Health", text: "Healthcare that's affordable and good", factor: "healthcare", kind: "both" },
  { key: "healthNeeds", section: "Health", text: "Any health needs, medications, or care that must be available?", kind: "text" },
  // Place
  { key: "climate", section: "Place", text: "The climate we'd want", factor: "climate", kind: "both" },
  { key: "nature", section: "Place", text: "Nature close at hand", factor: "nature", kind: "importance" },
  { key: "water", section: "Place", text: "Water: coast, lakes, rivers", factor: "water", kind: "importance" },
  { key: "transit", section: "Place", text: "Public transportation, so life works without two cars", factor: "transit", kind: "importance" },
  { key: "cityOrTown", section: "Place", text: "City, town, or countryside?", kind: "text" },
  // People
  { key: "family", section: "People", text: "Being reachable from family", hint: "For both of you, given everything.", factor: "family", kind: "both" },
  { key: "language", section: "People", text: "English getting you by while we learn", factor: "language", kind: "importance" },
  { key: "languageWilling", section: "People", text: "Would you learn a new language? How much, honestly?", kind: "text" },
  // The path
  { key: "visaEase", section: "The path", text: "A realistic legal path for Americans to stay", factor: "visaEase", kind: "importance" },
  { key: "timeline", section: "The path", text: "When would we go, if we go?", kind: "text" },
  { key: "fears", section: "The path", text: "What scares you about leaving? What scares you about staying?", kind: "text" },
  { key: "nonNegotiable", section: "The path", text: "One non-negotiable, for you.", kind: "text" },
];

export const SECTIONS = [...new Set(QUESTIONS.map((q) => q.section))];

import type { Place } from "./places";

/** Fit math: each person's importance per factor, averaged, times the place's rating. Plain sentences, no percentages shown. */

export interface Answer {
  key: string;
  importance?: number;
  text?: string;
}

export function importanceByFactor(answers: Answer[]): Partial<Record<Factor, number>> {
  const out: Partial<Record<Factor, number>> = {};
  for (const q of QUESTIONS) {
    if (!q.factor) continue;
    const a = answers.find((x) => x.key === q.key);
    if (a?.importance !== undefined) out[q.factor] = a.importance;
  }
  return out;
}

/** Both people's importances, averaged where both answered; one person's where only one did. */
export function combinedImportance(a: Answer[], b: Answer[]): Partial<Record<Factor, number>> {
  const ia = importanceByFactor(a);
  const ib = importanceByFactor(b);
  const out: Partial<Record<Factor, number>> = {};
  for (const f of Object.keys(FACTOR_LABEL) as Factor[]) {
    const va = ia[f];
    const vb = ib[f];
    if (va !== undefined && vb !== undefined) out[f] = (va + vb) / 2;
    else if (va !== undefined) out[f] = va;
    else if (vb !== undefined) out[f] = vb;
  }
  return out;
}

export interface Fit {
  key: string;
  /** 1 to 5, the weighted average rating on the factors that matter. */
  score: number;
  strong: Factor[];
  weak: Factor[];
}

export function fitFor(place: Place, importance: Partial<Record<Factor, number>>): Fit {
  let num = 0;
  let den = 0;
  const strong: Factor[] = [];
  const weak: Factor[] = [];
  for (const f of Object.keys(importance) as Factor[]) {
    const w = importance[f] ?? 0;
    if (w <= 0) continue;
    const rating = place.ratings[f];
    num += rating * w;
    den += w;
    if (w >= 4 && rating >= 4) strong.push(f);
    if (w >= 4 && rating <= 2) weak.push(f);
  }
  return { key: place.key, score: den === 0 ? 0 : num / den, strong, weak };
}

export function rank(places: Place[], importance: Partial<Record<Factor, number>>): Fit[] {
  return places.map((p) => fitFor(p, importance)).sort((a, b) => b.score - a.score);
}

export function fitWords(score: number): string {
  if (score === 0) return "Answer the importance questions to see a fit.";
  if (score >= 4.2) return "A strong fit for what you both said matters.";
  if (score >= 3.6) return "A good fit, with a few things to check.";
  if (score >= 3) return "Mixed. Some of what matters most is thin here.";
  return "Probably not, on what you said matters.";
}

/** Where two people differ by two or more points on something at least one of them cares about. */
export function differences(a: Answer[], b: Answer[]): { key: string; a: number; b: number }[] {
  const out: { key: string; a: number; b: number }[] = [];
  for (const q of QUESTIONS) {
    if (q.kind === "text") continue;
    const va = a.find((x) => x.key === q.key)?.importance;
    const vb = b.find((x) => x.key === q.key)?.importance;
    if (va === undefined || vb === undefined) continue;
    if (Math.abs(va - vb) >= 2 && Math.max(va, vb) >= 3) out.push({ key: q.key, a: va, b: vb });
  }
  return out;
}

export function agreements(a: Answer[], b: Answer[]): string[] {
  const out: string[] = [];
  for (const q of QUESTIONS) {
    if (q.kind === "text") continue;
    const va = a.find((x) => x.key === q.key)?.importance;
    const vb = b.find((x) => x.key === q.key)?.importance;
    if (va !== undefined && vb !== undefined && va >= 4 && vb >= 4) out.push(q.key);
  }
  return out;
}
