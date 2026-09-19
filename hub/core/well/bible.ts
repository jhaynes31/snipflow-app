"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TRANSLATION, translationByCode } from "./translations";

/**
 * Loads the built-in Bible (public/bible/bsb) a book at a time and keeps it
 * in memory for the session. Small files, no server round trip after the
 * first read of a book.
 */
export interface BibleBook {
  name: string;
  slug: string;
  chapters: string[][];
}

export interface BibleIndex {
  translation: string;
  abbrev: string;
  books: { name: string; slug: string; testament: "old" | "new"; chapters: number }[];
}

const bookCache = new Map<string, Promise<BibleBook>>();
const indexCache = new Map<string, Promise<BibleIndex>>();

export function loadIndex(code = DEFAULT_TRANSLATION): Promise<BibleIndex> {
  let p = indexCache.get(code);
  if (!p) {
    p = fetch(`/bible/${code}/index.json`).then((r) => r.json() as Promise<BibleIndex>);
    indexCache.set(code, p);
  }
  return p;
}

export function loadBook(slug: string, code = DEFAULT_TRANSLATION): Promise<BibleBook> {
  const key = `${code}/${slug}`;
  let p = bookCache.get(key);
  if (!p) {
    p = fetch(`/bible/${code}/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error("That book isn't here.");
      return r.json() as Promise<BibleBook>;
    });
    bookCache.set(key, p);
  }
  return p;
}

export function useBibleIndex(code = DEFAULT_TRANSLATION): BibleIndex | null {
  const [index, setIndex] = useState<{ code: string; index: BibleIndex } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadIndex(code).then((i) => alive && setIndex({ code, index: i }));
    return () => {
      alive = false;
    };
  }, [code]);
  return index?.code === code ? index.index : null;
}

export function useBook(slug: string | null, code = DEFAULT_TRANSLATION): BibleBook | null | "missing" {
  const [loaded, setLoaded] = useState<{ key: string; book: BibleBook | "missing" } | null>(null);
  const key = `${code}/${slug}`;
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    loadBook(slug, code)
      .then((b) => alive && setLoaded({ key, book: b }))
      .catch(() => alive && setLoaded({ key, book: "missing" }));
    return () => {
      alive = false;
    };
  }, [slug, code, key]);
  if (!slug) return "missing";
  return loaded?.key === key ? loaded.book : null;
}

/** Several translations of one book at once, for the compare view. Null while any is loading. */
export function useBooks(slug: string, codes: string[]): (BibleBook | "missing")[] | null {
  const key = `${slug}|${codes.join(",")}`;
  const [loaded, setLoaded] = useState<{ key: string; books: (BibleBook | "missing")[] } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all(codes.map((c) => loadBook(slug, c).catch(() => "missing" as const))).then((books) => alive && setLoaded({ key, books }));
    return () => {
      alive = false;
    };
  }, [slug, key, codes]);
  return loaded?.key === key ? loaded.books : null;
}

/** The person's chosen translation, per browser. */
export function preferredTranslation(): string {
  try {
    const code = localStorage.getItem("well:translation");
    return code && translationByCode(code)?.builtIn ? code : DEFAULT_TRANSLATION;
  } catch {
    return DEFAULT_TRANSLATION;
  }
}

export function setPreferredTranslation(code: string): void {
  try {
    localStorage.setItem("well:translation", code);
  } catch {
    /* private mode, or storage blocked */
  }
}

/** Where I left off, per person's browser. No gap is ever shown. */
export function rememberPlace(book: string, chapter: number): void {
  try {
    localStorage.setItem("well:place", JSON.stringify({ book, chapter }));
  } catch {
    /* private mode, or storage blocked */
  }
}

export function lastPlace(): { book: string; chapter: number } | null {
  try {
    const raw = localStorage.getItem("well:place");
    return raw ? (JSON.parse(raw) as { book: string; chapter: number }) : null;
  } catch {
    return null;
  }
}

/** Reads a passage aloud with the browser's own voice, or does nothing where that isn't available. */
export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** The ISO-ish week key used for the weekly question: Monday's date. */
export function weekKeyFor(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}
