/**
 * The Storehouse's pure math: payoff schedules, monthly allocation, and
 * plain sentences. Money is in dollars. No red, no percentages of
 * progress; dates and dollars in sentences.
 */

export type Strategy = "snowball" | "avalanche" | "blend" | "dmp";

export const STRATEGY_LABEL: Record<Strategy, string> = {
  snowball: "Smallest balance first",
  avalanche: "Highest interest first",
  blend: "A blend: quick wins, then highest interest",
  dmp: "With a counseling plan at reduced rates",
};

export const STRATEGY_NOTE: Record<Strategy, string> = {
  snowball: "Wins early. Each paid-off debt frees its payment for the next. Best when momentum is what's been missing.",
  avalanche: "Cheapest overall. The highest rate gets every extra dollar first. Best when the numbers are what matter most.",
  blend: "Knock out anything under $1,000 first for the wins, then go highest interest. Most couples land here.",
  dmp: "An estimate of a nonprofit debt management plan: cards paid through one payment at reduced rates, no loan, no credit check. Ask an NFCC agency for the real numbers.",
};

export interface DebtIn {
  id: string;
  name: string;
  balance: number;
  /** Annual percentage rate, as a percent (19.99). */
  apr: number;
  minimum: number;
  kind?: string;
}

export interface DebtOut {
  id: string;
  name: string;
  paidMonth: number;
  interest: number;
}

export interface Schedule {
  strategy: Strategy;
  months: number;
  totalInterest: number;
  debts: DebtOut[];
  /** True when the minimums alone don't cover the interest on some debt. */
  stuck: boolean;
}

/** DMP estimate: card and personal rates come down to about this; others unchanged. */
export const DMP_RATE = 8;
export const DMP_FEE_MONTHLY = 35;

function order(debts: DebtIn[], strategy: Strategy): DebtIn[] {
  const copy = [...debts];
  if (strategy === "snowball") return copy.sort((a, b) => a.balance - b.balance);
  if (strategy === "avalanche" || strategy === "dmp") return copy.sort((a, b) => b.apr - a.apr);
  const small = copy.filter((d) => d.balance < 1000).sort((a, b) => a.balance - b.balance);
  const rest = copy.filter((d) => d.balance >= 1000).sort((a, b) => b.apr - a.apr);
  return [...small, ...rest];
}

/**
 * Simulates month by month: every debt gets its minimum; the extra plus any
 * freed minimums go to the first unpaid debt in the strategy's order.
 * Caps at 600 months so a hopeless input still returns.
 */
export function simulate(input: DebtIn[], extraMonthly: number, strategy: Strategy): Schedule {
  const debts = order(input, strategy).map((d) => ({
    ...d,
    apr: strategy === "dmp" && (d.kind === "card" || d.kind === "personal" || d.kind === undefined) ? Math.min(d.apr, DMP_RATE) : d.apr,
    remaining: d.balance,
    interest: 0,
    paidMonth: 0,
  }));
  let extra = Math.max(0, extraMonthly) - (strategy === "dmp" ? DMP_FEE_MONTHLY : 0);
  if (extra < 0) extra = 0;
  let freed = 0;
  let month = 0;
  let stuck = false;
  while (debts.some((d) => d.remaining > 0.005) && month < 600) {
    month++;
    let pool = extra + freed;
    for (const d of debts) {
      if (d.remaining <= 0.005) continue;
      const interest = (d.remaining * (d.apr / 100)) / 12;
      d.interest += interest;
      d.remaining += interest;
      const pay = Math.min(d.remaining, d.minimum);
      if (d.minimum <= interest && d.remaining > d.minimum) stuck = true;
      d.remaining -= pay;
    }
    for (const d of debts) {
      if (pool <= 0) break;
      if (d.remaining <= 0.005) continue;
      const pay = Math.min(d.remaining, pool);
      d.remaining -= pay;
      pool -= pay;
    }
    for (const d of debts) {
      if (d.remaining <= 0.005 && d.paidMonth === 0) {
        d.paidMonth = month;
        freed += d.minimum;
      }
    }
  }
  return {
    strategy,
    months: month,
    totalInterest: Math.round(debts.reduce((s, d) => s + d.interest, 0)),
    debts: debts.map((d) => ({ id: d.id, name: d.name, paidMonth: d.paidMonth || month, interest: Math.round(d.interest) })),
    stuck,
  };
}

export function compare(input: DebtIn[], extraMonthly: number): Schedule[] {
  return (["snowball", "avalanche", "blend", "dmp"] as Strategy[]).map((s) => simulate(input, extraMonthly, s));
}

/** "March 2028" from a month count, counting from the given month key. */
export function monthLabel(monthKey: string, plus: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + plus, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export type Group = "giving" | "needs" | "debt" | "barns" | "savings" | "fun" | "buffer";

export const GROUP_LABEL: Record<Group, string> = {
  giving: "Giving",
  needs: "Needs",
  debt: "Debts",
  barns: "The Barns",
  savings: "Savings",
  fun: "Life",
  buffer: "Buffer",
};

export const GROUP_ORDER: Group[] = ["giving", "needs", "debt", "barns", "savings", "fun", "buffer"];

/** Starter categories. Every one can be renamed, removed, or added to. */
export const STARTER_LINES: { group: Group; category: string }[] = [
  { group: "giving", category: "Giving" },
  { group: "needs", category: "Housing" },
  { group: "needs", category: "Utilities" },
  { group: "needs", category: "Groceries" },
  { group: "needs", category: "Gas and car" },
  { group: "needs", category: "Insurance" },
  { group: "needs", category: "Phone and internet" },
  { group: "needs", category: "Medical" },
  { group: "needs", category: "Household" },
  { group: "savings", category: "Savings" },
  { group: "fun", category: "Eating out and fun" },
  { group: "fun", category: "Personal, each" },
  { group: "buffer", category: "Buffer for the unexpected" },
];

export interface Allocation {
  income: number;
  planned: number;
  /** Positive: dollars still without a job. Negative: more planned than coming in. */
  unassigned: number;
  sentence: string;
}

export function allocate(income: number, planned: number): Allocation {
  const unassigned = Math.round(income - planned);
  let sentence: string;
  if (income === 0 && planned === 0) sentence = "Add what's coming in and where it goes, and this line will tell you the truth about the month.";
  else if (unassigned === 0) sentence = "Every dollar has a job. That's the whole goal.";
  else if (unassigned > 0) sentence = `${money(unassigned)} still needs a job. Debts, the Barns, or the buffer are the usual homes for it.`;
  else sentence = `${money(-unassigned)} more is planned than is coming in. Not a failure; a fact. Move it from Life or the Barns, or say which bill waits.`;
  return { income, planned, unassigned, sentence };
}

/** The plain-words comparison lines. */
export function describe(s: Schedule, monthKey: string): string {
  if (s.stuck) return `${STRATEGY_LABEL[s.strategy]}: the minimums don't cover the interest on at least one debt, so this never finishes on its own. That's exactly what the hardship programs in The Lifeboat are for.`;
  return `${STRATEGY_LABEL[s.strategy]}: done in ${monthLabel(monthKey, s.months)}, ${s.months} months from now, paying about ${money(s.totalInterest)} in interest along the way.`;
}
