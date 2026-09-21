"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ARENA_LABEL, extractSteps, suggestFor, THEMES, type Arena } from "@/convex/renewedMind/library";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * Live It: where a truer line gets felt. Pick a line; take a practical step
 * from the library or from the coach, in the marriage, outside the house,
 * with friends, at work, or with God; then say what actually happened. When
 * it held, it becomes evidence on its own.
 */
export function Live() {
  const beliefs = useQuery(api.renewedMind.entries.beliefs);
  const steps = useQuery(api.renewedMind.entries.steps);
  const addStep = useMutation(api.renewedMind.entries.addStep);
  const complete = useMutation(api.renewedMind.entries.completeStep);
  const skip = useMutation(api.renewedMind.entries.skipStep);
  const remove = useMutation(api.renewedMind.entries.removeStep);
  const { busy, error, run } = useAction();
  const [beliefId, setBeliefId] = useState<Id<"rmBeliefs"> | "">("");
  const [own, setOwn] = useState("");
  const [ownArena, setOwnArena] = useState<Arena | "">("");
  const [browse, setBrowse] = useState(false);
  const [askCoach, setAskCoach] = useState(false);
  const active = useMemo(() => (beliefs ?? []).filter((b) => !b.retiredAt), [beliefs]);
  const chosen = active.find((b) => b._id === beliefId) ?? active[0] ?? null;
  const chosenId = chosen?._id ?? "";
  if (!beliefs || !steps) return <Spinner />;

  if (!chosen) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Live It" subtitle="A truer line becomes true by being lived. Write one first." />
        <Card>
          <p className="sh-muted">Nothing to practice yet. <Link href="/renewed-mind/beliefs" className="sh-link">Put Off, Put On</Link> is where lines are written.</p>
        </Card>
      </div>
    );
  }

  const mine = steps.filter((s) => s.beliefId === chosen._id);
  const planned = mine.filter((s) => s.status === "planned");
  const done = mine.filter((s) => s.status !== "planned");
  const taken = new Set(mine.map((s) => s.text));
  const suggested = suggestFor(chosen.oldLine, chosen.newLine);
  const shownThemes = browse ? THEMES : suggested.length > 0 ? suggested : THEMES.slice(0, 2);
  const opening = `My old line: "${chosen.oldLine}". The truer line I wrote: "${chosen.newLine}".`;

  async function take(text: string, arena: Arena | null, source: "library" | "coach" | "own") {
    await run(() => addStep({ beliefId: chosen!._id, text, arena: arena ?? undefined, source }));
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Live It" subtitle="Small steps this week that let the truer line hold: in the marriage, outside the house, with friends, at work, with God. Then notice what actually happened." />

      <Card>
        <Field label="The line I'm living">
          <select className="sh-input" value={chosenId} onChange={(e) => setBeliefId(e.target.value as Id<"rmBeliefs">)}>
            {active.map((b) => <option key={b._id} value={b._id}>{b.newLine}</option>)}
          </select>
        </Field>
        <p className="rm-old">{chosen.oldLine}</p>
        <p className="rm-new">{chosen.newLine}</p>
      </Card>

      {planned.length > 0 && (
        <Card>
          <h2 className="sh-h2">This week</h2>
          {planned.map((s) => (
            <StepRow key={s._id} s={s} busy={busy} onDone={(happened, provedIt) => void run(() => complete({ id: s._id, happened, provedIt }))} onSkip={() => void run(() => skip({ id: s._id }))} onRemove={() => void run(() => remove({ id: s._id }))} />
          ))}
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Steps to try</h2>
        <p className="sh-muted">{suggested.length > 0 && !browse ? "Matched to your line. " : ""}Take one. One is a week&apos;s worth.</p>
        {shownThemes.map((t) => (
          <details key={t.key} className="sh-menu" open={!browse && suggested.length > 0}>
            <summary>{t.title}</summary>
            <div className="sh-stack-sm" style={{ marginTop: "0.4rem" }}>
              {t.steps.map((st) => (
                <div key={st.text} className="rm-entry">
                  <p><span className="sh-eyebrow">{ARENA_LABEL[st.arena]}</span><br />{st.text}</p>
                  <Btn variant="secondary" disabled={busy || taken.has(st.text)} onClick={() => void take(st.text, st.arena, "library")}>{taken.has(st.text) ? "Taken" : "Try this"}</Btn>
                </div>
              ))}
            </div>
          </details>
        ))}
        <div className="sh-choices mt-2">
          <Btn variant="ghost" onClick={() => setBrowse((v) => !v)}>{browse ? "Just the matched ones" : "Browse every theme"}</Btn>
          <Btn variant="secondary" onClick={() => setAskCoach((v) => !v)}>{askCoach ? "Close the coach" : "Ask the coach for steps"}</Btn>
        </div>
        <ErrorNote error={error} />
      </Card>

      {askCoach && (
        <>
          <p className="sh-muted">The coach knows your manual, so its steps fit your actual week. Each one comes with an Add button.</p>
          <CoachChat
            module="renewed-mind"
            task="renewedMind.steps"
            opening={opening}
            placeholder="Anything to add? Or just say: suggest steps."
            suggestions={{ extract: (r) => extractSteps(r), label: "Add", added: taken, onAdd: (text) => { const a = extractSteps(`- ${text}`)[0]?.arena ?? null; return take(text, a, "coach"); } }}
          />
        </>
      )}

      <Card>
        <h2 className="sh-h2">A step of my own</h2>
        <Field label="The step" hint="One sentence, doable this week.">
          <input className="sh-input" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={300} />
        </Field>
        <Field label="Where">
          <select className="sh-input" value={ownArena} onChange={(e) => setOwnArena(e.target.value as Arena | "")}>
            <option value="">Anywhere</option>
            {(Object.keys(ARENA_LABEL) as Arena[]).map((a) => <option key={a} value={a}>{ARENA_LABEL[a]}</option>)}
          </select>
        </Field>
        <CrisisNotice texts={[own]} />
        <Btn disabled={busy || !own.trim()} onClick={() => void run(async () => { await take(own, ownArena || null, "own"); setOwn(""); })}>Take it on</Btn>
      </Card>

      {done.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Tried</h2>
          {done.map((s) => (
            <div key={s._id} className="rm-entry">
              <p>{s.text}{s.arena ? <span className="sh-muted"> · {ARENA_LABEL[s.arena]}</span> : null}</p>
              {s.status === "done" ? (
                <p className="sh-muted">{s.happened}{s.evidenceId ? " · in Evidence" : ""} · {timeAgo(s.doneAt ?? s.createdAt)}</p>
              ) : (
                <p className="sh-muted">Not that week. Fine.</p>
              )}
            </div>
          ))}
        </Card>
      )}

      <Note>
        The old line makes a prediction every time: &ldquo;if I say no, they&apos;ll be angry.&rdquo; A step is a test of that prediction. When what happened doesn&apos;t match, that gap is what rewrites the path, and it goes into <Link href="/renewed-mind/evidence" className="sh-link">Evidence</Link> on its own.
      </Note>
    </div>
  );
}

function StepRow({ s, busy, onDone, onSkip, onRemove }: { s: Doc<"rmSteps">; busy: boolean; onDone: (happened: string, provedIt: boolean) => void; onSkip: () => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [happened, setHappened] = useState("");
  const [proved, setProved] = useState(true);
  return (
    <div className="rm-entry">
      <p>{s.text}{s.arena ? <span className="sh-muted"> · {ARENA_LABEL[s.arena]}</span> : null}</p>
      {!open ? (
        <div className="sh-choices">
          <Btn disabled={busy} onClick={() => setOpen(true)}>I did it</Btn>
          <Btn variant="ghost" disabled={busy} onClick={onSkip}>Not this week</Btn>
          <Btn variant="ghost" disabled={busy} onClick={onRemove}>Remove</Btn>
        </div>
      ) : (
        <>
          <Field label="What actually happened?" hint="The plain facts. This is the part that rewrites the path.">
            <textarea className="sh-input sh-textarea" rows={2} value={happened} onChange={(e) => setHappened(e.target.value)} maxLength={400} />
          </Field>
          <CrisisNotice texts={[happened]} />
          <label className="sh-row" style={{ gap: "0.5rem" }}>
            <input type="checkbox" checked={proved} onChange={(e) => setProved(e.target.checked)} /> It held up the truer line. Put it in Evidence.
          </label>
          <div className="sh-choices mt-2">
            <Btn disabled={busy || !happened.trim()} onClick={() => onDone(happened, proved)}>Save</Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Back</Btn>
          </div>
        </>
      )}
    </div>
  );
}
