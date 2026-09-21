"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LIES } from "@/core/well/lies";
import { parseRef, refHref } from "@/core/well/refs";
import { useHub } from "@/core/shell/HubContext";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/** Lies and truth: a lie beside what Jesus says and does. Starter cards, and your own. */
export function Lies() {
  const { profile } = useHub();
  const mine = useQuery(api.well.entries.lies);
  const add = useMutation(api.well.entries.addLie);
  const remove = useMutation(api.well.entries.removeLie);
  const toEvidence = useMutation(api.tend.evidence.add);
  const { busy, error, run } = useAction();
  const [lie, setLie] = useState("");
  const [truth, setTruth] = useState("");
  const [ref, setRef] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const groups = [
    { key: "identity", title: "Lies about who I am", cards: LIES.filter((l) => l.group === "identity") },
    { key: "religious", title: "Lies religion taught me", cards: LIES.filter((l) => l.group === "religious") },
  ] as const;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Lies and truth" subtitle="A lie, and what Jesus says and does. Read the one you need. Add your own when you find the truth." />
      <Card>
        <h2 className="sh-h2">My own cards</h2>
        <Field label="The lie, in its exact words">
          <input className="sh-input" value={lie} onChange={(e) => setLie(e.target.value)} maxLength={300} />
        </Field>
        <Field label="What's actually true" hint="In your words. What Jesus did or said that answers it.">
          <textarea className="sh-input sh-textarea" rows={2} value={truth} onChange={(e) => setTruth(e.target.value)} maxLength={800} />
        </Field>
        <Field label="A reference, if you have one" hint="For example: john 8:10-11">
          <input className="sh-input" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} />
        </Field>
        <CrisisNotice texts={[lie, truth]} />
        <ErrorNote error={error} />
        <div className="sh-row">
          <Btn disabled={busy || !lie.trim() || !truth.trim()} onClick={() => void run(async () => { await add({ lie, truth, ref: ref || undefined }); setLie(""); setTruth(""); setRef(""); setSaved("Kept."); })}>
            Keep this card
          </Btn>
          {saved && <Note>{saved}</Note>}
        </div>
        {!mine ? (
          <Spinner />
        ) : (
          mine.map((c) => {
            const r = c.ref ? parseRef(c.ref) : null;
            return (
              <div key={c._id} className="well-entry">
                <p className="sh-muted">&ldquo;{c.lie}&rdquo;</p>
                <p>{c.truth}</p>
                <p className="sh-hint">
                  {r && (
                    <>
                      <Link href={refHref(r)} className="sh-link">{c.ref}</Link> ·{" "}
                    </>
                  )}
                  <button type="button" className="sh-link" disabled={busy} onClick={() => void run(async () => { await toEvidence({ aboutProfileId: profile._id, text: c.truth.slice(0, 300), showed: "What's true about me" }); setSaved("Saved to your Evidence Bank."); })}>
                    Save to my Evidence Bank
                  </button>{" "}
                  ·{" "}
                  <Link href={`/renewed-mind/beliefs?old=${encodeURIComponent(c.lie)}${c.ref ? `&ref=${encodeURIComponent(c.ref)}` : ""}`} className="sh-link">Make this mine</Link>{" "}
                  ·{" "}
                  <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: c._id }))}>Delete</button>
                </p>
              </div>
            );
          })
        )}
      </Card>
      {groups.map((g) => (
        <Card key={g.key}>
          <h2 className="sh-h2">{g.title}</h2>
          {g.cards.map((c) => (
            <div key={c.key} className="well-entry">
              <p className="sh-muted">&ldquo;{c.lie}&rdquo;</p>
              <p>{c.truth}</p>
              <p className="sh-hint">
                <Link href={refHref(c.ref)} className="sh-link">Read it</Link> ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(async () => { await toEvidence({ aboutProfileId: profile._id, text: c.truth.slice(0, 300), showed: "What's true about me" }); setSaved("Saved to your Evidence Bank."); })}>
                  Save to my Evidence Bank
                </button>{" "}
                ·{" "}
                <Link href={`/renewed-mind/beliefs?old=${encodeURIComponent(c.lie)}&ref=${encodeURIComponent(`${c.ref.book} ${c.ref.chapter}:${c.ref.from}${c.ref.to ? `-${c.ref.to}` : ""}`)}`} className="sh-link">Make this mine</Link>
              </p>
            </div>
          ))}
        </Card>
      ))}
      <p className="sh-hint">Tend&apos;s Shame Interrupter can bring you here. &ldquo;Make this mine&rdquo; starts a Put Off, Put On line in Renewed Mind with the lie filled in. The starter cards are a first draft for the two of you to review.</p>
    </div>
  );
}
