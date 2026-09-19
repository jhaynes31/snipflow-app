"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WHOSE_LABEL, type Whose as WhoseKind } from "@/convex/reCentered/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** Something has landed. One line, then sort it. Two minutes. */
export function Whose() {
  const list = useQuery(api.reCentered.entries.sorts, { limit: 30 });
  const add = useMutation(api.reCentered.entries.addSort);
  const remove = useMutation(api.reCentered.entries.removeSort);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [whose, setWhose] = useState<WhoseKind | null>(null);
  const [myPart, setMyPart] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Whose is this?" subtitle="Something landed on you. Before you carry it, check whose it is." />
      <Card>
        <Field label="What landed, in one line">
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        </Field>
        <CrisisNotice texts={[text, myPart]} />
        <p className="sh-label">Whose is it?</p>
        <div className="sh-choices">
          {(Object.keys(WHOSE_LABEL) as WhoseKind[]).map((k) => (
            <Btn key={k} variant={whose === k ? "primary" : "secondary"} onClick={() => setWhose(k)}>
              {WHOSE_LABEL[k]}
            </Btn>
          ))}
        </div>
        {whose === "mine" && (
          <Field label="What I'll do about the part that's mine" hint="Optional. Small is fine.">
            <input className="sh-input" value={myPart} onChange={(e) => setMyPart(e.target.value)} maxLength={500} />
          </Field>
        )}
        {whose === "theirs" && <p className="sh-muted">Theirs to carry. You can care without carrying it. If the urge to fix it is loud, the pause is next door.</p>}
        {whose === "notMine" && <p className="sh-muted">Not yours. Set it down.</p>}
        <ErrorNote error={error} />
        <div className="sh-row mt-3">
          <Btn
            big
            disabled={busy || !text.trim() || !whose}
            onClick={() =>
              void run(async () => {
                await add({ text, whose: whose!, myPart: whose === "mine" ? myPart : undefined });
                setText("");
                setWhose(null);
                setMyPart("");
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              })
            }
          >
            Sorted
          </Btn>
          {saved && <Note>Sorted. Kept for you only.</Note>}
        </div>
      </Card>
      {!list ? (
        <Spinner />
      ) : list.length > 0 ? (
        <Card tone="alt">
          <h2 className="sh-h2">Sorted lately</h2>
          {list.map((s) => (
            <div key={s._id} className="rc-entry">
              <p>
                <strong>{WHOSE_LABEL[s.whose]}.</strong> {s.text}
                {s.myPart ? <span className="sh-muted"> My part: {s.myPart}</span> : null}
              </p>
              <p className="sh-hint">
                {timeAgo(s.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: s._id }))}>
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
