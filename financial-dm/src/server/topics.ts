import { createServerFn } from "@tanstack/react-start";
import { FACTS } from "./seed-facts";
import { requireAdmin } from "~/server/auth";

/**
 * One topic pool and one roll for every generator.
 *
 * A TopicPick is a topic label, one supporting fact, and a short list of
 * pain points: the specific situations a viewer might be in that this topic
 * speaks to. John picks the pain point he wants the content to address and
 * it flows into the generation prompt next to the topic and the fact.
 */

export interface TopicPick {
  topic: string;
  fact: string;
  painPoints: string[];
}

/** A topic the owner has chosen plus the pain point to address. */
export interface TopicSelection {
  topic: string;
  fact: string;
  painPoint: string;
  /** The fact as rolled, kept when John edits `fact` in the picker. */
  sourceFact?: string;
}

// ── Curated extra life planning topics ────────────────────────────
// Plain language, accurate, factual. No invented statistics, no em dashes
// or hyphens. These complement the FACTS seed bank (Term Life Insurance,
// Investments, Getting Out of Debt, Financial Freedom).

export const EXTRA_TOPICS: Array<{ topic: string; fact: string }> = [
  {
    topic: "Saving",
    fact: "Saving a little from each paycheck, even a small amount, builds a cushion over time.",
  },
  {
    topic: "Budgeting",
    fact: "A simple budget tracks what you earn and what you spend each month so you can see where your money really goes.",
  },
  {
    topic: "Emergency Fund",
    fact: "An emergency fund of three to six months of living expenses can cover surprise costs without turning to credit cards.",
  },
  {
    topic: "Retirement Planning",
    fact: "Money held in a retirement account has time to grow, and starting even a few years earlier can make a meaningful difference.",
  },
  {
    topic: "Life Insurance Riders",
    fact: "Riders are optional add ons that customize a life insurance policy, such as converting it later or waiving premiums if you become disabled.",
  },
  {
    topic: "Home Buying",
    fact: "Buying a home usually involves a down payment, closing costs, and ongoing costs like property taxes and maintenance.",
  },
  {
    topic: "Taxes",
    fact: "Contributing to tax advantaged accounts can lower your taxable income for the year.",
  },
  {
    topic: "Estate Planning",
    fact: "Estate planning is about making sure your money and belongings pass to the people you intend, in the way you intend.",
  },
  {
    topic: "Beneficiaries",
    fact: "Naming a beneficiary on a policy or account helps that money pass directly to the right person.",
  },
  {
    topic: "Career Planning",
    fact: "A clear career goal paired with a realistic savings plan can guide both your income and your lifestyle choices.",
  },
  {
    topic: "Family and Kids",
    fact: "Having kids changes your financial picture, from child care and education costs to the need for life insurance and college savings.",
  },
  {
    topic: "College Savings",
    fact: "Saving for education through a dedicated college account can grow money in a tax advantaged way.",
  },
  {
    topic: "Health Coverage",
    fact: "Having health coverage protects you from large medical bills and can make routine care more affordable.",
  },
  {
    topic: "Disability Protection",
    fact: "Disability insurance replaces part of your income if you cannot work due to illness or injury.",
  },
  {
    topic: "Financial Goals",
    fact: "Writing down a specific financial goal with a realistic timeline makes it easier to stay motivated and on track.",
  },
  {
    topic: "Net Worth",
    fact: "Your net worth is what you own minus what you owe, and it rises as you pay down debt and grow your savings.",
  },
  {
    topic: "Paying Yourself First",
    fact: "Putting a set amount into savings the moment you get paid makes saving automatic instead of optional.",
  },
  {
    topic: "Wills and Trusts",
    fact: "A will states who should receive your assets, while a trust can add control over how and when they receive them.",
  },
  {
    topic: "Life Insurance Amounts",
    fact: "A common rule of thumb is coverage worth 10 to 12 times your annual income to protect the people who depend on you.",
  },
  {
    topic: "Building Credit",
    fact: "A good credit history can help you qualify for lower rates on loans, and it takes time and consistent payments to build.",
  },
  {
    topic: "Renting vs Buying",
    fact: "Whether to rent or buy a home depends on your timeline, your budget, and how long you plan to stay in one place.",
  },
  {
    topic: "Financial Literacy",
    fact: "Understanding the basics of income, spending, saving, and investing helps you make confident money decisions.",
  },
  {
    topic: "Healthcare Directives",
    fact: "A healthcare directive names someone to make medical decisions for you if you cannot speak for yourself.",
  },
  {
    topic: "Compound Growth",
    fact: "Compound growth means you earn returns not just on what you put in, but on the returns you already earned.",
  },
  {
    topic: "Life Changes",
    fact: "Major life events like a marriage, a new baby, or a new home are good times to review your insurance and estate plans.",
  },
  {
    topic: "Talking to Family About Money",
    fact: "Open conversations with family about money and life insurance help everyone plan and reduce surprises later.",
  },
  {
    topic: "Savings & CDs",
    fact: "A certificate of deposit, or CD, locks your money in for a set term and typically pays a fixed interest rate, with a penalty for early withdrawal.",
  },
  {
    topic: "Savings & CDs",
    fact: "A high yield savings account is a savings or money market account that pays a higher interest rate than a typical brick and mortar savings account, often with no fixed term.",
  },
  {
    topic: "Savings & CDs",
    fact: "A money market account or money market fund can offer a higher rate than a standard savings account, often with check writing or debit card access.",
  },
  {
    topic: "Savings & CDs",
    fact: "A Treasury bill, or T bill, is a short term government debt with maturities of one year or less, bought at a discount and paid at full face value at maturity.",
  },
  {
    topic: "Savings & CDs",
    fact: "I bonds are US savings bonds whose interest rate adjusts for inflation, making them a way to protect savings from inflation over time.",
  },
  {
    topic: "Savings & CDs",
    fact: "Short term savings are a good fit for money you may need within a few years, since the balance is not tied to stock market ups and downs.",
  },
];

// ── Pain points per topic ─────────────────────────────────────────
// Written from the viewer's side, in the words they would use at the bar.
// Every topic in the pool (FACTS categories and EXTRA_TOPICS) has an entry.

export const TOPIC_PAIN_POINTS: Record<string, string[]> = {
  "Term Life Insurance": [
    "I only have the life insurance my job gives me",
    "I think life insurance is too expensive for my budget",
    "I keep putting it off because I am young and healthy",
    "I have no idea how much coverage my family would actually need",
  ],
  Investments: [
    "I have money sitting in checking because investing feels risky",
    "I do not understand the difference between saving and investing",
    "I started late and feel like it is pointless now",
    "Market ups and downs make me want to pull everything out",
  ],
  "Getting Out of Debt": [
    "My minimum payments never seem to shrink the balance",
    "I have several cards and do not know which to pay first",
    "Every time I make progress a surprise bill knocks me back",
    "I feel embarrassed about how much I owe",
  ],
  "Financial Freedom": [
    "I earn decent money but never seem to get ahead",
    "I do not know what financial freedom would even look like for me",
    "Every month feels like starting over",
    "I want to stop worrying about money but do not know the first step",
  ],
  Saving: [
    "There is nothing left to save at the end of the month",
    "I save for a while and then spend it all",
    "Saving a small amount feels pointless",
    "I do not know where to keep my savings",
  ],
  Budgeting: [
    "I have no idea where my money goes each month",
    "Budgets feel restrictive and I never stick to them",
    "My income changes month to month so planning feels impossible",
    "My partner and I fight about spending",
  ],
  "Emergency Fund": [
    "One surprise bill would go straight onto a credit card",
    "I do not know how much an emergency fund should be",
    "I keep dipping into my emergency savings for non emergencies",
    "Three to six months of expenses feels impossibly far away",
  ],
  "Retirement Planning": [
    "I have not started saving for retirement and I am worried it is too late",
    "I do not understand my workplace retirement plan",
    "I have no idea how much I will actually need",
    "I am self employed and have no plan at all",
  ],
  "Life Insurance Riders": [
    "I have a policy but no idea what the extra options on it do",
    "I am afraid I could not keep paying if I got sick or hurt",
    "I want coverage that can grow with my life instead of expiring",
    "The add ons sound like upsells and I do not know which matter",
  ],
  "Home Buying": [
    "I do not know how much house I can really afford",
    "I am saving for a down payment and it feels endless",
    "I did not know about closing costs and the other fees",
    "I am scared of being house poor",
  ],
  Taxes: [
    "I get a refund and assume that means I did fine",
    "I do not understand how retirement accounts change my taxes",
    "I am self employed and taxes surprise me every spring",
    "I want to pay less in taxes but do not know the legal ways",
  ],
  "Estate Planning": [
    "I think estate planning is only for wealthy people",
    "I have kids and nothing written down about who would care for them",
    "I do not know what happens to my stuff if something happens to me",
    "Talking about death makes me avoid the whole topic",
  ],
  Beneficiaries: [
    "I have no idea who is listed on my accounts and policies",
    "I got divorced or remarried and never updated anything",
    "I assumed my will covers my accounts and policies",
    "I want my kids taken care of but they are minors",
  ],
  "Career Planning": [
    "I want to change jobs but worry about losing my benefits",
    "I got a raise and somehow still have nothing extra",
    "I do not know what my career path means for my money long term",
    "I am afraid to negotiate my pay",
  ],
  "Family and Kids": [
    "We just had a baby and our finances feel upside down",
    "Child care costs more than I expected",
    "I do not know how to protect my family if something happens to me",
    "I want to teach my kids about money but nobody taught me",
  ],
  "College Savings": [
    "I feel guilty that I have not started saving for my kid's college",
    "I do not know where to put college savings",
    "I am torn between saving for retirement and saving for college",
    "I am not sure my kid will even go to college",
  ],
  "Health Coverage": [
    "I skip going to the doctor because I am afraid of the bill",
    "I do not understand my plan's deductible and out of pocket costs",
    "I am between jobs and have no coverage",
    "I am young and wonder if I really need it",
  ],
  "Disability Protection": [
    "If I could not work for a few months, I could not pay my bills",
    "I never thought about my income as something to insure",
    "I assumed my job or the government would cover me",
    "I work with my hands and an injury would end my paycheck",
  ],
  "Financial Goals": [
    "I have vague goals but nothing concrete written down",
    "I lose motivation a few weeks into any money goal",
    "I do not know which goal to tackle first",
    "My goals feel too big to ever reach",
  ],
  "Net Worth": [
    "I have never added up what I own and what I owe",
    "My net worth is negative and that feels hopeless",
    "I compare myself to friends and always feel behind",
    "I do not know whether I am actually making progress",
  ],
  "Paying Yourself First": [
    "I always plan to save whatever is left, and nothing is left",
    "Automatic transfers scare me because money feels tight",
    "I do not know how much to set aside first",
    "I treat every raise as spending money",
  ],
  "Wills and Trusts": [
    "I do not have a will and do not know how to start",
    "I do not know the difference between a will and a trust",
    "I worry my kids would get everything at once too young",
    "I assume my family will just sort it out",
  ],
  "Life Insurance Amounts": [
    "I picked a coverage amount out of thin air",
    "I do not know if my current policy is enough",
    "I am worried a bigger policy would be unaffordable",
    "I do not know what the payout would actually need to cover",
  ],
  "Building Credit": [
    "I have no credit history and keep getting turned down",
    "I made mistakes years ago and my score still hurts",
    "I do not understand what actually moves my score",
    "I am afraid to use credit cards at all",
  ],
  "Renting vs Buying": [
    "I feel like rent is throwing money away",
    "Everyone says buy but I am not ready",
    "I do not know how long I need to stay for buying to make sense",
    "I cannot tell if my market is a good time to buy",
  ],
  "Financial Literacy": [
    "Nobody ever taught me how money works",
    "Financial terms make me feel stupid",
    "I nod along at the bank and hope for the best",
    "I want to get smarter with money but do not know where to start",
  ],
  "Healthcare Directives": [
    "I have never told anyone what I would want medically",
    "I assumed my spouse could just decide for me",
    "I do not know who would speak for me in an emergency",
    "It feels morbid to plan for",
  ],
  "Compound Growth": [
    "Small amounts feel too small to bother investing",
    "I do not understand how money grows on its own",
    "I feel like I missed my chance by starting late",
    "I keep taking money out before it can grow",
  ],
  "Life Changes": [
    "I just got married and we have not talked about money",
    "We are expecting and I do not know what to update",
    "I bought a house and my old coverage no longer fits",
    "I went through a divorce and my paperwork is a mess",
  ],
  "Talking to Family About Money": [
    "Money is a taboo subject in my family",
    "I do not know if my parents have a plan for later in life",
    "My partner and I avoid the money conversation",
    "I want to talk to my adult kids about money without lecturing",
  ],
  "Savings & CDs": [
    "My savings account pays almost nothing in interest",
    "I do not know the difference between a CD, a high yield account, and a money market",
    "I am afraid to lock money away in case I need it",
    "I want my short term savings safe from the stock market",
  ],
};

const GENERIC_PAIN_POINTS = [
  "I do not know where to start with this",
  "I have been putting this off because it feels overwhelming",
  "I am not sure this applies to someone like me",
];

export function painPointsFor(topic: string): string[] {
  return TOPIC_PAIN_POINTS[topic] ?? GENERIC_PAIN_POINTS;
}

// ── Topic pool ─────────────────────────────────────────────────────

export function buildTopicPool(): TopicPick[] {
  const pool: TopicPick[] = [];
  for (const [category, facts] of Object.entries(FACTS)) {
    for (const f of facts) {
      pool.push({ topic: category, fact: f, painPoints: painPointsFor(category) });
    }
  }
  for (const t of EXTRA_TOPICS) {
    pool.push({ ...t, painPoints: painPointsFor(t.topic) });
  }
  return pool;
}

/**
 * Every distinct topic name with the facts that back it, so a roll can treat
 * "Term Life Insurance" (55 facts) and "Budgeting" (1 fact) as equals.
 */
export function buildTopicGroups(): Array<{ topic: string; facts: string[] }> {
  const map = new Map<string, string[]>();
  for (const [category, facts] of Object.entries(FACTS)) {
    map.set(category, [...(map.get(category) ?? []), ...facts]);
  }
  for (const t of EXTRA_TOPICS) {
    map.set(t.topic, [...(map.get(t.topic) ?? []), t.fact]);
  }
  return [...map.entries()].map(([topic, facts]) => ({ topic, facts }));
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` distinct topics, each topic name equally likely, then one
 * random fact under each. Topics named in `exclude` (normally the previous
 * roll) are skipped while enough other topics remain, so "Roll again" always
 * shows John something new.
 *
 * The old version rolled from a flat list of every fact, so the four seed
 * bank categories with 55 facts each crowded out the 30 or so single fact
 * topics almost every time.
 */
export function pickRandomTopics(count = 3, exclude: string[] = []): TopicPick[] {
  const groups = buildTopicGroups();
  if (groups.length === 0) {
    return [
      {
        topic: "Financial Literacy",
        fact: "Understanding the basics of money helps you make confident decisions.",
        painPoints: painPointsFor("Financial Literacy"),
      },
    ];
  }
  const want = Math.min(count, groups.length);
  const skip = new Set(exclude.map((t) => t.trim().toLowerCase()));
  const fresh = groups.filter((g) => !skip.has(g.topic.toLowerCase()));
  const candidates = fresh.length >= want ? fresh : groups;
  return shuffle(candidates)
    .slice(0, want)
    .map((g) => ({
      topic: g.topic,
      fact: g.facts[Math.floor(Math.random() * g.facts.length)],
      painPoints: painPointsFor(g.topic),
    }));
}

/**
 * Roll three topics (with their pain points) for any generator. Pass the
 * topics currently on screen as `exclude` to guarantee a different set.
 */
export const getRandomTopics = createServerFn()
  .middleware([requireAdmin])
  .validator((d?: { exclude?: string[] }) => ({
    exclude: Array.isArray(d?.exclude) ? d.exclude.map(String).slice(0, 12) : [],
  }))
  .handler(async ({ data }): Promise<TopicPick[]> => pickRandomTopics(3, data.exclude));

/**
 * The shared "what is this content about" section of every user message.
 * Every generator sends the same three inputs so they read as one system.
 */
export function topicPromptLines(sel: {
  topic: string;
  fact: string;
  painPoint?: string;
}): string {
  const lines = [`Topic: ${sel.topic}`, `Supporting fact: ${sel.fact}`];
  lines.push(
    `Pain point this content must speak to (the viewer's own situation, address it directly): ${
      (sel.painPoint || "").trim() || "not specified, pick the most common worry about this topic"
    }`,
  );
  return lines.join("\n");
}
