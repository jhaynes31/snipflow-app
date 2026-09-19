"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ANSWER_LABEL, AREAS } from "@/convex/keptWord/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** Asks: said once, plainly. The answer goes on the record either way. */
export function Asks() {
  const { partner } = useHub();
  const data = useQuery(api.keptWord.asks.list);
  const write = useMutation(api.keptWord.asks.write);
  const remove = useMutation(api.keptWord.asks.remove);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const name = partner?.displayName ?? "your partner";
  if (!data) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Asks" subtitle="Say it once, in plain words. The answer is on the record either way, so you never have to say it twice." />
      {data.toMe.filter((a) => !a.answer).length > 0 && (
        <Card>
          <h2 className="sh-h2">{name} asked</h2>
          {data.toMe.filter((a) => !a.answer).map((a) => (
            <AskForMe key={a._id} a={a} />
          ))}
        </Card>
      )}
      {partner && (
        <Card>
          <h2 className="sh-h2">Ask {name}</h2>
          <Field label="What I'd like" hint="Specific enough to become a word. For example: plan one evening for us this month.">
            <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} />
          </Field>
          <CrisisNotice texts={[text]} />
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn
              disabled={busy || !text.trim()}
              onClick={() =>
                void run(async () => {
                  await write({ text });
                  setText("");
                  setSent(true);
                  setTimeout(() => setSent(false), 1800);
                })
              }
            >
              Ask once
            </Btn>
            {sent && <Note>Asked. It&apos;s on the record.</Note>}
          </div>
        </Card>
      )}
      <Card tone="alt">
        <h2 className="sh-h2">The record</h2>
        {data.mine.length === 0 && data.toMe.length === 0 && <p className="sh-muted">Nothing asked yet.</p>}
        {[...data.mine.map((a) => ({ a, mine: true })), ...data.toMe.map((a) => ({ a, mine: false }))]
          .sort((x, y) => y.a.createdAt - x.a.createdAt)
          .map(({ a, mine }) => (
            <div key={a._id} className="kw-word">
              <span className="kw-word-text">
                {mine ? "You asked" : `${name} asked`}: {a.text}
              </span>
              <span className="kw-meta">
                {timeAgo(a.createdAt)} ·{" "}
                {a.answer ? `Answer: ${ANSWER_LABEL[a.answer]}${a.answeredAt ? `, ${timeAgo(a.answeredAt)}` : ""}` : "No answer yet"}
                {mine && !a.answer && (
                  <>
                    {" "}·{" "}
                    <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: a._id }))}>
                      Take it back
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
      </Card>
    </div>
  );
}

function AskForMe({ a }: { a: Doc<"kwAsks"> }) {
  const answer = useMutation(api.keptWord.asks.answer);
  const give = useMutation(api.keptWord.words.give);
  const { busy, error, run } = useAction();
  const [making, setMaking] = useState(false);
  const [text, setText] = useState(a.text);
  const [area, setArea] = useState<string>("us");
  const [dueDay, setDueDay] = useState("");
  return (
    <div className="kw-word">
      <span className="kw-word-text">{a.text}</span>
      <span className="kw-meta">Asked {timeAgo(a.createdAt)}</span>
      <ErrorNote error={error} />
      {!making ? (
        <div className="sh-choices">
          <Btn disabled={busy} onClick={() => setMaking(true)}>{ANSWER_LABEL.word}</Btn>
          <Btn variant="secondary" disabled={busy} onClick={() => void run(() => answer({ id: a._id, answer: "notNow" }))}>{ANSWER_LABEL.notNow}</Btn>
          <Btn variant="secondary" disabled={busy} onClick={() => void run(() => answer({ id: a._id, answer: "talk" }))}>{ANSWER_LABEL.talk}</Btn>
        </div>
      ) : (
        <div className="sh-stack-sm">
          <Field label="My word, in my words" hint="Smaller than the ask is fine, if it's honest.">
            <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
          </Field>
          <div className="sh-row sh-wrap">
            <Field label="By when">
              <input className="sh-input" type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </Field>
            <Field label="Area">
              <select className="sh-input" value={area} onChange={(e) => setArea(e.target.value)}>
                {AREAS.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="sh-row">
            <Btn disabled={busy || !text.trim()} onClick={() => void run(() => give({ text, area, forWhom: "partner", dueDay: dueDay || undefined, askId: a._id }))}>That&apos;s my word</Btn>
            <Btn variant="ghost" onClick={() => setMaking(false)}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
