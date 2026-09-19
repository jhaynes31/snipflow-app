"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, Spinner, timeAgo, useAction } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

type Column = "dump" | "now" | "later" | "cantThink";
const COLUMNS: { key: Column; label: string; hint: string }[] = [
  { key: "now", label: "Solve now", hint: "Worth testing today." },
  { key: "later", label: "Solve later", hint: "Parked, with a date." },
  { key: "cantThink", label: "Can't be solved by thinking harder", hint: "Let it sit. Thinking won't move it." },
];

/** Loop Breaker: dump, sort, pick one, decide by default. Never debates the logic. */
export function LoopBreaker({ loopId }: { loopId?: string }) {
  return <ToolFrame toolKey="loopBreaker">{loopId ? <Session id={loopId as Id<"tendLoops">} /> : <LoopList />}</ToolFrame>;
}

function LoopList() {
  const loops = useQuery(api.tend.loops.open);
  const create = useMutation(api.tend.loops.create);
  const remove = useMutation(api.tend.loops.remove);
  const [title, setTitle] = useState("");
  const { busy, error, run } = useAction();
  if (!loops) return <Spinner />;
  return (
    <div className="sh-stack">
      <Card>
        <form
          className="sh-row sh-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const id = await create({ title: title.trim() || undefined });
              window.location.assign(`/tend/tools/loopBreaker/${id}`);
            });
          }}
        >
          <Field label="What's the loop about?" hint="Optional. A few words.">
            <input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Btn type="submit" big disabled={busy}>
            Start a new loop
          </Btn>
        </form>
        <ErrorNote error={error} />
      </Card>
      {loops.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Your loops</h2>
          <ul className="sh-list">
            {loops.map((l) => (
              <li key={l._id} className="sh-row">
                <Link href={`/tend/tools/loopBreaker/${l._id}`} className="sh-link">
                  {l.title || "Untitled loop"}
                </Link>
                <span className="sh-muted">
                  {l.cards.length} {l.cards.length === 1 ? "card" : "cards"} · {l.status === "closed" ? "closed" : "open"} · {timeAgo(l.updatedAt)}
                </span>
                <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Delete this loop and its cards?")) void run(() => remove({ id: l._id })); }}>
                  Delete
                </Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Session({ id }: { id: Id<"tendLoops"> }) {
  const loop = useQuery(api.tend.loops.get, { id });
  if (loop === undefined) return <Spinner />;
  if (loop === null)
    return (
      <Card>
        <p className="sh-muted">That loop isn&apos;t here.</p>
        <LinkBtn href="/tend/tools/loopBreaker" variant="secondary">Back to loops</LinkBtn>
      </Card>
    );
  return <Board loop={loop} />;
}

function Board({ loop }: { loop: Doc<"tendLoops"> }) {
  const setCards = useMutation(api.tend.loops.setCards);
  const pick = useMutation(api.tend.loops.pick);
  const setDecision = useMutation(api.tend.loops.setDecision);
  const decide = useMutation(api.tend.loops.decide);
  const close = useMutation(api.tend.loops.close);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [action, setAction] = useState(loop.testAction ?? "");
  const [defaultChoice, setDefaultChoice] = useState(loop.decision?.defaultChoice ?? "");
  const [hours, setHours] = useState(24);
  const [saved, setSaved] = useState(false);
  const [openedAt] = useState(() => Date.now());

  const cards = loop.cards;
  const dump = cards.filter((c) => c.column === "dump");
  const move = (cardId: string, column: Column) =>
    void run(() =>
      setCards({
        id: loop._id,
        cards: cards.map((c) => (c.id === cardId ? { ...c, column, parkedUntil: column === "later" ? Date.now() + 7 * 86400000 : undefined } : c)),
      }),
    );
  const addCard = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    void run(() => setCards({ id: loop._id, cards: [...cards, { id: Math.random().toString(36).slice(2, 10), text: t, column: "dump" }] }));
  };
  const remove = (cardId: string) => void run(() => setCards({ id: loop._id, cards: cards.filter((c) => c.id !== cardId) }));
  const picked = cards.find((c) => c.id === loop.pickedCardId);
  const deadlinePassed = loop.decision && !loop.decision.decidedAt && loop.decision.deadline <= openedAt;

  return (
    <div className="sh-stack">
      <p className="sh-eyebrow">
        <Link href="/tend/tools/loopBreaker" className="sh-link">All loops</Link> · {loop.title || "Untitled loop"}
      </p>
      <ErrorNote error={error} />

      <Card>
        <h2 className="sh-h2">1. Dump</h2>
        <p className="sh-muted">Every &ldquo;but what about…&rdquo; as its own card. As fast as you like. No limit.</p>
        <form
          className="sh-row"
          onSubmit={(e) => {
            e.preventDefault();
            addCard();
          }}
        >
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="But what about…" aria-label="New card" />
          <Btn type="submit" disabled={busy || !text.trim()}>Add</Btn>
        </form>
        {dump.length > 0 && (
          <ul className="sh-list mt-3">
            {dump.map((c) => (
              <li key={c.id} className="tend-loop-card">
                <span>{c.text}</span>
                <span className="sh-choices">
                  {COLUMNS.map((col) => (
                    <Btn key={col.key} variant="secondary" disabled={busy} onClick={() => move(c.id, col.key)}>
                      {col.label}
                    </Btn>
                  ))}
                  <Btn variant="ghost" disabled={busy} onClick={() => remove(c.id)}>×</Btn>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="sh-h2">2. Sorted</h2>
        <div className="tend-loop-columns">
          {COLUMNS.map((col) => {
            const items = cards.filter((c) => c.column === col.key);
            return (
              <div key={col.key} className="tend-loop-column">
                <h3 className="sh-h3">{col.label}</h3>
                <p className="sh-hint">{col.hint}</p>
                <ul className="sh-list">
                  {items.map((c) => (
                    <li key={c.id} className="tend-loop-card">
                      <span>
                        {c.text}
                        {col.key === "later" && c.parkedUntil && <span className="sh-hint">Parked until {new Date(c.parkedUntil).toLocaleDateString()}</span>}
                      </span>
                      <span className="sh-choices">
                        {col.key === "now" && (
                          <Btn variant={loop.pickedCardId === c.id ? "primary" : "secondary"} disabled={busy} onClick={() => void run(() => pick({ id: loop._id, cardId: c.id }))}>
                            {loop.pickedCardId === c.id ? "Picked" : "Pick this one"}
                          </Btn>
                        )}
                        <Btn variant="ghost" disabled={busy} onClick={() => move(c.id, "dump")}>Back</Btn>
                      </span>
                    </li>
                  ))}
                  {items.length === 0 && <li className="sh-hint">Nothing here yet.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">3. Pick one and test it</h2>
        {picked ? (
          <>
            <p className="sh-quote">{picked.text}</p>
            <Field label="The smallest action that tests it">
              <input className="sh-input" value={action} onChange={(e) => setAction(e.target.value)} maxLength={300} />
            </Field>
            <div className="sh-row mt-2">
              <Btn disabled={busy || !action.trim()} onClick={() => void run(async () => { await pick({ id: loop._id, testAction: action }); setSaved(true); setTimeout(() => setSaved(false), 1800); })}>Save</Btn>
              {saved && <Note>Saved.</Note>}
            </div>
          </>
        ) : (
          <p className="sh-muted">Pick a card from &ldquo;Solve now&rdquo; above. Just one.</p>
        )}
      </Card>

      <Card>
        <h2 className="sh-h2">4. Decide by default</h2>
        <p className="sh-muted">For decisions: name the reasonable default and a deadline. If it&apos;s still open when the time runs out, the default wins, and that counts as a decision made.</p>
        {loop.decision?.decidedAt ? (
          <p>
            <strong>Decided:</strong> {loop.decision.defaultChoice} {loop.decision.byDefault ? "(the default won, as agreed)" : "(you chose)"} · {timeAgo(loop.decision.decidedAt)}
          </p>
        ) : loop.decision ? (
          <>
            <p>
              <strong>Default:</strong> {loop.decision.defaultChoice} · deadline {new Date(loop.decision.deadline).toLocaleString()}
              {deadlinePassed && " · the time has run out"}
            </p>
            <div className="sh-choices">
              <Btn disabled={busy} onClick={() => void run(() => decide({ id: loop._id, byDefault: false }))}>I&apos;ve decided</Btn>
              {deadlinePassed && (
                <Btn variant="secondary" disabled={busy} onClick={() => void run(() => decide({ id: loop._id, byDefault: true }))}>The default wins</Btn>
              )}
            </div>
          </>
        ) : (
          <div className="sh-stack-sm">
            <Field label="The reasonable default">
              <input className="sh-input" value={defaultChoice} onChange={(e) => setDefaultChoice(e.target.value)} maxLength={300} />
            </Field>
            <Field label="Time to decide">
              <select className="sh-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                <option value={0.25}>15 minutes</option>
                <option value={1}>1 hour</option>
                <option value={4}>4 hours</option>
                <option value={24}>1 day</option>
                <option value={48}>2 days</option>
              </select>
            </Field>
            <div>
              <Btn disabled={busy || !defaultChoice.trim()} onClick={() => void run(() => setDecision({ id: loop._id, defaultChoice, deadline: Date.now() + hours * 3600000 }))}>
                Set the default
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {loop.status === "open" && (
        <div>
          <Btn variant="ghost" disabled={busy} onClick={() => void run(() => close({ id: loop._id }))}>Close this loop</Btn>
        </div>
      )}
    </div>
  );
}
