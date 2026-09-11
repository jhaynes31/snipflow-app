/**
 * Loot for the financial health quiz: two or three genuinely useful items
 * per stat. A d20 picks among the items for the player's weakest stat,
 * mapped evenly, so the roll is real but no result is a dud.
 *
 * Each item is a short branded PDF written in John's voice (public/loot).
 * TODO(Jen): John reviews the ten guides before the quiz is promoted; swap
 * any file here for his own by changing its url.
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
    { id: "con_fund_guide", icon: "🛡️", title: "Emergency Fund Starter Guide", description: "How much to keep, where to keep it, and how to start with what you have this month.", url: "/loot/con_fund_guide.pdf" },
    { id: "con_savings_boost", icon: "💰", title: "Savings Booster Checklist", description: "Small moves that add a cushion without changing your life much.", url: "/loot/con_savings_boost.pdf" },
  ],
  DEX: [
    { id: "dex_budget_sheet", icon: "📋", title: "One Page Budget Worksheet", description: "A printable budget that takes ten minutes and shows where the money really goes.", url: "/loot/dex_budget_sheet.pdf" },
    { id: "dex_paycheck_split", icon: "✂️", title: "Paycheck Split Plan", description: "How to route part of every paycheck to savings before it lands in checking.", url: "/loot/dex_paycheck_split.pdf" },
  ],
  STR: [
    { id: "str_debt_plan", icon: "⚔️", title: "Debt Payoff Battle Plan", description: "Pick your order of attack, smallest balance or highest rate, and stick to it.", url: "/loot/str_debt_plan.pdf" },
    { id: "str_apr_script", icon: "📞", title: "Lower Your Rate Call Script", description: "What to say when you call your card company to ask for a lower APR.", url: "/loot/str_apr_script.pdf" },
  ],
  WIS: [
    { id: "wis_compound", icon: "🕯️", title: "Compound Growth Calculator", description: "See what steady monthly saving turns into over ten, twenty, and thirty years.", url: "/loot/wis_compound.pdf" },
    { id: "wis_retire_basics", icon: "🌱", title: "Retirement Saving Basics", description: "The first three decisions that matter, in plain language.", url: "/loot/wis_retire_basics.pdf" },
  ],
  INT: [
    { id: "int_credit_report", icon: "📜", title: "Free Credit Report Guide", description: "Pull your reports from all three bureaus for free and read them like a pro.", url: "/loot/int_credit_report.pdf" },
    { id: "int_money_glossary", icon: "📖", title: "Money Words, Decoded", description: "The terms that show up on statements and offers, explained without the jargon.", url: "/loot/int_money_glossary.pdf" },
  ],
};

/** Evenly map a d20 onto the items for a stat. */
export function lootForRoll(stat: StatKey, d20: number): LootItem {
  const items = LOOT_TABLE[stat];
  const idx = Math.min(items.length - 1, Math.floor(((d20 - 1) * items.length) / 20));
  return items[idx];
}
