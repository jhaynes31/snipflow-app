"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { entryLine, evidenceOf, letterDraft, WAYS, type Evidence } from "@/convex/reCentered/noticedPure";
import { useHub } from "@/core/shell/HubContext";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, CopyButton, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * Noticed (2026-11-16, Jen's ask): a gratitude journal and evidence log
 * about John and their marriage, in her own room. Thirty seconds on a
 * normal day; a handful of past entries on a hard one; a month read back
 * in one sitting with a letter draft. Nothing is counted.
 */
export function Noticed() {
  const { partner } = useHub();
  const him = partner?.displayName ?? "him";
  const list = useQuery(api.reCentered.noticed.list);
  const oldLines = useQuery(api.reCentered.noticed.oldLines);
  const add = useMutation(api.reCentered.noticed.add);
  const edit = useMutation(api.reCentered.noticed.edit);
  const remove = useMutation(api.reCentered.noticed.remove);
  const share = useMutation(api.reCentered.noticed.share);
  const { busy, error, run } = useAction();
  const [ways, setWays] = useState<string[]>([]);
  const [own, setOwn] = useState("");
  const [didWell, setDidWell] = useState("");
  const [grateful, setGrateful] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [ownLine, setOwnLine] = useState("");
  const [view, setView] = useState<"write" | "hard" | "month">("write");
  const [saved, setSaved] = useState(false);
  const flip = (w: string) => setWays(ways.includes(w) ? ways.filter((x) => x !== w) : [...ways, w]);
  const flipLine = (l: string) => setEvidence(evidence.some((x) => x.line === l) ? evidence.filter((x) => x.line !== l) : [...evidence, { line: l }]);
  const noteFor = (l: string, note: string) => setEvidence(evidence.map((x) => (x.line === l ? { line: l, note: note || undefined } : x)));

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Noticed" subtitle={`What ${him} is doing well, the ways he showed his love today, and what you're grateful for about the two of you. In your words, for you.`} />
      <div className="sh-chips">
        <button type="button" className="sh-chip" aria-pressed={view === "write"} onClick={() => setView("write")}>Today</button>
        <button type="button" className="sh-chip" aria-pressed={view === "hard"} onClick={() => setView("hard")}>On a hard day, read this</button>
        <button type="button" className="sh-chip" aria-pressed={view === "month"} onClick={() => setView("month")}>This month, read back</button>
      </div>

      {view === "hard" && <HardDay him={him} />}
      {view === "month" && <Month />}

      {view === "write" && (
        <>
          <Card>
            <Field label={`How ${him} showed love today`} hint="Tap any that fit. Add your own below.">
              <div className="sh-chips">{[...WAYS, ...ways.filter((w) => !(WAYS as readonly string[]).includes(w))].map((w) => <button key={w} type="button" className="sh-chip" aria-pressed={ways.includes(w)} onClick={() => flip(w)}>{w}</button>)}</div>
              <div className="sh-row mt-2" style={{ gap: "0.4rem" }}>
                <input className="sh-input" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={80} placeholder="My own" onKeyDown={(e) => { if (e.key === "Enter" && own.trim()) { e.preventDefault(); flip(own.trim()); setOwn(""); } }} />
                <Btn variant="secondary" disabled={!own.trim()} onClick={() => { flip(own.trim()); setOwn(""); }}>Add</Btn>
              </div>
            </Field>
            <Field label="What he did well" hint="One line is plenty.">
              <RichTextarea className="sh-input sh-textarea" rows={2} value={didWell} onChange={(e) => setDidWell(e.target.value)} maxLength={2000} />
            </Field>
            <Field label="What I'm grateful for about us" hint="The marriage, not only him.">
              <RichTextarea className="sh-input sh-textarea" rows={2} value={grateful} onChange={(e) => setGrateful(e.target.value)} maxLength={2000} />
            </Field>
            <Field label="Evidence against an old line (optional)" hint="Tap every line this goes against, so the evidence column fills itself. Add one of your own below.">
              <div className="sh-chips">
                {[...(oldLines ?? []), ...evidence.map((x) => x.line).filter((l) => !(oldLines ?? []).includes(l))].map((l) => <button key={l} type="button" className="sh-chip" aria-pressed={evidence.some((x) => x.line === l)} onClick={() => flipLine(l)}>{l.length > 48 ? `${l.slice(0, 46)}…` : l}</button>)}
              </div>
              <div className="sh-row mt-2" style={{ gap: "0.4rem" }}>
                <input className="sh-input" value={ownLine} onChange={(e) => setOwnLine(e.target.value)} maxLength={300} placeholder={'Another one: "he doesn\'t care"'} onKeyDown={(e) => { if (e.key === "Enter" && ownLine.trim()) { e.preventDefault(); flipLine(ownLine.trim()); setOwnLine(""); } }} />
                <Btn variant="secondary" disabled={!ownLine.trim()} onClick={() => { flipLine(ownLine.trim()); setOwnLine(""); }}>Add</Btn>
              </div>
            </Field>
            {evidence.map((x) => (
              <Field key={x.line} label={`How this went against “${x.line}”`} hint="The specifics. What he actually did, and why the line can't hold next to it.">
                <RichTextarea className="sh-input sh-textarea" rows={3} value={x.note ?? ""} onChange={(e) => noteFor(x.line, e.target.value)} maxLength={3000} placeholder="Today, he…" />
              </Field>
            ))}
            <ErrorNote error={error} />
            <div className="sh-row sh-wrap" style={{ gap: "0.5rem" }}>
              <Btn big disabled={busy || (!ways.length && !didWell.trim() && !grateful.trim())} onClick={() => void run(async () => { await add({ ways, didWell: didWell || undefined, grateful: grateful || undefined, evidence: evidence.length ? evidence : undefined }); setWays([]); setDidWell(""); setGrateful(""); setEvidence([]); setOwnLine(""); setSaved(true); setTimeout(() => setSaved(false), 1800); })}>Noticed</Btn>
              {saved && <Note>Kept.</Note>}
            </div>
          </Card>
          {!list ? <Spinner /> : list.length > 0 ? (
            <Card tone="alt">
              <h2 className="sh-h2">What I&apos;ve noticed</h2>
              <p className="sh-hint">Newest first. &ldquo;Tell him&rdquo; sends that one line as a short note, by whatever ways he chose. Nothing is sent otherwise.</p>
              {list.map((e) => <Entry key={e._id} e={e} him={him} busy={busy} onShare={() => void run(() => share({ id: e._id }))} onRemove={() => { if (window.confirm("Delete this one?")) void run(() => remove({ id: e._id })); }} onEdit={(patch) => void run(() => edit({ id: e._id, ...patch }))} />)}
            </Card>
          ) : (
            <Note>Nothing yet. Start with today, even if it was small. Especially if it was small.</Note>
          )}
        </>
      )}
      <Note>Private to you, in your room. The coach, Mom, and Dad can read a line back to you on a hard day, the way they use your mantel, and only sparingly. No totals, no streaks. This is noticing, not keeping score.</Note>
    </div>
  );
}

function Entry({ e, him, busy, onShare, onRemove, onEdit }: { e: { _id: string; day: string; ways: string[]; didWell?: string; grateful?: string; evidenceAgainst?: string; evidence?: Evidence[]; sharedAt?: number; createdAt: number }; him: string; busy: boolean; onShare: () => void; onRemove: () => void; onEdit: (patch: { didWell?: string; grateful?: string; evidence?: Evidence[] }) => void }) {
  const [open, setOpen] = useState(false);
  const lines = evidenceOf(e);
  return (
    <div className="rc-entry">
      <p className="sh-hint">{new Date(e.day + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{e.sharedAt ? ` · told ${him} ${timeAgo(e.sharedAt)}` : ""}</p>
      {e.ways.length > 0 && <div className="sh-chips">{e.ways.map((w) => <span key={w} className="sh-chip" aria-pressed="true">{w}</span>)}</div>}
      {open ? (
        <>
          <RichTextarea className="sh-input sh-textarea" rows={2} defaultValue={e.didWell ?? ""} maxLength={2000} placeholder="What he did well" onBlur={(ev) => ev.target.value !== (e.didWell ?? "") && onEdit({ didWell: ev.target.value })} />
          <RichTextarea className="sh-input sh-textarea mt-2" rows={2} defaultValue={e.grateful ?? ""} maxLength={2000} placeholder="What I'm grateful for about us" onBlur={(ev) => ev.target.value !== (e.grateful ?? "") && onEdit({ grateful: ev.target.value })} />
          {lines.map((x) => (
            <RichTextarea key={x.line} className="sh-input sh-textarea mt-2" rows={3} defaultValue={x.note ?? ""} maxLength={3000} placeholder={`How this went against “${x.line}”`} onBlur={(ev) => ev.target.value !== (x.note ?? "") && onEdit({ evidence: lines.map((y) => (y.line === x.line ? { line: y.line, note: ev.target.value || undefined } : y)) })} />
          ))}
        </>
      ) : (
        <>
          {e.didWell && <p><Rich text={e.didWell} /></p>}
          {e.grateful && <p className="sh-muted"><Rich text={e.grateful} /></p>}
        </>
      )}
      {lines.map((x) => (
        <div key={x.line}>
          <p className="sh-hint">Evidence against: &ldquo;{x.line}&rdquo;</p>
          {!open && x.note && <p><Rich text={x.note} /></p>}
        </div>
      ))}
      <p className="sh-hint">
        <button type="button" className="sh-link" onClick={() => setOpen(!open)}>{open ? "done" : "edit"}</button> ·{" "}
        {!e.sharedAt && <><button type="button" className="sh-link" disabled={busy} onClick={onShare}>tell {him}</button> · </>}
        <button type="button" className="sh-link" disabled={busy} onClick={onRemove}>delete</button>
      </p>
    </div>
  );
}

function HardDay({ him }: { him: string }) {
  const rows = useQuery(api.reCentered.noticed.hardDay);
  if (!rows) return <Spinner />;
  if (rows.length === 0) return <Note>Nothing to read yet. On a better day, write a few.</Note>;
  return (
    <Card>
      <h2 className="sh-h2">Things you noticed about {him}, on days that weren&apos;t this one</h2>
      <p className="sh-hint">Chosen by the date, from across the whole log. The old story is loud right now; these are quieter and truer.</p>
      {rows.map((e) => (
        <div key={e._id} className="rc-entry">
          <p className="sh-hint">{new Date(e.day + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
          <p className="rt-line" style={{ fontSize: "1.05rem" }}>{entryLine({ ...e, evidence: undefined, evidenceAgainst: undefined })}</p>
          {evidenceOf(e).map((x) => (
            <div key={x.line}>
              <p className="sh-hint">Evidence against: &ldquo;{x.line}&rdquo;</p>
              {x.note && <p><Rich text={x.note} /></p>}
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

function Month() {
  const [key, setKey] = useState<string | undefined>(undefined);
  const data = useQuery(api.reCentered.noticed.month, key ? { month: key } : {});
  const [letter, setLetter] = useState<string | null>(null);
  if (!data) return <Spinner />;
  const label = new Date(`${data.key}-15T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <div className="sh-stack">
      <div className="sh-chips">{data.months.map((m) => <button key={m} type="button" className="sh-chip" aria-pressed={m === data.key} onClick={() => { setKey(m); setLetter(null); }}>{new Date(`${m}-15T12:00:00Z`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</button>)}</div>
      <Card>
        <h2 className="sh-h2">{label}</h2>
        {data.rows.length === 0 ? <p className="sh-muted">Nothing noticed this month yet.</p> : [...data.rows].reverse().map((e) => (
          <div key={e._id} className="rc-entry">
            <p className="sh-hint">{new Date(e.day + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
            <p>{entryLine({ ...e, evidence: undefined, evidenceAgainst: undefined })}</p>
            {evidenceOf(e).map((x) => <p key={x.line} className="sh-hint">Against &ldquo;{x.line}&rdquo;{x.note ? `: ${x.note}` : ""}</p>)}
          </div>
        ))}
      </Card>
      {data.rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">A letter to {data.partnerName}, drafted from this month</h2>
          <p className="sh-hint">Built from your entries, in your voice. Edit it, then copy it wherever you like. Nothing is sent from here.</p>
          {letter === null ? <Btn onClick={() => setLetter(letterDraft(data.partnerName, data.rows, data.key))}>Draft it</Btn> : (
            <>
              <RichTextarea className="sh-input sh-textarea" rows={12} value={letter} onChange={(e) => setLetter(e.target.value)} maxLength={8000} />
              <div className="sh-row mt-2"><CopyButton text={letter} label="Copy the letter" /></div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
