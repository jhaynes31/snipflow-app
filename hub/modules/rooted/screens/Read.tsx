"use client";

import Link from "next/link";
import { TELLS, WATCH_TIMELINE } from "@/core/rooted/content";
import { Card, Note, PageTitle } from "@/core/ui";

const WINDOW_LABEL = { weeks: "Shows in the first weeks", months: "Shows in the first months", later: "Shows by three to six months" } as const;

export function Read() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="The avoidant read" subtitle="Early tells, each with its fair exception and what a secure person does instead. One sighting is data. Two or three is a pattern. A hard line is a decision." />
      <Note>
        This is not for diagnosing anyone, and it is not a verdict on their worth. It is for your time and your heart: so the pattern is named in week three instead of year three. Write what you see in <Link href="/love-and-release/circle" className="sh-link">Someone in my circle</Link> and the coach reads it against this list and your <Link href="/rooted/fail-safes" className="sh-link">tripwires</Link>.
      </Note>
      {(["weeks", "months", "later"] as const).map((w) => (
        <Card key={w}>
          <h2 className="sh-h2">{WINDOW_LABEL[w]}</h2>
          {TELLS.filter((t) => t.window === w).map((t) => (
            <details key={t.key} className="rt-tell rt-entry">
              <summary>{t.name}</summary>
              <p><strong>Looks like:</strong> {t.looksLike}</p>
              <p><strong>The fair exception:</strong> {t.exception}</p>
              <p><strong>What secure looks like instead:</strong> {t.secure}</p>
            </details>
          ))}
        </Card>
      ))}
      <Card tone="alt">
        <h2 className="sh-h2">What to watch, by when</h2>
        {WATCH_TIMELINE.map((p) => (
          <div key={p.period} className="rt-entry">
            <h3 className="sh-h3">{p.period}</h3>
            <ul style={{ paddingLeft: "1.2rem", margin: "0.3rem 0" }}>{p.watch.map((w) => <li key={w}>{w}</li>)}</ul>
            <p><strong>You:</strong> {p.youDo}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
