"use client";

import Link from "next/link";
import { WAYS } from "@/convex/orchard/pure";
import { Card, Note, PageTitle } from "@/core/ui";

/** How friendships get built, in small practical moves. For both of them. */
export function Ways() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Ways" subtitle="Small moves that build a friendship. None of them require being interesting." />
      {WAYS.map((w) => (
        <Card key={w.title}>
          <h2 className="sh-h2">{w.title}</h2>
          {w.lines.map((l) => <p key={l}>{l}</p>)}
        </Card>
      ))}
      <Note>
        Want these as steps for the week, with what actually happened afterward? Renewed Mind&apos;s <Link href="/renewed-mind/live" className="sh-link">Live It</Link> has a friendship set that files the outcome as evidence.
      </Note>
    </div>
  );
}
