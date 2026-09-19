"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { AREAS, FOR_WHOM_LABEL, REASON_LABEL, WHAT_NOW_LABEL, type ForWhom, type Reason, type WhatNow } from "@/convex/keptWord/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * Open words for both people, soonest first. I give, close, and renegotiate
 * my own. I can add "I heard you say" about my partner's; it becomes their
 * word only when they confirm it. No one marks anyone else's word.
 */
export function OpenWords() {
  const { profile, partner } = useHub();
  const data = useQuery(api.keptWord.words.open);
  const notices = useQuery(api.keptWord.words.myNotices);
  if (!data) return <Spinner />;
  const mine = data.words.filter((w) => w.ownerId === profile._id);
  const theirs = data.words.filter((w) => w.ownerId !== profile._id);
  const name = partner?.displayName ?? "your partner";
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Kept Word" subtitle="A word is one thing you said you'd do. You write yours, you close yours. The record shows what was kept beside what wasn't, in the same type." />

      {(notices ?? []).map((n) => (
        <div key={n.kind + (n.area ?? "")} className="sh-banner" role="status">
          <strong>Only you see this.</strong> {n.text}{" "}
          {n.kind === "mostlyAvoided" && <Link href="/tend/tools/smallestStep" className="sh-link">Smallest Step</Link>}
          {n.kind === "mostlyForgot" && <Link href="/tend/tools/focusMode" className="sh-link">Focus Mode</Link>}
        </div>
      ))}

      {data.heardForMe.length > 0 && (
        <Card>
          <h2 className="sh-h2">{name} heard you say</h2>
          <p className="sh-hint">It becomes your word only if you confirm it. You can edit the wording first, or say it wasn&apos;t a promise.</p>
          {data.heardForMe.map((h) => (
            <HeardRow key={h._id} h={h} />
          ))}
        </Card>
      )}

      <GiveWord />

      <Card>
        <h2 className="sh-h2">My open words</h2>
        {mine.length === 0 && <p className="sh-muted">None open. Small and kept beats big and said.</p>}
        {mine.map((w) => (
          <MyWord key={w._id} w={w} today={data.today} />
        ))}
      </Card>

      {partner && (
        <Card>
          <h2 className="sh-h2">{name}&apos;s open words</h2>
          {theirs.length === 0 && <p className="sh-muted">None open.</p>}
          {theirs.map((w) => (
            <div key={w._id} className="kw-word">
              <span className="kw-word-text">{w.text}</span>
              <span className="kw-meta">
                {FOR_WHOM_LABEL[w.forWhom]} · {w.dueDay ? `by ${w.dueDay}` : "no day"} · said {timeAgo(w.createdAt)}
              </span>
            </div>
          ))}
          {data.heardByMe.length > 0 && (
            <>
              <h3 className="sh-h3">Waiting for {name}</h3>
              {data.heardByMe.map((h) => (
                <div key={h._id} className="kw-word">
                  <span className="kw-word-text">&ldquo;{h.text}&rdquo;</span>
                  <span className="kw-meta">You heard this {timeAgo(h.createdAt)}. Waiting for {name} to confirm.</span>
                </div>
              ))}
            </>
          )}
          <Heard name={name} />
        </Card>
      )}
    </div>
  );
}

function GiveWord() {
  const give = useMutation(api.keptWord.words.give);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [area, setArea] = useState<string>("home");
  const [forWhom, setForWhom] = useState<ForWhom>("partner");
  const [dueDay, setDueDay] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <Card>
      <h2 className="sh-h2">Give my word</h2>
      <Field label="What I'll do" hint="Say it smaller than you want to. A kept small word counts more than a big one said.">
        <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
      </Field>
      <CrisisNotice texts={[text]} />
      <div className="sh-row sh-wrap">
        <Field label="By when" hint="Leave empty for ongoing.">
          <input className="sh-input" type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
        <Field label="For">
          <select className="sh-input" value={forWhom} onChange={(e) => setForWhom(e.target.value as ForWhom)}>
            {(Object.keys(FOR_WHOM_LABEL) as ForWhom[]).map((k) => (
              <option key={k} value={k}>{FOR_WHOM_LABEL[k]}</option>
            ))}
          </select>
        </Field>
      </div>
      <p className="sh-label">Area</p>
      <div className="sh-chips">
        {AREAS.map((a) => (
          <button key={a} type="button" className="sh-chip" aria-pressed={area === a} onClick={() => setArea(a)} style={area === a ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined}>
            {a}
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
      <div className="sh-row mt-3">
        <Btn
          big
          disabled={busy || !text.trim()}
          onClick={() =>
            void run(async () => {
              await give({ text, area, forWhom, dueDay: dueDay || undefined });
              setText("");
              setDueDay("");
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            })
          }
        >
          That&apos;s my word
        </Btn>
        {saved && <Note>On the record.</Note>}
      </div>
    </Card>
  );
}

function MyWord({ w, today }: { w: Doc<"kwWords">; today: string }) {
  const close = useMutation(api.keptWord.words.close);
  const renegotiate = useMutation(api.keptWord.words.renegotiate);
  const remove = useMutation(api.keptWord.words.remove);
  const sendToEveryBox = useMutation(api.keptWord.words.sendToEveryBox);
  const { busy, error, run } = useAction();
  const [mode, setMode] = useState<"idle" | "didnt" | "renegotiate">("idle");
  const [reason, setReason] = useState<Reason | null>(null);
  const [whatNow, setWhatNow] = useState<WhatNow | null>(null);
  const [note, setNote] = useState("");
  const [smallerText, setSmallerText] = useState("");
  const [smallerDay, setSmallerDay] = useState("");
  const [newText, setNewText] = useState(w.text);
  const [newDay, setNewDay] = useState(w.dueDay ?? "");
  const [done, setDone] = useState<string | null>(null);
  const pastDue = !!w.dueDay && w.dueDay < today;

  if (done) {
    return (
      <div className="kw-word">
        <span className="kw-word-text">{w.text}</span>
        <Note>{done}</Note>
      </div>
    );
  }

  return (
    <div className="kw-word">
      <span className="kw-word-text">{w.text}</span>
      <span className="kw-meta">
        {FOR_WHOM_LABEL[w.forWhom]} · {w.dueDay ? `by ${w.dueDay}` : "no day"} · {w.area}
        {w.sentToEveryBoxAt ? " · in Every Box" : ""}
      </span>
      <ErrorNote error={error} />
      {mode === "idle" && (
        <div className="sh-choices">
          <Btn disabled={busy} onClick={() => void run(async () => { await close({ id: w._id, outcome: "kept" }); setDone("Kept. On the record."); })}>Kept</Btn>
          <Btn variant="secondary" disabled={busy} onClick={() => setMode("didnt")}>Didn&apos;t</Btn>
          {!pastDue && <Btn variant="secondary" disabled={busy} onClick={() => setMode("renegotiate")}>I can&apos;t keep this as said</Btn>}
          {!w.sentToEveryBoxAt && <Btn variant="ghost" disabled={busy} onClick={() => void run(() => sendToEveryBox({ id: w._id }))}>To Every Box</Btn>}
          <LinkBtn href="/tend/tools/smallestStep" variant="ghost">Smallest Step</LinkBtn>
          <LinkBtn href="/tend/tools/focusMode" variant="ghost">Focus Mode</LinkBtn>
          <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: w._id }))}>Delete</Btn>
        </div>
      )}
      {mode === "renegotiate" && (
        <div className="sh-stack-sm">
          <p className="sh-hint">Before the day comes, saying &ldquo;here&apos;s what I can do&rdquo; is honesty, not a broken word. The old one stays on the record as said again.</p>
          <Field label="What I can do">
            <input className="sh-input" value={newText} onChange={(e) => setNewText(e.target.value)} maxLength={300} />
          </Field>
          <Field label="By when">
            <input className="sh-input" type="date" value={newDay} onChange={(e) => setNewDay(e.target.value)} />
          </Field>
          <div className="sh-row">
            <Btn disabled={busy || !newText.trim()} onClick={() => void run(async () => { await renegotiate({ id: w._id, text: newText, dueDay: newDay || undefined }); setDone("Said again. The new word is open."); })}>That&apos;s my new word</Btn>
            <Btn variant="ghost" onClick={() => setMode("idle")}>Cancel</Btn>
          </div>
        </div>
      )}
      {mode === "didnt" && (
        <div className="sh-stack-sm">
          <p className="sh-label">What got in the way?</p>
          <div className="sh-choices">
            {(Object.keys(REASON_LABEL) as Reason[]).map((r) => (
              <Btn key={r} variant={reason === r ? "primary" : "secondary"} onClick={() => setReason(r)}>{REASON_LABEL[r]}</Btn>
            ))}
          </div>
          <p className="sh-label">What now? There isn&apos;t a fourth option.</p>
          <div className="sh-stack-sm">
            {(Object.keys(WHAT_NOW_LABEL) as WhatNow[]).map((k) => (
              <Btn key={k} variant={whatNow === k ? "primary" : "secondary"} onClick={() => setWhatNow(k)}>{WHAT_NOW_LABEL[k]}</Btn>
            ))}
          </div>
          {whatNow === "smaller" && (
            <>
              <Field label="The smaller word">
                <input className="sh-input" value={smallerText} onChange={(e) => setSmallerText(e.target.value)} maxLength={300} />
              </Field>
              <Field label="By when">
                <input className="sh-input" type="date" value={smallerDay} onChange={(e) => setSmallerDay(e.target.value)} />
              </Field>
            </>
          )}
          {whatNow === "askedHelp" && <p className="sh-hint">Say who and what in the note, or send a heads-up after. Asking is on the record as a step, not a failure.</p>}
          <Field label="A line, if you want" hint="Optional. No essay.">
            <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
          </Field>
          <div className="sh-row sh-wrap">
            <Btn
              disabled={busy || !reason || !whatNow || (whatNow === "smaller" && !smallerText.trim())}
              onClick={() =>
                void run(async () => {
                  await close({ id: w._id, outcome: "didnt", reason: reason!, whatNow: whatNow!, note: note || undefined, smaller: whatNow === "smaller" ? { text: smallerText, dueDay: smallerDay || undefined } : undefined });
                  setDone(whatNow === "smaller" ? "On the record, and the smaller word is open." : "On the record.");
                })
              }
            >
              Put it on the record
            </Btn>
            <LinkBtn href="/tend/together" variant="secondary">Start a Repair in Tend</LinkBtn>
            <Btn variant="ghost" onClick={() => setMode("idle")}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function HeardRow({ h }: { h: Doc<"kwHeard"> }) {
  const answer = useMutation(api.keptWord.words.answerHeard);
  const { busy, error, run } = useAction();
  const [text, setText] = useState(h.text);
  const [area, setArea] = useState<string>("home");
  const [dueDay, setDueDay] = useState(h.dueDay ?? "");
  return (
    <div className="kw-word">
      <span className="kw-word-text">&ldquo;{h.text}&rdquo;</span>
      <span className="kw-meta">Heard {timeAgo(h.createdAt)}</span>
      <Field label="In my words">
        <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
      </Field>
      <div className="sh-row sh-wrap">
        <Field label="By when">
          <input className="sh-input" type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
        <Field label="Area">
          <select className="sh-input" value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
      </div>
      <ErrorNote error={error} />
      <div className="sh-choices">
        <Btn disabled={busy || !text.trim()} onClick={() => void run(() => answer({ id: h._id, confirm: true, text, area, dueDay: dueDay || undefined }))}>Yes, that&apos;s my word</Btn>
        <Btn variant="secondary" disabled={busy} onClick={() => void run(() => answer({ id: h._id, confirm: false }))}>That wasn&apos;t a promise</Btn>
      </div>
    </div>
  );
}

function Heard({ name }: { name: string }) {
  const heard = useMutation(api.keptWord.words.heard);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <form
      className="sh-stack-sm mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await heard({ text, dueDay: dueDay || undefined });
          setText("");
          setDueDay("");
          setSent(true);
          setTimeout(() => setSent(false), 1800);
        });
      }}
    >
      <Field label={`I heard ${name} say`} hint={`Becomes ${name}'s word only when they confirm it. Until then it shows as waiting.`}>
        <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
      </Field>
      <div className="sh-row sh-wrap">
        <Field label="By when, if they said">
          <input className="sh-input" type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
        <Btn type="submit" disabled={busy || !text.trim()}>Add to the record</Btn>
        {sent && <Note>Waiting for {name}.</Note>}
      </div>
      <ErrorNote error={error} />
    </form>
  );
}
