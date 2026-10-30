/**
 * Where the Lookout looks, and how each source's answer is read. Pure: the
 * fetching is in discover.ts. Every source here is a public feed or API the
 * site offers for reading its listings, so nothing is scraped.
 *
 * Employers' own boards come first: Greenhouse, Lever, Ashby, Workable,
 * SmartRecruiters, and Recruitee host companies' official listings and
 * application pages. Add one by pasting the company's careers page link
 * (boardFromUrl). Then the remote job boards with open feeds: Remotive,
 * Himalayas, Remote OK, We Work Remotely, Jobicy, Working Nomads, and The
 * Muse. Several ask for a link back, shown on each job, and a light touch;
 * the once-a-day limit in discover.ts keeps it.
 *
 * Indeed, LinkedIn, Glassdoor, and ZipRecruiter don't allow automated
 * reading, so jobs from there are pasted in by hand and get every check.
 */

export type SourceKind = "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters" | "recruitee" | "remotive" | "himalayas" | "remoteok" | "weworkremotely" | "jobicy" | "workingnomads" | "themuse";

export interface Source {
  kind: SourceKind;
  /** The employer's board name for employer boards; a category or search words for job boards. */
  token: string;
  name: string;
  enabled: boolean;
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  greenhouse: "Employer board on Greenhouse",
  lever: "Employer board on Lever",
  ashby: "Employer board on Ashby",
  workable: "Employer board on Workable",
  smartrecruiters: "Employer board on SmartRecruiters",
  recruitee: "Employer board on Recruitee",
  remotive: "Remotive (remote job board)",
  himalayas: "Himalayas (remote job board)",
  remoteok: "Remote OK (remote job board)",
  weworkremotely: "We Work Remotely (remote job board)",
  jobicy: "Jobicy (remote job board)",
  workingnomads: "Working Nomads (remote job board)",
  themuse: "The Muse (job board)",
};

/** Kinds that are one employer's own board, as opposed to a job board listing many employers. */
export const EMPLOYER_KINDS: SourceKind[] = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee"];

/** Where each site's public listing page is, for the link back several of them ask for. */
export const BOARD_HOME: Partial<Record<SourceKind, { name: string; url: string }>> = {
  remotive: { name: "Remotive", url: "https://remotive.com" },
  himalayas: { name: "Himalayas", url: "https://himalayas.app" },
  remoteok: { name: "Remote OK", url: "https://remoteok.com" },
  weworkremotely: { name: "We Work Remotely", url: "https://weworkremotely.com" },
  jobicy: { name: "Jobicy", url: "https://jobicy.com" },
  workingnomads: { name: "Working Nomads", url: "https://www.workingnomads.com" },
  themuse: { name: "The Muse", url: "https://www.themuse.com" },
};

/**
 * The starting list, with the version each entry arrived in. A search made
 * before an entry existed gets it added once (mergeNewDefaults), so new
 * sources reach existing searches without bringing back ones removed.
 * Example employer boards are off until turned on, because a board name can
 * change; the search note says when one doesn't answer.
 */
export const SOURCES_VERSION = 2;
export const DEFAULT_SOURCES: (Source & { since: number })[] = [
  { kind: "remotive", token: "customer-support", name: "Remotive: customer support", enabled: true, since: 1 },
  { kind: "remotive", token: "all-others", name: "Remotive: operations and other", enabled: true, since: 1 },
  { kind: "remotive", token: "writing", name: "Remotive: writing and documentation", enabled: true, since: 2 },
  { kind: "himalayas", token: "customer-support", name: "Himalayas: customer support", enabled: true, since: 1 },
  { kind: "himalayas", token: "operations", name: "Himalayas: operations", enabled: true, since: 1 },
  { kind: "himalayas", token: "data entry", name: "Himalayas: data entry and records", enabled: true, since: 2 },
  { kind: "himalayas", token: "claims", name: "Himalayas: claims and benefits", enabled: true, since: 2 },
  { kind: "remoteok", token: "all", name: "Remote OK: newest remote jobs", enabled: true, since: 2 },
  { kind: "weworkremotely", token: "remote-customer-support-jobs", name: "We Work Remotely: customer support", enabled: true, since: 2 },
  { kind: "weworkremotely", token: "remote-management-and-finance-jobs", name: "We Work Remotely: management and finance", enabled: true, since: 2 },
  { kind: "weworkremotely", token: "all-other-remote-jobs", name: "We Work Remotely: everything else", enabled: true, since: 2 },
  { kind: "jobicy", token: "customer support", name: "Jobicy: customer support", enabled: true, since: 2 },
  { kind: "jobicy", token: "operations", name: "Jobicy: operations", enabled: true, since: 2 },
  { kind: "jobicy", token: "data entry", name: "Jobicy: data entry", enabled: true, since: 2 },
  { kind: "workingnomads", token: "all", name: "Working Nomads: newest remote jobs", enabled: true, since: 2 },
  { kind: "themuse", token: "Customer Service", name: "The Muse: customer service, remote", enabled: true, since: 2 },
  { kind: "themuse", token: "Administration and Office", name: "The Muse: administration, remote", enabled: true, since: 2 },
  { kind: "themuse", token: "Data and Analytics", name: "The Muse: data and records, remote", enabled: true, since: 2 },
  { kind: "greenhouse", token: "gitlab", name: "GitLab", enabled: false, since: 1 },
  { kind: "ashby", token: "zapier", name: "Zapier", enabled: false, since: 1 },
  { kind: "greenhouse", token: "automatticcareers", name: "Automattic", enabled: false, since: 1 },
  { kind: "lever", token: "doist", name: "Doist", enabled: false, since: 1 },
];

/** The default sources as a plain list, without their version. */
export function defaultSources(): Source[] {
  return DEFAULT_SOURCES.map(({ since, ...src }) => (void since, src));
}

/** Add the defaults that arrived after a search was made, skipping any it already has. */
export function mergeNewDefaults(current: Source[], fromVersion: number): Source[] {
  const has = new Set(current.map((x) => `${x.kind}:${x.token.toLowerCase()}`));
  const added = DEFAULT_SOURCES.filter((d) => d.since > fromVersion && !has.has(`${d.kind}:${d.token.toLowerCase()}`)).map(({ since, ...src }) => (void since, src));
  return [...current, ...added];
}

/**
 * An employer's job board from a link to it: the careers page, a job on it,
 * or the application page. Null when the link isn't on a board the Lookout
 * can read; then the company's jobs are added by hand.
 */
export function boardFromUrl(input: string): { kind: SourceKind; token: string } | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const seg = u.pathname.split("/").filter(Boolean);
  const first = seg[0] ? decodeURIComponent(seg[0]).toLowerCase() : "";
  const ok = (t: string) => /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(t);
  if ((host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") && ok(first) && first !== "embed") return { kind: "greenhouse", token: first };
  if ((host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") && first === "embed") {
    const t = u.searchParams.get("for");
    return t && ok(t) ? { kind: "greenhouse", token: t.toLowerCase() } : null;
  }
  if (host === "boards-api.greenhouse.io" && seg[2] && ok(seg[2])) return { kind: "greenhouse", token: seg[2].toLowerCase() };
  if (host === "jobs.lever.co" && ok(first)) return { kind: "lever", token: first };
  if (host === "jobs.ashbyhq.com" && ok(first)) return { kind: "ashby", token: first };
  if (host === "apply.workable.com" && ok(first) && first !== "api") return { kind: "workable", token: first };
  if ((host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") && ok(first)) return { kind: "smartrecruiters", token: seg[0] };
  const rec = /^([a-z0-9-]+)\.recruitee\.com$/.exec(host);
  if (rec && rec[1] !== "www") return { kind: "recruitee", token: rec[1] };
  return null;
}

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
    case "workable":
      return `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=100`;
    case "recruitee":
      return `https://${t}.recruitee.com/api/offers/`;
    case "remotive":
      return `https://remotive.com/api/remote-jobs?category=${t}&limit=100`;
    case "himalayas":
      return `https://himalayas.app/jobs/api/search?q=${t}&country=US&sort=recent`;
    case "remoteok":
      return "https://remoteok.com/api";
    case "weworkremotely":
      return `https://weworkremotely.com/categories/${t}.rss`;
    case "jobicy":
      return `https://jobicy.com/api/v2/remote-jobs?count=50&geo=usa&tag=${t}`;
    case "workingnomads":
      return "https://www.workingnomads.com/api/exposed_jobs/";
    case "themuse":
      return `https://www.themuse.com/api/public/jobs?category=${t}&location=${encodeURIComponent("Flexible / Remote")}&page=0&descending=true`;
  }
}

/** RSS feeds are read as text; everything else is JSON. */
export function isFeed(kind: SourceKind): boolean {
  return kind === "weworkremotely";
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
  } else if (source.kind === "workable") {
    const d = obj(data);
    for (const j of arr(d.jobs).map(obj)) {
      out.push({
        ...base,
        sourceId: str(j.shortcode) || str(j.url),
        title: str(j.title),
        employer: str(d.name) || source.name,
        url: str(j.url) || str(j.shortlink),
        applyUrl: str(j.application_url) || undefined,
        location: [str(j.city), str(j.state), str(j.country), j.telecommuting ? "Remote" : ""].filter(Boolean).join(", ") || undefined,
        description: [htmlToText(str(j.description)), str(j.employment_type)].filter(Boolean).join("\n\n"),
        postedAt: time(j.published_on) ?? time(j.created_at),
      });
    }
  } else if (source.kind === "smartrecruiters") {
    for (const j of arr(obj(data).content).map(obj)) {
      const loc = obj(j.location);
      const id = str(j.id);
      // The list has no description; discover.ts fills it in for the few that fit.
      out.push({
        ...base,
        sourceId: id,
        title: str(j.name),
        employer: str(obj(j.company).name) || source.name,
        url: `https://jobs.smartrecruiters.com/${encodeURIComponent(source.token)}/${id}`,
        location: [str(loc.fullLocation) || [str(loc.city), str(loc.region), str(loc.country)].filter(Boolean).join(", "), loc.remote ? "Remote" : ""].filter(Boolean).join(", ") || undefined,
        description: [str(obj(j.typeOfEmployment).label), loc.remote ? "Remote" : ""].filter(Boolean).join("\n"),
        postedAt: time(j.releasedDate),
      });
    }
  } else if (source.kind === "recruitee") {
    for (const j of arr(obj(data).offers).map(obj)) {
      const sal = obj(j.salary);
      out.push({
        ...base,
        sourceId: str(j.id),
        title: str(j.title),
        employer: str(j.company_name) || source.name,
        url: str(j.careers_url),
        applyUrl: str(j.careers_apply_url) || undefined,
        location: [str(j.location), j.remote ? "Remote" : ""].filter(Boolean).join(", ") || undefined,
        description: [htmlToText(str(j.description)), htmlToText(str(j.requirements)), str(j.employment_type_code)].filter(Boolean).join("\n\n"),
        postedAt: time(j.published_at) ?? time(j.created_at),
        payLine: sal.min ? `Pay range: $${str(sal.min)} to $${str(sal.max)} ${str(sal.currency)} per ${/hour|week|month|year/.exec(str(sal.period))?.[0] ?? "year"}` : undefined,
      });
    }
  } else if (source.kind === "remoteok") {
    // The first item is the site's legal notice, not a job.
    for (const j of arr(data).map(obj).filter((x) => x.id && x.position)) {
      const min = Number(j.salary_min);
      const max = Number(j.salary_max);
      out.push({
        ...base,
        sourceId: str(j.id),
        title: str(j.position),
        employer: str(j.company),
        url: str(j.url) || `https://remoteok.com/remote-jobs/${str(j.id)}`,
        applyUrl: str(j.apply_url) || undefined,
        location: str(j.location) || undefined,
        description: [htmlToText(str(j.description)), arr(j.tags).map(str).join(", ")].filter(Boolean).join("\n\n"),
        postedAt: time(j.date) ?? time(j.epoch),
        payLine: Number.isFinite(min) && min > 0 ? `Salary range: $${min}${Number.isFinite(max) && max > 0 ? ` to $${max}` : ""} USD per year` : undefined,
      });
    }
  } else if (source.kind === "jobicy") {
    for (const j of arr(obj(data).jobs).map(obj)) {
      const min = Number(j.annualSalaryMin);
      const max = Number(j.annualSalaryMax);
      out.push({
        ...base,
        sourceId: str(j.id),
        title: htmlToText(str(j.jobTitle)),
        employer: str(j.companyName),
        url: str(j.url),
        location: str(j.jobGeo) || undefined,
        description: [htmlToText(str(j.jobDescription) || str(j.jobExcerpt)), arr(j.jobType).map(str).join(", ")].filter(Boolean).join("\n\n"),
        postedAt: time(j.pubDate),
        payLine: Number.isFinite(min) && min > 0 ? `Salary range: $${min}${Number.isFinite(max) && max > 0 ? ` to $${max}` : ""} ${str(j.salaryCurrency) || "USD"} per year` : undefined,
      });
    }
  } else if (source.kind === "workingnomads") {
    for (const j of arr(data).map(obj)) {
      out.push({
        ...base,
        sourceId: str(j.url),
        title: str(j.title),
        employer: str(j.company_name),
        url: str(j.url),
        location: str(j.location) || undefined,
        description: [htmlToText(str(j.description)), str(j.category_name), str(j.tags)].filter(Boolean).join("\n\n"),
        postedAt: time(j.pub_date),
      });
    }
  } else if (source.kind === "themuse") {
    for (const j of arr(obj(data).results).map(obj)) {
      out.push({
        ...base,
        sourceId: str(j.id),
        title: str(j.name),
        employer: str(obj(j.company).name),
        url: str(obj(j.refs).landing_page),
        location: arr(j.locations).map((l) => str(obj(l).name)).filter(Boolean).join("; ") || undefined,
        description: htmlToText(str(j.contents)),
        postedAt: time(j.publication_date),
      });
    }
  } else if (source.kind === "weworkremotely") {
    for (const item of feedItems(typeof data === "string" ? data : "")) {
      // Titles read "Company: Job title".
      const i = item.title.indexOf(": ");
      out.push({
        ...base,
        sourceId: item.link,
        title: i > 0 ? item.title.slice(i + 2) : item.title,
        employer: i > 0 ? item.title.slice(0, i) : "",
        url: item.link,
        location: item.region || undefined,
        description: htmlToText(item.description),
        postedAt: time(item.pubDate),
      });
    }
  }
  return out.filter((p) => p.title && p.url);
}

/** RSS items: title, link, date, description, and the region We Work Remotely adds. */
export function feedItems(xml: string): { title: string; link: string; pubDate: string; description: string; region: string }[] {
  const unwrap = (x: string | undefined) => (x ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  const tag = (block: string, name: string) => unwrap(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block)?.[1]);
  const out: { title: string; link: string; pubDate: string; description: string; region: string }[] = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    out.push({ title: htmlToText(tag(b, "title")), link: tag(b, "link") || tag(b, "guid"), pubDate: tag(b, "pubDate"), description: tag(b, "description"), region: htmlToText(tag(b, "region")) });
  }
  return out;
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

/** One from each list in turn until the limit: variety over volume. */
export function takeInTurns<T>(lists: T[][], limit: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < limit; i++) {
    let any = false;
    for (const l of lists) {
      if (i < l.length) {
        any = true;
        out.push(l[i]);
        if (out.length >= limit) break;
      }
    }
    if (!any) break;
  }
  return out;
}
