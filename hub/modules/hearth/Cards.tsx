"use client";

import Link from "next/link";
import { useState } from "react";
import type { DailyWord, TeachCard } from "@/core/hearth/father";
import { pickForDay } from "@/convex/reCentered/pure";
import { Card } from "@/core/ui";
import { Passage } from "@/modules/the-well/components/Passage";

/** A stack of open-and-close cards. Nothing is tracked; read what you like. */
export function TeachCards({ cards }: { cards: TeachCard[] }) {
  return (
    <div className="hh-cards">
      {cards.map((c) => (
        <details key={c.key} className="sh-card hh-card">
          <summary>
            <span className="hh-card-title">{c.title}</span>
            <span className="hh-card-lead">{c.lead}</span>
          </summary>
          <ul>{c.body.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </details>
      ))}
    </div>
  );
}

/** One word for today, from a parent, never tied to yesterday. */
export function TodaysWord({ eyebrow, words }: { eyebrow: string; words: DailyWord[] }) {
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const w = pickForDay(words, day)!;
  return (
    <Card>
      <p className="sh-eyebrow">{eyebrow}</p>
      {w.ref && <div className="mt-2"><Passage r={w.ref} actions={false} /></div>}
      <p className="hh-word">{w.line}</p>
      <p className="sh-hint">A different one each day. Nothing here is counted.</p>
    </Card>
  );
}

export function BlessingView({ title, subtitle, paragraphs }: { title: string; subtitle: string; paragraphs: string[] }) {
  return (
    <Card>
      <p className="sh-eyebrow">{title}</p>
      <p className="sh-hint">{subtitle}</p>
      <div className="hh-blessing mt-3">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
    </Card>
  );
}

export function Tiles({ items }: { items: { href: string; name: string; tagline: string }[] }) {
  return (
    <div className="sh-tiles">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className="sh-tile">
          <span className="sh-tile-name">{t.name}</span>
          <span className="sh-tile-tagline">{t.tagline}</span>
        </Link>
      ))}
    </div>
  );
}
