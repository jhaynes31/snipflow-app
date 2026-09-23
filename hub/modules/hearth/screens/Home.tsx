"use client";

import Link from "next/link";
import { useHub } from "@/core/shell/HubContext";
import { Card, Note, PageTitle } from "@/core/ui";
import { HEARTH } from "../Shell";
import { Tiles } from "../Cards";

/** The front room: two chairs by the fire, a table, and the small rooms off it. */
export function Home() {
  const { profile } = useHub();
  const first = profile.displayName.split(" ")[0];
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title={`Come in, ${first}.`} subtitle="You've been the parent for everyone for a long time. In here, you're the daughter. Sit down." />
      <Tiles items={[
        { href: `${HEARTH}/father`, name: "The Father's chair", tagline: "Steady, proud of you, on your side. Ask him, tell him what happened, in his eyes, what a father teaches." },
        { href: `${HEARTH}/mother`, name: "The Mother's Table", tagline: "Come sit. Advice, what a mother teaches, the women in the text, for my married daughter, her body, the care shelf." },
      ]} />
      <Tiles items={[
        { href: `${HEARTH}/know`, name: "What I know", tagline: "Your own lived wisdom, written down and kept ready for the ones who'll ask." },
        { href: `${HEARTH}/girl`, name: "The girl", tagline: "Five to seven. What she loved, what she needed to hear, letters both ways." },
        { href: `${HEARTH}/teen`, name: "The teenager", tagline: "Twelve to sixteen. What she was right about. Someone finally on her side." },
      ]} />
      <Note>
        Yours only. John can&apos;t open it. Nothing in here is counted, scored or compared. The two voices are honest that they aren&apos;t your parents; they&apos;re the voices you should have had. <Link href={`${HEARTH}/about`} className="sh-link">What this room is, and isn&apos;t</Link>.
      </Note>
      <Card>
        <p className="sh-muted">Coach conversations in here are private to you and can be deleted. <Link href="/talk?place=hearth" className="sh-link">Talk it through</Link> from anywhere in the room speaks in the mother&apos;s voice.</p>
      </Card>
    </div>
  );
}
