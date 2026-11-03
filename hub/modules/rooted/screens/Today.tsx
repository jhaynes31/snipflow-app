"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { leanOf } from "@/convex/rooted/pure";
import { FeltButton } from "@/core/felt/FeltButton";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const LEVELS = ["Not at all", "A little", "Some", "A lot"];
const PULLS = ["A quiet phone", "Someone pulled away", "A plan that hovered", "A small no", "Being asked what I need", "Someone steady (and I flinched)", "An old memory", "Tired or in a flare", "Conflict with John", "A new person"];
const STEADIES = ["Ground Me", "The wheel", "Said the need plainly", "Waited out the gap", "Came sit at The Hearth", "Prayed it instead of texting it", "A walk or movement", "John", "A friend who earned it", "Read my fail safes"];

type Key = "secure" | "anxious" | "avoidant" | "disorganized";
const KEYS: { key: Key; label: string; hint: string }[] = [
  { key: "secure", label: "Secure", hint: "Said what I needed, waited without a story, stepped back cleanly." },
  { key: "anxious", label: "Anxious", hint: "Checked, chased, shrank a need, managed a mood." },
  { key: "avoidant", label: "Avoidant", hint: "Went quiet or cold, found flaws, needed nothing." },
  { key: "disorganized", label: "Disorganized", hint: "Pulled toward and pushed away in the same day. Flooded, then numb." },
];

export function Today() {
  const checks = useQuery(api.rooted.entries.checks);
  const add = useMutation(api.rooted.entries.addCheck);
  const remove = useMutation(api.rooted.entries.removeCheck);
  const { busy, error, run } = useAction();
  const [levels, setLevels] = useState<Record<Key, number>>({ secure: 0, anxious: 0, avoidant: 0, disorganized: 0 });
  const [pulled, setPulled] = useState<string[]>([]);
  const [steadied, setSteadied] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [felt, setFelt] = useState("");
  const flip = (list: string[], set: (v: string[]) => void, item: string) => set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Where I am today" subtitle="Not a score and not a diagnosis. A read of what showed this week, in your words, so you can see your own movement over time." />
      <Card>
        {KEYS.map((k) => (
          <Field key={k.key} label={k.label} hint={k.hint}>
            <div className="rt-level" role="group" aria-label={k.label}>
              {LEVELS.map((l, i) => (
                <button key={l} type="button" className="sh-chip" aria-pressed={levels[k.key] === i} onClick={() => setLevels({ ...levels, [k.key]: i })}>{l}</button>
              ))}
            </div>
          </Field>
        ))}
        <Field label="What pulled me toward the old pattern" hint="Tap any that fit.">
          <div className="sh-chips">{PULLS.map((p) => <button key={p} type="button" className="sh-chip" aria-pressed={pulled.includes(p)} onClick={() => flip(pulled, setPulled, p)}>{p}</button>)}</div>
        </Field>
        <Field label="What steadied me" hint="Tap any that fit.">
          <div className="sh-chips">{STEADIES.map((p) => <button key={p} type="button" className="sh-chip" aria-pressed={steadied.includes(p)} onClick={() => flip(steadied, setSteadied, p)}>{p}</button>)}</div>
        </Field>
        <Field label="In my words" hint="Optional. What happened, what I noticed.">
          <RichTextarea className="sh-input sh-textarea" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} />
        </Field>
        <FeltButton context="rooted" label="Where it sat in my body" onInsert={(t) => setFelt((f) => (f ? `${f}; ${t}` : t).slice(0, 600))} />
        {felt && <p className="sh-hint">Felt: {felt}</p>}
        <CrisisNotice texts={[note]} />
        <ErrorNote error={error} />
        <div className="sh-row mt-3">
          <Btn big disabled={busy} onClick={() => void run(async () => { await add({ ...levels, pulled, steadied, note: note || undefined, felt: felt || undefined }); setLevels({ secure: 0, anxious: 0, avoidant: 0, disorganized: 0 }); setPulled([]); setSteadied([]); setNote(""); setFelt(""); })}>
            Keep this read
          </Btn>
        </div>
      </Card>
      {!checks ? (
        <Spinner />
      ) : checks.length > 0 ? (
        <Card tone="alt">
          <h2 className="sh-h2">My reads</h2>
          <p className="sh-hint">Newest first. Look for movement, not grades. A week leaning anxious after a hard month is information, not failure.</p>
          {checks.map((c) => (
            <div key={c._id} className="rt-entry">
              <p><strong>Leaning {leanOf(c)}</strong> <span className="sh-muted">· {timeAgo(c.createdAt)}</span></p>
              {c.pulled.length > 0 && <p className="sh-muted">Pulled by: {c.pulled.join(", ")}</p>}
              {c.steadied.length > 0 && <p className="sh-muted">Steadied by: {c.steadied.join(", ")}</p>}
              {c.felt && <p className="sh-muted">Felt: {c.felt}</p>}
              {c.note && <p><Rich text={c.note} /></p>}
              <p className="sh-hint"><button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: c._id }))}>Delete</button></p>
            </div>
          ))}
        </Card>
      ) : (
        <Note>Nothing yet. The first read is just a starting point.</Note>
      )}
    </div>
  );
}
