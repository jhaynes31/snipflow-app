"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { areaName } from "@/convex/apothecary/pure";
import { Card, Note, PageTitle, Spinner } from "@/core/ui";

/** Patterns: which daily factors show up on the days a place hurts, far more than usual. Plain ratios, in words. */
export function Patterns() {
  const data = useQuery(api.apothecary.entries.patternLines);
  if (!data) return <Spinner />;
  const areas = Object.entries(data.byArea).sort((a, b) => b[1] - a[1]);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Patterns" subtitle="What tends to come before what. This is how POTS, hypermobility and MCAS actually get sorted: not by one answer, by months of small ones." />
      <Card>
        <p className="sh-muted">{data.entries} entries across {data.days} logged days.</p>
        {data.lines.length === 0 ? (
          <p>{data.days < 5 ? "Five logged days and three entries for a place is where lines start to show. Keep tapping the daily line." : "No factor stands out yet. That's information too: keep logging, and add factors of your own in your words in an entry."}</p>
        ) : (
          data.lines.map((l) => <p key={`${l.area}-${l.factor}`} className="ap-entry">{l.text}</p>)
        )}
      </Card>
      {areas.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Where it shows up</h2>
          {areas.map(([k, n]) => <p key={k}>{areaName(k)}: {n} {n === 1 ? "entry" : "entries"}</p>)}
        </Card>
      )}
      <Note>
        Bring these lines to whoever eventually runs the blood work; they are worth more than a single visit&apos;s story. The <Link href="/apothecary/conditions" className="sh-link">Conditions</Link> page has the home checks that turn a guess into a number.
      </Note>
    </div>
  );
}
