"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { HALO_QUESTIONS, LAYERS, SAFE_QUESTIONS, WATCH_FOR, type SafeAnswer } from "@/convex/orchard/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";

const NOTE_KINDS = [
  ["fact", "What they showed", "Only things you watched happen."],
  ["story", "The story I'm telling", "The fantasy, the expectation, the mind-reading. Named, it loses power."],
  ["green", "Green flag", ""],
  ["flag", "Watch note", "Something that made you pause."],
  ["showedUp", "They showed up", ""],
  ["gave", "I gave", "A favor, time, money, a pearl."],
] as const;
type NoteKind = (typeof NOTE_KINDS)[number][0];

/** One person: what they've shown beside the story, the checks, and the move with a reason. */
export function Person({ id }: { id: string }) {
  const { partner } = useHub();
  const p = useQuery(api.orchard.entries.person, { id: id as Id<"orPeople"> });
  const addNote = useMutation(api.orchard.entries.addNote);
  const removeNote = useMutation(api.orchard.entries.removeNote);
  const update = useMutation(api.orchard.entries.updatePerson);
  const move = useMutation(api.orchard.entries.move);
  const remove = useMutation(api.orchard.entries.removePerson);
  const halo = useMutation(api.orchard.entries.halo);
  const safe = useMutation(api.orchard.entries.safe);
  const { busy, error, run, setError } = useAction();
  const [kind, setKind] = useState<NoteKind>("fact");
  const [text, setText] = useState("");
  const [shareNote, setShareNote] = useState(false);
  const [panel, setPanel] = useState<"none" | "move" | "halo" | "safe" | "story">("none");
  const [to, setTo] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [excitement, setExcitement] = useState(3);
  const [haloAnswers, setHaloAnswers] = useState<Record<string, string>>({});
  const [haloRead, setHaloRead] = useState<{ read: string; readOn: string } | null>(null);
  const [safeAnswers, setSafeAnswers] = useState<Record<string, SafeAnswer>>({});
  const [safeResult, setSafeResult] = useState<{ text: string; untested: string[] } | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (p === undefined) return <Spinner />;
  const layer = LAYERS[p.layer];
  const facts = p.notes.filter((n) => n.kind === "fact" || n.kind === "showedUp" || n.kind === "green");
  const stories = p.notes.filter((n) => n.kind === "story");
  const flags = p.notes.filter((n) => n.kind === "flag" || n.kind === "conflict");
  const gave = p.notes.filter((n) => n.kind === "gave");

  if (!p.mine) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title={p.name} subtitle={`Shared by ${partner?.displayName ?? "your partner"}. ${layer.name}, ${p.daysKnown} days.`} />
        <Card>
          <h2 className="sh-h2">What they chose to share</h2>
          {p.notes.length === 0 && <p className="sh-muted">Only the name and the layer, so far.</p>}
          {p.notes.map((n) => <p key={n._id} className="or-entry">{n.text} <span className="sh-muted">· {n.day}</span></p>)}
        </Card>
        <Link href="/orchard/together" className="sh-link">Back to Together</Link>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={p.name} subtitle={`${layer.name} · ${p.daysKnown} days known${p.howMet ? ` · ${p.howMet}` : ""}${p.state !== "growing" ? ` · ${p.state}` : ""}`} />

      {p.story && (
        <Card tone="alt">
          <p className="sh-eyebrow">The story I told myself{p.storyReadDay ? (p.storyReadDay <= p.today ? " · time to re-read it" : ` · re-read on ${p.storyReadDay}`) : ""}</p>
          <p className="or-story">{p.story}</p>
          <p className="sh-muted">Now read the facts below. How much of the story have they actually shown?</p>
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">What they&apos;ve actually shown</h2>
        {facts.length === 0 && <p className="sh-muted">Nothing watched yet. That&apos;s honest. The list grows in the ordinary.</p>}
        {facts.map((n) => (
          <div key={n._id} className="or-entry">
            <p>{n.kind === "green" ? "Green: " : n.kind === "showedUp" ? "Showed up: " : ""}{n.text} <span className="sh-muted">· {n.day}{n.visibility === "shared" ? " · shared" : ""}</span></p>
            <Btn variant="ghost" disabled={busy} onClick={() => void run(() => removeNote({ id: n._id }))}>Delete</Btn>
          </div>
        ))}
      </Card>

      {(stories.length > 0 || flags.length > 0 || gave.length > 0) && (
        <Card tone="alt">
          {stories.length > 0 && <><h2 className="sh-h2">Stories I&apos;ve caught myself telling</h2>{stories.map((n) => <p key={n._id} className="or-entry or-story">{n.text} <span className="sh-muted">· {n.day}</span></p>)}</>}
          {flags.length > 0 && <><h2 className="sh-h2 mt-3">Watch notes</h2>{flags.map((n) => <p key={n._id} className="or-entry">{n.kind === "conflict" ? "Conflict: " : ""}{n.text} <span className="sh-muted">· {n.day}</span></p>)}</>}
          {gave.length > 0 && <><h2 className="sh-h2 mt-3">What I&apos;ve given</h2>{gave.map((n) => <p key={n._id} className="or-entry">{n.text} <span className="sh-muted">· {n.day}</span></p>)}</>}
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Add a note</h2>
        <div className="sh-chips">
          {NOTE_KINDS.map(([k, label]) => <button key={k} type="button" className="sh-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}
        </div>
        <Field label={NOTE_KINDS.find(([k]) => k === kind)?.[1] ?? ""} hint={NOTE_KINDS.find(([k]) => k === kind)?.[2]}>
          <textarea className="sh-input sh-textarea" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        </Field>
        {p.visibility === "shared" && <Toggle checked={shareNote} onChange={setShareNote} label={`Let ${partner?.displayName ?? "your partner"} see this note`} />}
        <CrisisNotice texts={[text]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await addNote({ personId: p._id, kind, text, shared: shareNote }); setText(""); })}>Add</Btn>
      </Card>

      <Card>
        <h2 className="sh-h2">Checks</h2>
        <div className="sh-choices">
          <Btn variant={panel === "halo" ? "primary" : "secondary"} onClick={() => setPanel(panel === "halo" ? "none" : "halo")}>Halo check</Btn>
          <Btn variant={panel === "safe" ? "primary" : "secondary"} onClick={() => setPanel(panel === "safe" ? "none" : "safe")}>Safe for me?</Btn>
          <Link href={`/orchard/compass?person=${p._id}`} className="sh-btn sh-btn-secondary">The Compass</Link>
          <Btn variant={panel === "move" ? "primary" : "secondary"} onClick={() => setPanel(panel === "move" ? "none" : "move")}>Move</Btn>
        </div>

        {panel === "halo" && (
          <div className="mt-3">
            <p className="sh-muted">Am I excited about them, or about being chosen? Both are allowed. Only one is about them.</p>
            <Field label="How excited am I right now, 1 to 5?">
              <div className="sh-choices">{[1, 2, 3, 4, 5].map((n) => <Btn key={n} variant={excitement === n ? "primary" : "secondary"} onClick={() => setExcitement(n)}>{n}</Btn>)}</div>
            </Field>
            {HALO_QUESTIONS.map((q) => (
              <Field key={q.key} label={q.q} hint={q.hint}>
                <input className="sh-input" value={haloAnswers[q.key] ?? ""} onChange={(e) => setHaloAnswers({ ...haloAnswers, [q.key]: e.target.value })} maxLength={600} />
              </Field>
            ))}
            <Btn disabled={busy} onClick={() => void run(async () => { const r = await halo({ personId: p._id, excitement, answers: haloAnswers }); setHaloRead(r); })}>Read it back to me</Btn>
            {haloRead && <Note><p>{haloRead.read}</p><p className="sh-muted">Re-read the story on {haloRead.readOn}.</p></Note>}
          </div>
        )}

        {panel === "safe" && (
          <div className="mt-3">
            {SAFE_QUESTIONS.map((q) => (
              <div key={q.key} className="or-entry">
                <p>{q.q}</p>
                <div className="sh-choices">
                  {(["yes", "unsure", "no"] as SafeAnswer[]).map((a) => <Btn key={a} variant={safeAnswers[q.key] === a ? "primary" : "secondary"} onClick={() => setSafeAnswers({ ...safeAnswers, [q.key]: a })}>{q[a]}</Btn>)}
                </div>
              </div>
            ))}
            <Btn className="mt-2" disabled={busy || Object.keys(safeAnswers).length < SAFE_QUESTIONS.length} onClick={() => void run(async () => { const r = await safe({ personId: p._id, answers: safeAnswers }); setSafeResult(r); })}>Read it back to me</Btn>
            {safeResult && (
              <Note>
                <p>{safeResult.text}</p>
                {safeResult.untested.length > 0 && <p className="sh-muted">Not tested yet: {safeResult.untested.join(" ")} Those are the tests still ahead, not marks against them.</p>}
              </Note>
            )}
            <details className="sh-menu mt-2"><summary>What to watch for, in the ordinary</summary><ul className="sh-list">{WATCH_FOR.map((w) => <li key={w}>{w}</li>)}</ul></details>
          </div>
        )}

        {panel === "move" && (
          <div className="mt-3">
            {p.nextLayer && !p.nextLayer.ok && <p className="sh-muted">Slow trust: {LAYERS[p.layer + 1].name} usually waits until {p.nextLayer.needed} days known. You&apos;re at {p.nextLayer.daysKnown}; ready on {p.nextLayer.readyOn}. Moving inward before then is allowed, with a reason you&apos;d say out loud.</p>}
            <div className="sh-chips">
              {LAYERS.map((l) => <button key={l.index} type="button" className="sh-chip" aria-pressed={to === l.index} disabled={l.index === p.layer} onClick={() => setTo(l.index)}>{l.name}</button>)}
            </div>
            {to !== null && (
              <>
                <p className="sh-muted mt-2">{LAYERS[to].meaning} {to > p.layer ? `Earned by: ${LAYERS[to].earnedBy.join("; ")}.` : `Exit signals for where they are: ${layer.exitSignals.join("; ")}.`}</p>
                <Field label="Why" hint="One line you could say to a friend. Moving out quietly is a fine reason too.">
                  <input className="sh-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
                </Field>
                <div className="sh-choices">
                  <Btn disabled={busy || !reason.trim()} onClick={() => void run(async () => { try { await move({ id: p._id, to, reason }); setPanel("none"); setTo(null); setReason(""); } catch (e) { setError((e as { data?: string }).data ?? "Couldn't move them."); } })}>Move them</Btn>
                  {p.nextLayer && !p.nextLayer.ok && to > p.layer && <Btn variant="ghost" disabled={busy || !reason.trim()} onClick={() => void run(async () => { await move({ id: p._id, to, reason, anyway: true }); setPanel("none"); setTo(null); setReason(""); })}>Move anyway</Btn>}
                </div>
              </>
            )}
          </div>
        )}
        {p.moves.length > 0 && (
          <details className="sh-menu mt-2"><summary>Moves so far</summary>{p.moves.map((m) => <p key={m._id} className="sh-muted">{LAYERS[m.from].name} to {LAYERS[m.to].name}: {m.reason} · {timeAgo(m.createdAt)}</p>)}</details>
        )}
        {p.checks.length > 0 && (
          <details className="sh-menu mt-2"><summary>Earlier checks</summary>{p.checks.map((c) => <p key={c._id} className="sh-muted"><strong>{c.kind === "halo" ? "Halo" : c.kind === "safe" ? "Safe for me" : "Compass"}</strong> · {timeAgo(c.createdAt)}: {c.read.length > 160 ? `${c.read.slice(0, 158)}…` : c.read}</p>)}</details>
        )}
      </Card>

      <Card tone="alt">
        <h2 className="sh-h2">This person</h2>
        <p className="sh-eyebrow">Pearls I&apos;m holding</p>
        <p className="sh-muted">{p.pearls.length ? p.pearls.join(" · ") : "None held."}</p>
        <div className="sh-choices mt-2">
          <Btn variant="secondary" onClick={() => { setStory(p.story ?? ""); setPanel(panel === "story" ? "none" : "story"); }}>{p.story ? "Rewrite the story" : "Write the story I'm telling"}</Btn>
          {p.state === "growing" ? <Btn variant="ghost" disabled={busy} onClick={() => void run(() => update({ id: p._id, state: "resting" }))}>Let it rest</Btn> : <Btn variant="ghost" disabled={busy} onClick={() => void run(() => update({ id: p._id, state: "growing" }))}>Growing again</Btn>}
          {p.state !== "released" && <Btn variant="ghost" disabled={busy} onClick={() => void run(() => update({ id: p._id, state: "released" }))}>Release</Btn>}
        </div>
        {panel === "story" && story !== null && (
          <div className="mt-2">
            <textarea className="sh-input sh-textarea" rows={3} value={story} onChange={(e) => setStory(e.target.value)} maxLength={1500} />
            <Btn className="mt-2" disabled={busy} onClick={() => void run(async () => { await update({ id: p._id, story }); setPanel("none"); })}>Save, and re-read in a month</Btn>
          </div>
        )}
        {partner && (
          <Toggle checked={p.visibility === "shared"} onChange={(v) => void run(() => update({ id: p._id, visibility: v ? "shared" : "private" }))} label={`Share with ${partner.displayName}`} hint="They see the name and the layer, and only the notes you mark shared. Never the story, the checks, or the pearls." />
        )}
        {!confirmDelete ? (
          <Btn variant="ghost" onClick={() => setConfirmDelete(true)}>Delete this person</Btn>
        ) : (
          <div className="sh-choices"><Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: p._id }))}>Yes, delete everything about them</Btn><Btn variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Btn></div>
        )}
      </Card>
      <Link href="/orchard" className="sh-link">Back to People</Link>
    </div>
  );
}
