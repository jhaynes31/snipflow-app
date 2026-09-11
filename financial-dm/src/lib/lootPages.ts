/**
 * Loot pages: each downloadable item as content, rendered by one template
 * (components/loot/LootPage.tsx) as a web page at /loot/<id> and printed to
 * a matching PDF at /loot/<id>.pdf by scripts/loot-pdf.ts.
 *
 * Rules (loot pages spec, Section 2): only the allowed facts listed per item
 * may appear; nothing a reader types is ever collected; no sensitive fields;
 * warm and practical; John's title is exactly "Licensed Term Life Agent";
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
  | { type: "facts"; heading?: string; items: string[] };

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
  agentTitle: "Licensed Term Life Agent",
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
];

export function lootPageById(id: string | undefined): LootPageContent | null {
  if (!id) return null;
  return LOOT_PAGES.find((p) => p.id === id) ?? null;
}

/** Where the matching PDF is served from (built by scripts/loot-pdf.ts). */
export function lootPdfUrl(id: string): string {
  return `/loot/${id}.pdf`;
}
