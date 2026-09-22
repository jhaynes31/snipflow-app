"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { KEEPERS, type ChangeSince, type StayKind } from "@/convex/orchard/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

const CHANGE: [ChangeSince, string][] = [["none", "Nothing"], ["some", "Some"], ["real", "Real change"]];

/**
 * Too long. A person, a place or a situation you knew was wrong, the date
 * you first knew, what keeps you, and what has changed since. Time made
 * visible, and asked again every thirty days. The knowing was the answer;
 * this page keeps it from getting quiet.
 */
export function TooLong() {
  const data = useQuery(api.orchard.entries.stays);
  const people = useQuery(api.orchard.entries.people);
  const add = useMutation(api.orchard.entries.addStay);
  const check = useMutation(api.orchard.entries.checkStay);
  const setStatus = useMutation(api.orchard.entries.setStayStatus);
  const remove = useMutation(api.orchard.entries.removeStay);
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<StayKind>("person");
  const [label, setLabel] = useState("");
  const [personId, setPersonId] = useState<Id<"orPeople"> | "">("");
  const [firstKnewDay, setFirstKnewDay] = useState("");
  const [keepers, setKeepers] = useState<string[]>([]);
  const [changeSince, setChangeSince] = useState<ChangeSince>("none");
  const [cost, setCost] = useState("");
  if (!data || !people) return <Spinner />;
  const staying = data.stays.filter((s) => s.status === "staying");
  const past = data.stays.filter((s) => s.status !== "staying");

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Too long" subtitle="Where you already know, and stay anyway. Time made visible, and asked again every thirty days." />
      <Note>
        The pattern isn&apos;t not knowing. You knew. The pattern is the months between knowing and leaving, filled with hope, guilt, the years invested, and the fear of being lonely. This page keeps the date of the knowing where you can see it, and asks the same question each month: what has changed since?
      </Note>

      {staying.map((s) => <StayCard key={s._id} s={s} busy={busy} onCheck={(c, note, k) => void run(() => check({ id: s._id, changeSince: c, note, keepers: k }))} onStatus={(st) => void run(() => setStatus({ id: s._id, status: st }))} onRemove={() => void run(() => remove({ id: s._id }))} />)}

      <Card>
        {!open ? (
          <Btn onClick={() => setOpen(true)}>Name one</Btn>
        ) : (
          <>
            <h2 className="sh-h2">Something I already know about</h2>
            <div className="sh-chips">
              {([["person", "A person"], ["place", "A place"], ["situation", "A situation"]] as [StayKind, string][]).map(([k, t]) => <button key={k} type="button" className="sh-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{t}</button>)}
            </div>
            {kind === "person" && people.people.length > 0 && (
              <Field label="From the orchard (optional)">
                <select className="sh-input" value={personId} onChange={(e) => { setPersonId(e.target.value as Id<"orPeople">); const p = people.people.find((x) => x._id === e.target.value); if (p) setLabel(p.name); }}>
                  <option value="">Someone else</option>
                  {people.people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <Field label={kind === "person" ? "Who" : kind === "place" ? "Where" : "What"} hint={kind === "situation" ? "A job, a church, a role, an arrangement." : undefined}>
              <input className="sh-input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
            </Field>
            <Field label="When did you first know?" hint="The day you first knew it was wrong for you. A guess is fine.">
              <input className="sh-input" type="date" value={firstKnewDay} onChange={(e) => setFirstKnewDay(e.target.value)} />
            </Field>
            <p className="sh-eyebrow">What keeps you</p>
            <div className="sh-chips">
              {KEEPERS.map((k) => <button key={k} type="button" className="sh-chip" aria-pressed={keepers.includes(k)} onClick={() => setKeepers((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}>{k}</button>)}
            </div>
            <p className="sh-eyebrow mt-2">What has changed since you first knew?</p>
            <div className="sh-choices">{CHANGE.map(([c, t]) => <Btn key={c} variant={changeSince === c ? "primary" : "secondary"} onClick={() => setChangeSince(c)}>{t}</Btn>)}</div>
            <Field label="What it's costing you (optional)" hint="Energy, health, peace, money, time, the marriage.">
              <input className="sh-input" value={cost} onChange={(e) => setCost(e.target.value)} maxLength={400} />
            </Field>
            <CrisisNotice texts={[label, cost]} />
            <ErrorNote error={error} />
            <div className="sh-choices mt-2">
              <Btn disabled={busy || !label.trim() || !firstKnewDay} onClick={() => void run(async () => { await add({ kind, label, personId: personId || undefined, firstKnewDay, keepers, changeSince, cost: cost || undefined }); setOpen(false); setLabel(""); setPersonId(""); setFirstKnewDay(""); setKeepers([]); setChangeSince("none"); setCost(""); })}>Keep the date</Btn>
              <Btn variant="ghost" onClick={() => setOpen(false)}>Not now</Btn>
            </div>
          </>
        )}
      </Card>

      {past.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Left, or leaving</h2>
          {past.map((s) => (
            <div key={s._id} className="or-entry">
              <p><strong>{s.label}</strong> <span className="sh-muted">· {s.status} · first knew {s.firstKnewDay}, {s.daysSinceKnew} days</span></p>
              <div className="sh-choices">
                {s.status === "leaving" && <Btn variant="secondary" disabled={busy} onClick={() => void run(() => setStatus({ id: s._id, status: "left" }))}>I left</Btn>}
                <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: s._id }))}>Delete</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}
      <Note>
        For a person, the <Link href="/orchard/compass" className="sh-link">Compass</Link> holds the how. For a place or a situation, the smallest first step out belongs in <Link href="/every-box/commitments" className="sh-link">Every Box</Link>, and a bigger move in <Link href="/crossroads" className="sh-link">The Crossroads</Link>.
      </Note>
    </div>
  );
}

function StayCard({ s, busy, onCheck, onStatus, onRemove }: { s: Doc<"orStays"> & { daysSinceKnew: number; read: { call: string; text: string }; checkDue: boolean }; busy: boolean; onCheck: (c: ChangeSince, note?: string, keepers?: string[]) => void; onStatus: (st: "leaving" | "left") => void; onRemove: () => void }) {
  const [checking, setChecking] = useState(false);
  const [c, setC] = useState<ChangeSince>(s.changeSince);
  const [note, setNote] = useState("");
  const [keepers, setKeepers] = useState<string[]>(s.keepers);
  const months = Math.floor(s.daysSinceKnew / 30);
  return (
    <Card tone={s.read.call === "time" ? undefined : "alt"}>
      <h2 className="sh-h2">{s.label} <span className="sh-muted">· {s.kind}</span></h2>
      <p className="or-truth">{months >= 1 ? `${months} ${months === 1 ? "month" : "months"} since you first knew.` : `${s.daysSinceKnew} days since you first knew.`}</p>
      <p>{s.read.text}</p>
      {s.cost && <p className="sh-muted">Costing: {s.cost}</p>}
      {s.checkDue && <p className="sh-muted">It&apos;s been a month since you last looked. Still there?</p>}
      {!checking ? (
        <div className="sh-choices">
          <Btn variant="secondary" disabled={busy} onClick={() => setChecking(true)}>Still here. Check in</Btn>
          <Btn disabled={busy} onClick={() => onStatus("leaving")}>I&apos;m leaving</Btn>
          <Btn variant="ghost" disabled={busy} onClick={() => onStatus("left")}>I left</Btn>
          <Btn variant="ghost" disabled={busy} onClick={onRemove}>Delete</Btn>
        </div>
      ) : (
        <>
          <p className="sh-eyebrow mt-2">What has changed since you first knew?</p>
          <div className="sh-choices">{CHANGE.map(([k, t]) => <Btn key={k} variant={c === k ? "primary" : "secondary"} onClick={() => setC(k)}>{t}</Btn>)}</div>
          <p className="sh-eyebrow mt-2">What keeps you, today</p>
          <div className="sh-chips">{KEEPERS.map((k) => <button key={k} type="button" className="sh-chip" aria-pressed={keepers.includes(k)} onClick={() => setKeepers((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}>{k}</button>)}</div>
          <Field label="A line for the record (optional)"><input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
          <div className="sh-choices">
            <Btn disabled={busy} onClick={() => { onCheck(c, note || undefined, keepers); setChecking(false); setNote(""); }}>Save the check</Btn>
            <Btn variant="ghost" onClick={() => setChecking(false)}>Back</Btn>
          </div>
        </>
      )}
      {s.checks.length > 1 && (
        <details className="sh-menu mt-2"><summary>Earlier checks</summary>{s.checks.map((ch, i) => <p key={i} className="sh-muted">{ch.day}: {ch.changeSince}{ch.note ? ` · ${ch.note}` : ""}</p>)}</details>
      )}
    </Card>
  );
}
