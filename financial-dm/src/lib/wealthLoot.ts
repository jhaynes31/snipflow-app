/**
 * Loot for the financial health quiz: two or three genuinely useful items
 * per stat. A d20 picks among the items for the player's weakest stat,
 * mapped evenly, so the roll is real but no result is a dud.
 *
 * TODO(Jen): replace these stand ins with John's own downloads and links.
 * The current entries point at free, official resources so nobody gets an
 * empty chest in the meantime.
 */
import type { StatKey } from "./wealthProfile";

export interface LootItem {
  id: string;
  title: string;
  description: string;
  url: string;
  /** Emoji shown on the chest reveal. */
  icon: string;
}

export const LOOT_TABLE: Record<StatKey, LootItem[]> = {
  CON: [
    { id: "con_fund_guide", icon: "🛡️", title: "Emergency Fund Starter Guide", description: "How much to keep, where to keep it, and how to start with what you have this month.", url: "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/" }, // TODO(Jen)
    { id: "con_savings_boost", icon: "💰", title: "Savings Booster Checklist", description: "Small moves that add a cushion without changing your life much.", url: "https://www.consumerfinance.gov/consumer-tools/save-money/" }, // TODO(Jen)
  ],
  DEX: [
    { id: "dex_budget_sheet", icon: "📋", title: "One Page Budget Worksheet", description: "A printable budget that takes ten minutes and shows where the money really goes.", url: "https://www.consumerfinance.gov/consumer-tools/budgeting/" }, // TODO(Jen)
    { id: "dex_paycheck_split", icon: "✂️", title: "Paycheck Split Plan", description: "How to route part of every paycheck to savings before it lands in checking.", url: "https://www.consumerfinance.gov/consumer-tools/save-money/" }, // TODO(Jen)
  ],
  STR: [
    { id: "str_debt_plan", icon: "⚔️", title: "Debt Payoff Battle Plan", description: "Pick your order of attack, smallest balance or highest rate, and stick to it.", url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/" }, // TODO(Jen)
    { id: "str_apr_script", icon: "📞", title: "Lower Your Rate Call Script", description: "What to say when you call your card company to ask for a lower APR.", url: "https://www.consumerfinance.gov/ask-cfpb/how-can-i-lower-the-interest-rate-on-my-credit-card-en-1663/" }, // TODO(Jen)
  ],
  WIS: [
    { id: "wis_compound", icon: "🕯️", title: "Compound Growth Calculator", description: "See what steady monthly saving turns into over ten, twenty, and thirty years.", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" }, // TODO(Jen)
    { id: "wis_retire_basics", icon: "🌱", title: "Retirement Saving Basics", description: "The first three decisions that matter, in plain language.", url: "https://www.investor.gov/introduction-investing/investing-basics/save-and-invest" }, // TODO(Jen)
  ],
  INT: [
    { id: "int_credit_report", icon: "📜", title: "Free Credit Report Guide", description: "Pull your reports from all three bureaus for free and read them like a pro.", url: "https://www.annualcreditreport.com/" }, // TODO(Jen)
    { id: "int_money_glossary", icon: "📖", title: "Money Words, Decoded", description: "The terms that show up on statements and offers, explained without the jargon.", url: "https://www.consumerfinance.gov/consumer-tools/" }, // TODO(Jen)
  ],
};

/** Evenly map a d20 onto the items for a stat. */
export function lootForRoll(stat: StatKey, d20: number): LootItem {
  const items = LOOT_TABLE[stat];
  const idx = Math.min(items.length - 1, Math.floor(((d20 - 1) * items.length) / 20));
  return items[idx];
}
