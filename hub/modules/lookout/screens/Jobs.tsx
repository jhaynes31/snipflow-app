"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, PageTitle, Spinner, useAction } from "@/core/ui";
import { VIEWS } from "../views";
import { JobLine } from "./Overview";
import { QuickApplied } from "../QuickApplied";

/** Every job, one view at a time, best first. */
export function Jobs() {
  const params = useSearchParams();
  const [view, setView] = useState(() => (VIEWS.some((v) => v.key === params.get("show")) ? params.get("show")! : "best"));
  const data = useQuery(api.lookout.data.jobs);
  const [find, setFind] = useState("");
  if (!data) return <Spinner />;
  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const words = find.trim().toLowerCase().split(/\s+/).filter(Boolean);
  // A search looks through every job, in every group, including earlier finds.
  const rows = (words.length ? data.jobs.filter((j) => words.every((w) => `${j.title} ${j.employer}`.toLowerCase().includes(w))) : data.jobs.filter(current.test)).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.discoveredAt - a.discoveredAt);

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
      <input className="sh-input mt-3" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find any job by title or company, including earlier finds" aria-label="Find a job" />
      {view === "earlier" && !words.length && <p className="sh-hint mt-3">Jobs moved out of the way by Refresh or Hide. Nothing here is deleted; bring any back, or save it, and it returns to the lists.</p>}
      <Card>
        {words.length > 0 && <p className="sh-hint">{rows.length} {rows.length === 1 ? "job matches" : "jobs match"} &quot;{find.trim()}&quot; across every group.</p>}
        {rows.length === 0 && <p className="sh-muted">Nothing here.</p>}
        {rows.map((j) => <JobRow key={j._id} j={j} />)}
      </Card>
    </div>
  );
}

/** One job in the list, with "I applied" and "Hide" right there. */
function JobRow({ j }: { j: Parameters<typeof JobLine>[0]["j"] & { status: string; askApplied: boolean; shelved: boolean } }) {
  const [open, setOpen] = useState(j.askApplied);
  const shelve = useMutation(api.lookout.data.setShelved);
  const { busy, error, run } = useAction();
  const before = ["new", "review", "saved", "preparing", "ready", "approved", "passed"].includes(j.status);
  const hideable = ["new", "review", "passed"].includes(j.status);
  return (
    <div className="lo-entry">
      <JobLine j={j} />
      {j.shelved && hideable && <p className="sh-hint">In earlier finds.</p>}
      {before && open ? (
        <div className="mt-3">
          {j.askApplied && <p className="sh-hint">You opened the application page. Did you apply?</p>}
          <QuickApplied jobId={j._id as Id<"loJobs">} onNotYet={j.askApplied} compact />
          {!j.askApplied && <button type="button" className="sh-link" onClick={() => setOpen(false)}>Cancel</button>}
        </div>
      ) : (
        <div className="sh-row sh-wrap mt-3">
          {before && <button type="button" className="sh-btn sh-btn-secondary" onClick={() => setOpen(true)}>I applied to this</button>}
          {hideable && (j.shelved
            ? <Btn variant="ghost" disabled={busy} onClick={() => void run(() => shelve({ jobId: j._id as Id<"loJobs">, shelved: false }))}>Bring it back</Btn>
            : <Btn variant="ghost" disabled={busy} onClick={() => void run(() => shelve({ jobId: j._id as Id<"loJobs">, shelved: true }))}>Hide</Btn>)}
        </div>
      )}
      <ErrorNote error={error} />
    </div>
  );
}
