"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { SORTING_QUESTIONS, WHOSE_LABEL, type Whose as WhoseKind } from "@/convex/reCentered/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const ORDER: WhoseKind[] = ["mine", "theirs", "ours", "notMine", "unsure"];

function Guidance({ whose }: { whose: WhoseKind | null }) {
  if (whose === "theirs") return <p className="sh-muted">Theirs to carry. You can care without carrying it. If the urge to fix it is loud, the pause is next door.</p>;
  if (whose === "notMine") return <p className="sh-muted">Not yours. Set it down.</p>;
  if (whose === "ours") return <p className="sh-muted">A piece each. Name both pieces, then carry only yours. Their piece staying theirs is the whole point.</p>;
  if (whose === "unsure") {
    return (
      <div className="sh-card-alt">
        <p><strong>Not knowing is allowed.</strong> These usually settle it:</p>
        <ul className="sh-list">
          {SORTING_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <p className="sh-hint">If it&apos;s still unclear, save it as unsure and come back. That is already a step away from &ldquo;everything is mine&rdquo;.</p>
      </div>
    );
  }
  return null;
}

function Parts({ whose, myPart, theirPart, setMyPart, setTheirPart }: { whose: WhoseKind | null; myPart: string; theirPart: string; setMyPart: (v: string) => void; setTheirPart: (v: string) => void }) {
  return (
    <>
      {(whose === "mine" || whose === "ours") && (
        <Field label={whose === "ours" ? "My piece" : "What I'll do about the part that's mine"} hint="Optional. Small is fine.">
          <input className="sh-input" value={myPart} onChange={(e) => setMyPart(e.target.value)} maxLength={500} />
        </Field>
      )}
      {whose === "ours" && (
        <Field label="Their piece" hint="Named so you can see it's not yours. Not sent anywhere.">
          <input className="sh-input" value={theirPart} onChange={(e) => setTheirPart(e.target.value)} maxLength={500} />
        </Field>
      )}
    </>
  );
}

/** Something has landed. One line, then sort it. Two minutes. */
export function Whose() {
  const list = useQuery(api.reCentered.entries.sorts, { limit: 30 });
  const add = useMutation(api.reCentered.entries.addSort);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [whose, setWhose] = useState<WhoseKind | null>(null);
  const [myPart, setMyPart] = useState("");
  const [theirPart, setTheirPart] = useState("");
  const [saved, setSaved] = useState(false);
  const { partner } = useHub();
  const partnerName = partner?.displayName ?? "My partner";

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Whose is this?" subtitle="Someone handed you a problem, a feeling or a job, and you can feel yourself picking it up. Before you carry it, check whose it actually is. A piece each is a real answer, and so is not knowing yet." />
      <Card>
        <Field label="What got handed to you?" hint="The thing you are about to pick up: a request, a mood, a mess, a worry. A few words is enough.">
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={`${partnerName} is upset and I feel like I have to fix it`} />
        </Field>
        <CrisisNotice texts={[text, myPart, theirPart]} />
        <p className="sh-label">Whose is it?</p>
        <div className="sh-choices">
          {ORDER.map((k) => (
            <Btn key={k} variant={whose === k ? "primary" : "secondary"} onClick={() => setWhose(k)}>
              {WHOSE_LABEL[k]}
            </Btn>
          ))}
        </div>
        <Guidance whose={whose} />
        <Parts whose={whose} myPart={myPart} theirPart={theirPart} setMyPart={setMyPart} setTheirPart={setTheirPart} />
        <ErrorNote error={error} />
        <div className="sh-row mt-3">
          <Btn
            big
            disabled={busy || !text.trim() || !whose}
            onClick={() =>
              void run(async () => {
                await add({ text, whose: whose!, myPart: myPart || undefined, theirPart: whose === "ours" ? theirPart || undefined : undefined });
                setText("");
                setWhose(null);
                setMyPart("");
                setTheirPart("");
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
            <SortRow key={s._id} row={s} />
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function SortRow({ row }: { row: Doc<"rcSorts"> }) {
  const resort = useMutation(api.reCentered.entries.resort);
  const remove = useMutation(api.reCentered.entries.removeSort);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [whose, setWhose] = useState<WhoseKind>(row.whose);
  const [myPart, setMyPart] = useState(row.myPart ?? "");
  const [theirPart, setTheirPart] = useState(row.theirPart ?? "");
  return (
    <div className="rc-entry">
      <p>
        <strong>{WHOSE_LABEL[row.whose]}.</strong> {row.text}
        {row.myPart ? <span className="sh-muted"> My part: {row.myPart}</span> : null}
        {row.theirPart ? <span className="sh-muted"> Their part: {row.theirPart}</span> : null}
      </p>
      {editing ? (
        <div className="sh-stack-sm">
          <div className="sh-choices">
            {ORDER.map((k) => (
              <Btn key={k} variant={whose === k ? "primary" : "secondary"} onClick={() => setWhose(k)}>
                {WHOSE_LABEL[k]}
              </Btn>
            ))}
          </div>
          <Guidance whose={whose} />
          <Parts whose={whose} myPart={myPart} theirPart={theirPart} setMyPart={setMyPart} setTheirPart={setTheirPart} />
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn disabled={busy} onClick={() => void run(async () => { await resort({ id: row._id, whose, myPart: myPart || undefined, theirPart: whose === "ours" ? theirPart || undefined : undefined }); setEditing(false); })}>Save</Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <p className="sh-hint">
          {timeAgo(row.createdAt)} ·{" "}
          <button type="button" className="sh-link" onClick={() => setEditing(true)}>
            {row.whose === "unsure" ? "Sort it now" : "Re-sort"}
          </button>{" "}
          ·{" "}
          <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: row._id }))}>
            Delete
          </button>
        </p>
      )}
    </div>
  );
}
