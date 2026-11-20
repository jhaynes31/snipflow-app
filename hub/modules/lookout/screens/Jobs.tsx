"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";
import { INSURANCE_VIEW, VIEWS } from "../views";
import { JobLine } from "./Overview";
import { QuickApplied } from "../QuickApplied";
import { RETIRED_KINDS, type SourceKind } from "@/convex/lookout/sources";

/** Every job, one view at a time, best first. */
export function Jobs() {
  const params = useSearchParams();
  const [view, setView] = useState(() => ([...VIEWS, INSURANCE_VIEW].some((v) => v.key === params.get("show")) ? params.get("show")! : "best"));
  const data = useQuery(api.lookout.data.jobs);
  const settings = useQuery(api.lookout.data.settings);
  const setInsurance = useMutation(api.lookout.data.setInsurance);
  const [find, setFind] = useState("");
  if (!data || !settings) return <Spinner />;
  const insuranceOn = settings.insurance.enabled || data.jobs.some((j) => j.preset === "insurance");
  const showBlocked = settings.insurance.showBlocked;
  const views = insuranceOn ? [...VIEWS.slice(0, 2), { ...INSURANCE_VIEW, test: (j: Parameters<typeof INSURANCE_VIEW.test>[0]) => INSURANCE_VIEW.test(j, showBlocked) }, ...VIEWS.slice(2)] : VIEWS;
  const current = views.find((v) => v.key === view) ?? views[0];
  const words = find.trim().toLowerCase().split(/\s+/).filter(Boolean);
  // A search looks through every job, in every group, including earlier finds. Best first (for insurance jobs, Strong fit first), then newest.
  const rows = (words.length ? data.jobs.filter((j) => words.every((w) => `${j.title} ${j.employer}`.toLowerCase().includes(w))) : data.jobs.filter(current.test)).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.discoveredAt - a.discoveredAt);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Jobs" subtitle="Ranked only after the requirements. A high score never overrides a failed one." />
      <div className="sh-chips" role="tablist" aria-label="Which jobs">
        {views.map((v) => {
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
      {view === "insurance" && !words.length && (
        <div className="mt-3">
          <p className="sh-hint">Insurance sales jobs, Strong fit first, then newest. Each card shows why, as tags. Jobs from blocklisted companies are hidden unless you show them.</p>
          <Toggle checked={showBlocked} onChange={(on) => void setInsurance({ showBlocked: on })} label="Show hidden (blocklisted companies)" />
        </div>
      )}
      <Card>
        {words.length > 0 && <p className="sh-hint">{rows.length} {rows.length === 1 ? "job matches" : "jobs match"} &quot;{find.trim()}&quot; across every group.</p>}
        {rows.length === 0 && <p className="sh-muted">Nothing here.</p>}
        {rows.map((j) => <JobRow key={j._id} j={j} />)}
      </Card>
    </div>
  );
}

/** One job in the list, with "I applied" and "Hide" right there. */
function JobRow({ j }: { j: Parameters<typeof JobLine>[0]["j"] & { status: string; askApplied: boolean; shelved: boolean; url: string; applyUrl?: string; sourceKind: string } }) {
  const [open, setOpen] = useState(j.askApplied);
  const shelve = useMutation(api.lookout.data.setShelved);
  const setStatus = useMutation(api.lookout.data.setStatus);
  const opened = useMutation(api.lookout.data.noteApplyOpened);
  const saveable = ["new", "review"].includes(j.status);
  const applyHref = RETIRED_KINDS.includes(j.sourceKind as SourceKind) ? null : (j.applyUrl ?? j.url);
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
          {before && applyHref && <a className="sh-btn sh-btn-secondary" href={applyHref} target="_blank" rel="noopener noreferrer" onClick={() => void opened({ jobId: j._id as Id<"loJobs"> }).catch(() => undefined)}>Apply</a>}
          {saveable && <Btn variant="secondary" disabled={busy} onClick={() => void run(() => setStatus({ jobId: j._id as Id<"loJobs">, status: "saved" }))}>Save</Btn>}
          {before && <button type="button" className="sh-btn sh-btn-ghost" onClick={() => setOpen(true)}>I applied to this</button>}
          {hideable && (j.shelved
            ? <Btn variant="ghost" disabled={busy} onClick={() => void run(() => shelve({ jobId: j._id as Id<"loJobs">, shelved: false }))}>Bring it back</Btn>
            : <Btn variant="ghost" disabled={busy} onClick={() => void run(() => shelve({ jobId: j._id as Id<"loJobs">, shelved: true }))}>Hide</Btn>)}
        </div>
      )}
      <ErrorNote error={error} />
    </div>
  );
}
