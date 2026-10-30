/**
 * Staffing agencies that place people in remote customer service, admin,
 * operations, and healthcare back office work (Jen's list, 2026-10-30, the
 * ones that fit his background). Most run their own job sites with no open
 * feed, so they're checked by hand from the Agencies page. Search links go
 * through a web search limited to the agency's own site when its address is
 * known, so they keep working when an agency reorganizes its pages.
 */

export interface Agency {
  key: string;
  name: string;
  /** The agency's own web address, when known for certain. */
  site?: string;
  focus: string;
  group: "general" | "healthcare";
}

export const AGENCIES: Agency[] = [
  { key: "roberthalf", name: "Robert Half", site: "roberthalf.com", focus: "Remote administrative, insurance, customer service, and professional contract roles.", group: "general" },
  { key: "kelly", name: "Kelly", site: "kellyservices.com", focus: "Remote customer service, insurance, operations, and administrative roles.", group: "general" },
  { key: "astoncarter", name: "Aston Carter", site: "astoncarter.com", focus: "Administrative, claims, insurance, operations, and customer support. Contract and contract to hire.", group: "general" },
  { key: "randstad", name: "Randstad USA", site: "randstadusa.com", focus: "Customer service, insurance, claims, healthcare administration, and operations.", group: "general" },
  { key: "adecco", name: "Adecco", site: "adeccousa.com", focus: "Remote customer support, operations, and administrative positions.", group: "general" },
  { key: "manpower", name: "Manpower", site: "manpower.com", focus: "Administrative, customer service, and operations contract assignments.", group: "general" },
  { key: "insightglobal", name: "Insight Global", site: "insightglobal.com", focus: "Remote jobs in insurance, operations, and business support.", group: "general" },
  { key: "appleone", name: "AppleOne", site: "appleone.com", focus: "Administrative, customer service, insurance, and clerical jobs.", group: "general" },
  { key: "lasalle", name: "LaSalle Network", site: "lasallenetwork.com", focus: "Administrative, customer service, operations, and healthcare placements.", group: "general" },
  { key: "atrium", name: "Atrium", site: "atriumstaffing.com", focus: "Administrative, customer service, and operations staffing.", group: "general" },
  { key: "spherion", name: "Spherion", site: "spherion.com", focus: "Administrative, customer service, and temporary or contract work.", group: "general" },
  { key: "clarisureva", name: "ClariSureVA", focus: "Remote healthcare admin: prior authorization, insurance verification, claims, and denials.", group: "healthcare" },
  { key: "medix", name: "Medix", site: "medixteam.com", focus: "Health plan, revenue cycle, and healthcare administration staffing.", group: "healthcare" },
  { key: "judge", name: "The Judge Group", site: "judge.com", focus: "Insurance, healthcare operations, and professional contract jobs.", group: "healthcare" },
];

/** Words a search for his kind of work uses. */
const SEARCH_WORDS = '"remote" (customer service OR administrative OR operations OR claims OR "data entry" OR "back office")';

/** A web search for the agency's remote jobs: within its own site when the address is known, by name otherwise. */
export function searchLink(a: { name: string; site?: string }, healthcare = false): string {
  const words = healthcare ? '"remote" (claims OR "prior authorization" OR "insurance verification" OR "billing" OR "revenue cycle")' : SEARCH_WORDS;
  const q = a.site ? `site:${a.site} jobs ${words}` : `"${a.name}" remote jobs ${words}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function siteLink(a: { name: string; site?: string }): string {
  return a.site ? `https://www.${a.site.replace(/^www\./, "")}` : `https://www.google.com/search?q=${encodeURIComponent(a.name)}`;
}

/**
 * The first note to a recruiter: what he's looking for and his limits, so
 * nobody's time goes to jobs that can't work. Nothing personal or health
 * related.
 */
export function recruiterNote(o: { name: string; minHourly: number; maxHours: number; homeState: string }): string {
  return `Hello,

I'm looking for a fully remote role and would love to be considered for openings that fit. I have more than ten years of customer service experience and I'm strongest in written, independent work: email and ticket support, documentation, records, order processing, quality review, and back office operations.

What I'm looking for:
1. Fully remote, open to someone living in ${o.homeState}, and able to work from other US states while traveling.
2. Guaranteed pay of at least $${o.minHourly} an hour (hourly W2 is great).
3. ${o.maxHours} hours a week or fewer, ideally a flexible or early schedule.
4. Mostly email, ticket, or back office work, with few calls and meetings.
5. No sales, cold calling, or commission based roles.

Email is the best way to reach me. Thank you for your help.

${o.name}`;
}

/** Days until a follow up, or null. Negative means it has come and gone. */
export function daysUntil(at: number | undefined, now: number): number | null {
  if (!at) return null;
  return Math.ceil((at - now) / 86400000);
}
