"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LAMENT_PSALMS } from "@/core/well/permissions";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, LinkBtn, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** Talking with him: prayer in your own words, lament allowed, and a way out when you can't. */
export function Talking() {
  const { partner } = useHub();
  const prayers = useQuery(api.well.entries.prayers);
  const add = useMutation(api.well.entries.addPrayer);
  const answered = useMutation(api.well.entries.answered);
  const remove = useMutation(api.well.entries.removePrayer);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [cant, setCant] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (cant) {
    return (
      <div className="sh-container sh-narrow">
        <div className="well-quiet">He&apos;s already near. Sit here. That&apos;s enough.</div>
        <div className="sh-stack">
          <LinkBtn href="/the-well/bible/psalms/23" big variant="secondary">Let Psalm 23 pray for you</LinkBtn>
          <Btn big variant="ghost" onClick={() => setCant(false)}>Back</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Talking with him" subtitle="Your words, no formula. Three words counts. Anger counts. Silence counts." />
      <div className="sh-choices">
        <Btn big variant="secondary" onClick={() => setCant(true)}>I can&apos;t pray right now</Btn>
        {partner && <LinkBtn href="/heads-up/new?help=prayer" big variant="secondary">Ask {partner.displayName} to pray for me</LinkBtn>}
      </div>
      <Card>
        <Field label="What I want to say to him">
          <textarea className="sh-input sh-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        </Field>
        <CrisisNotice texts={[text]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ text }); setText(""); })}>
          Said
        </Btn>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">When it&apos;s anger, or nothing</h2>
        <p className="sh-muted">A third of the Psalms are complaints to God. Borrow one.</p>
        <ul className="sh-list">
          {LAMENT_PSALMS.map((p) => (
            <li key={p.chapter}>
              <Link href={`/the-well/bible/psalms/${p.chapter}`} className="sh-link">Psalm {p.chapter}</Link> <span className="sh-muted">· {p.when}</span>
            </li>
          ))}
        </ul>
      </Card>
      {!prayers ? (
        <Spinner />
      ) : prayers.length > 0 ? (
        <Card>
          <h2 className="sh-h2">Said before</h2>
          {prayers.map((p) => (
            <div key={p._id} className="well-entry">
              <p style={{ whiteSpace: "pre-wrap" }}>{p.text}</p>
              <p className="sh-hint">
                {timeAgo(p.createdAt)}
                {p.answeredAt ? ` · answered${p.answerNote ? `: ${p.answerNote}` : ""}` : ""}
                {!p.answeredAt && (
                  <>
                    {" "}·{" "}
                    <button type="button" className="sh-link" onClick={() => setNoteFor(noteFor === p._id ? null : p._id)}>He answered</button>
                  </>
                )}{" "}
                ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: p._id }))}>Delete</button>
              </p>
              {noteFor === p._id && (
                <div className="sh-row sh-wrap">
                  <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="How, in a line (optional)" aria-label="How he answered" />
                  <Btn disabled={busy} onClick={() => void run(async () => { await answered({ id: p._id, note: note || undefined }); setNote(""); setNoteFor(null); })}>Keep in Remembering</Btn>
                </div>
              )}
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
