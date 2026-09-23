"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CALL_LABEL, LAYERS, type CompassCall, type Expect, type Feel, type Repaired, type Times } from "@/convex/orchard/pure";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/**
 * The Compass: when conflict or a pattern shows, which way? Say it once,
 * say it and adjust, adjust quietly, step back, or leave. Six questions,
 * one plain reading with the why, a script when talking is the call, and
 * a suggested layer. Never a verdict on the person; a direction for you.
 */
export function CompassScreen() {
  return (
    <Suspense fallback={<Spinner />}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const data = useQuery(api.orchard.entries.people);
  const sig = useQuery(api.orchard.entries.signals);
  const check = useMutation(api.orchard.entries.compassCheck);
  const move = useMutation(api.orchard.entries.move);
  const { busy, error, run } = useAction();
  const [personId, setPersonId] = useState<Id<"orPeople"> | "">(() => (params.get("person") as Id<"orPeople"> | null) ?? "");
  const [what, setWhat] = useState("");
  const [times, setTimes] = useState<Times | null>(null);
  const [said, setSaid] = useState<"yes" | "no" | null>(null);
  const [safety, setSafety] = useState<boolean | null>(null);
  const [expect, setExpect] = useState<Expect | null>(null);
  const [repaired, setRepaired] = useState<Repaired | null>(null);
  const [feel, setFeel] = useState<Feel | null>(null);
  const [signals, setSignals] = useState<string[]>([]);
  const [result, setResult] = useState<{ call: CompassCall; why: string[]; script: string | null; suggestedLayer: number; currentLayer: number; signalName: string | null; priorSightings: number } | null>(null);
  const [talk, setTalk] = useState(false);
  if (!data || !sig) return <Spinner />;
  const people = data.people.filter((p) => p.state !== "released");
  const person = people.find((p) => p._id === personId) ?? null;
  const ready = person && what.trim() && times && said && safety !== null && expect && repaired && feel;

  const choice = <T extends string>(label: string, options: [T, string][], value: T | null, set: (v: T) => void) => (
    <div className="or-entry">
      <p>{label}</p>
      <div className="sh-choices">{options.map(([k, text]) => <Btn key={k} variant={value === k ? "primary" : "secondary"} onClick={() => set(k)}>{text}</Btn>)}</div>
    </div>
  );

  if (result && person) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title={CALL_LABEL[result.call]} subtitle={`About ${person.name}. A direction for you, not a verdict on them.`} />
        <Card>
          {result.signalName && <p className="sh-eyebrow">{result.signalName}{result.priorSightings > 0 ? ` · seen ${result.priorSightings} ${result.priorSightings === 1 ? "time" : "times"} before` : " · first sighting"}</p>}
          {result.why.map((w) => <p key={w}>{w}</p>)}
          {result.script && (
            <>
              <p className="sh-eyebrow mt-3">One way to say it</p>
              <p className="or-truth">&ldquo;{result.script}&rdquo;</p>
              <p className="sh-muted">Short. Then stop talking and watch what they do with it. That&apos;s the data.</p>
            </>
          )}
          {result.suggestedLayer !== result.currentLayer && (
            <>
              <p className="sh-eyebrow mt-3">Access</p>
              <p>They&apos;re at {LAYERS[result.currentLayer].name}. This points toward {LAYERS[result.suggestedLayer].name}: {LAYERS[result.suggestedLayer].access.join(", ").toLowerCase()}.</p>
              <Btn variant="secondary" disabled={busy} onClick={() => void run(() => move({ id: person._id, to: result.suggestedLayer, reason: `Compass: ${CALL_LABEL[result.call]}` }))}>Move them to {LAYERS[result.suggestedLayer].name}</Btn>
            </>
          )}
          {result.call === "leave" && <p className="sh-muted mt-3">Leaving can be quiet. You don&apos;t owe a closing speech to someone who has shown you this more than once. If anything about it feels unsafe, <Link href="/help-now" className="sh-link">Need help now</Link> is one tap away.</p>}
          <ErrorNote error={error} />
        </Card>
        <div className="sh-choices">
          <Btn variant="secondary" onClick={() => setTalk((v) => !v)}>{talk ? "Close the coach" : "Talk it through"}</Btn>
          <LinkBtn href={`/orchard/person/${person._id}`} variant="ghost">Back to {person.name}</LinkBtn>
          <Btn variant="ghost" onClick={() => setResult(null)}>Start over</Btn>
        </div>
        {talk && <CoachChat module="orchard" task="orchard.compass" opening={`About a friend, ${person.name} (${LAYERS[person.layer].name}, known ${person.daysKnown} days). What happened: ${what}.${result.signalName ? ` My signal: ${result.signalName}, seen ${result.priorSightings} times before.` : ""} The compass said: ${CALL_LABEL[result.call]}.`} placeholder="What's the part you're unsure about?" />}
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Compass" subtitle="Conflict, or a pattern. Say it, adjust access quietly, step back, or leave? Six questions." />
      {people.length === 0 ? (
        <Card><p className="sh-muted">No one in the orchard yet. <Link href="/orchard" className="sh-link">Plant someone</Link> first.</p></Card>
      ) : (
        <Card>
          <Field label="Who">
            <select className="sh-input" value={personId} onChange={(e) => setPersonId(e.target.value as Id<"orPeople">)}>
              <option value="">Pick a person</option>
              {people.map((p) => <option key={p._id} value={p._id}>{p.name} · {p.layerName}</option>)}
            </select>
          </Field>
          <Field label="What happened" hint="Just the facts a camera would record.">
            <textarea className="sh-input sh-textarea" rows={2} value={what} onChange={(e) => setWhat(e.target.value)} maxLength={600} />
          </Field>
          <div className="or-entry">
            <p>Which of my signals is this? Pick every one that fits, or none.</p>
            <div className="sh-chips">
              {sig.list.map((s) => <button key={s.key} type="button" className="sh-chip" aria-pressed={signals.includes(s.key)} onClick={() => setSignals((cur) => (cur.includes(s.key) ? cur.filter((x) => x !== s.key) : [...cur, s.key]))}>{s.name}{s.hardLine ? " (hard line)" : ""}</button>)}
            </div>
          </div>
          {choice("Is this the first time, or a pattern?", [["first", "First time"], ["second", "Second time"], ["pattern", "A pattern"]], times, setTimes)}
          {choice("Have you told them, out loud, that this matters to you?", [["yes", "Yes"], ["no", "No, or not clearly"]], said, setSaid)}
          {choice("Does it touch your safety: body, money, home, marriage, confidences?", [["yes", "Yes"], ["no", "No"]], safety === null ? null : safety ? "yes" : "no", (v) => setSafety(v === "yes"))}
          {choice("If you raised it, what do you honestly expect?", [["repair", "They'd hear it and repair"], ["defensive", "Defensive, then maybe"], ["punish", "It would cost me"], ["unknown", "I don't know"]], expect, setExpect)}
          {choice("Have they repaired after a rupture before?", [["yes", "Yes"], ["no", "No"], ["untested", "Never tested"]], repaired, setRepaired)}
          {choice("After time with them lately, you feel…", [["filled", "Filled"], ["mixed", "Mixed"], ["drained", "Drained"]], feel, setFeel)}
          <CrisisNotice texts={[what]} />
          <ErrorNote error={error} />
          <Btn className="mt-2" disabled={busy || !ready} onClick={() => void run(async () => { const r = await check({ personId: person!._id, what, times: times!, said: said!, safety: safety!, expect: expect!, repaired: repaired!, feel: feel!, signals: signals.length ? signals : undefined }); setResult(r); })}>Which way?</Btn>
        </Card>
      )}
      <Note>
        Three honest options exist between &ldquo;confront&rdquo; and &ldquo;leave,&rdquo; and most friendships live there: say it once, say it and let access match what they show, or adjust quietly. Quiet adjustment isn&apos;t cowardice. It&apos;s letting the layer match the evidence.
      </Note>
    </div>
  );
}
