"use client";

import { CHARTER, CHARTER_INTRO } from "@/core/metamorphosis/charter";
import { Card, PageTitle } from "@/core/ui";

export function Charter() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Charter" subtitle="What a father gives, and what this room will try to give. Hold it to this." />
      <Card>
        <p>{CHARTER_INTRO}</p>
        <div className="mm-charter mt-3">
          <div className="mm-charter-row" style={{ borderTop: "none" }}>
            <span className="sh-eyebrow">What a father gives</span>
            <span className="sh-eyebrow">Where this room does it</span>
          </div>
          {CHARTER.map((c, i) => (
            <div key={i} className="mm-charter-row">
              <p><strong>{c.gives}</strong></p>
              <p>{c.here}</p>
            </div>
          ))}
        </div>
        <p className="sh-hint mt-3">Some of these places arrive in the next two builds. The list is the promise.</p>
      </Card>
    </div>
  );
}
