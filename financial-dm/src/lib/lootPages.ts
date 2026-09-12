import { JOHN_TITLE_LINE } from "./johnTitles";
/**
 * Loot pages: each downloadable item as content, rendered by one template
 * (components/loot/LootPage.tsx) as a web page at /loot/<id> and printed to
 * a matching PDF at /loot/<id>.pdf by scripts/loot-pdf.ts.
 *
 * Rules (loot pages spec, Section 2): only the allowed facts listed per item
 * may appear; nothing a reader types is ever collected; no sensitive fields;
 * warm and practical; John's titles are exactly JOHN_TITLES;
 * the disclaimer is a per-item field. All copy is a DRAFT for John's review.
 */

export type LootBlock =
  | { type: "paragraph"; text: string }
  /** A boxed note. "safety" makes it prominent. */
  | { type: "note"; text: string; tone?: "safety" | "info" }
  | { type: "checklist"; heading?: string; items: string[] }
  /** Questions with blank answer lines under each. */
  | { type: "questions"; heading?: string; items: string[]; lines?: number }
  /** A blank table to fill in by hand. */
  | { type: "table"; heading?: string; columns: string[]; rows: number }
  /** Labelled blanks, one line each. */
  | { type: "fields"; heading: string; items: string[] }
  /** The allowed facts, shown as "Good to know". */
  | { type: "facts"; heading?: string; items: string[] }
  /** Start a new printed page here (invisible on screen). */
  | { type: "pagebreak" };

export interface LootPageContent {
  id: string;
  title: string;
  subtitle: string;
  icon: "chest" | "d20";
  /** John's intro, in his voice. */
  intro: string;
  body: LootBlock[];
  cta: { text: string; url: string };
  footer: {
    brand: string;
    agent: string;
    agentTitle: string;
    disclaimer: string;
  };
  /** Pages the PDF may run to. */
  pageLimit: 1 | 2;
}

export const BOOKING_URL = "https://calendly.com/thefinancialdm-proton/30min";

const FOOTER = {
  brand: "The Financial DM",
  agent: "John",
  agentTitle: JOHN_TITLE_LINE,
  // DRAFT for John's approval (loot pages spec, Section 2.6).
  disclaimer: "For educational purposes only. Not a quote, a recommendation, or legal or tax advice. Coverage details vary by policy and employer.",
};

const CTA = { text: "Want help with this? Grab a seat at John's table.", url: BOOKING_URL };

export const LOOT_PAGES: LootPageContent[] = [
  {
    id: "beneficiary_check",
    title: "The Beneficiary Check",
    subtitle: "Is your coverage going where you think?",
    icon: "chest",
    intro: "The name on that form decides where your coverage goes. Make sure it's the right one.",
    body: [
      {
        type: "checklist",
        heading: "The checklist",
        items: [
          "List a primary and a backup (contingent) beneficiary.",
          "Use full names.",
          "Make sure percentages add up to 100%.",
          "Don't leave it blank.",
          "Check retirement accounts too, since they use beneficiary designations as well.",
          "Review after a marriage, divorce, birth or adoption, or the death of a beneficiary.",
        ],
      },
      {
        type: "table",
        heading: "Your tracker",
        columns: ["Policy or account", "Primary", "Contingent", "Last checked"],
        rows: 6,
      },
      {
        type: "note",
        tone: "info",
        text: "Thinking of naming your kids? Talk with an estate attorney first about the best way to set that up for minors.",
      },
      {
        type: "facts",
        heading: "Good to know",
        items: [
          "A beneficiary designation usually overrides a will.",
          "If no beneficiary is named, or none is living, the money may go to your estate and through probate.",
          "Minors generally can't receive the money directly; a trust or custodian can be set up for them.",
        ],
      },
    ],
    cta: CTA,
    footer: FOOTER,
    pageLimit: 1,
  },
  {
    id: "cursed_armor_decoder",
    title: "The Cursed Armor Decoder",
    subtitle: "What to ask HR about your work coverage",
    icon: "d20",
    intro: "Work coverage is great armor, until you change jobs. Here's how to find out if yours is cursed.",
    body: [
      {
        type: "paragraph",
        text: "Bring this to HR, or open your benefits portal, and write down what you find. Ten minutes, and you'll know exactly what your work armor does and doesn't do.",
      },
      {
        type: "questions",
        heading: "Seven questions for HR",
        items: [
          "How much life insurance do I have through work (a flat amount or a multiple of salary)?",
          "Can I buy more? Does that require health questions?",
          "Who's listed as my beneficiary?",
          "What happens to my coverage if I leave, get laid off, or retire?",
          "Can I keep it or convert it? What's the deadline, and what would it cost?",
          "Does my coverage change as I get older?",
          "Is there coverage for my spouse or kids through the plan?",
        ],
      },
      {
        type: "facts",
        heading: "Good to know",
        items: [
          "Work life insurance often ends, or has to be converted, when you leave a job.",
          "Some plans let you keep or convert coverage, often within a limited time window.",
          "Under IRS rules, the cost of employer-paid group term life coverage above $50,000 generally counts as taxable income to the employee.",
        ],
      },
    ],
    cta: CTA,
    footer: FOOTER,
    pageLimit: 1,
  },
  {
    id: "party_map",
    title: "The Party Map",
    subtitle: "The \"if something happens to me\" organizer",
    icon: "chest",
    intro: "If something happens to you, your party shouldn't have to go treasure hunting. Draw them a map.",
    body: [
      {
        type: "note",
        tone: "safety",
        text: "Write where things are, not account numbers or passwords. Keep this somewhere safe and tell someone you trust where it is.",
      },
      { type: "fields", heading: "Who to call first", items: ["First call (name and number):", "Second call (name and number):", "Third call (name and number):"] },
      { type: "fields", heading: "Life insurance", items: ["Company:", "Agent (name and number):", "Where the policy is kept:"] },
      { type: "fields", heading: "Work benefits", items: ["Employer:", "HR contact (name and number):"] },
      {
        type: "table",
        heading: "Bank and retirement accounts",
        columns: ["Institution", "Type (checking, savings, 401(k), IRA...)", "Where statements are kept"],
        rows: 4,
      },
      { type: "fields", heading: "Home and vehicles", items: ["Where the deed is kept:", "Mortgage lender:", "Vehicles, and where the titles are kept:"] },
      { type: "pagebreak" },
      { type: "fields", heading: "Will and estate documents", items: ["Where they are:", "Attorney (name and number):"] },
      {
        type: "table",
        heading: "Bills on autopay",
        columns: ["Bill", "Paid from (account name, not the number)", "About when each month"],
        rows: 6,
      },
      { type: "fields", heading: "Digital life", items: ["Where the instructions for your password manager are kept:", "Who knows where to find them:"] },
      { type: "fields", heading: "Pets", items: ["Who will care for them:", "Vet (name and number):"] },
      { type: "fields", heading: "This map", items: ["Date last updated:", "Where the original is kept:"] },
    ],
    cta: CTA,
    footer: FOOTER,
    pageLimit: 2,
  },
];

export function lootPageById(id: string | undefined): LootPageContent | null {
  if (!id) return null;
  return LOOT_PAGES.find((p) => p.id === id) ?? null;
}

/** Where the matching PDF is served from (built by scripts/loot-pdf.ts). */
export function lootPdfUrl(id: string): string {
  return `/loot/${id}.pdf`;
}
