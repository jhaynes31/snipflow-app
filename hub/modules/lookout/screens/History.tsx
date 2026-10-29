"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CHANNELS } from "@/convex/lookout/intake";
import { monthYear } from "@/convex/lookout/writing";
import { Btn, Card, ErrorNote, Field, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

const EMPTY = { employer: "", title: "", start: "", end: "", location: "", channels: [] as string[], duties: "", achievements: "", tools: "", leftNote: "", sales: false };
type Form = typeof EMPTY;

/**
 * Work history: one entry per job, the source of truth for every resume.
 * Employer names, titles, and dates on a resume come from here exactly.
 */
export function History() {
  const roles = useQuery(api.lookout.data.roles);
  const settings = useQuery(api.lookout.data.settings);
  const add = useMutation(api.lookout.data.addRole);
  const update = useMutation(api.lookout.data.updateRole);
  const confirm = useMutation(api.lookout.data.confirmRole);
  const remove = useMutation(api.lookout.data.removeRole);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState<Id<"loRoles"> | "new" | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  if (!roles || !settings) return <Spinner />;
  const owner = settings.role === "owner";

  function open(id: Id<"loRoles"> | "new") {
    const r = id === "new" ? null : roles!.find((x) => x._id === id);
    setF(r ? { employer: r.employer, title: r.title, start: r.start, end: r.end ?? "", location: r.location ?? "", channels: r.channels, duties: r.duties, achievements: r.achievements, tools: r.tools, leftNote: r.leftNote ?? "", sales: r.sales } : EMPTY);
    setEditing(id);
  }

  async function saveIt() {
    const args = { ...f, end: f.end || undefined, location: f.location || undefined, leftNote: f.leftNote || undefined };
    if (editing === "new") await add(args);
    else if (editing) await update({ id: editing, ...args });
    setEditing(null);
  }

  const form = (
    <Card>
      <h2 className="sh-h2">{editing === "new" ? "Add a job" : "Change this job"}</h2>
      <div className="sh-stack">
        <Field label="Employer"><input className="sh-input" value={f.employer} maxLength={120} onChange={(e) => setF({ ...f, employer: e.target.value })} /></Field>
        <Field label="Job title, as it was"><input className="sh-input" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="sh-row sh-wrap">
          <Field label="Started (month)"><input className="sh-input" type="month" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="Ended (blank if current)"><input className="sh-input" type="month" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <Field label="Location (optional)" hint="For example: Remote, or Charleston, West Virginia."><input className="sh-input" value={f.location} maxLength={120} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <div>
          <span className="sh-label">How you helped people here</span>
          <div className="sh-chips">
            {CHANNELS.map((c) => {
              const on = f.channels.includes(c);
              return <button key={c} type="button" className={`sh-chip ${on ? "lo-chip-on" : ""}`} aria-pressed={on} onClick={() => setF({ ...f, channels: on ? f.channels.filter((x) => x !== c) : [...f.channels, c] })}>{c}</button>;
            })}
          </div>
        </div>
        <Field label="What you did, day to day" hint="One per line. Plain words are perfect; the resume wording comes later."><textarea className="sh-textarea" rows={5} value={f.duties} onChange={(e) => setF({ ...f, duties: e.target.value })} /></Field>
        <Field label="What went well, with real numbers only if you're sure of them" hint="Awards, scores, a problem you fixed, something a manager praised. Leave it blank rather than guess."><textarea className="sh-textarea" rows={4} value={f.achievements} onChange={(e) => setF({ ...f, achievements: e.target.value })} /></Field>
        <Field label="Software and tools used here"><input className="sh-input" value={f.tools} maxLength={2000} onChange={(e) => setF({ ...f, tools: e.target.value })} /></Field>
        <Toggle checked={f.sales} onChange={(sales) => setF({ ...f, sales })} label="This was a sales job" hint="Sales jobs are described by their transferable parts, never as customer service, and never made the center of the story." />
        <Field label="Why it ended (private, optional)" hint="For your eyes only. Applications only ever use the wording you approve in the interview."><textarea className="sh-textarea" rows={2} value={f.leftNote} onChange={(e) => setF({ ...f, leftNote: e.target.value })} /></Field>
      </div>
      <ErrorNote error={error} />
      <div className="sh-row sh-wrap mt-3">
        <Btn disabled={busy || !f.employer.trim() || !f.title.trim() || !f.start} onClick={() => void run(saveIt)}>Save</Btn>
        <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
      </div>
    </Card>
  );

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Work history" subtitle="Every job, as it really was. Resumes take employers, titles, and dates from here exactly." action={editing ? undefined : <Btn onClick={() => open("new")}>Add a job</Btn>} />
      {editing && form}
      <Card>
        {roles.length === 0 && <p className="sh-muted">No jobs yet. Start with the most recent.</p>}
        {roles.map((r) => (
          <div key={r._id} className="lo-entry">
            <p><strong>{r.title}</strong>, {r.employer} <span className="sh-muted">· {monthYear(r.start)} to {monthYear(r.end)}{r.sales ? " · sales" : ""}</span></p>
            {r.channels.length > 0 && <p className="sh-hint">{r.channels.join(", ")}</p>}
            {r.duties && <p style={{ whiteSpace: "pre-wrap" }}>{r.duties}</p>}
            {r.achievements && <p style={{ whiteSpace: "pre-wrap" }} className="sh-hint">{r.achievements}</p>}
            <div className="sh-row sh-wrap">
              {r.confirmed ? <span className="lo-verified">Confirmed</span> : owner ? <Btn variant="secondary" disabled={busy} onClick={() => void run(() => confirm({ id: r._id }))}>Confirm it&apos;s right</Btn> : <span className="sh-hint">Waiting for confirmation</span>}
              <button type="button" className="sh-link" onClick={() => open(r._id)}>Change</button>
              <button type="button" className="sh-link" disabled={busy} onClick={() => { if (window.confirm(`Remove ${r.title} at ${r.employer}?`)) void run(() => remove({ id: r._id })); }}>Remove</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
