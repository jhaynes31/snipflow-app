"use client";

import { CoachChat } from "@/core/coach/CoachChat";
import { AVAILABLE, BODY, COME_SIT, EQUIPPED, MARRIED, MOTHER_BLESSING, MOTHER_TEACHES, MOTHER_WORDS } from "@/core/hearth/mother";
import { Card, PageTitle } from "@/core/ui";
import { Passage } from "@/modules/the-well/components/Passage";
import { HEARTH } from "../Shell";
import { BlessingView, TeachCards, Tiles, TodaysWord } from "../Cards";

const M = `${HEARTH}/mother`;

export function MotherHome() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="The Mother's Table" subtitle="Strong, plainspoken, warm. Not the cardboard version. Come sit." />
      <TodaysWord eyebrow="She'd say" words={MOTHER_WORDS} />
      <Tiles items={[
        { href: `${M}/sit`, name: "Come sit", tagline: "Nothing to fix. Nurture, gentleness, tenderness, being tucked in." },
        { href: `${M}/ask`, name: "Ask her", tagline: "Advice, teaching, or a word. She notices how you are first." },
        { href: `${M}/teaches`, name: "What a mother teaches", tagline: "Home, hosting, cooking, doctors, friends, grief, seasons, rest, money, no, beauty, faith, flare days." },
        { href: `${M}/equipped`, name: "Equipped", tagline: "The women who were actually in the text. Deborah, Jael, Abigail, Ruth, Huldah, Esther, the woman of valor as written." },
        { href: `${M}/married`, name: "For my married daughter", tagline: "Truth, sex, money, fighting well, when he goes absent, submission honestly, staying yourself, delight." },
        { href: `${M}/available`, name: "The available woman", tagline: "Emotionally intelligent and available, Christian, strong. Grace and steel." },
        { href: `${M}/body`, name: "Her body", tagline: "A truce, feeding yourself, moving for joy, the mirror, clothes, kind touch, a body that's often sick, enough." },
        { href: `${HEARTH}/care`, name: "Her care shelf", tagline: "Skin, hygiene, hair, face and style. Step by step, seated, natural." },
        { href: `${M}/blessing`, name: "A blessing over you", tagline: "From the table. Read it aloud on any day." },
      ]} />
    </div>
  );
}

export function MotherAsk() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Ask her" subtitle="Practical when you want practical. Tender when you want tender. Both when it's both." />
      <CoachChat module="hearth" task="hearth.mother" placeholder="Mom, how do I…" />
    </div>
  );
}

export function ComeSit() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Come sit" subtitle="You don't have to say anything. If you want to, she's here." />
      <Card tone="alt">
        <CoachChat module="hearth" task="hearth.sit" placeholder="I'm tired. / I'm sick. / I just need to sit here a minute." />
      </Card>
      <TeachCards cards={COME_SIT} />
    </div>
  );
}

export function MotherTeaches() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="What a mother teaches" subtitle="The life skills a mother is supposed to hand down. Read in any order." />
      <TeachCards cards={MOTHER_TEACHES} />
    </div>
  );
}

export function Equipped() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Equipped" subtitle="The women who were actually in the text. The text first, then what she did, then what it says to a strong woman." />
      <div className="hh-cards">
        {EQUIPPED.map((w) => (
          <details key={w.key} className="sh-card hh-card">
            <summary>
              <span className="hh-card-title">{w.name}</span>
              <span className="hh-card-lead">{w.did}</span>
            </summary>
            <Passage r={w.ref} />
            <p className="hh-line mt-3"><strong>What she did:</strong> {w.did}</p>
            <p className="hh-line"><strong>What it says to you:</strong> {w.says}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function Married() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="For my married daughter" subtitle="Wife advice that aligns with the Word and doesn't water it down." />
      <TeachCards cards={MARRIED} />
    </div>
  );
}

export function Available() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="The available woman" subtitle="Emotionally intelligent, emotionally available, Christian, and not anybody's doormat." />
      <TeachCards cards={AVAILABLE} />
    </div>
  );
}

export function Body() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Her body" subtitle="Taking care of it and loving it, from the table. Never a word about size." />
      <TeachCards cards={BODY} />
    </div>
  );
}

export function MotherBlessing() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="A blessing over you" subtitle="From the Mother's Table. Read it out loud." />
      <BlessingView title="The Mother's blessing" subtitle="Written for you. Tell me if a line should change; it's yours." paragraphs={MOTHER_BLESSING} />
    </div>
  );
}
