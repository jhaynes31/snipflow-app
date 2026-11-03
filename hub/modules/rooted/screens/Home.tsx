"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { leanOf, readRootedSettings } from "@/convex/rooted/pure";
import { pickForDay } from "@/convex/reCentered/pure";
import { ANCHORS, WELCOME } from "@/core/rooted/content";
import { useHub } from "@/core/shell/HubContext";
import { Note, PageTitle, timeAgo } from "@/core/ui";

export function Home() {
  const { profile } = useHub();
  const checks = useQuery(api.rooted.entries.checks);
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const anchor = pickForDay(ANCHORS, day);
  const settings = readRootedSettings(profile.moduleSettings);
  const last = checks?.[0];
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Rooted" subtitle="Earned security: knowing your pattern, choosing your people." />
      <p className="rt-line">{WELCOME}</p>
      {anchor && (
        <div className="rt-faith">
          <strong>{anchor.ref}</strong>
          {anchor.plain}
        </div>
      )}
      <div className="sh-tiles">
        <Link href="/rooted/learn" className="sh-tile"><span className="sh-tile-name">Learn</span><span className="sh-tile-tagline">The four styles, the trap, and earned security.</span></Link>
        <Link href="/rooted/today" className="sh-tile"><span className="sh-tile-name">Where I am today</span><span className="sh-tile-tagline">{last ? `Last read ${timeAgo(last.createdAt)}, leaning ${leanOf(last)}.` : "A short read, repeated whenever you like."}</span></Link>
        <Link href="/rooted/secure" className="sh-tile"><span className="sh-tile-name">Becoming secure</span><span className="sh-tile-tagline">Protest behaviors with the secure move beside each, practices, scripts.</span></Link>
        <Link href="/rooted/read" className="sh-tile"><span className="sh-tile-name">The avoidant read</span><span className="sh-tile-tagline">Early tells, their fair exceptions, and what to watch by when.</span></Link>
        <Link href="/rooted/fail-safes" className="sh-tile"><span className="sh-tile-name">My fail safes</span><span className="sh-tile-tagline">{settings.vow || settings.tripwires.length ? "Your vow and tripwires, ready to be read back." : "Write them on a calm day."}</span></Link>
        <Link href="/rooted/people" className="sh-tile"><span className="sh-tile-name">The map of past people</span><span className="sh-tile-tagline">What each cost, what each taught.</span></Link>
        <Link href="/rooted/talk" className="sh-tile"><span className="sh-tile-name">Talk it through</span><span className="sh-tile-tagline">The coach, with all of this in hand.</span></Link>
      </div>
      <Note>Private to you. Nothing here is counted or scored, and nothing reaches the other one of you. When you write about someone in <Link href="/love-and-release/circle" className="sh-link">Someone in my circle</Link>, the coach reads it against the early tells and your tripwires.</Note>
    </div>
  );
}
