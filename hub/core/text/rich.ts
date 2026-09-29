/**
 * Light formatting for anywhere the two of them type (2026-09-29, Jen's ask):
 * **bold**, *italic* or _italic_, and __underline__. Plain text in, a few
 * marks, nothing else. Pure, so the browser, the Convex bundle and the tests
 * all load it. Text without marks comes back unchanged.
 */
export type Mark = "b" | "i" | "u";
export type Token = { text: string; b?: boolean; i?: boolean; u?: boolean };

// A mark must hug its text: "**bold**" yes, "2 * 3 * 4" no.
const RE = /(\*\*(?=\S)[\s\S]*?(?<=\S)\*\*|__(?=\S)[\s\S]*?(?<=\S)__|\*(?=\S)[^*\n]*?(?<=\S)\*|_(?=\S)[^_\n]*?(?<=\S)_)/;

/** Split text into runs with their marks. Nested marks work one level deep (bold inside underline, etc.). */
export function parseRich(text: string, inherited: Omit<Token, "text"> = {}): Token[] {
  const out: Token[] = [];
  let rest = text;
  while (rest.length) {
    const m = RE.exec(rest);
    if (!m || m.index === undefined) { out.push({ text: rest, ...inherited }); break; }
    if (m.index > 0) out.push({ text: rest.slice(0, m.index), ...inherited });
    const raw = m[0];
    let inner: string;
    let mark: Mark;
    if (raw.startsWith("**")) { inner = raw.slice(2, -2); mark = "b"; }
    else if (raw.startsWith("__")) { inner = raw.slice(2, -2); mark = "u"; }
    else { inner = raw.slice(1, -1); mark = "i"; }
    out.push(...parseRich(inner, { ...inherited, [mark]: true }));
    rest = rest.slice(m.index + raw.length);
  }
  return out.filter((t) => t.text.length > 0);
}

/** True when the text carries any mark. */
export function hasMarks(text: string): boolean {
  return RE.test(text);
}

/** The text with the marks removed, for notifications and other plain places. */
export function stripMarks(text: string): string {
  return parseRich(text).map((t) => t.text).join("");
}

const WRAP: Record<Mark, string> = { b: "**", i: "*", u: "__" };

/**
 * Wrap the selection in a mark, or unwrap it when it is already wrapped, or
 * insert a pair to type into when nothing is selected. Returns the new text
 * and where the cursor or selection should land.
 */
export function toggleMark(value: string, start: number, end: number, mark: Mark): { value: string; start: number; end: number } {
  const w = WRAP[mark];
  const before = value.slice(0, start);
  const sel = value.slice(start, end);
  const after = value.slice(end);
  if (sel.startsWith(w) && sel.endsWith(w) && sel.length >= 2 * w.length) {
    const inner = sel.slice(w.length, -w.length);
    return { value: before + inner + after, start, end: start + inner.length };
  }
  if (before.endsWith(w) && after.startsWith(w)) {
    return { value: before.slice(0, -w.length) + sel + after.slice(w.length), start: start - w.length, end: end - w.length };
  }
  const next = before + w + sel + w + after;
  return { value: next, start: start + w.length, end: end + w.length };
}
