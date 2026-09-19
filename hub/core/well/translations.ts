/**
 * The translations The Well can show. Built-in ones are public domain and
 * live in public/bible/<code>/. Keyed ones need a key pasted into Convex
 * before they turn on; until then they show as "later", never hidden.
 */
export interface Translation {
  code: string;
  name: string;
  short: string;
  /** Present in public/bible/<code>/ and always available. */
  builtIn: boolean;
  /** The Convex environment variable that turns a keyed translation on. */
  needsKey?: string;
  note: string;
}

export const TRANSLATIONS: Translation[] = [
  { code: "bsb", short: "BSB", name: "Berean Standard Bible", builtIn: true, note: "Modern, readable, close to the original wording. Public domain since 2022." },
  { code: "kjv", short: "KJV", name: "King James Version", builtIn: true, note: "1611, revised 1769. The one most English-speaking churches grew up on." },
  { code: "asv", short: "ASV", name: "American Standard Version", builtIn: true, note: "1901. Very literal; the grandparent of the NASB and ESV." },
  { code: "esv", short: "ESV", name: "English Standard Version", builtIn: false, needsKey: "ESV_API_KEY", note: "Needs a free key from Crossway. Not turned on yet." },
  { code: "niv", short: "NIV", name: "New International Version", builtIn: false, needsKey: "BIBLE_API_KEY", note: "Needs a licensed key. Not turned on yet." },
  { code: "nlt", short: "NLT", name: "New Living Translation", builtIn: false, needsKey: "BIBLE_API_KEY", note: "Needs a licensed key. Not turned on yet." },
];

export const DEFAULT_TRANSLATION = "bsb";

export function translationByCode(code: string): Translation | undefined {
  return TRANSLATIONS.find((t) => t.code === code);
}

export function builtInTranslations(): Translation[] {
  return TRANSLATIONS.filter((t) => t.builtIn);
}

/** Lines a person's chosen verse up across translations, by verse number, blank where a translation lacks it. */
export function alignVerses(chapters: (string[] | null)[]): { n: number; texts: (string | null)[] }[] {
  const longest = Math.max(0, ...chapters.map((c) => c?.length ?? 0));
  const out: { n: number; texts: (string | null)[] }[] = [];
  for (let i = 0; i < longest; i++) out.push({ n: i + 1, texts: chapters.map((c) => c?.[i] ?? null) });
  return out;
}
