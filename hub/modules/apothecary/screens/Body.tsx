"use client";

import { AREAS } from "@/convex/apothecary/pure";
import { Card, Note, PageTitle } from "@/core/ui";

/** The body map: twenty places, the meridian that runs there, and what the traditions say it holds. */
export function Body() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The body, by tradition" subtitle="Chinese medicine and somatic work, place by place. Offered as a way of listening, never as a verdict." />
      {AREAS.map((a) => (
        <Card key={a.key}>
          <h2 className="sh-h2">{a.name}</h2>
          <p className="sh-muted">{a.meridian}</p>
          <p>{a.holds}</p>
        </Card>
      ))}
      <Note>The body keeps what the mind set down. That doesn&apos;t make a swollen calf a metaphor; it means both can be true, and the plumbing gets checked first.</Note>
    </div>
  );
}
