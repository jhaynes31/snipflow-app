"use client";

import Link from "next/link";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { INTAKE } from "@/convex/lookout/intake";
import { Btn, Card, ErrorNote, LinkBtn, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import { useEffect, useState } from "react";
import { LOOKOUT } from "../Shell";
import { VIEWS } from "../views";

/** The Overview's grid: every stage group from the Jobs page, so the two always count the same jobs. */
const GRID = VIEWS.filter((v) => v.key !== "best" && v.key !== "check");

/** The dashboard: setup, the best matches, what's waiting, and what's coming up. */
export function Overview() {
  const data = useQuery(api.lookout.data.jobs);
  const answers = useQuery(api.lookout.data.answers);
  const roles = useQuery(api.lookout.data.roles);
  const settings = useQuery(api.lookout.data.settings);
  const agencies = useQuery(api.lookout.agencyData.list);
  const searchNow = useConvexAction(api.lookout.discover.searchNow);
  const refresh = useMutation(api.lookout.data.refreshReadings);
  useEffect(() => {
    void refresh({}).catch(() => undefined);
  }, [refresh]);
  const { busy, error, run } = useAction();
  const [result, setResult] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  if (!data || !answers || !roles || !settings) return <Spinner />;

  const answered = answers.filter((a) => a.answer.trim()).length;
  const confirmedRoles = roles.filter((r) => r.confirmed).length;
  const live = data.jobs.filter((j) => !["rejected", "closed", "passed"].includes(j.status));
  const top = live.filter((j) => j.verdict === "eligible" && ["new", "review", "saved"].includes(j.status)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
  const toCheck = live.filter((j) => j.verdict === "check" && ["new", "review", "saved"].includes(j.status)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
  const interviews = data.events.filter((e) => e.kind === "interview" && e.at && e.at > now - 3600000).sort((a, b) => a.at! - b.at!);
  const followUps = data.events.filter((e) => e.kind === "followUp" && e.at).sort((a, b) => a.at! - b.at!);
  const agencyFollowUps = (agencies ?? []).filter((x) => !x.hidden && x.followUpAt && x.followUpAt <= now + 7 * 86400000).sort((a, b) => a.followUpAt! - b.followUpAt!);
  const rejectedCount = data.jobs.filter((j) => j.verdict === "rejected" && ["new", "review", "saved"].includes(j.status)).length;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Lookout" subtitle="The right job, not more jobs. Every opening is checked against your requirements before it's ranked." />

      {(answered < 8 || confirmedRoles === 0) && (
        <Card className="lo-fail">
          <h2 className="sh-h2">First, the interview</h2>
          <p>Resumes and letters are written only from what you&apos;ve told the Lookout and confirmed. {answered} of {INTAKE.length} questions answered; {confirmedRoles} {confirmedRoles === 1 ? "job" : "jobs"} in your confirmed work history.</p>
          <div className="sh-row sh-wrap">
            <LinkBtn href={`${LOOKOUT}/interview`}>Continue the interview</LinkBtn>
            <LinkBtn href={`${LOOKOUT}/history`} variant="secondary">Add work history</LinkBtn>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Find jobs</h2>
        <p className="sh-hint">
          {settings.lastSearchAt ? `Last searched ${timeAgo(settings.lastSearchAt)}. ${(settings.lastSearchNote ?? "").split(". ").slice(0, 1).join("")}.` : "Not searched yet."} Scheduled search: {settings.frequency === "off" ? "off" : settings.frequency}.
        </p>
        <div className="sh-row sh-wrap">
          <Btn disabled={busy} onClick={() => void run(async () => { const r = await searchNow({}); setResult(r.note + (r.fresh ? ` ${r.fresh} new; each one is in the group below that fits it, including Set aside for any that fail a requirement.` : " Nothing new.")); })}>{busy ? "Searching…" : "Search now"}</Btn>
          <LinkBtn href={`${LOOKOUT}/add`} variant="secondary">Add one I found</LinkBtn>
        </div>
        <ErrorNote error={error} />
        {result && <Note>{result}</Note>}
        {settings.lastSearchSources.length > 0 && (
          <details className="mt-3">
            <summary className="sh-link">What each site gave last time</summary>
            <ul className="sh-list sh-hint">
              {settings.lastSearchSources.map((r) => <li key={r.name}>{r.name}: {r.problem ? r.problem : `${r.found} listings, ${r.kept} that fit`}</li>)}
            </ul>
            <p className="sh-hint">More sites and companies are under Settings, Searching.</p>
          </details>
        )}
      </Card>

      <Card>
        <h2 className="sh-h2">Top matches</h2>
        {top.length === 0 && <p className="sh-muted">None that pass every requirement yet. Jobs that still need a fact checked are below.</p>}
        {top.map((j) => <JobLine key={j._id} j={j} />)}
      </Card>

      {toCheck.length > 0 && (
        <Card>
          <h2 className="sh-h2">Promising, but something needs checking</h2>
          <p className="sh-hint">A requirement that isn&apos;t known is never assumed. Open one to see what to ask.</p>
          {toCheck.map((j) => <JobLine key={j._id} j={j} />)}
        </Card>
      )}

      {(interviews.length > 0 || followUps.length > 0 || agencyFollowUps.length > 0) && (
        <Card>
          <h2 className="sh-h2">Coming up</h2>
          {interviews.map((e) => <p key={e._id} className="lo-entry"><strong>Interview</strong> · {new Date(e.at!).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · <Link className="sh-link" href={`${LOOKOUT}/jobs/${e.jobId}`}>{e.employer}, {e.jobTitle}</Link></p>)}
          {agencyFollowUps.map((x) => <p key={x.key} className="lo-entry"><strong>{x.followUpAt! <= now ? "Follow up now" : "Follow up"}</strong> · {new Date(x.followUpAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · <Link className="sh-link" href={`${LOOKOUT}/agencies`}>{x.name}{x.recruiter ? `, ${x.recruiter}` : ""}</Link></p>)}
          {followUps.map((e) => <p key={e._id} className="lo-entry"><strong>{e.at! <= now ? "Follow up now" : "Follow up"}</strong> · {new Date(e.at!).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · <Link className="sh-link" href={`${LOOKOUT}/jobs/${e.jobId}`}>{e.employer}, {e.jobTitle}</Link></p>)}
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Where everything is</h2>
        <div className="lo-grid">
          {GRID.map((g) => {
            const n = data.jobs.filter(g.test).length;
            return (
              <Link key={g.key} href={`${LOOKOUT}/jobs?show=${g.key}`}>
                <span className="lo-count">{n}</span>
                <br />
                {g.label}
              </Link>
            );
          })}
        </div>
        {rejectedCount > 0 && <p className="sh-hint mt-3">{rejectedCount} found {rejectedCount === 1 ? "job was" : "jobs were"} set aside because {rejectedCount === 1 ? "it fails" : "they fail"} a requirement. Open Set aside to see each reason.</p>}
      </Card>
    </div>
  );
}

export function JobLine({ j }: { j: { _id: string; title: string; employer: string; score: number | null; verdict: string; uncertain: number; sourceName: string; discoveredAt: number; seen: boolean; changedAt?: number; warnings: string[]; fails: string[] } }) {
  return (
    <Link href={`${LOOKOUT}/jobs/${j._id}`} className="lo-job lo-entry">
      <span className="lo-job-title">{j.title}</span> <span className="sh-muted">· {j.employer}</span>
      <br />
      <span className="sh-hint">
        {j.score !== null ? <span className="lo-score" title="Match score out of 100">{j.score}</span> : null}{" "}
        {j.verdict === "eligible" ? "Passes every requirement" : j.verdict === "check" ? `${j.uncertain} ${j.uncertain === 1 ? "thing" : "things"} to check` : `Set aside: ${j.fails[0] ?? "fails a requirement"}`}
        {" · "}found {timeAgo(j.discoveredAt)} via {j.sourceName}
        {!j.seen ? " · new to you" : ""}
        {j.changedAt ? " · the listing changed" : ""}
        {j.warnings.length ? ` · ${j.warnings.length} warning${j.warnings.length === 1 ? "" : "s"}` : ""}
      </span>
    </Link>
  );
}
