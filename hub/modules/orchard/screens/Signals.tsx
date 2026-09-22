"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SIGNALS } from "@/convex/orchard/signals";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

/** My signals: what I'm done with, how it shows early, the test, the response, and the twin I'm looking for. */
export function Signals() {
  const { partner } = useHub();
  const data = useQuery(api.orchard.entries.signals);
  const toggle = useMutation(api.orchard.entries.toggleSignal);
  const add = useMutation(api.orchard.entries.addSignal);
  const remove = useMutation(api.orchard.entries.removeSignal);
  const { busy, error, run } = useAction();
  const [form, setForm] = useState({ name: "", tell: "", test: "", response: "", twin: "", hardLine: false });
  if (!data) return <Spinner />;
  const off = new Set(data.off);
  const custom = data.list.filter((s) => s.key.startsWith("own-"));

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My signals" subtitle="The patterns I'm done with. Each with how it shows early, the test that reveals it, what I do when it shows, and the twin I'm actually looking for." />
      <Note>
        A single sighting is data, not a verdict; everyone fails one of these on a bad week. Two or three is a pattern. The two hard lines are different: one clear sighting changes access. The tests mostly ask you to do less, which is how you find out in week three instead of month eight.
      </Note>
      {SIGNALS.map((s) => (
        <Card key={s.key} tone={off.has(s.key) ? "alt" : undefined}>
          <h2 className="sh-h2">{s.name}{s.hardLine ? <span className="or-layer" style={{ marginLeft: "0.5rem" }}>hard line</span> : null}</h2>
          <p><strong>The tell.</strong> {s.tell}</p>
          <p><strong>The test.</strong> {s.test}</p>
          <p><strong>When it shows.</strong> {s.response}</p>
          <p className="sh-muted"><strong>Looking for instead:</strong> {s.twin}</p>
          <Toggle checked={!off.has(s.key)} onChange={(on) => void run(() => toggle({ key: s.key, on }))} label="On my list" />
        </Card>
      ))}
      {custom.length > 0 && (
        <Card>
          <h2 className="sh-h2">My own</h2>
          {custom.map((s) => (
            <div key={s.key} className="or-entry">
              <p><strong>{s.name}</strong>{s.hardLine ? " · hard line" : ""}</p>
              <p className="sh-muted">Tell: {s.tell} Test: {s.test} When it shows: {s.response} Looking for: {s.twin}</p>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ key: s.key }))}>Remove</Btn>
            </div>
          ))}
        </Card>
      )}
      <Card>
        <h2 className="sh-h2">Add one of my own</h2>
        <Field label="Name it"><input className="sh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></Field>
        <Field label="The tell" hint="How it shows early."><input className="sh-input" value={form.tell} onChange={(e) => setForm({ ...form, tell: e.target.value })} maxLength={300} /></Field>
        <Field label="The test" hint="What reveals it, usually something you do less of."><input className="sh-input" value={form.test} onChange={(e) => setForm({ ...form, test: e.target.value })} maxLength={300} /></Field>
        <Field label="When it shows"><input className="sh-input" value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} maxLength={300} /></Field>
        <Field label="Looking for instead" hint="The green twin."><input className="sh-input" value={form.twin} onChange={(e) => setForm({ ...form, twin: e.target.value })} maxLength={120} /></Field>
        <Toggle checked={form.hardLine} onChange={(v) => setForm({ ...form, hardLine: v })} label="A hard line" hint="One clear sighting changes access." />
        <ErrorNote error={error} />
        <Btn disabled={busy || !form.name.trim() || !form.tell.trim() || !form.test.trim() || !form.response.trim() || !form.twin.trim()} onClick={() => void run(async () => { await add(form); setForm({ name: "", tell: "", test: "", response: "", twin: "", hardLine: false }); })}>Add it</Btn>
      </Card>
      <p className="sh-muted">{partner?.displayName ?? "Your partner"} has the same starting list and their own switches. Lists aren&apos;t shared; sightings aren&apos;t either.</p>
    </div>
  );
}
