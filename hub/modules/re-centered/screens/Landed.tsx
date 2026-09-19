"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** The log of times I didn't fix or manage it. Only ever about what I did. */
export function Landed() {
  const list = useQuery(api.reCentered.entries.landings, { limit: 100 });
  const add = useMutation(api.reCentered.entries.addLanding);
  const remove = useMutation(api.reCentered.entries.removeLanding);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [after, setAfter] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Let it land" subtitle="A time you didn't fix it, manage it, or catch it. In your words. This page is your evidence of your own change." />
      <Card>
        <Field label="What I did, or didn't do" hint="For example: I didn't remind him. I let the appointment be his to remember.">
          <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={800} />
        </Field>
        <Field label="How it felt after" hint="Optional. Honest is better than tidy.">
          <input className="sh-input" value={after} onChange={(e) => setAfter(e.target.value)} maxLength={500} />
        </Field>
        <CrisisNotice texts={[text, after]} />
        <ErrorNote error={error} />
        <div className="sh-row mt-3">
          <Btn
            big
            disabled={busy || !text.trim()}
            onClick={() =>
              void run(async () => {
                await add({ text, after: after || undefined });
                setText("");
                setAfter("");
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              })
            }
          >
            It landed
          </Btn>
          {saved && <Note>Kept. You let it land.</Note>}
        </div>
      </Card>
      {!list ? (
        <Spinner />
      ) : list.length > 0 ? (
        <Card tone="alt">
          <h2 className="sh-h2">Times I let it land</h2>
          <p className="sh-hint">Reread these on the days it feels like nothing is changing in you. Something is.</p>
          {list.map((l) => (
            <div key={l._id} className="rc-entry">
              <p>{l.text}</p>
              {l.after && <p className="sh-muted">After: {l.after}</p>}
              <p className="sh-hint">
                {timeAgo(l.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: l._id }))}>
                  Delete
                </button>
              </p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
