"use client";

import { useState } from "react";
import { useAction as useConvexAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BADGE_LABEL, INSURANCE_NAME, SCREENING, watchSource, type Badge, type InsuranceConfig, type ScreeningAnswer, type WatchEntry } from "@/convex/lookout/insurance";
import { Btn, Card, ErrorNote, Field, Note, Toggle, useAction } from "@/core/ui";

/** The fit badge and its reasons, shown on every insurance job card. */
export type FitView = { badge: Badge; green: string[]; red: string[]; blocked: string | null; why: string; wv: string; pay: string | null };

export function FitLine({ fit, compact }: { fit: FitView; compact?: boolean }) {
  return (
    <span className="lo-fit">
      <span className={`lo-badge lo-badge-${fit.badge}`}>{BADGE_LABEL[fit.badge]}</span>
      {fit.red.map((t) => <span key={t} className="lo-tag lo-tag-red">{t}</span>)}
      {fit.green.map((t) => <span key={t} className="lo-tag lo-tag-green">{t}</span>)}
      <span className={`lo-tag ${fit.wv === "yes" ? "lo-tag-green" : fit.wv === "no" ? "lo-tag-red" : ""}`}>{fit.wv === "yes" ? "Open to WV" : fit.wv === "no" ? "Not open to WV" : "Check state eligibility"}</span>
      {fit.blocked && <span className="lo-tag lo-tag-red">Blocklist: {fit.blocked}</span>}
      {!compact && fit.pay && <span className="sh-hint"> · Pay {fit.pay}</span>}
    </span>
  );
}

/** The known-good companies, each with its careers link and "Check now". */
export function Watchlist({ cfg }: { cfg: InsuranceConfig }) {
  const check = useConvexAction(api.lookout.discover.checkWatch);
  const { busy, error, run } = useAction();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const list = cfg.watchlist.map((w, i) => ({ w, i })).filter(({ w }) => w.enabled);
  if (list.length === 0) return <p className="sh-muted">No companies on the watchlist yet. Add some under Settings, {INSURANCE_NAME}.</p>;
  return (
    <div>
      {list.map(({ w, i }) => {
        const readable = !!watchSource(w);
        return (
          <div key={`${w.name}:${i}`} className="lo-entry">
            <p><strong>{w.name}</strong>{w.note ? <span className="sh-hint"> · {w.note}</span> : null}</p>
            <div className="sh-row sh-wrap">
              <a className="sh-btn sh-btn-secondary" href={w.url} target="_blank" rel="noopener noreferrer">Careers page</a>
              {readable ? (
                <Btn variant="secondary" disabled={busy} onClick={() => void run(async () => { const r = await check({ index: i }); setNotes({ ...notes, [i]: r.problem ? `Their board ${r.problem}.` : `Read their board: ${r.found} openings, ${r.kept} insurance sales ${r.kept === 1 ? "title" : "titles"}, ${r.fresh} new here.` }); })}>Check now</Btn>
              ) : (
                <a className="sh-btn sh-btn-secondary" href={w.url} target="_blank" rel="noopener noreferrer">Check now{w.search ? `: search "${w.search}"` : ""}</a>
              )}
            </div>
            <p className="sh-hint">{readable ? "Their own job board can be read here; new openings land under Jobs, Insurance sales." : `No feed to read, so this opens their site${w.search ? ` (search for "${w.search}")` : ""}. Paste anything good into Add a job and it gets scored.`}</p>
            {notes[i] && <Note>{notes[i]}</Note>}
          </div>
        );
      })}
      <ErrorNote error={error} />
    </div>
  );
}

/** The screening checklist on a saved insurance job: checkbox, the answer, and notes per question. */
export function Screening({ jobId, answers }: { jobId: Id<"loJobs">; answers: ScreeningAnswer[] }) {
  const save = useMutation(api.lookout.data.setScreening);
  const { busy, error, run } = useAction();
  const [draft, setDraft] = useState<ScreeningAnswer[]>(() => SCREENING.map((q) => answers.find((a) => a.key === q.key) ?? { key: q.key, asked: false, answer: "", note: "" }));
  const update = (key: string, patch: Partial<ScreeningAnswer>) => {
    const next = draft.map((a) => (a.key === key ? { ...a, ...patch } : a));
    setDraft(next);
    void run(() => save({ jobId, answers: next }));
  };
  return (
    <Card>
      <h2 className="sh-h2">Screening checklist</h2>
      <p className="sh-hint">Ask these in the interview and write the answers down. A wrong answer to the first, third, or fourth marks the job Avoid on its own.</p>
      {SCREENING.map((q, n) => {
        const a = draft.find((x) => x.key === q.key)!;
        return (
          <div key={q.key} className="lo-entry">
            <label className="sh-row" style={{ gap: "0.5rem", alignItems: "flex-start" }}>
              <input type="checkbox" checked={a.asked} disabled={busy} onChange={(e) => update(q.key, { asked: e.target.checked })} aria-label={`Asked: ${q.question}`} />
              <span><strong>{n + 1}. {q.question}</strong></span>
            </label>
            {q.good && q.bad && (
              <div className="sh-chips mt-2">
                {([["good", q.good], ["bad", q.bad], ["unsure", "Not sure yet"]] as const).map(([val, label]) => (
                  <button key={val} type="button" className={`sh-chip ${a.answer === val ? (val === "bad" ? "lo-chip-bad" : "lo-chip-on") : ""}`} disabled={busy} onClick={() => update(q.key, { answer: a.answer === val ? "" : val, asked: true })}>{label}</button>
                ))}
              </div>
            )}
            <textarea className="sh-textarea mt-2" rows={2} defaultValue={a.note} placeholder="Notes" aria-label={`Notes: ${q.question}`} onBlur={(e) => e.target.value !== a.note && update(q.key, { note: e.target.value })} />
            {q.critical && a.answer === "bad" && <p className="sh-hint lo-fail">{q.tag}. Marked Avoid.</p>}
          </div>
        );
      })}
      <ErrorNote error={error} />
    </Card>
  );
}

/** Settings: the preset in one place: on or off, search words, blocklist, watchlist, show hidden. */
export function InsuranceSettings({ cfg }: { cfg: InsuranceConfig }) {
  const set = useMutation(api.lookout.data.setInsurance);
  const { busy, error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState<WatchEntry>({ name: "", url: "", search: "", note: "", enabled: true });
  const done = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const lines = (xs: string[]) => xs.join("\n");
  const fromLines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
  return (
    <Card>
      <h2 className="sh-h2">{INSURANCE_NAME}</h2>
      <p className="sh-hint">A saved search for life insurance sales jobs that fit: inbound calls or provided leads, no warm market, real paid training, W-2 with an hourly or base wage, remote and open to West Virginia. Jobs it finds get a Fit badge (Strong fit, Maybe, Avoid) with the reasons as tags, and are judged by those flags instead of the main search&apos;s rules. Everything it goes by is on this card.</p>
      <Toggle checked={cfg.enabled} onChange={(enabled) => void run(async () => { await set({ enabled }); done(); })} label="Search for insurance sales jobs" hint="On: the preset's sites and the watchlist companies are read with every search, and an Insurance sales group appears under Jobs. Off: nothing is searched, and jobs already found stay where they are." />
      {saved && <Note>Saved.</Note>}
      <Field label="Search words, one per line" hint="Combined as each site allows. Adzuna and Jooble use them as typed (with 'remote' added); the remote boards search a fixed set of insurance and inbound sales words as well.">
        <textarea className="sh-textarea" rows={6} defaultValue={lines(cfg.keywords)} onBlur={(e) => { const k = fromLines(e.target.value); if (k.join("\n") !== cfg.keywords.join("\n")) void run(async () => { await set({ keywords: k }); done(); }); }} />
      </Field>
      <Field label="Company blocklist, one per line" hint="Jobs from these companies are hidden by default. Matching is by name, so 'Globe Life' also catches 'Globe Life Liberty National'.">
        <textarea className="sh-textarea" rows={4} defaultValue={lines(cfg.blocklist)} onBlur={(e) => { const b = fromLines(e.target.value); if (b.join("\n") !== cfg.blocklist.join("\n")) void run(async () => { await set({ blocklist: b }); done(); }); }} />
      </Field>
      <Toggle checked={cfg.showBlocked} onChange={(showBlocked) => void run(async () => { await set({ showBlocked }); done(); })} label="Show hidden jobs from blocklisted companies" hint="In the Insurance sales group under Jobs." />
      <h3 className="sh-h3">Company watchlist</h3>
      <p className="sh-hint">Employers that hire for the right kind of job. Paste a careers page link; when it&apos;s on a board the Lookout can read (Greenhouse, Lever, Ashby, Workday, Workable, SmartRecruiters, BambooHR, Breezy, Recruitee), their openings are read with every search and by &ldquo;Check now&rdquo;. Otherwise the link opens their site with the words to search for.</p>
      {cfg.watchlist.map((w, i) => (
        <div key={`${w.name}:${i}`} className="sh-row sh-wrap lo-entry">
          <Toggle checked={w.enabled} onChange={(enabled) => void run(async () => { await set({ watchlist: cfg.watchlist.map((x, j) => (j === i ? { ...x, enabled } : x)) }); })} label={w.name} hint={`${w.url}${w.search ? ` · search "${w.search}"` : ""}${w.note ? ` · ${w.note}` : ""}${watchSource(w) ? " · readable board" : " · link only"}`} />
          <button type="button" className="sh-link" disabled={busy} onClick={() => void run(async () => { await set({ watchlist: cfg.watchlist.filter((_, j) => j !== i) }); done(); })}>Remove</button>
        </div>
      ))}
      <details className="mt-3">
        <summary className="sh-link">Add a company</summary>
        <div className="sh-stack mt-3">
          <input className="sh-input" value={adding.name} maxLength={80} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder="Company name" aria-label="Company name" />
          <input className="sh-input" value={adding.url} maxLength={500} onChange={(e) => setAdding({ ...adding, url: e.target.value })} placeholder="https://… careers page or any job link" aria-label="Careers page link" />
          <input className="sh-input" value={adding.search ?? ""} maxLength={120} onChange={(e) => setAdding({ ...adding, search: e.target.value })} placeholder="What to search for on their site (optional)" aria-label="Search words" />
          <input className="sh-input" value={adding.note ?? ""} maxLength={400} onChange={(e) => setAdding({ ...adding, note: e.target.value })} placeholder="Notes (optional)" aria-label="Notes" />
          <div><Btn disabled={busy || !adding.name.trim() || !/^https?:\/\//i.test(adding.url.trim())} onClick={() => void run(async () => { await set({ watchlist: [...cfg.watchlist, { ...adding, enabled: true }] }); setAdding({ name: "", url: "", search: "", note: "", enabled: true }); done(); })}>Add to the watchlist</Btn></div>
        </div>
      </details>
      <ErrorNote error={error} />
    </Card>
  );
}
