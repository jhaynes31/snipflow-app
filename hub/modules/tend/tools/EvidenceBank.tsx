"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, Spinner, useAction } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

/** The Evidence Bank: specific, real things done well, about either of you. */
export function EvidenceBank() {
  return (
    <ToolFrame toolKey="evidenceBank">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { profile, partner } = useHub();
  const [about, setAbout] = useState<Id<"profiles">>(profile._id);
  const entries = useQuery(api.tend.evidence.about, { profileId: about });
  const add = useMutation(api.tend.evidence.add);
  const remove = useMutation(api.tend.evidence.remove);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [showed, setShowed] = useState("");
  const [saved, setSaved] = useState(false);
  const aboutName = about === profile._id ? "you" : partner?.displayName ?? "your partner";

  return (
    <div className="sh-stack">
      {partner && (
        <div className="sh-chips" role="group" aria-label="Whose bank">
          <button type="button" className={`sh-chip ${about === profile._id ? "is-on" : ""}`} aria-pressed={about === profile._id} onClick={() => setAbout(profile._id)}>
            About me
          </button>
          <button type="button" className={`sh-chip ${about === partner._id ? "is-on" : ""}`} aria-pressed={about === partner._id} onClick={() => setAbout(partner._id)}>
            About {partner.displayName}
          </button>
        </div>
      )}
      <Card>
        <h2 className="sh-h2">Add evidence about {aboutName}</h2>
        <form
          className="sh-stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await add({ aboutProfileId: about, text, showed: showed || undefined });
              setText("");
              setShowed("");
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            });
          }}
        >
          <Field label="What they did, specifically" hint="Not general praise. A real thing, with a detail.">
            <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} required />
          </Field>
          <Field label="What it showed" hint="For example: followed through, patient, figured it out.">
            <input className="sh-input" value={showed} onChange={(e) => setShowed(e.target.value)} maxLength={120} />
          </Field>
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn type="submit" disabled={busy || !text.trim()}>Add</Btn>
            {saved && <Note>Added.</Note>}
          </div>
        </form>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">Evidence about {aboutName}</h2>
        {!entries ? (
          <Spinner />
        ) : entries.length === 0 ? (
          <p className="sh-muted">Nothing logged yet. The first entry can be small.</p>
        ) : (
          <ul className="sh-list">
            {entries.map((e) => (
              <li key={e._id} className="sh-row">
                <span>
                  {e.text}
                  {e.showed && <span className="sh-muted"> · {e.showed}</span>}
                  <span className="sh-hint">{new Date(e.date).toLocaleDateString()}</span>
                </span>
                {e.ownerId === profile._id && (
                  <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: e._id }))}>×</Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
