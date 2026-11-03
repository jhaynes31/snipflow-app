"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readRootedSettings } from "@/convex/rooted/pure";
import { CHECK_BEFORE_INVEST, TRIPWIRE_STARTERS, VOW_STARTER } from "@/core/rooted/content";
import { useHub } from "@/core/shell/HubContext";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, useAction } from "@/core/ui";

/**
 * Written on a calm day, read back on a shaky one. The vow and the
 * tripwires are kept in hub settings and handed to the coach whenever a
 * person is being read, in Rooted, Someone in my circle, or The Orchard.
 */
export function FailSafes() {
  const { profile } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const saved = readRootedSettings(profile.moduleSettings);
  const [vow, setVow] = useState(saved.vow);
  const [tripwires, setTripwires] = useState<string[]>(saved.tripwires);
  const [newWire, setNewWire] = useState("");
  const [checklist, setChecklist] = useState<string[]>(saved.checklist);
  const [newCheck, setNewCheck] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);
  const dirty = vow !== saved.vow || JSON.stringify(tripwires) !== JSON.stringify(saved.tripwires) || JSON.stringify(checklist) !== JSON.stringify(saved.checklist);
  const save = () => void run(() => setModuleSettings({ moduleId: "rooted", settings: { vow, tripwires, checklist } }));
  const list = [...CHECK_BEFORE_INVEST, ...checklist];

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="My fail safes" subtitle="Written on a calm day, read back on a shaky one. Your calm self protecting your activated self." />
      <Card>
        <h2 className="sh-h2">My pacing vow</h2>
        <p className="sh-hint">In your own words. A starter is below; change every word until it sounds like you.</p>
        <RichTextarea className="sh-input sh-textarea" rows={5} value={vow} onChange={(e) => setVow(e.target.value)} maxLength={4000} placeholder={VOW_STARTER} />
        {!vow && <Btn variant="secondary" onClick={() => setVow(VOW_STARTER)}>Start from the starter</Btn>}
      </Card>

      <Card>
        <h2 className="sh-h2">My tripwires</h2>
        <p className="sh-hint">If-then lines. When one trips, the decision is already made, so the shaky day doesn&apos;t have to make it.</p>
        {tripwires.map((t, i) => (
          <div key={`${t}-${i}`} className="rt-entry sh-row" style={{ justifyContent: "space-between", gap: "0.5rem" }}>
            <span><Rich text={t} /></span>
            <button type="button" className="sh-link" onClick={() => setTripwires(tripwires.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <Field label="Add one" hint="Enter adds it.">
          <input className="sh-input" value={newWire} onChange={(e) => setNewWire(e.target.value)} maxLength={300} onKeyDown={(e) => { if (e.key === "Enter" && newWire.trim()) { e.preventDefault(); setTripwires([...tripwires, newWire.trim()]); setNewWire(""); } }} placeholder="If they ___, I ___." />
        </Field>
        <details className="sh-menu">
          <summary>Starters to borrow</summary>
          <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
            {TRIPWIRE_STARTERS.filter((s) => !tripwires.includes(s)).map((s) => (
              <div key={s} className="sh-row" style={{ justifyContent: "space-between", gap: "0.5rem" }}>
                <span>{s}</span>
                <Btn variant="secondary" onClick={() => setTripwires([...tripwires, s])}>Add</Btn>
              </div>
            ))}
          </div>
        </details>
      </Card>

      <Card>
        <h2 className="sh-h2">Check before I invest</h2>
        <p className="sh-hint">Tick through it for anyone new, at week four and again at month three. Add your own lines at the bottom.</p>
        {list.map((q) => (
          <label key={q} className="sh-row rt-entry" style={{ gap: "0.5rem", alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={ticked.includes(q)} onChange={() => setTicked(ticked.includes(q) ? ticked.filter((x) => x !== q) : [...ticked, q])} />
            <span>{q}</span>
          </label>
        ))}
        {ticked.length > 0 && <p className="sh-muted">{ticked.length} of {list.length} answered honestly. The ones you couldn&apos;t tick are the ones to watch.</p>}
        <Field label="Add my own question">
          <input className="sh-input" value={newCheck} onChange={(e) => setNewCheck(e.target.value)} maxLength={200} onKeyDown={(e) => { if (e.key === "Enter" && newCheck.trim()) { e.preventDefault(); setChecklist([...checklist, newCheck.trim()]); setNewCheck(""); } }} />
        </Field>
        {checklist.length > 0 && <p className="sh-hint">Mine: {checklist.map((c, i) => <span key={`${c}-${i}`}>{c} <button type="button" className="sh-link" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>remove</button>{i < checklist.length - 1 ? " · " : ""}</span>)}</p>}
      </Card>

      <ErrorNote error={error} />
      <div className="sh-row">
        <Btn big disabled={busy || !dirty} onClick={save}>{dirty ? "Keep my fail safes" : "Kept"}</Btn>
      </div>
      <Note>
        The coach reads these back to you whenever a person is being sorted: here, in <Link href="/love-and-release/circle" className="sh-link">Someone in my circle</Link>, in The Orchard, and at The Hearth. Nothing here reaches the other one of you.
      </Note>
    </div>
  );
}
