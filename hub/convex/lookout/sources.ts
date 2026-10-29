/**
 * Where the Lookout looks, and how each source's answer is read. Pure: the
 * fetching is in discover.ts. Every source here is a public API the site
 * offers for exactly this use, so nothing is scraped:
 *
 * - Greenhouse, Lever, and Ashby host employers' own job boards. Their
 *   public posting APIs return the employer's official listing and its
 *   application page. These come first.
 * - Remotive and Himalayas are remote job boards with public APIs. Both ask
 *   for a link back to them and a light touch (a few requests a day), which
 *   the once-a-day limit in discover.ts keeps.
 *
 * Indeed, LinkedIn, and other aggregators don't allow automated access, so
 * jobs from there are pasted in by hand and still get every check.
 */

export type SourceKind = "greenhouse" | "lever" | "ashby" | "remotive" | "himalayas";

export interface Source {
  kind: SourceKind;
  /** The employer's board name for Greenhouse, Lever, and Ashby; a search term or category for job boards. */
  token: string;
  name: string;
  enabled: boolean;
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  greenhouse: "Employer board on Greenhouse",
  lever: "Employer board on Lever",
  ashby: "Employer board on Ashby",
  remotive: "Remotive (remote job board)",
  himalayas: "Himalayas (remote job board)",
};

/**
 * A starting list. Employer boards are examples of remote-first companies
 * that hire support and operations people; each is off until he turns it
 * on, because a board name can change and the first search will say so.
 */
export const DEFAULT_SOURCES: Source[] = [
  { kind: "remotive", token: "customer-support", name: "Remotive: customer support", enabled: true },
  { kind: "remotive", token: "all-others", name: "Remotive: operations and other", enabled: true },
  { kind: "himalayas", token: "customer-support", name: "Himalayas: customer support", enabled: true },
  { kind: "himalayas", token: "operations", name: "Himalayas: operations", enabled: true },
  { kind: "greenhouse", token: "gitlab", name: "GitLab", enabled: false },
  { kind: "ashby", token: "zapier", name: "Zapier", enabled: false },
  { kind: "greenhouse", token: "automatticcareers", name: "Automattic", enabled: false },
  { kind: "lever", token: "doist", name: "Doist", enabled: false },
];

/** The plan's discovery categories, as title words. A title must match one to be kept. */
export const TITLE_WORDS = [
  "documentation", "knowledge base", "knowledge management", "technical writer", "content specialist",
  "customer operations", "support operations", "service operations", "operations specialist", "operations coordinator", "operations associate",
  "back office", "order processing", "order management", "fulfillment specialist", "order specialist",
  "email support", "ticket", "support specialist", "support associate", "customer support", "customer service", "customer care", "support agent", "help desk",
  "quality assurance", "quality analyst", "qa specialist", "quality specialist", "service quality", "quality reviewer", "audit",
  "process improvement", "workflow", "data entry", "records", "data specialist", "data coordinator", "data administrator",
  "content review", "content moderator", "trust and safety", "verification", "fraud analyst", "risk analyst",
  "onboarding specialist", "onboarding coordinator", "implementation coordinator",
  "claims", "benefits administrator", "billing specialist", "accounts receivable", "payments specialist",
  "crm", "administrator", "administrative", "coordinator", "virtual assistant", "scheduler", "transcription",
];

/** Titles that point to sales work, dropped before any further reading. */
export const SALES_TITLE = /\b(?:account executive|sales|business development|bdr|sdr|closer|inside sales|account manager|lead generation|telemarket|appointment setter|recruiter)\b/i;

export function titleFits(title: string, extra: string[] = []): boolean {
  if (SALES_TITLE.test(title)) return false;
  const t = title.toLowerCase();
  return [...TITLE_WORDS, ...extra.map((w) => w.toLowerCase())].some((w) => t.includes(w));
}

export function sourceUrl(s: Source): string {
  const t = encodeURIComponent(s.token.trim());
  switch (s.kind) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${t}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${t}?includeCompensation=true`;
    case "remotive":
      return `https://remotive.com/api/remote-jobs?category=${t}&limit=100`;
    case "himalayas":
      return `https://himalayas.app/jobs/api/search?q=${t}&country=US&sort=recent`;
  }
}

/** One listing as every source is turned into. */
export interface Posting {
  sourceKind: SourceKind;
  sourceName: string;
  sourceId: string;
  title: string;
  employer: string;
  url: string;
  applyUrl?: string;
  location?: string;
  description: string;
  postedAt?: number;
  deadline?: string;
  /** Structured pay when the source gives it. Appended to the description so the scanner reads it too. */
  payLine?: string;
}

/** HTML to readable text: block tags become line breaks, entities decoded, tags dropped. */
export function htmlToText(html: string): string {
  const decoded = html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&");
  return decoded
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*(br|\/p|\/div|\/li|\/h\d|\/tr)\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

type J = Record<string, unknown>;
const str = (x: unknown): string => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");
const obj = (x: unknown): J => (x && typeof x === "object" && !Array.isArray(x) ? (x as J) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const time = (x: unknown): number | undefined => {
  if (typeof x === "number") return x < 1e12 ? x * 1000 : x;
  if (typeof x === "string" && x) {
    const t = Date.parse(x);
    return Number.isFinite(t) ? t : undefined;
  }
  return undefined;
};

/** Read one source's JSON into postings. Unknown shapes give an empty list, never a throw. */
export function parseSource(source: Source, data: unknown): Posting[] {
  const base = { sourceKind: source.kind, sourceName: source.name };
  const out: Posting[] = [];
  if (source.kind === "greenhouse") {
    for (const j of arr(obj(data).jobs).map(obj)) {
      out.push({
        ...base,
        sourceId: str(j.id),
        title: str(j.title),
        employer: str(j.company_name) || source.name,
        url: str(j.absolute_url),
        applyUrl: str(j.absolute_url) || undefined,
        location: str(obj(j.location).name) || undefined,
        description: htmlToText(str(j.content)),
        postedAt: time(j.first_published) ?? time(j.updated_at),
      });
    }
  } else if (source.kind === "lever") {
    for (const j of arr(data).map(obj)) {
      const cat = obj(j.categories);
      const lists = arr(j.lists).map(obj).map((l) => `${str(l.text)}\n${htmlToText(str(l.content))}`).join("\n\n");
      const sal = obj(j.salaryRange);
      out.push({
        ...base,
        sourceId: str(j.id),
        title: str(j.text),
        employer: source.name,
        url: str(j.hostedUrl),
        applyUrl: str(j.applyUrl) || undefined,
        location: [str(cat.location), str(j.workplaceType)].filter(Boolean).join(", ") || undefined,
        description: [str(j.descriptionPlain), lists, str(j.additionalPlain), str(cat.commitment)].filter(Boolean).join("\n\n"),
        postedAt: time(j.createdAt),
        payLine: sal.min ? `Pay range: $${str(sal.min)} to $${str(sal.max)} ${str(sal.currency)} per ${/hour|week|month|year/.exec(str(sal.interval))?.[0] ?? "year"}` : undefined,
      });
    }
  } else if (source.kind === "ashby") {
    for (const j of arr(obj(data).jobs).map(obj)) {
      const comp = obj(j.compensation);
      out.push({
        ...base,
        sourceId: str(j.id) || str(j.jobUrl),
        title: str(j.title),
        employer: source.name,
        url: str(j.jobUrl),
        applyUrl: str(j.applyUrl) || undefined,
        location: [str(j.location), j.isRemote ? "Remote" : ""].filter(Boolean).join(", ") || undefined,
        description: [str(j.descriptionPlain) || htmlToText(str(j.descriptionHtml)), str(j.employmentType)].filter(Boolean).join("\n\n"),
        postedAt: time(j.publishedAt),
        payLine: str(comp.compensationTierSummary) || str(comp.scrapeableCompensationSalarySummary) || undefined,
      });
    }
  } else if (source.kind === "remotive") {
    for (const j of arr(obj(data).jobs).map(obj)) {
      out.push({
        ...base,
        sourceId: str(j.id),
        title: str(j.title),
        employer: str(j.company_name),
        url: str(j.url),
        location: str(j.candidate_required_location) || undefined,
        description: [htmlToText(str(j.description)), str(j.job_type)].filter(Boolean).join("\n\n"),
        postedAt: time(j.publication_date),
        payLine: str(j.salary) ? `Salary: ${str(j.salary)}` : undefined,
      });
    }
  } else if (source.kind === "himalayas") {
    for (const j of arr(obj(data).jobs).map(obj)) {
      const min = Number(j.minSalary);
      const max = Number(j.maxSalary);
      const restrictions = arr(j.locationRestrictions).map((x) => (typeof x === "string" ? x : str(obj(x).name))).filter(Boolean);
      out.push({
        ...base,
        sourceId: str(j.guid) || str(j.applicationLink),
        title: str(j.title),
        employer: str(j.companyName),
        url: str(j.applicationLink) || str(j.guid),
        applyUrl: str(j.applicationLink) || undefined,
        location: restrictions.length ? restrictions.join(", ") : undefined,
        description: [htmlToText(str(j.description) || str(j.excerpt)), str(j.employmentType), restrictions.length ? `Location restrictions: ${restrictions.join(", ")}` : ""].filter(Boolean).join("\n\n"),
        postedAt: time(j.pubDate),
        deadline: j.expiryDate ? new Date(time(j.expiryDate) ?? 0).toISOString().slice(0, 10) : undefined,
        payLine: Number.isFinite(min) && min > 0 ? `Salary range: $${min}${Number.isFinite(max) && max > 0 ? ` to $${max}` : ""} ${str(j.currency) || "USD"} per year` : undefined,
      });
    }
  }
  return out.filter((p) => p.title && p.url);
}

/** A US-friendly location line, or one with no location limit. Postings limited to other countries are dropped. */
export function usFriendly(location: string | undefined): boolean {
  if (!location) return true;
  const l = location.toLowerCase();
  if (/\b(?:us|usa|u\.s\.|united states|americas|north america|worldwide|anywhere|global|remote)\b/.test(l)) return true;
  return !/\b(?:uk|united kingdom|europe|emea|germany|canada only|india|philippines|latam|apac|australia|brazil|mexico)\b/.test(l);
}

/** Words a listing page shows once the job is gone. */
const CLOSED_WORDS = /\b(?:no longer (?:accepting applications|available|open)|position has been filled|this job (?:has )?(?:expired|closed)|job (?:is )?no longer (?:available|posted)|the job you are looking for (?:is no longer|was not found)|page (?:you requested )?(?:could not be|was not) found|posting (?:has been )?(?:closed|removed))\b/i;

/**
 * Whether a recheck says the job is still open. A 404 or 410, or a page
 * that says it's gone, is closed. Anything else that answers is open as far
 * as can be told; a page that won't answer stays unknown.
 */
export function openFromPage(status: number, body: string): "yes" | "no" | "unknown" {
  if (status === 404 || status === 410) return "no";
  if (status >= 200 && status < 300) return CLOSED_WORDS.test(htmlToText(body).slice(0, 20000)) ? "no" : "yes";
  return "unknown";
}
