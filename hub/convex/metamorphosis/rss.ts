/**
 * The feeds the Field Guide pulls from, and a small parser for them. Both
 * sites publish standard RSS; the parser also reads Atom in case one changes.
 * Only titles, links, a short teaser and dates are kept. No article text.
 * Self-contained so tests/field-guide.test.ts can load it on its own.
 */
export interface Feed {
  key: string;
  name: string;
  url: string;
}

export const FEEDS: Feed[] = [
  { key: "aom", name: "Art of Manliness", url: "https://www.artofmanliness.com/feed/" },
  { key: "additude", name: "ADDitude", url: "https://www.additudemag.com/feed/" },
];

export interface FeedItem {
  title: string;
  url: string;
  teaser: string;
  /** Milliseconds since the epoch, or null when the feed gave no usable date. */
  publishedAt: number | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#8217": "’", "#8216": "‘", "#8220": "“", "#8221": "”", "#8230": "…", "#038": "&" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    const key = code.toLowerCase();
    if (key in ENTITIES) return ENTITIES[key];
    if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10));
    return m;
  });
}

function unwrap(s: string): string {
  return decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : null;
}

function atomLink(block: string): string | null {
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ?? block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  return alt ? alt[1] : null;
}

export function teaserOf(html: string, max = 180): string {
  const text = stripTags(unwrap(html));
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).trim() + "…";
}

/** Parses RSS 2.0 or Atom into items, newest first as the feed lists them. Never throws. */
export function parseFeed(xml: string, limit = 12): FeedItem[] {
  const out: FeedItem[] = [];
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks) {
    const title = tag(block, "title");
    const link = tag(block, "link") ?? atomLink(block);
    if (!title || !link) continue;
    const url = unwrap(link);
    if (!/^https?:\/\//i.test(url)) continue;
    const desc = tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content") ?? "";
    const date = tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated") ?? tag(block, "dc:date");
    const ms = date ? Date.parse(unwrap(date)) : NaN;
    out.push({ title: stripTags(unwrap(title)).slice(0, 200), url, teaser: teaserOf(desc), publishedAt: Number.isFinite(ms) ? ms : null });
    if (out.length >= limit) break;
  }
  return out;
}
