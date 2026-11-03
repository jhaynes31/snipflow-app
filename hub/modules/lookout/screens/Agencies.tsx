"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { daysUntil, recruiterNote, searchLink, siteLink } from "@/convex/lookout/agencies";
import { Btn, Card, CopyButton, ErrorNote, Field, PageTitle, Spinner, Toggle, timeAgo, useAction } from "@/core/ui";
import { LOOKOUT } from "../Shell";

type Row = NonNullable<ReturnType<typeof useAgencies>>[number];
function useAgencies() {
  return useQuery(api.lookout.agencyData.list);
}

/**
 * Staffing agencies: the ones that place people in remote customer service,
 * admin, operations, and healthcare back office work. Their job sites can't
 * be read automatically, so each has a link to search its remote jobs, a
 * "checked" date, and room for the recruiter and the next follow up. Jobs
 * found there go in through Add a job.
 */
export function Agencies() {
  const rows = useAgencies();
  const settings = useQuery(api.lookout.data.settings);
  const answers = useQuery(api.lookout.data.answers);
  const add = useMutation(api.lookout.agencyData.add);
  const { busy, error, run } = useAction();
  const [showHidden, setShowHidden] = useState(false);
  const [f, setF] = useState({ name: "", site: "", focus: "" });
  const [now] = useState(() => Date.now());
  if (!rows || !settings || !answers) return <Spinner />;
  const name = answers.find((a) => a.key === "name")?.answer || "";
  const visible = rows.filter((r) => !r.hidden);
  const hidden = rows.filter((r) => r.hidden);
  // Agencies with a follow up due first, then the ones checked longest ago.
  const order = (r: Row) => (r.followUpAt && r.followUpAt <= now + 86400000 ? -1e15 + r.followUpAt : r.lastCheckedAt ?? 0);
  const general = visible.filter((r) => r.group === "general").sort((a, b) => order(a) - order(b));
  const health = visible.filter((r) => r.group === "healthcare").sort((a, b) => order(a) - order(b));

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Staffing agencies" subtitle="Agencies that place people in remote customer service, admin, and back office work. Their sites can't be searched automatically, so check them from here." />
      <Card>
        <p>Open an agency&apos;s remote jobs, look through them, and tap <strong>Checked today</strong>. When a job looks right, copy its link and listing into <Link className="sh-link" href={`${LOOKOUT}/add`}>Add a job</Link> so it gets every check. Agency jobs are often contract or contract to hire and often 40 hours, so the hour and pay checks matter here too.</p>
      </Card>
      <RecruiterNote name={name} minHourly={settings.minHourly} maxHours={settings.maxHours} homeState={settings.homeState} />
      <Card>
        <h2 className="sh-h2">Customer service, admin, and operations</h2>
        {general.map((r) => <AgencyRow key={r.key} r={r} now={now} />)}
      </Card>
      <Card>
        <h2 className="sh-h2">Healthcare back office</h2>
        <p className="sh-hint">Claims, prior authorization, insurance verification, and billing: mostly computer work, often with little phone time.</p>
        {health.map((r) => <AgencyRow key={r.key} r={r} now={now} />)}
      </Card>
      <Card>
        <h2 className="sh-h2">Add an agency</h2>
        <div className="sh-stack-sm">
          <input className="sh-input" value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Agency name" aria-label="Agency name" />
          <input className="sh-input" value={f.site} maxLength={120} onChange={(e) => setF({ ...f, site: e.target.value })} placeholder="Web address (optional), like example.com" aria-label="Web address" />
          <input className="sh-input" value={f.focus} maxLength={300} onChange={(e) => setF({ ...f, focus: e.target.value })} placeholder="What they place (optional)" aria-label="What they place" />
        </div>
        <ErrorNote error={error} />
        <Btn disabled={busy || !f.name.trim()} onClick={() => void run(async () => { await add({ name: f.name, site: f.site || undefined, focus: f.focus || undefined }); setF({ name: "", site: "", focus: "" }); })}>Add</Btn>
        {hidden.length > 0 && (
          <p className="sh-hint mt-3">
            <button type="button" className="sh-link" onClick={() => setShowHidden(!showHidden)}>{showHidden ? "Hide" : "Show"} the {hidden.length} hidden</button>
          </p>
        )}
        {showHidden && hidden.map((r) => <AgencyRow key={r.key} r={r} now={now} />)}
      </Card>
    </div>
  );
}

function RecruiterNote(o: { name: string; minHourly: number; maxHours: number; homeState: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => recruiterNote(o));
  return (
    <Card>
      <h2 className="sh-h2">A first note to a recruiter</h2>
      <p className="sh-hint">The requirements, said up front so recruiters only send jobs that can work. Change anything that isn&apos;t right before sending.</p>
      {open ? (
        <>
          <textarea className="sh-textarea" rows={16} value={text} onChange={(e) => setText(e.target.value)} aria-label="Note to a recruiter" />
          <div className="sh-row sh-wrap mt-3">
            <CopyButton text={text} label="Copy the note" />
            <Btn variant="ghost" onClick={() => setText(recruiterNote(o))}>Start over</Btn>
          </div>
        </>
      ) : (
        <Btn variant="secondary" onClick={() => setOpen(true)}>Show the note</Btn>
      )}
    </Card>
  );
}

function AgencyRow({ r, now }: { r: Row; now: number }) {
  const update = useMutation(api.lookout.agencyData.update);
  const remove = useMutation(api.lookout.agencyData.remove);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ recruiter: r.recruiter ?? "", contact: r.contact ?? "", followUp: r.followUpAt ? new Date(r.followUpAt).toISOString().slice(0, 10) : "", notes: r.notes ?? "" });
  const due = daysUntil(r.followUpAt, now);

  return (
    <div className="lo-entry">
      <p><strong>{r.name}</strong>{r.signedUp ? <span className="lo-verified"> · signed up</span> : null}</p>
      {r.focus && <p className="sh-hint">{r.focus}</p>}
      <p className="sh-hint">
        {r.lastCheckedAt ? `Checked ${timeAgo(r.lastCheckedAt, now)}` : "Not checked yet"}
        {r.recruiter ? ` · recruiter: ${r.recruiter}${r.contact ? ` (${r.contact})` : ""}` : ""}
        {due !== null ? ` · ${due < 0 ? "follow up was due" : due === 0 ? "follow up today" : `follow up in ${due} ${due === 1 ? "day" : "days"}`}` : ""}
      </p>
      {r.notes && !editing && <p style={{ whiteSpace: "pre-wrap" }} className="sh-hint">{r.notes}</p>}
      <div className="sh-row sh-wrap">
        <a className="sh-btn sh-btn-primary" href={searchLink(r, r.group === "healthcare")} target="_blank" rel="noopener noreferrer">Find remote jobs</a>
        <a className="sh-btn sh-btn-secondary" href={siteLink(r)} target="_blank" rel="noopener noreferrer">Their site</a>
        <Btn variant="secondary" disabled={busy} onClick={() => void run(() => update({ key: r.key, checkedNow: true }))}>Checked today</Btn>
        <button type="button" className="sh-link" onClick={() => setEditing(!editing)}>{editing ? "Close" : "Recruiter and notes"}</button>
      </div>
      {editing && (
        <div className="sh-stack-sm mt-3">
          <Toggle checked={r.signedUp} onChange={(signedUp) => void run(() => update({ key: r.key, signedUp }))} label="Signed up with this agency" />
          <div className="sh-row sh-wrap">
            <Field label="Recruiter"><input className="sh-input" value={f.recruiter} maxLength={120} onChange={(e) => setF({ ...f, recruiter: e.target.value })} /></Field>
            <Field label="Email or phone"><input className="sh-input" value={f.contact} maxLength={200} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
            <Field label="Follow up on"><input className="sh-input" type="date" value={f.followUp} onChange={(e) => setF({ ...f, followUp: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea className="sh-textarea" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="What they said, jobs they sent, what to ask next time" /></Field>
          <ErrorNote error={error} />
          <div className="sh-row sh-wrap">
            <Btn disabled={busy} onClick={() => void run(async () => { await update({ key: r.key, recruiter: f.recruiter, contact: f.contact, notes: f.notes, followUpAt: f.followUp ? new Date(`${f.followUp}T12:00:00`).getTime() : null }); setEditing(false); })}>Save</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => void run(() => update({ key: r.key, hidden: !r.hidden }))}>{r.hidden ? "Show it again" : "Hide this agency"}</Btn>
            {r.custom && <button type="button" className="sh-link" disabled={busy} onClick={() => { if (window.confirm(`Remove ${r.name}?`)) void run(() => remove({ key: r.key })); }}>Remove</button>}
          </div>
        </div>
      )}
    </div>
  );
}
