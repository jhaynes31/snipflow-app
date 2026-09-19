"use client";

import Link from "next/link";
import { useState } from "react";
import { KNOWING } from "@/core/metamorphosis/knowing";
import { CoachChat } from "@/core/coach/CoachChat";
import { Btn, Card, LinkBtn, PageTitle } from "@/core/ui";
import { Passage } from "@/modules/the-well/components/Passage";

/** Getting to know him: one story at a time, no order to keep. */
export function Knowing({ which }: { which?: string }) {
  const entry = which ? KNOWING.find((k) => k.key === which) : undefined;
  const [asking, setAsking] = useState(false);
  if (!entry) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Getting to know him" subtitle="Relationship, not religion. One story of Jesus at a time, in any order. Pick whichever one you want." />
        <div className="sh-tiles">
          {KNOWING.map((k) => (
            <Link key={k.key} href={`/metamorphosis/knowing/${k.key}`} className="sh-tile">
              <span className="sh-tile-name">{k.title}</span>
              <span className="sh-tile-tagline">{k.shows}</span>
            </Link>
          ))}
        </div>
        <p className="sh-hint">More in <Link href="/the-well" className="sh-link">The Well</Link>: Today, the Ways of Jesus, and the whole Bible with a guide.</p>
      </div>
    );
  }
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={entry.title} action={<LinkBtn href="/metamorphosis/knowing" variant="ghost">All stories</LinkBtn>} />
      <Card>
        <Passage r={entry.ref} />
      </Card>
      <Card tone="alt">
        <p><strong>What this shows about him:</strong> {entry.shows}</p>
        <p className="mt-3"><strong>What he&apos;d say to you here:</strong> &ldquo;{entry.toYou}&rdquo;</p>
      </Card>
      <Btn variant={asking ? "ghost" : "secondary"} onClick={() => setAsking(!asking)}>{asking ? "Close" : "Talk about him"}</Btn>
      {asking && <CoachChat module="metamorphosis" task="metamorphosis.knowing" opening={`The story we're looking at: ${entry.title}. What it shows: ${entry.shows}`} placeholder="Is he really like that? What about…" />}
    </div>
  );
}
