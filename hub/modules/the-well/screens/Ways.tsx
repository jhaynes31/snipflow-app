"use client";

import Link from "next/link";
import { WAYS } from "@/core/well/ways";
import { Card, LinkBtn, PageTitle } from "@/core/ui";
import { Passage } from "../components/Passage";

/** The Ways of Jesus: his example by area of real life. */
export function Ways({ area }: { area?: string }) {
  const way = area ? WAYS.find((w) => w.key === area) : undefined;
  if (!way) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="The Ways of Jesus" subtitle="What he did and said, sorted by the life you're actually living. Not rules drawn from it. His example." />
        <div className="sh-tiles">
          {WAYS.map((w) => (
            <Link key={w.key} href={`/the-well/ways/${w.key}`} className="sh-tile">
              <span className="sh-tile-name">{w.title}</span>
              <span className="sh-tile-tagline">{w.line}</span>
            </Link>
          ))}
        </div>
        <p className="sh-hint">A first draft, written to be reviewed line by line by the two of you. Tell Claude what to change.</p>
      </div>
    );
  }
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={way.title} subtitle={way.line} action={<LinkBtn href="/the-well/ways" variant="ghost">All areas</LinkBtn>} />
      {way.passages.map((p, i) => (
        <Card key={i}>
          <p className="well-did">{p.note}</p>
          <div className="mt-3">
            <Passage r={p.ref} />
          </div>
        </Card>
      ))}
    </div>
  );
}
