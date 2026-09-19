"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { STREAM_LABEL, VOICE } from "@/core/metamorphosis/voice";
import { sessionZero } from "@/core/metamorphosis/sheet";
import { pickForDay } from "@/convex/reCentered/pure";
import { Card, LinkBtn, PageTitle, Spinner } from "@/core/ui";
import { Passage } from "@/modules/the-well/components/Passage";
import { SurvivalCheck } from "./Mirror";

/** The front room: survival first, then the Father's Voice, then Session Zero if it isn't done. */
export function Home() {
  const mirror = useQuery(api.metamorphosis.entries.mirrorToday);
  const sheet = useQuery(api.metamorphosis.entries.sheet);
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const entry = pickForDay(VOICE, day)!;
  if (!mirror || !sheet) return <Spinner />;
  const name = sheet.find((s) => s.key === "name")?.text.trim();
  const zeroLeft = sessionZero().filter((q) => !sheet.some((s) => s.key === q.key && s.text.trim()));
  const checkedToday = mirror.todays !== null;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={name ? `Welcome back, ${name}.` : "Welcome."} subtitle="Yours. No one else reads this. Nothing in here is counted." />
      {!checkedToday && <SurvivalCheck compact />}
      <Card>
        <p className="sh-eyebrow">The Father&apos;s Voice · {STREAM_LABEL[entry.stream]}</p>
        <Passage r={entry.ref} actions={false} />
        <p className="mm-line mt-3">{entry.line}</p>
        <p className="sh-hint">
          A different one each day. Never tied to yesterday. Religion&apos;s version of any of these can go on the table in <Link href="/the-well/untangle" className="sh-link">Untangle</Link>.
        </p>
      </Card>
      {zeroLeft.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Session Zero</h2>
          <p className="sh-muted">Who is this character? {zeroLeft.length === sessionZero().length ? "Five questions, in your words, whenever you like." : `${zeroLeft.length} left, no rush.`}</p>
          <LinkBtn href="/metamorphosis/sheet" variant="secondary">Open the Character Sheet</LinkBtn>
        </Card>
      )}
      <div className="sh-tiles">
        <Link href="/metamorphosis/mirror" className="sh-tile"><span className="sh-tile-name">The Mirror</span><span className="sh-tile-tagline">Name it. What&apos;s under it. What do I want.</span></Link>
        <Link href="/metamorphosis/map" className="sh-tile"><span className="sh-tile-name">The Map</span><span className="sh-tile-tagline">Zoom out from the one thing.</span></Link>
        <Link href="/metamorphosis/knowing" className="sh-tile"><span className="sh-tile-name">Getting to know him</span><span className="sh-tile-tagline">One story of Jesus at a time. Relationship, not religion.</span></Link>
        <Link href="/metamorphosis/landing" className="sh-tile"><span className="sh-tile-name">The Landing</span><span className="sh-tile-tagline">Say it however it comes out. Heard, not fixed.</span></Link>
        <Link href="/metamorphosis/scout" className="sh-tile"><span className="sh-tile-name">The Scout</span><span className="sh-tile-tagline">Notice first. Move before anyone asks.</span></Link>
        <Link href="/metamorphosis/tired" className="sh-tile"><span className="sh-tile-name">Do It Tired</span><span className="sh-tile-tagline">The plan is the plan. Two minutes, tired.</span></Link>
        <Link href="/metamorphosis/shield" className="sh-tile"><span className="sh-tile-name">Shield Down</span><span className="sh-tile-tagline">Three sentences for the next hard conversation.</span></Link>
        <Link href="/metamorphosis/quests" className="sh-tile"><span className="sh-tile-name">Quest Log</span><span className="sh-tile-tagline">One main quest at a time.</span></Link>
        <Link href="/metamorphosis/iron" className="sh-tile"><span className="sh-tile-name">Iron</span><span className="sh-tile-tagline">Your word to yourself. Only this room asks.</span></Link>
        <Link href="/metamorphosis/compass" className="sh-tile"><span className="sh-tile-name">The Compass</span><span className="sh-tile-tagline">One thing you&apos;ll lead this week.</span></Link>
        <Link href="/metamorphosis/seen" className="sh-tile"><span className="sh-tile-name">Seen</span><span className="sh-tile-tagline">One small chosen act of being seen.</span></Link>
        <Link href="/metamorphosis/actually" className="sh-tile"><span className="sh-tile-name">Actually</span><span className="sh-tile-tagline">What you really did, caught from your own logs.</span></Link>
        <Link href="/metamorphosis/present" className="sh-tile"><span className="sh-tile-name">Present</span><span className="sh-tile-tagline">One way you were here. One thing you fought for.</span></Link>
        <Link href="/metamorphosis/no-condemnation" className="sh-tile"><span className="sh-tile-name">No Condemnation</span><span className="sh-tile-tagline">Conviction or shame? Here&apos;s the difference.</span></Link>
        <Link href="/metamorphosis/origins" className="sh-tile"><span className="sh-tile-name">Where This Came From</span><span className="sh-tile-tagline">The survival story, told straight.</span></Link>
        <Link href="/metamorphosis/party" className="sh-tile"><span className="sh-tile-name">The Party</span><span className="sh-tile-tagline">Where men like you are, and how it goes.</span></Link>
        <Link href="/metamorphosis/men" className="sh-tile"><span className="sh-tile-name">Men in the Story</span><span className="sh-tile-tagline">Joseph, Boaz, Peter. Aragorn, Sam, Faramir.</span></Link>
        <Link href="/metamorphosis/horizon" className="sh-tile"><span className="sh-tile-name">The Horizon</span><span className="sh-tile-tagline">Dreams back. Nothing becomes a task.</span></Link>
        <Link href="/metamorphosis/small-ways" className="sh-tile"><span className="sh-tile-name">Small Ways</span><span className="sh-tile-tagline">Things a father teaches. One a day.</span></Link>
        <Link href="/metamorphosis/builder" className="sh-tile"><span className="sh-tile-name">The Builder</span><span className="sh-tile-tagline">One business action a day.</span></Link>
        <Link href="/metamorphosis/blessing" className="sh-tile"><span className="sh-tile-name">The Blessing</span><span className="sh-tile-tagline">The thing fathers give.</span></Link>
        <Link href="/metamorphosis/letters" className="sh-tile"><span className="sh-tile-name">Letters</span><span className="sh-tile-tagline">From the mentor, once a month.</span></Link>
      </div>
      <p className="sh-hint">
        Resources across The Shire, one direction only: <Link href="/tend/tools" className="sh-link">Tend&apos;s tools</Link>, <Link href="/the-well/for-me" className="sh-link">For me, as a man and husband</Link>, <Link href="/kept-word/ways" className="sh-link">Ways to show up</Link>. None of them can see in here.
      </p>
    </div>
  );
}
