"use client";

import Link from "next/link";
import { useState } from "react";
import { lastPlace } from "@/core/well/bible";
import { TODAY } from "@/core/well/today";
import { pickForDay } from "@/convex/reCentered/pure";
import { Card, PageTitle } from "@/core/ui";
import { Passage } from "../components/Passage";

/**
 * Today: one small thing, whenever you open it. Chosen by the day. It never
 * says how long it has been, because that is not the point.
 */
export function Today() {
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const [place] = useState(() => lastPlace());
  const entry = pickForDay(TODAY, day)!;
  const [full, setFull] = useState(false);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Today" subtitle="One small thing. Two minutes is plenty; the rest is there if you want it." />
      <Card>
        <Passage r={entry.ref} />
      </Card>
      <Card tone="alt">
        <p className="well-did">
          <strong>What Jesus did here:</strong> {entry.did}
        </p>
        {full ? (
          <p className="mt-3">
            <strong>To carry today:</strong> {entry.question}
          </p>
        ) : (
          <p className="mt-3">
            <button type="button" className="sh-link" onClick={() => setFull(true)}>A question to carry, if you want one</button>
          </p>
        )}
      </Card>
      <p className="sh-hint">
        {place ? (
          <>
            Pick up where you left off: <Link href={`/the-well/bible/${place.book}/${place.chapter}`} className="sh-link">{place.book.replace(/-/g, " ")} {place.chapter}</Link>. Or
          </>
        ) : (
          "Or"
        )}{" "}
        open the <Link href="/the-well/bible" className="sh-link">Bible</Link>, or the <Link href="/the-well/ways" className="sh-link">Ways of Jesus</Link>.
      </p>
    </div>
  );
}
