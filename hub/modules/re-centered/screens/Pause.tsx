"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ENDING_LABEL, type PauseEnding } from "@/convex/reCentered/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const QUESTIONS = [
  { key: "ifNothing", label: "If I do nothing, what happens?", hint: "The actual, boring, literal outcome." },
  { key: "landsOn", label: "Who does that land on?", hint: "Name the person. It may not be you." },
  { key: "afraid", label: "What am I afraid of?", hint: "The real fear, not the tidy one." },
  { key: "need", label: "What do I need right now?", hint: "Not what they need. You." },
] as const;

type Key = (typeof QUESTIONS)[number]["key"];

/** Four questions before stepping in. No wrong ending. */
export function Pause() {
  const list = useQuery(api.reCentered.entries.pauses, { limit: 10 });
  const add = useMutation(api.reCentered.entries.addPause);
  const remove = useMutation(api.reCentered.entries.removePause);
  const { busy, error, run } = useAction();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<Key, string>>({ ifNothing: "", landsOn: "", afraid: "", need: "" });
  const [ending, setEnding] = useState<PauseEnding | null>(null);

  const done = i >= QUESTIONS.length;

  if (ending) {
    return (
      <div className="sh-container sh-narrow sh-lowdemand">
        <h1 className="sh-h1">{ENDING_LABEL[ending]}.</h1>
        <p>{ending === "letItLand" ? "That's yours to be proud of, whatever happens next." : ending === "stepIn" ? "Then step in with your eyes open. You chose it; it didn't choose you." : "Not knowing is allowed. The answer can wait an hour."}</p>
        <div className="sh-stack">
          {ending === "letItLand" && <LinkBtn href="/re-centered/landed" big>Write it in Let it land</LinkBtn>}
          <LinkBtn href="/tend/tools/groundMe" big variant="secondary">Ground Me, two minutes</LinkBtn>
          <LinkBtn href="/tend/tools/sitWithIt" big variant="secondary">Sit With It</LinkBtn>
          <LinkBtn href="/re-centered" big variant="ghost">Back to the room</LinkBtn>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The pause before rescuing" subtitle="Four questions. Then you decide, and any answer is allowed." />
      {!done ? (
        <Card>
          <p className="sh-eyebrow">{i + 1} of {QUESTIONS.length}</p>
          <Field label={QUESTIONS[i].label} hint={QUESTIONS[i].hint}>
            <textarea className="sh-input sh-textarea" rows={3} value={answers[QUESTIONS[i].key]} onChange={(e) => setAnswers({ ...answers, [QUESTIONS[i].key]: e.target.value })} maxLength={600} />
          </Field>
          <CrisisNotice texts={Object.values(answers)} />
          <div className="sh-choices">
            {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
            <Btn onClick={() => setI(i + 1)}>{i === QUESTIONS.length - 1 ? "Decide" : "Next"}</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <p>
            <strong>So, what now?</strong> Nothing here is graded.
          </p>
          <ErrorNote error={error} />
          <div className="sh-stack">
            {(Object.keys(ENDING_LABEL) as PauseEnding[]).map((k) => (
              <Btn
                key={k}
                big
                variant={k === "letItLand" ? "primary" : "secondary"}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await add({ ...answers, ending: k });
                    setEnding(k);
                  })
                }
              >
                {ENDING_LABEL[k]}
              </Btn>
            ))}
          </div>
        </Card>
      )}
      {!list ? (
        <Spinner />
      ) : list.length > 0 ? (
        <Card tone="alt">
          <h2 className="sh-h2">Earlier pauses</h2>
          {list.map((p) => (
            <div key={p._id} className="rc-entry">
              <p>
                <strong>{ENDING_LABEL[p.ending]}.</strong> {p.need ? `I needed: ${p.need}` : ""}
              </p>
              <p className="sh-hint">
                {timeAgo(p.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: p._id }))}>
                  Delete
                </button>
              </p>
            </div>
          ))}
          {list.length > 1 && <Note>You have paused {list.length} times. That is the muscle.</Note>}
        </Card>
      ) : null}
    </div>
  );
}
