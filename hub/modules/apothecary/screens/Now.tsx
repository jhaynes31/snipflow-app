"use client";

import Link from "next/link";
import { RED_FLAGS } from "@/convex/apothecary/pure";
import { Card, Note, PageTitle } from "@/core/ui";

/** The ten-second answer to "am I dying?": the signs that mean now, and the ones that mean today. Everything else means no. */
export function Now() {
  const now = RED_FLAGS.filter((r) => r.where === "now");
  const today = RED_FLAGS.filter((r) => r.where === "today");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Is this a now thing?" subtitle="If what's happening is on this page, act on it. If it isn't, it isn't a now thing, and you can breathe and go ask." />
      <Card>
        <h2 className="sh-h2">Now. Call 911 or go.</h2>
        {now.map((r) => (
          <div key={r.sign} className="ap-entry ap-now">
            <p><strong>{r.sign}</strong></p>
            <p className="sh-muted">{r.why}</p>
          </div>
        ))}
      </Card>
      <Card>
        <h2 className="sh-h2">Today. Urgent care, or the ER if it worsens.</h2>
        {today.map((r) => (
          <div key={r.sign} className="ap-entry ap-today">
            <p><strong>{r.sign}</strong></p>
            <p className="sh-muted">{r.why}</p>
          </div>
        ))}
      </Card>
      <Note>
        Not on this page: most pain, most swelling in both legs, most dizziness on standing, most racing hearts that settle when you lie down, most rashes, most fatigue, most brain fog. Those are the body talking, not the body failing. <Link href="/apothecary" className="sh-link">Ask</Link> about them. <Link href="/apothecary/where" className="sh-link">Where to go</Link> has the low-cost urgent care and the bill help for the ones that are on this page.
      </Note>
    </div>
  );
}
