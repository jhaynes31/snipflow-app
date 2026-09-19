/**
 * A reference into the built-in Bible: a book slug, a chapter, and an
 * optional verse range. Pure, shared by content files, screens, and tests.
 */
export interface Ref {
  book: string;
  chapter: number;
  from?: number;
  to?: number;
}

export function refLabel(r: Ref, bookName: string): string {
  if (!r.from) return `${bookName} ${r.chapter}`;
  if (!r.to || r.to === r.from) return `${bookName} ${r.chapter}:${r.from}`;
  return `${bookName} ${r.chapter}:${r.from}-${r.to}`;
}

export function refHref(r: Ref): string {
  const hash = r.from ? `#v${r.from}` : "";
  return `/the-well/bible/${r.book}/${r.chapter}${hash}`;
}

/** The verses a ref points at, from a chapter's verse list. */
export function sliceVerses(chapter: string[], r: Ref): { n: number; text: string }[] {
  const from = r.from ?? 1;
  const to = r.to ?? (r.from ? r.from : chapter.length);
  const out: { n: number; text: string }[] = [];
  for (let n = from; n <= Math.min(to, chapter.length); n++) out.push({ n, text: chapter[n - 1] });
  return out;
}

/** Parses "john 3:16-18", "psalms 23", "1-john 4:18". Used by personal cards. */
export function parseRef(input: string): Ref | null {
  const m = input.trim().toLowerCase().match(/^([1-3]?\s?[a-z][a-z\s]*?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) return null;
  const book = m[1].trim().replace(/\s+/g, "-");
  const chapter = Number(m[2]);
  const from = m[3] ? Number(m[3]) : undefined;
  const to = m[4] ? Number(m[4]) : undefined;
  return { book, chapter, from, to };
}
