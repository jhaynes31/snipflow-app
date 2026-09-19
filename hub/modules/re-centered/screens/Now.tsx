"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { pickForDay, WHERE_LABEL } from "@/convex/reCentered/pure";
import { Card, PageTitle, Spinner, timeAgo } from "@/core/ui";

const TOOLS = [
  { href: "/re-centered/whose", name: "Whose is this?", line: "Something landed. Sort it: mine, theirs, or not mine at all." },
  { href: "/re-centered/pause", name: "The pause before rescuing", line: "Four questions before I step in." },
  { href: "/re-centered/landed", name: "Let it land", line: "I didn't fix it. Write that down." },
  { href: "/re-centered/security", name: "Where I stand today", line: "One tap: where my security is sitting." },
];

/** The front room: my own words first, then the four tools, then one way back into my own life. */
export function Now() {
  const now = useQuery(api.reCentered.entries.now);
  if (!now) return <Spinner />;
  const wayBack = pickForDay(now.ownLife, now.today);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Re-Centered" subtitle="Your own ground. Nothing here is about anyone else's behavior; it's about where you stand." />
      {now.settings.boundaries && (
        <Card className="rc-quote">
          <p className="sh-eyebrow">What I will and won&apos;t do</p>
          <p>{now.settings.boundaries}</p>
        </Card>
      )}
      <div className="sh-tiles">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="sh-tile">
            <span className="sh-tile-name">{t.name}</span>
            <span className="sh-tile-tagline">{t.line}</span>
          </Link>
        ))}
      </div>
      {now.tappedToday && <p className="sh-muted">Today you marked: {WHERE_LABEL[now.tappedToday]}.</p>}
      {wayBack && (
        <Card tone="alt">
          <p className="sh-eyebrow">{now.hardDay ? "One way back into your own life" : "Yours, today"}</p>
          <p>
            <strong>{wayBack.area}:</strong> {wayBack.wayBackIn}
          </p>
        </Card>
      )}
      {!wayBack && (
        <Card tone="alt">
          <p className="sh-muted">
            <Link href="/re-centered/own-life" className="sh-link">My own life</Link> is empty for now. When you add the things that are yours, one shows here each day.
          </p>
        </Card>
      )}
      {now.wordNotKept && (
        <Card className="rc-quote">
          <p className="sh-eyebrow">A word wasn&apos;t kept, {timeAgo(now.wordNotKept)}</p>
          {now.settings.ifThen ? (
            <>
              <p className="sh-muted">Here is what you decided on a steady day:</p>
              <p>{now.settings.ifThen}</p>
            </>
          ) : (
            <p className="sh-muted">You haven&apos;t written your if-then plan yet. <Link href="/re-centered/boundaries" className="sh-link">Write it</Link> when you&apos;re steady, and it will be here next time.</p>
          )}
        </Card>
      )}
      {!now.wordNotKept && now.settings.ifThen && (
        <Card className="rc-quote">
          <p className="sh-eyebrow">If a word isn&apos;t kept, then I will…</p>
          <p>{now.settings.ifThen}</p>
        </Card>
      )}
    </div>
  );
}
