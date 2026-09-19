"use client";

import Link from "next/link";
import { useState } from "react";
import { CHARTER, CHARTER_INTRO, HEADER } from "@/core/metamorphosis/charter";
import { KNOWING } from "@/core/metamorphosis/knowing";
import { SURVIVAL_SIGNS, WAY_BACK } from "@/core/metamorphosis/mirror";
import { sessionZero } from "@/core/metamorphosis/sheet";
import { MEN_IN_STORY, PARTY_STEPS, SMALL_WAYS } from "@/core/metamorphosis/step3";
import { STREAM_LABEL, VOICE } from "@/core/metamorphosis/voice";
import { pickForDay } from "@/convex/reCentered/pure";
import { Card, LinkBtn, PageTitle } from "@/core/ui";
import { Passage } from "@/modules/the-well/components/Passage";

const PLACES: { name: string; line: string }[] = [
  { name: "Home", line: "Survival first, then the Father's Voice, then whatever he wants." },
  { name: "The Mirror", line: "Name it. What's under it. Body. What do I want." },
  { name: "Character Sheet", line: "Who is this character, one question at a time. He picks what the mentor may read." },
  { name: "The Map", line: "Zoom out from the one thing, level by level." },
  { name: "Getting to know him", line: "One story of Jesus at a time. Relationship, not religion." },
  { name: "The Landing", line: "Vent to the mentor. Heard, not fixed." },
  { name: "The Scout", line: "Notice first. Move before anyone asks." },
  { name: "Do It Tired", line: "Two minutes, tired. The plan is the plan." },
  { name: "Shield Down", line: "Three sentences for the next hard conversation." },
  { name: "Quest Log", line: "One main quest at a time. Set down, never failed." },
  { name: "Iron", line: "His word to himself. Only the room asks. And: which older man did you talk to this week?" },
  { name: "The Compass", line: "One thing he'll lead this week. Where he's headed, in his words." },
  { name: "Seen", line: "One small chosen act of being seen." },
  { name: "Actually", line: "What he really did, caught from his own logs. Failure Check for the moment 'I failed' lands." },
  { name: "Present", line: "One way I was here. One thing I fought for." },
  { name: "No Condemnation", line: "Conviction or shame. Romans 8:1." },
  { name: "Where This Came From", line: "The survival story, told straight. Letters he won't send." },
  { name: "The Party", line: "Where men like him are, and how friendship actually goes." },
  { name: "Men in the Story", line: "Joseph, Boaz, Peter. Aragorn, Sam, Faramir." },
  { name: "The Horizon", line: "Dreams back. Nothing becomes a task." },
  { name: "Small Ways", line: "Things a father teaches. One a day." },
  { name: "The Builder", line: "One business action a day." },
  { name: "The Blessing", line: "Scripture blessings any day, and yours, sealed until he opens them." },
  { name: "Letters", line: "A letter from the mentor on the 1st of each month." },
  { name: "For my therapist", line: "Read-only links to sections he picks, with an expiry." },
  { name: "The Charter", line: "What a father gives, and what this room will try to give." },
];

/**
 * A look around without claiming. Every place named, the words and the
 * content shown, nothing saved. The real room is the same layout with his
 * own entries in it.
 */
export function Tour() {
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const voice = pickForDay(VOICE, day)!;
  return (
    <div className="mm">
      <header className="sh-card mm-header">
        <p className="mm-header-verse">{HEADER.verse} <span className="sh-muted">{HEADER.ref}</span></p>
        <p className="mm-header-note">{HEADER.note}</p>
      </header>
      <div className="sh-container sh-narrow">
        <PageTitle title="A look around" subtitle="This is the room as the person who claims it will see it, minus their own entries. Nothing on this page saves anything." action={<LinkBtn href="/metamorphosis" variant="ghost">Back</LinkBtn>} />
        <Card>
          <p className="sh-eyebrow">The first thing on every visit</p>
          <p className="mm-line"><strong>Right now, am I in survival?</strong></p>
          <ul className="sh-list sh-muted">{SURVIVAL_SIGNS.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="sh-hint mt-3">If yes, everything else waits and The Way Back appears:</p>
          <ol className="sh-list">{WAY_BACK.map((w, i) => <li key={i} className="mm-entry"><strong>{i + 1}. {w.step}</strong><br /><span className="sh-muted">{w.why}</span></li>)}</ol>
        </Card>
        <Card>
          <p className="sh-eyebrow">The Father&apos;s Voice · {STREAM_LABEL[voice.stream]}</p>
          <Passage r={voice.ref} actions={false} />
          <p className="mm-line mt-3">{voice.line}</p>
        </Card>
        <Card>
          <h2 className="sh-h2">Session Zero</h2>
          <p className="sh-muted">The first handful of Character Sheet questions:</p>
          {sessionZero().map((q) => <p key={q.key} className="mm-entry"><strong>{q.label}</strong><br /><span className="sh-muted">{q.hint}</span></p>)}
        </Card>
        <Card>
          <h2 className="sh-h2">Every place in the room</h2>
          {PLACES.map((p) => <p key={p.name} className="mm-entry"><strong>{p.name}.</strong> {p.line}</p>)}
        </Card>
        <Card>
          <h2 className="sh-h2">The Charter</h2>
          <p>{CHARTER_INTRO}</p>
          {CHARTER.map((c, i) => <p key={i} className="mm-entry"><strong>{c.gives}</strong><br />{c.here}</p>)}
        </Card>
        <Card>
          <h2 className="sh-h2">A few of the words</h2>
          <p className="sh-eyebrow">Getting to know him</p>
          {KNOWING.slice(0, 3).map((k) => <p key={k.key} className="mm-entry"><strong>{k.title}.</strong> {k.shows} <span className="sh-muted">&ldquo;{k.toYou}&rdquo;</span></p>)}
          <p className="sh-eyebrow mt-3">The Party, how it goes</p>
          {PARTY_STEPS.slice(0, 3).map((s) => <p key={s.title} className="mm-entry"><strong>{s.title}</strong> {s.body}</p>)}
          <p className="sh-eyebrow mt-3">Small Ways</p>
          {SMALL_WAYS.slice(0, 3).map((s) => <p key={s.title} className="mm-entry"><strong>{s.title}</strong> {s.body}</p>)}
          <p className="sh-eyebrow mt-3">Men in the Story</p>
          {MEN_IN_STORY.filter((m) => m.source === "story").slice(0, 3).map((m) => <p key={m.name} className="mm-entry"><strong>{m.name}.</strong> {m.line}</p>)}
        </Card>
        <p className="sh-hint">The whole room, in words, is in the spec at <code>hub/docs/metamorphose-spec.md</code>. <Link href="/metamorphosis" className="sh-link">Back to the door</Link>.</p>
      </div>
    </div>
  );
}
