"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, timeAgo, useAction } from "@/core/ui";
import { toolByKey } from "../tools/registry";

/** Shared ground: Repair, the monthly view, appreciation, and the shared forecast. */
export function Together() {
  const { partner } = useHub();
  const name = partner?.displayName ?? "your partner";
  const announce = useMutation(api.tend.log.announceTenderWeek);
  useEffect(() => {
    void announce();
  }, [announce]);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Together" subtitle="Only what you've both chosen to share. No scores, no comparisons." />
      <Forecast />
      <Repairs name={name} />
      <Notes name={name} />
      <Monthly />
    </div>
  );
}

function Forecast() {
  const f = useQuery(api.tend.log.partnerForecast);
  if (!f) return null;
  const now = f.today >= f.tenderStart && f.today <= f.tenderEnd;
  return (
    <Card className="tend-forecast">
      <p>
        <strong>{now ? `${f.name}\u2019s tender week is now` : `${f.name}\u2019s tender week starts ${f.tenderStart}`}</strong> and runs to {f.tenderEnd}. Lighter defaults, one task off their plate, no big conversations or surprises.
      </p>
    </Card>
  );
}

function Repairs({ name }: { name: string }) {
  const { profile, partner } = useHub();
  const repairs = useQuery(api.tend.repair.list);
  const start = useMutation(api.tend.repair.start);
  const { busy, error, run } = useAction();
  if (!repairs) return <Spinner />;
  const open = repairs.filter((r) => r.status !== "closed");
  const closed = repairs.filter((r) => r.status === "closed");
  return (
    <Card>
      <h2 className="sh-h2">Repair</h2>
      <p className="sh-muted">A guided conversation for after a conflict or a hurt. Either of you can start one; the other accepts now or picks a later time.</p>
      <ErrorNote error={error} />
      {partner && open.length === 0 && (
        <Btn big disabled={busy} onClick={() => void run(() => start())}>
          Start a repair with {name}
        </Btn>
      )}
      {open.map((r) => (
        <RepairFlow key={r._id} r={r} me={profile._id} name={name} />
      ))}
      {closed.length > 0 && (
        <p className="sh-hint mt-3">{closed.length} repair{closed.length === 1 ? "" : "s"} closed. Last one {timeAgo(closed[0].updatedAt)}.</p>
      )}
    </Card>
  );
}

type Repair = Doc<"tendRepairs">;

function RepairFlow({ r, me, name }: { r: Repair; me: string; name: string }) {
  const respond = useMutation(api.tend.repair.respond);
  const begin = useMutation(api.tend.repair.begin);
  const submit = useMutation(api.tend.repair.submit);
  const reflect = useMutation(api.tend.repair.reflect);
  const close = useMutation(api.tend.repair.close);
  const remove = useMutation(api.tend.repair.remove);
  const partnerMenu = useQuery(api.tend.loveMenu.partners);
  const { busy, error, run } = useAction();
  const mineEntry = r.entries.find((e) => e.profileId === me);
  const theirs = r.entries.find((e) => e.profileId !== me);
  const [happened, setHappened] = useState("");
  const [felt, setFelt] = useState("");
  const [needed, setNeeded] = useState("");
  const [heard, setHeard] = useState(mineEntry?.heard ?? "");
  const [own, setOwn] = useState(mineEntry?.own ?? "");
  const [nextTime, setNextTime] = useState(mineEntry?.nextTime ?? "");
  const [saved, setSaved] = useState(false);
  const iStarted = r.ownerId === me;
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <div className="sh-card-alt sh-stack-sm mt-3">
      <p className="sh-eyebrow">{iStarted ? "You started this" : `${name} started this`} · {timeAgo(r.createdAt)}</p>
      <ErrorNote error={error} />

      {r.status === "invited" && !iStarted && (
        <div className="sh-choices">
          <Btn disabled={busy} onClick={() => void run(() => respond({ id: r._id, now: true }))}>Yes, now</Btn>
          <Btn variant="secondary" disabled={busy} onClick={() => void run(() => respond({ id: r._id, now: false, laterAt: Date.now() + 3 * 3600_000 }))}>Later today</Btn>
          <Btn variant="secondary" disabled={busy} onClick={() => void run(() => respond({ id: r._id, now: false, laterAt: Date.now() + 24 * 3600_000 }))}>Tomorrow</Btn>
        </div>
      )}
      {r.status === "invited" && iStarted && <p className="sh-muted">Waiting for {name} to accept now or pick a time.</p>}
      {r.status === "later" && (
        <div className="sh-row sh-wrap">
          <span className="sh-muted">Picked for {r.laterAt ? new Date(r.laterAt).toLocaleString() : "later"}.</span>
          <Btn variant="secondary" disabled={busy} onClick={() => void run(() => begin({ id: r._id }))}>Begin now</Btn>
        </div>
      )}

      {r.status === "writing" && !mineEntry && (
        <form
          className="sh-stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => submit({ id: r._id, happened, felt, needed }));
          }}
        >
          <p className="sh-hint">Written privately. {name} sees it only when you&apos;ve both submitted, and you both see each other&apos;s at the same time.</p>
          <Field label="What happened, for me">
            <textarea className="sh-input sh-textarea" rows={3} value={happened} onChange={(e) => setHappened(e.target.value)} maxLength={1500} required />
          </Field>
          <Field label="What I felt">
            <textarea className="sh-input sh-textarea" rows={2} value={felt} onChange={(e) => setFelt(e.target.value)} maxLength={800} required />
          </Field>
          <Field label="What I needed">
            <textarea className="sh-input sh-textarea" rows={2} value={needed} onChange={(e) => setNeeded(e.target.value)} maxLength={800} required />
          </Field>
          <div>
            <Btn type="submit" disabled={busy}>Submit, and wait for {name}</Btn>
          </div>
        </form>
      )}
      {r.status === "writing" && mineEntry && <p className="sh-muted">Yours is in. Waiting for {name}&apos;s.</p>}

      {(r.status === "revealed" || r.status === "closed") && theirs && mineEntry && (
        <div className="sh-stack-sm">
          <div className="tend-menu-columns">
            <div>
              <h3 className="sh-h3">{name}</h3>
              <p><strong>What happened:</strong> {theirs.happened}</p>
              <p><strong>Felt:</strong> {theirs.felt}</p>
              <p><strong>Needed:</strong> {theirs.needed}</p>
            </div>
            <div>
              <h3 className="sh-h3">You</h3>
              <p><strong>What happened:</strong> {mineEntry.happened}</p>
              <p><strong>Felt:</strong> {mineEntry.felt}</p>
              <p><strong>Needed:</strong> {mineEntry.needed}</p>
            </div>
          </div>
          {r.status === "revealed" && (
            <form
              className="sh-stack-sm"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => { await reflect({ id: r._id, heard, own, nextTime }); flash(); });
              }}
            >
              <Field label="What I heard you say is…">
                <textarea className="sh-input sh-textarea" rows={2} value={heard} onChange={(e) => setHeard(e.target.value)} maxLength={800} />
              </Field>
              <Field label="One thing I own">
                <input className="sh-input" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={400} />
              </Field>
              <Field label="One thing I'd like next time">
                <input className="sh-input" value={nextTime} onChange={(e) => setNextTime(e.target.value)} maxLength={400} />
              </Field>
              <div className="sh-row">
                <Btn type="submit" disabled={busy}>Save</Btn>
                {saved && <Note>Saved.</Note>}
              </div>
            </form>
          )}
          {theirs.heard && <p><strong>{name} heard:</strong> {theirs.heard}</p>}
          {theirs.own && <p><strong>{name} owns:</strong> {theirs.own}</p>}
          {theirs.nextTime && <p><strong>{name} would like next time:</strong> {theirs.nextTime}</p>}
          {r.status === "revealed" && partnerMenu && partnerMenu.length > 0 && (
            <div>
              <p className="sh-label">Close with a gesture from {name}&apos;s Love Menu</p>
              <div className="sh-chips">
                {partnerMenu.map((m) => (
                  <Btn key={m._id} variant={mineEntry.gesture === m.text ? "primary" : "secondary"} disabled={busy} onClick={() => void run(() => reflect({ id: r._id, gesture: m.text }))}>{m.text}</Btn>
                ))}
              </div>
            </div>
          )}
          {mineEntry.gesture && <p className="sh-muted">Your gesture: {mineEntry.gesture}</p>}
          {theirs.gesture && <p className="sh-muted">{name}&apos;s gesture: {theirs.gesture}</p>}
          {r.status === "revealed" && (
            <div>
              <Btn variant="secondary" disabled={busy} onClick={() => void run(() => close({ id: r._id }))}>Close this repair</Btn>
            </div>
          )}
        </div>
      )}
      <div>
        <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Delete this repair for both of you?")) void run(() => remove({ id: r._id })); }}>Delete</Btn>
      </div>
    </div>
  );
}

function Notes({ name }: { name: string }) {
  const { profile, partner } = useHub();
  const notes = useQuery(api.tend.notes.between, { limit: 10 });
  const send = useMutation(api.tend.notes.send);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [toEvidence, setToEvidence] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <Card>
      <h2 className="sh-h2">I saw you</h2>
      <p className="sh-muted">A quick note, any day, not just hard ones.</p>
      <ErrorNote error={error} />
      {partner && (
        <form
          className="sh-stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await send({ text, saveToEvidence: toEvidence });
              setText("");
              setSent(true);
              setTimeout(() => setSent(false), 1800);
            });
          }}
        >
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} placeholder={`I saw you ${name === "your partner" ? "" : name + " "}…`} aria-label="Note" required />
          <Toggle checked={toEvidence} onChange={setToEvidence} label={`Also save it to ${name}'s Evidence Bank`} />
          <div className="sh-row">
            <Btn type="submit" disabled={busy || !text.trim()}>Send</Btn>
            {sent && <Note>Sent.</Note>}
          </div>
        </form>
      )}
      {notes && notes.length > 0 && (
        <ul className="sh-list mt-3">
          {notes.map((n) => (
            <li key={n._id}>
              <span className="sh-muted">{n.ownerId === profile._id ? "You" : name} · {timeAgo(n.createdAt)}:</span> {n.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Monthly() {
  const m = useQuery(api.tend.together.monthly);
  if (!m) return null;
  return (
    <Card tone="alt">
      <h2 className="sh-h2">How are we doing? The last 30 days</h2>
      <ul className="sh-list">
        <li>Love actions done: {m.loveActions === 0 ? "none yet" : m.loveActions}</li>
        <li>&ldquo;I saw you&rdquo; notes: {m.notes === 0 ? "none yet" : m.notes}</li>
        <li>Repairs: {m.repairs === 0 ? "none" : m.repairs}</li>
        {m.helpful.map((h) => (
          <li key={h.name}>
            Tools that helped {h.name} most: {h.tools.length ? h.tools.map((t) => toolByKey(t)?.name ?? t).join(", ") : "nothing marked yet"}
          </li>
        ))}
      </ul>
      <p className="sh-hint">Only what each of you chose to share. Nothing here compares you to each other.</p>
    </Card>
  );
}
