"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { weekKeyFor } from "@/core/well/bible";
import { TOGETHER_QUESTIONS } from "@/core/well/permissions";
import { pickForDay } from "@/convex/reCentered/pure";
import { refHref, refLabel } from "@/core/well/refs";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** Together: passages marked for each other, and one question a week. Never a comparison. */
export function Together() {
  const { partner } = useHub();
  const [weekKey] = useState(() => weekKeyFor(new Date()));
  const marks = useQuery(api.well.together.marks);
  const answers = useQuery(api.well.together.answers, { weekKey });
  const answer = useMutation(api.well.together.answer);
  const unmark = useMutation(api.well.together.unmark);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const question = pickForDay(TOGETHER_QUESTIONS, weekKey)!;
  const name = partner?.displayName ?? "your partner";
  const bookName = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Together" subtitle="A passage marked for the other, with a note. One question a week. No one keeps count." />
      <Card>
        <p className="sh-eyebrow">This week&apos;s question</p>
        <p className="well-did">{question}</p>
        {!answers ? (
          <Spinner />
        ) : (
          <>
            {answers.mine ? (
              <p className="mt-3"><strong>You:</strong> {answers.mine.text}</p>
            ) : (
              <>
                <Field label="Your answer, in your words">
                  <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} />
                </Field>
                <CrisisNotice texts={[text]} />
                <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await answer({ weekKey, text }); setText(""); })}>Share my answer</Btn>
              </>
            )}
            {answers.theirs ? <p className="mt-3"><strong>{name}:</strong> {answers.theirs.text}</p> : <p className="sh-hint mt-3">{name} hasn&apos;t answered this week. That&apos;s fine.</p>}
          </>
        )}
        <ErrorNote error={error} />
      </Card>
      <Card>
        <h2 className="sh-h2">Marked for you</h2>
        {!marks ? (
          <Spinner />
        ) : marks.forMe.length === 0 ? (
          <p className="sh-muted">Nothing marked for you yet. Any passage in the Bible has a &ldquo;Mark for {name}&rdquo; button.</p>
        ) : (
          marks.forMe.map((m) => (
            <div key={m._id} className="well-entry">
              <p>
                <Link href={refHref(m)} className="sh-link">{refLabel(m, bookName(m.book))}</Link>
                {m.note ? <span> · &ldquo;{m.note}&rdquo;</span> : null}
              </p>
              <p className="sh-hint">{timeAgo(m.createdAt)}</p>
            </div>
          ))
        )}
      </Card>
      {marks && marks.byMe.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">You marked for {name}</h2>
          {marks.byMe.map((m) => (
            <div key={m._id} className="well-entry">
              <p>
                <Link href={refHref(m)} className="sh-link">{refLabel(m, bookName(m.book))}</Link>
                {m.note ? <span> · &ldquo;{m.note}&rdquo;</span> : null}
              </p>
              <p className="sh-hint">
                {timeAgo(m.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => unmark({ id: m._id }))}>Unmark</button>
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
