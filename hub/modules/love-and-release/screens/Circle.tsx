"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { useHub } from "@/core/shell/HubContext";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { circleText, GREEN_FLAGS, RED_FLAGS, SORT_LABEL, type CircleSort } from "@/convex/reCentered/circlePure";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * Someone in my circle (2026-09-29, Jen's ask): a box for what you know
 * about a person you're letting in, green and red flags you can tap (as
 * many as fit, and your own), and a "Sort it with the coach" button that
 * puts it into green flags, red flags, something to confront, something to
 * monitor, and not enough to tell yet. Private to whoever wrote it.
 */

type Entry = Doc<"rcCircle">;
type Bucket = keyof typeof SORT_LABEL;
const BUCKETS = Object.keys(SORT_LABEL) as Bucket[];

interface Draft {
  name: string;
  text: string;
  green: string[];
  red: string[];
}

const EMPTY: Draft = { name: "", text: "", green: [], red: [] };

export function Circle() {
  const { partner } = useHub();
  const list = useQuery(api.reCentered.circle.mine);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [prefillName, setPrefillName] = useState("");
  if (!list) return <Spinner />;

  const names = Array.from(new Set(list.map((e) => e.name)));

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle
        title="Someone in my circle"
        subtitle="Write what you know about someone you're letting in. Tap every flag that fits, green and red, then let the coach sort it: what to confront, what to watch, what's too soon to tell."
      />
      <Editor
        key={editing?._id ?? `new-${prefillName}`}
        initial={editing ? { name: editing.name, text: editing.text, green: editing.green, red: editing.red } : { ...EMPTY, name: prefillName }}
        editingId={editing?._id ?? null}
        onDone={() => {
          setEditing(null);
          setPrefillName("");
        }}
      />
      {list.length === 0 ? (
        <Note>No one here yet. When you save, the note and the flags stay on this page, private to you, and the coach can sort them whenever you ask.</Note>
      ) : (
        names.map((name) => (
          <section key={name} className="sh-stack-sm">
            <div className="sh-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 className="sh-h2" style={{ margin: 0 }}>
                {name}
              </h2>
              <button type="button" className="sh-link" onClick={() => { setEditing(null); setPrefillName(name); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                Add more about {name}
              </button>
            </div>
            {list
              .filter((e) => e.name === name)
              .map((e) => (
                <EntryCard key={e._id} entry={e} onEdit={() => { setEditing(e); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              ))}
          </section>
        ))
      )}
      <Note>
        Private to you. Nothing here reaches {partner?.displayName ?? "your partner"} unless you say it out loud. When you&apos;re ready to give someone a place, The Orchard is where they get planted and watched over time:{" "}
        <Link href="/orchard" className="sh-link">
          open The Orchard
        </Link>
        .
      </Note>
    </div>
  );
}

function Editor({ initial, editingId, onDone }: { initial: Draft; editingId: Id<"rcCircle"> | null; onDone: () => void }) {
  const add = useMutation(api.reCentered.circle.add);
  const edit = useMutation(api.reCentered.circle.edit);
  const { busy, error, run } = useAction();
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState(false);

  function flip(kind: "green" | "red", flag: string) {
    setDraft((d) => ({ ...d, [kind]: d[kind].includes(flag) ? d[kind].filter((f) => f !== flag) : [...d[kind], flag] }));
  }

  const ready = draft.name.trim().length > 0 && draft.text.trim().length > 0;

  return (
    <Card>
      {editingId && <p className="sh-hint">Editing. Saving clears the coach&apos;s old sort, since it was about the old words.</p>}
      <Field label="Who" hint="A first name or a nickname is enough.">
        <input className="sh-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} placeholder="Their name" />
      </Field>
      <FlagPicker kind="green" label="Green flags" hint="Tap every one that fits. A green flag is something they've shown more than once." options={GREEN_FLAGS} picked={draft.green} onFlip={(f) => flip("green", f)} />
      <FlagPicker kind="red" label="Red flags" hint="Tap every one that fits. A red flag is a pattern, not a verdict." options={RED_FLAGS} picked={draft.red} onFlip={(f) => flip("red", f)} />
      <Field label="What I know so far" hint="How you met, what they've said and done, what you've noticed in yourself around them. Facts and the story you're telling, both; the coach will help sort which is which.">
        <RichTextarea className="sh-input sh-textarea" rows={6} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} maxLength={20000} placeholder="Write it in your own words." />
      </Field>
      <CrisisNotice texts={[draft.text]} />
      <ErrorNote error={error} />
      <div className="sh-row mt-3" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn
          big
          disabled={busy || !ready}
          onClick={() =>
            void run(async () => {
              if (editingId) await edit({ id: editingId, ...draft });
              else await add(draft);
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
              onDone();
            })
          }
        >
          {editingId ? "Save changes" : "Keep it"}
        </Btn>
        {editingId && (
          <Btn variant="secondary" disabled={busy} onClick={onDone}>
            Cancel
          </Btn>
        )}
        {saved && <Note>Kept. Sort it with the coach below whenever you like.</Note>}
      </div>
    </Card>
  );
}

function FlagPicker({ kind, label, hint, options, picked, onFlip }: { kind: "green" | "red"; label: string; hint: string; options: string[]; picked: string[]; onFlip: (flag: string) => void }) {
  const [own, setOwn] = useState("");
  const custom = picked.filter((p) => !options.includes(p));
  function addOwn() {
    const flag = own.trim().slice(0, 120);
    if (!flag || picked.includes(flag)) return;
    onFlip(flag);
    setOwn("");
  }
  return (
    <Field label={`${label}${picked.length ? ` (${picked.length})` : ""}`} hint={hint}>
      <div className="sh-chips rc-flags" data-kind={kind} role="group" aria-label={label}>
        {[...options, ...custom].map((flag) => (
          <button key={flag} type="button" className="sh-chip" aria-pressed={picked.includes(flag)} onClick={() => onFlip(flag)}>
            {flag}
          </button>
        ))}
      </div>
      <div className="sh-row mt-2" style={{ gap: "0.5rem", alignItems: "center" }}>
        <input
          className="sh-input"
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOwn();
            }
          }}
          maxLength={120}
          placeholder={`My own ${kind} flag`}
          aria-label={`Add my own ${kind} flag`}
        />
        <Btn variant="secondary" disabled={!own.trim()} onClick={addOwn}>
          Add
        </Btn>
      </div>
    </Field>
  );
}

function EntryCard({ entry, onEdit }: { entry: Entry; onEdit: () => void }) {
  const sortIt = useConvexAction(api.reCentered.circleSort.sort);
  const remove = useMutation(api.reCentered.circle.remove);
  const { busy, error, run } = useAction();
  const [talking, setTalking] = useState(false);
  const [open, setOpen] = useState(false);
  const sort: CircleSort | undefined = entry.sort;

  return (
    <Card tone="alt">
      <p className="sh-hint">
        {timeAgo(entry.createdAt)}
        {entry.sortedAt ? ` · sorted ${timeAgo(entry.sortedAt)}` : ""}
      </p>
      {(entry.green.length > 0 || entry.red.length > 0) && (
        <div className="sh-chips rc-flags" data-kind="mixed">
          {entry.green.map((f) => (
            <span key={`g-${f}`} className="sh-chip rc-flag-green" aria-pressed="true">
              {f}
            </span>
          ))}
          {entry.red.map((f) => (
            <span key={`r-${f}`} className="sh-chip rc-flag-red" aria-pressed="true">
              {f}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
        {entry.text.length > 600 && !open ? (
          <>
            <Rich text={`${entry.text.slice(0, 600)}…`} />{" "}
            <button type="button" className="sh-link" onClick={() => setOpen(true)}>
              Read all
            </button>
          </>
        ) : (
          <Rich text={entry.text} />
        )}
      </div>

      {sort && (
        <div className="rc-sort mt-3">
          {BUCKETS.map((b) => (
            <div key={b} className="rc-sort-bucket" data-bucket={b}>
              <h3 className="rc-sort-title">{SORT_LABEL[b]}</h3>
              {sort[b].length === 0 ? (
                <p className="sh-muted">Nothing here yet.</p>
              ) : (
                <ul className="rc-sort-list">
                  {sort[b].map((item, i) => (
                    <li key={i}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {sort.line && (
            <p className="rc-quote mt-2">
              <Rich text={sort.line} />
            </p>
          )}
        </div>
      )}

      <ErrorNote error={error} />
      <div className="sh-row mt-3" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn disabled={busy} onClick={() => void run(() => sortIt({ id: entry._id }))}>
          {busy ? "Sorting…" : sort ? "Sort it again" : "Sort it with the coach"}
        </Btn>
        <Btn variant="secondary" onClick={() => setTalking((t) => !t)}>
          {talking ? "Close the talk" : "Talk it through"}
        </Btn>
        <Btn variant="secondary" disabled={busy} onClick={onEdit}>
          Edit
        </Btn>
        <button
          type="button"
          className="sh-link"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete this note about ${entry.name}? It can't be brought back.`)) void run(() => remove({ id: entry._id }));
          }}
        >
          Delete
        </button>
      </div>
      {talking && (
        <div className="mt-3">
          <CoachChat module="re-centered" task="reCentered.circle" opening={circleText({ name: entry.name, text: entry.text, green: entry.green, red: entry.red, sort })} placeholder={`Ask about ${entry.name}, in your own words.`} />
        </div>
      )}
    </Card>
  );
}
