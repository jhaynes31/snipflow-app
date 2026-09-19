"use client";

import { SOURCES } from "@/core/crossroads/places";
import { Card, PageTitle } from "@/core/ui";

export function Sources() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Sources" subtitle="The ratings in Places are starting points. These are where the real numbers live. Check them before any decision that costs money." />
      <Card>
        {SOURCES.map((s) => (
          <p key={s.name} className="cr-entry"><strong>{s.name}.</strong> {s.what} <a className="sh-link" href={s.url} target="_blank" rel="noreferrer">{s.url.replace("https://", "")}</a></p>
        ))}
      </Card>
      <Card tone="alt">
        <p className="sh-muted">Two more that matter: an expat tax preparer before you go, and two or three people who actually live where you&apos;re looking. An afternoon with either is worth more than any index.</p>
      </Card>
    </div>
  );
}
