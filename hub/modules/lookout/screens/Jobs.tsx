"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Status } from "@/convex/lookout/pure";
import { Card, PageTitle, Spinner } from "@/core/ui";
import { JobLine } from "./Overview";

const VIEWS: { key: string; label: string; test: (j: { status: Status; verdict: string }) => boolean }[] = [
  { key: "best", label: "Best matches", test: (j) => j.verdict === "eligible" && ["new", "review", "saved"].includes(j.status) },
  { key: "check", label: "Needs checking", test: (j) => j.verdict === "check" && ["new", "review", "saved"].includes(j.status) },
  { key: "new", label: "Newly found", test: (j) => j.status === "new" && j.verdict !== "rejected" },
  { key: "review", label: "Waiting for review", test: (j) => j.status === "review" },
  { key: "saved", label: "Saved", test: (j) => j.status === "saved" },
  { key: "preparing", label: "Being prepared", test: (j) => j.status === "preparing" },
  { key: "ready", label: "Ready for approval", test: (j) => j.status === "ready" },
  { key: "approved", label: "Approved, to submit", test: (j) => j.status === "approved" },
  { key: "submitted", label: "Submitted", test: (j) => j.status === "submitted" },
  { key: "interview", label: "Interviewing", test: (j) => j.status === "interview" || j.status === "offer" },
  { key: "closed", label: "Closed or not selected", test: (j) => j.status === "rejected" || j.status === "closed" },
  { key: "aside", label: "Set aside", test: (j) => (j.verdict === "rejected" && ["new", "review", "saved"].includes(j.status)) || j.status === "passed" },
];

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
