"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, PageTitle, Spinner } from "@/core/ui";
import { VIEWS } from "../views";
import { JobLine } from "./Overview";

/** Every job, one view at a time, best first. */
export function Jobs() {
  const params = useSearchParams();
  const [view, setView] = useState(() => (VIEWS.some((v) => v.key === params.get("show")) ? params.get("show")! : "best"));
  const data = useQuery(api.lookout.data.jobs);
  if (!data) return <Spinner />;
  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const rows = data.jobs.filter(current.test).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.discoveredAt - a.discoveredAt);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Jobs" subtitle="Ranked only after the requirements. A high score never overrides a failed one." />
      <div className="sh-chips" role="tablist" aria-label="Which jobs">
        {VIEWS.map((v) => {
          const n = data.jobs.filter(v.test).length;
          return (
            <button key={v.key} type="button" role="tab" aria-selected={view === v.key} className={`sh-chip ${view === v.key ? "lo-chip-on" : ""}`} onClick={() => setView(v.key)}>
              {v.label} ({n})
            </button>
          );
        })}
      </div>
      <Card>
        {rows.length === 0 && <p className="sh-muted">Nothing here.</p>}
        {rows.map((j) => <JobLine key={j._id} j={j} />)}
      </Card>
    </div>
  );
}
