"use client";

import { useEffect, useState } from "react";

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
let indexCache: Promise<BibleIndex> | null = null;

export function loadIndex(): Promise<BibleIndex> {
  if (!indexCache) indexCache = fetch("/bible/bsb/index.json").then((r) => r.json() as Promise<BibleIndex>);
  return indexCache;
}

export function loadBook(slug: string): Promise<BibleBook> {
  let p = bookCache.get(slug);
  if (!p) {
    p = fetch(`/bible/bsb/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error("That book isn't here.");
      return r.json() as Promise<BibleBook>;
    });
    bookCache.set(slug, p);
  }
  return p;
}

export function useBibleIndex(): BibleIndex | null {
  const [index, setIndex] = useState<BibleIndex | null>(null);
  useEffect(() => {
    let alive = true;
    void loadIndex().then((i) => alive && setIndex(i));
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

export function useBook(slug: string | null): BibleBook | null | "missing" {
  const [loaded, setLoaded] = useState<{ slug: string; book: BibleBook | "missing" } | null>(null);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    loadBook(slug)
      .then((b) => alive && setLoaded({ slug, book: b }))
      .catch(() => alive && setLoaded({ slug, book: "missing" }));
    return () => {
      alive = false;
    };
  }, [slug]);
  if (!slug) return "missing";
  return loaded?.slug === slug ? loaded.book : null;
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
