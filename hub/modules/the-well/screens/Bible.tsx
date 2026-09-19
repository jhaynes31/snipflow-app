"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rememberPlace, useBibleIndex, useBook } from "@/core/well/bible";
import { guideFor } from "@/core/well/books";
import { GLOSSARY } from "@/core/well/glossary";
import { refHref } from "@/core/well/refs";
import { CoachChat } from "@/core/coach/CoachChat";
import { Btn, Card, LinkBtn, PageTitle, Spinner } from "@/core/ui";
import { PassageActions } from "../components/Passage";

/** The book list. Old and New, plain names, and where to start if you're new. */
export function Books() {
  const index = useBibleIndex();
  if (!index) return <Spinner label="Opening the Bible" />;
  const old = index.books.filter((b) => b.testament === "old");
  const nw = index.books.filter((b) => b.testament === "new");
  return (
    <div className="sh-container">
      <PageTitle title="The Bible" subtitle={`${index.translation}. Every book has a "Where am I?" card so you're never lost.`} />
      <Card tone="alt">
        <p>
          New to it, or coming back after a long time? Start with <Link href="/the-well/bible/mark" className="sh-link">Mark</Link>, the shortest Gospel. Churchy words are explained in the <Link href="/the-well/bible/glossary" className="sh-link">plain-words glossary</Link>.
        </p>
      </Card>
      <h2 className="sh-h2">New Testament</h2>
      <div className="well-books">
        {nw.map((b) => (
          <Link key={b.slug} href={`/the-well/bible/${b.slug}`}>{b.name}</Link>
        ))}
      </div>
      <h2 className="sh-h2 mt-6">Old Testament</h2>
      <div className="well-books">
        {old.map((b) => (
          <Link key={b.slug} href={`/the-well/bible/${b.slug}`}>{b.name}</Link>
        ))}
      </div>
    </div>
  );
}

/** One book: the "Where am I?" card and its chapters. */
export function Book({ slug }: { slug: string }) {
  const book = useBook(slug);
  const guide = guideFor(slug);
  if (book === null) return <Spinner label="Opening the book" />;
  if (book === "missing") {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>That book isn&apos;t here.</p>
          <LinkBtn href="/the-well/bible" variant="ghost">All books</LinkBtn>
        </Card>
      </div>
    );
  }
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={book.name} action={<LinkBtn href="/the-well/bible" variant="ghost">All books</LinkBtn>} />
      {guide && (
        <Card>
          <p className="sh-eyebrow">Where am I?</p>
          <p><strong>Who:</strong> {guide.who}</p>
          <p><strong>To whom:</strong> {guide.toWhom}</p>
          <p><strong>Why:</strong> {guide.why}</p>
          <p><strong>Jesus:</strong> {guide.jesus}</p>
          <p className="mt-3">
            <Link href={refHref(guide.start)} className="sh-link">A good place to start: chapter {guide.start.chapter}</Link>
          </p>
        </Card>
      )}
      <div className="well-chapters" aria-label="Chapters">
        {book.chapters.map((_, i) => (
          <Link key={i} href={`/the-well/bible/${slug}/${i + 1}`}>{i + 1}</Link>
        ))}
      </div>
    </div>
  );
}

/** One chapter, verse by verse, with read-aloud, marking, and asking. */
export function Chapter({ slug, chapter }: { slug: string; chapter: number }) {
  const book = useBook(slug);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (book && book !== "missing") rememberPlace(slug, chapter);
  }, [book, slug, chapter]);
  if (book === null) return <Spinner label="Opening the chapter" />;
  if (book === "missing" || !book.chapters[chapter - 1]) {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>That chapter isn&apos;t here.</p>
          <LinkBtn href="/the-well/bible" variant="ghost">All books</LinkBtn>
        </Card>
      </div>
    );
  }
  const verses = book.chapters[chapter - 1];
  const label = `${book.name} ${chapter}`;
  const text = verses.join(" ");
  const opening = `Passage (Berean Standard Bible), ${label}:\n${verses.map((v, i) => `${i + 1} ${v}`).join("\n")}`;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={label} action={<LinkBtn href={`/the-well/bible/${slug}`} variant="ghost">{book.name}</LinkBtn>} />
      <Card>
        <p className="well-passage">
          {verses.map((v, i) => (
            <span key={i} id={`v${i + 1}`} className="well-verse">
              <sup>{i + 1}</sup>
              {v}{" "}
            </span>
          ))}
        </p>
        <PassageActions r={{ book: slug, chapter }} label={label} text={text} />
      </Card>
      <div className="sh-row sh-wrap">
        {chapter > 1 && <LinkBtn href={`/the-well/bible/${slug}/${chapter - 1}`} variant="secondary">Chapter {chapter - 1}</LinkBtn>}
        {chapter < book.chapters.length && <LinkBtn href={`/the-well/bible/${slug}/${chapter + 1}`} variant="secondary">Chapter {chapter + 1}</LinkBtn>}
        <Btn variant={asking ? "ghost" : "primary"} onClick={() => setAsking(!asking)}>{asking ? "Close the question box" : "Ask about this passage"}</Btn>
      </div>
      {asking && <CoachChat module="the-well" task="well.passage" opening={opening} placeholder="What's going on here? Who is he talking to? What does this word mean?" />}
    </div>
  );
}

export function Glossary() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Plain words" subtitle="Churchy words, explained once, without the weight." action={<LinkBtn href="/the-well/bible" variant="ghost">All books</LinkBtn>} />
      <Card>
        {GLOSSARY.map((g) => (
          <div key={g.term} className="well-entry">
            <p>
              <strong>{g.term}.</strong> {g.plain}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}
