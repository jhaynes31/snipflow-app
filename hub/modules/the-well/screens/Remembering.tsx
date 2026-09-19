"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** Remembering: times he showed up. Reread on low days. Tend's Anchor reads these too. */
export function Remembering() {
  const rows = useQuery(api.well.entries.remembering);
  const add = useMutation(api.well.entries.addRemembering);
  const remove = useMutation(api.well.entries.removeRemembering);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Remembering" subtitle="Times he showed up. Written down because low days lie about the past. Tend's Anchor tool reads from here." />
      <Card>
        <Field label="What happened">
          <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} />
        </Field>
        <Field label="When, roughly" hint="Optional. 'Spring 2019' is fine.">
          <input className="sh-input" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={40} />
        </Field>
        <CrisisNotice texts={[text]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ text, happenedOn: when || undefined }); setText(""); setWhen(""); })}>
          Keep it
        </Btn>
      </Card>
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card tone="alt">
          <p className="sh-muted">Nothing here yet. Start with one, even a small one.</p>
        </Card>
      ) : (
        <Card>
          {rows.map((r) => (
            <div key={r._id} className="well-entry">
              <p className="sh-quote" style={{ whiteSpace: "pre-wrap" }}>{r.text}</p>
              <p className="sh-hint">
                {r.happenedOn ?? timeAgo(r.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</button>
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
