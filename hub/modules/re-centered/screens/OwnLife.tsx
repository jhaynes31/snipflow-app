"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

const STARTERS = ["People", "Rest", "Work", "Faith", "Play", "Body", "Home", "Learning"];

/** The things that are mine, each with one small way back in. */
export function OwnLife() {
  const list = useQuery(api.reCentered.entries.ownLife);
  const add = useMutation(api.reCentered.entries.addOwnLife);
  const { busy, error, run } = useAction();
  const [area, setArea] = useState("");
  const [way, setWay] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My own life" subtitle="The parts of your life that are yours whatever anyone else does. For each, one small way back in on a day you've drifted out." />
      <Card>
        <Field label="An area that is mine">
          <input className="sh-input" value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} />
        </Field>
        <div className="sh-chips" aria-label="Ideas">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="sh-chip" onClick={() => setArea(s)}>
              {s}
            </button>
          ))}
        </div>
        <Field label="One way back in" hint="Small and specific. Text a friend. Ten minutes in the garden. The chapter I keep meaning to read.">
          <input className="sh-input" value={way} onChange={(e) => setWay(e.target.value)} maxLength={300} />
        </Field>
        <ErrorNote error={error} />
        <div className="sh-row mt-3">
          <Btn
            disabled={busy || !area.trim() || !way.trim()}
            onClick={() =>
              void run(async () => {
                await add({ area, wayBackIn: way });
                setArea("");
                setWay("");
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              })
            }
          >
            Add
          </Btn>
          {saved && <Note>Added.</Note>}
        </div>
      </Card>
      {!list ? <Spinner /> : list.map((row) => <Item key={row._id} row={row} />)}
    </div>
  );
}

function Item({ row }: { row: Doc<"rcOwnLife"> }) {
  const update = useMutation(api.reCentered.entries.updateOwnLife);
  const remove = useMutation(api.reCentered.entries.removeOwnLife);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [area, setArea] = useState(row.area);
  const [way, setWay] = useState(row.wayBackIn);
  return (
    <Card tone="alt">
      {editing ? (
        <div className="sh-stack-sm">
          <input className="sh-input" value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} aria-label="Area" />
          <input className="sh-input" value={way} onChange={(e) => setWay(e.target.value)} maxLength={300} aria-label="One way back in" />
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn disabled={busy} onClick={() => void run(async () => { await update({ id: row._id, area, wayBackIn: way }); setEditing(false); })}>Save</Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <>
          <p>
            <strong>{row.area}:</strong> {row.wayBackIn}
          </p>
          <p className="sh-hint">
            <button type="button" className="sh-link" onClick={() => setEditing(true)}>Edit</button> ·{" "}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: row._id }))}>Delete</button>
          </p>
        </>
      )}
    </Card>
  );
}
