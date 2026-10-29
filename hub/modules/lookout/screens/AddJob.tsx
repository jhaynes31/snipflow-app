"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, Field, PageTitle, useAction } from "@/core/ui";
import { LOOKOUT } from "../Shell";

/**
 * A job found anywhere: Indeed, LinkedIn, an email, a friend. Those sites
 * don't allow automated reading, so the listing is pasted here and gets
 * exactly the same checks as a job the Lookout found itself.
 */
export function AddJob() {
  const add = useMutation(api.lookout.data.addJob);
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [f, setF] = useState({ title: "", employer: "", url: "", applyUrl: "", location: "", deadline: "", description: "" });

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Add a job" subtitle="Paste the whole listing. It's checked the same way as everything else." />
      <Card>
        <div className="sh-stack">
          <Field label="Job title"><input className="sh-input" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Employer"><input className="sh-input" value={f.employer} maxLength={120} onChange={(e) => setF({ ...f, employer: e.target.value })} /></Field>
          <Field label="Link to the listing" hint="If you found it on a job board, look for the employer's own careers page and use that link when you can."><input className="sh-input" value={f.url} maxLength={1000} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
          <Field label="Application page, if different (optional)"><input className="sh-input" value={f.applyUrl} maxLength={1000} onChange={(e) => setF({ ...f, applyUrl: e.target.value })} /></Field>
          <Field label="Location line (optional)"><input className="sh-input" value={f.location} maxLength={300} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Remote, US" /></Field>
          <Field label="Application deadline (optional)"><input className="sh-input" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
          <Field label="The full listing"><textarea className="sh-textarea" rows={14} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <ErrorNote error={error} />
        <Btn disabled={busy || !f.title.trim() || !f.employer.trim() || !f.url.trim() || f.description.trim().length < 80} onClick={() => void run(async () => {
          const r = await add({ title: f.title, employer: f.employer, url: f.url, applyUrl: f.applyUrl || undefined, location: f.location || undefined, deadline: f.deadline || undefined, description: f.description });
          router.push(`${LOOKOUT}/jobs/${r.id}${r.duplicate ? "?already=1" : ""}`);
        })}>Add and check it</Btn>
      </Card>
    </div>
  );
}
