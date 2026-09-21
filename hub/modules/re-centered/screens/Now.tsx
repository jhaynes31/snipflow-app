"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { pickForDay, WHERE_LABEL } from "@/convex/reCentered/pure";
import { personFromName, readPersonSetting } from "@/core/person";
import { useHub } from "@/core/shell/HubContext";
import { Card, PageTitle, Spinner, timeAgo } from "@/core/ui";

const TOOLS = [
  { href: "/love-and-release/john/whose", name: "Whose is this?", line: "Something landed. Sort it: mine, theirs, or not mine at all." },
  { href: "/love-and-release/john/pause", name: "The pause before rescuing", line: "Four questions before I step in." },
  { href: "/love-and-release/john/landed", name: "Let it land", line: "I didn't fix it. Write that down." },
  { href: "/love-and-release/john/security", name: "Where I stand today", line: "One tap: where my security is sitting." },
];

/** The front room: my own words first, then the four tools, then one way back into my own life. */
export function Now() {
  const { profile, partner } = useHub();
  const partnerName = partner?.displayName ?? "My partner";
  const now = useQuery(api.reCentered.entries.now);
  if (!now) return <Spinner />;
  // The rest of Re-Centered (the app) keeps its data on this device, per person.
  const who = readPersonSetting(profile.moduleSettings, "love-and-release") ?? personFromName(profile.displayName) ?? "her";
  const lr = (path: string) => `/love-and-release/app/${path}?who=${who}`;
  const wayBack = pickForDay(now.ownLife, now.today);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={`${partnerName}, and me`} subtitle="Your own ground. Nothing here is about anyone else's behavior; it's about where you stand." />
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
            <Link href="/love-and-release/john/own-life" className="sh-link">My own life</Link> is empty for now. When you add the things that are yours, one shows here each day.
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
            <p className="sh-muted">You haven&apos;t written your if-then plan yet. <Link href="/love-and-release/john/boundaries" className="sh-link">Write it</Link> when you&apos;re steady, and it will be here next time.</p>
          )}
        </Card>
      )}
      {!now.wordNotKept && now.settings.ifThen && (
        <Card className="rc-quote">
          <p className="sh-eyebrow">If a word isn&apos;t kept, then I will…</p>
          <p>{now.settings.ifThen}</p>
        </Card>
      )}
      <Card tone="alt">
        <p className="sh-eyebrow">In the rest of Re-Centered</p>
        <div className="sh-choices">
          <a href={lr("fawn")} className="sh-btn sh-btn-secondary">Fawn alarm</a>
          <a href={lr("unhooked/loop")} className="sh-btn sh-btn-secondary">I&apos;m in a loop</a>
          <a href={lr("pause")} className="sh-btn sh-btn-secondary">A breathing pause</a>
          <a href={lr("boundaries")} className="sh-btn sh-btn-ghost">Boundaries with anyone</a>
          <Link href="/renewed-mind/captive" className="sh-btn sh-btn-secondary">Take It Captive</Link>
          <Link href="/talk?place=love-and-release" className="sh-btn sh-btn-ghost">Talk it through</Link>
        </div>
      </Card>
    </div>
  );
}
