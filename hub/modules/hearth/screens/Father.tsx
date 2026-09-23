"use client";

import Link from "next/link";
import { CoachChat } from "@/core/coach/CoachChat";
import { FATHER_BLESSING, FATHER_TEACHES, FATHER_WORDS, IN_HIS_EYES } from "@/core/hearth/father";
import { CrisisCard } from "@/core/safety/CrisisNotice";
import { Card, Note, PageTitle } from "@/core/ui";
import { HEARTH } from "../Shell";
import { BlessingView, TeachCards, Tiles, TodaysWord } from "../Cards";

const F = `${HEARTH}/father`;

export function FatherHome() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="The Father's chair" subtitle="Steady, proud of you, on your side before he has the whole story." />
      <TodaysWord eyebrow="He'd say" words={FATHER_WORDS} />
      <Tiles items={[
        { href: `${F}/ask`, name: "Ask him", tagline: "A father's take, plainly and briefly." },
        { href: `${F}/told`, name: "Tell him what happened", tagline: "He listens first. Then he says the protective thing." },
        { href: `${F}/eyes`, name: "In his eyes", tagline: "The opposite of everything that was said about your body." },
        { href: `${F}/teaches`, name: "What a father teaches", tagline: "Money, cars, men, standing your ground, negotiating, fixing things, staying safe." },
        { href: `${F}/blessing`, name: "A blessing over you", tagline: "Read it aloud on any day." },
      ]} />
    </div>
  );
}

export function FatherAsk() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Ask him" subtitle="Anything. He'll affirm first, then answer straight." />
      <CoachChat module="hearth" task="hearth.father" placeholder="Dad, what do you think about…" />
    </div>
  );
}

export function FatherTold() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Tell him what happened" subtitle="He listens. He doesn't fix unless you ask. He is on your side." />
      <CoachChat module="hearth" task="hearth.told" placeholder="So here's what happened…" />
    </div>
  );
}

export function InHisEyes() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="In his eyes" subtitle="What a father should have said about your body, your face, and you. Read one, or read them all. Or tell him what the mirror said today." />
      <Card>
        <div className="hh-shelf">{IN_HIS_EYES.map((l, i) => <p key={i} className="hh-line">{l}</p>)}</div>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h3">Tell him what the mirror said</h2>
        <p className="sh-muted">Or what he said, once, if you want to. You don&apos;t have to. Whatever you write, he answers with the truth.</p>
        <CoachChat module="hearth" task="hearth.eyes" placeholder="Today I looked in the mirror and…" />
      </Card>
      <Note>He will never mention your weight, size or shape, and never suggest changing anything about your body. That&apos;s a rule, not a mood.</Note>
      <CrisisCard />
      <p className="sh-muted"><Link href="/help-now" className="sh-link">Need help now</Link> is always one tap away.</p>
    </div>
  );
}

export function FatherTeaches() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="What a father teaches" subtitle="Practical, protective, plain. Read in any order. Nothing is assigned." />
      <TeachCards cards={FATHER_TEACHES} />
    </div>
  );
}

export function FatherBlessing() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="A blessing over you" subtitle="From the Father's chair. Read it out loud, or have John read it to you." />
      <BlessingView title="The Father's blessing" subtitle="Written for you. Tell me if a line should change; it's yours." paragraphs={FATHER_BLESSING} />
    </div>
  );
}
