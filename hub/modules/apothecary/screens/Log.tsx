"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { areaName, FACTORS } from "@/convex/apothecary/pure";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/** The log: today's thirty-second line of factors, and every entry with what was tried and what helped. */
export function Log() {
  const days = useQuery(api.apothecary.entries.days);
  const entries = useQuery(api.apothecary.entries.entries, { limit: 120 });
  const setDay = useMutation(api.apothecary.entries.setDay);
  const update = useMutation(api.apothecary.entries.updateEntry);
  const remove = useMutation(api.apothecary.entries.removeEntry);
  const { busy, error, run } = useAction();
  if (!days || !entries) return <Spinner />;
  const on = new Set(days.todayRow?.factors ?? []);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Log" subtitle="Thirty seconds a day is what makes the patterns. Tap what's true today." />
      <Card>
        <h2 className="sh-h2">Today, {days.today}</h2>
        <div className="sh-chips">
          {FACTORS.map((f) => (
            <button key={f} type="button" className="sh-chip" aria-pressed={on.has(f)} disabled={busy} onClick={() => void run(() => setDay({ factors: on.has(f) ? [...on].filter((x) => x !== f) : [...on, f], note: days.todayRow?.note }))}>{f}</button>
          ))}
        </div>
        <ErrorNote error={error} />
        <p className="sh-muted mt-2">{days.rows.length} {days.rows.length === 1 ? "day" : "days"} logged. Patterns start showing at five.</p>
      </Card>
      <Card>
        <h2 className="sh-h2">Entries</h2>
        {entries.length === 0 && <p className="sh-muted">Nothing yet. Every Ask saves one here.</p>}
        {entries.map((e) => <EntryRow key={e._id} e={e} busy={busy} onSave={(tried, helped) => void run(() => update({ id: e._id, tried, helped }))} onRemove={() => void run(() => remove({ id: e._id }))} />)}
      </Card>
      <Note>Private to you. Seasons never reads this, and neither does anyone else.</Note>
    </div>
  );
}

function EntryRow({ e, busy, onSave, onRemove }: { e: Doc<"apEntries">; busy: boolean; onSave: (tried?: string, helped?: string) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [tried, setTried] = useState(e.tried ?? "");
  const [helped, setHelped] = useState(e.helped ?? "");
  return (
    <div className="ap-entry">
      <p>
        <strong>{areaName(e.area)}</strong>{e.side !== "n/a" ? `, ${e.side}` : ""} <span className="sh-muted">· {e.day}</span>{" "}
        <span className="ap-sev" aria-label={`Severity ${e.severity} of 5`}>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= e.severity ? "on" : ""} />)}</span>
      </p>
      {e.qualities.length > 0 && <p className="sh-muted">{e.qualities.join(", ")}{e.onset ? ` · ${e.onset}` : ""}{e.duration ? ` · ${e.duration}` : ""}</p>}
      <p>{e.text}</p>
      {(e.tried || e.helped) && !open && <p className="sh-muted">{e.tried ? `Tried: ${e.tried}. ` : ""}{e.helped ? `Helped: ${e.helped}.` : ""}</p>}
      {open ? (
        <>
          <Field label="What I tried"><input className="sh-input" value={tried} onChange={(x) => setTried(x.target.value)} maxLength={600} /></Field>
          <Field label="What helped"><input className="sh-input" value={helped} onChange={(x) => setHelped(x.target.value)} maxLength={600} /></Field>
          <div className="sh-choices"><Btn disabled={busy} onClick={() => { onSave(tried, helped); setOpen(false); }}>Save</Btn><Btn variant="ghost" onClick={() => setOpen(false)}>Back</Btn></div>
        </>
      ) : (
        <div className="sh-choices"><Btn variant="ghost" onClick={() => setOpen(true)}>What I tried, what helped</Btn><Btn variant="ghost" disabled={busy} onClick={onRemove}>Delete</Btn></div>
      )}
    </div>
  );
}
