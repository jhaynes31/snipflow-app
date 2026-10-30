"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { FACT_KEYS, FACT_LABEL, INTERACTION_KINDS, INTERACTION_LABEL, MANUAL_MOVES, SCHEDULE_KINDS, SCHEDULE_LABEL, STATUS_LABEL, verificationNote, type Fact, type FactKey, type Facts, type Status } from "@/convex/lookout/pure";
import { Btn, Card, CopyButton, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import { BOARD_HOME, boardFromUrl, EMPLOYER_KINDS, type SourceKind } from "@/convex/lookout/sources";
import { isOpenAnswer, joinAnswerPairs, parseAnswerPairs } from "@/convex/lookout/writing";
import { download, fileName, textToDocx } from "../docx";
import { saveLabel, useAutosave } from "../useAutosave";
import { LOOKOUT } from "../Shell";

const SOURCE_LABEL: Record<Fact["source"], string> = { none: "", listing: "from the listing", ai: "read by the assistant", verified: "verified" };
const DOC_LABEL = { resume: "Resume", letter: "Cover letter", answers: "Application answers" } as const;
type DocKind = keyof typeof DOC_LABEL;
const LOCKED: Status[] = ["approved", "submitted", "interview", "offer", "rejected", "closed"];

function day(ms?: number) {
  return ms ? new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "never";
}

/** One job, all of it: the requirements, the facts and where each came from, the documents, and what happened. */
export function JobDetail({ id }: { id: string }) {
  const data = useQuery(api.lookout.data.job, { id: id as Id<"loJobs"> });
  const markSeen = useMutation(api.lookout.data.markSeen);
  const already = useSearchParams().get("already") === "1";
  useEffect(() => {
    if (data?.job) void markSeen({ jobId: data.job._id }).catch(() => undefined);
  }, [data?.job, markSeen]);
  if (data === undefined) return <Spinner />;
  if (data === null) return <div className="sh-container sh-narrow"><Card><p>That job isn&apos;t here.</p><Link href={`${LOOKOUT}/jobs`} className="sh-link">Back to jobs</Link></Card></div>;
  const { job, rank, docs, application, events, role } = data;
  const status = job.status as Status;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={job.title} subtitle={`${job.employer}${job.location ? ` · ${job.location}` : ""}`} />
      {already && <Note>This job was already here, so you&apos;re looking at the one you have.</Note>}
      <Header job={job} status={status} />
      {job.warnings.length > 0 && (
        <Card className="lo-fail">
          <h2 className="sh-h2">Warnings</h2>
          <ul className="sh-list">{job.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <p className="sh-hint">Never pay to apply, never buy equipment with a check they send, never share banking logins, and never move to a chat app for an interview. If anything asks for money or sensitive details before an offer, stop.</p>
        </Card>
      )}
      <Card>
        <h2 className="sh-h2">{rank.verdict === "eligible" ? "Passes every requirement" : rank.verdict === "check" ? "Some requirements still need checking" : "Fails a requirement"}</h2>
        {rank.checks.map((c) => (
          <div key={c.key} className={`lo-check ${c.result === "pass" ? "lo-pass" : c.result === "fail" ? "lo-fail" : ""}`}>
            <span className="lo-mark" aria-label={c.result}>{c.result === "pass" ? "✓" : c.result === "fail" ? "✗" : "?"}</span>
            <span><strong>{c.label}.</strong> {c.why}</span>
          </div>
        ))}
        {rank.verdict === "rejected" && <p className="sh-hint mt-3">A failed requirement can&apos;t be outweighed by anything else. If a fact here is wrong, correct it below and this updates.</p>}
      </Card>
      {rank.score !== null && (
        <Card>
          <h2 className="sh-h2">How well it fits: <span className="lo-score">{rank.score}</span></h2>
          <ul className="sh-list">
            {rank.parts.map((p) => <li key={p.key}>{p.label}: {Math.round(p.value * 100)} of 100 <span className="sh-muted">(weight {p.weight})</span></li>)}
          </ul>
          {rank.strengths.length > 0 && <><h3 className="sh-h3">Why it might be right</h3><ul className="sh-list">{rank.strengths.map((s) => <li key={s}>{s}</li>)}</ul></>}
          {rank.gaps.length > 0 && <><h3 className="sh-h3">Gaps and trade offs</h3><ul className="sh-list">{rank.gaps.map((s) => <li key={s}>{s}</li>)}</ul></>}
          {rank.uncertain.length > 0 && <><h3 className="sh-h3">Still unknown</h3><ul className="sh-list">{rank.uncertain.map((s) => <li key={s}>{s}</li>)}</ul></>}
        </Card>
      )}
      <FactsCard job={job} />
      <AskCard job={job} />
      <Documents job={job} docs={docs} status={status} />
      <Applied job={job} status={status} application={application} />
      <Approval job={job} docs={docs} application={application} status={status} verdict={rank.verdict} owner={role === "owner"} />
      <Events job={job} events={events} />
      <Listing job={job} />
    </div>
  );
}

function Header({ job, status }: { job: Doc<"loJobs">; status: Status }) {
  const setStatus = useMutation(api.lookout.data.setStatus);
  const remove = useMutation(api.lookout.data.removeJob);
  const recheck = useConvexAction(api.lookout.discover.recheck);
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [note, setNote] = useState<string | null>(null);
  const moves = MANUAL_MOVES[status] ?? [];
  return (
    <Card>
      <p><strong>{STATUS_LABEL[status]}</strong> <span className="sh-muted">since {timeAgo(job.statusAt)}</span></p>
      <p className="sh-hint">
        Found {day(job.discoveredAt)} via {job.sourceName}{job.postedAt ? ` · posted ${day(job.postedAt)}` : ""} · last verified {day(job.lastVerifiedAt)} · last checked {day(job.lastCheckedAt)}{job.deadline ? ` · apply by ${job.deadline}` : ""}{job.changedAt ? ` · the listing changed ${day(job.changedAt)}` : ""}
      </p>
      <p>
        <a className="sh-link" href={job.url} target="_blank" rel="noopener noreferrer">The original listing</a>
        {job.applyUrl && job.applyUrl !== job.url ? <> · <a className="sh-link" href={job.applyUrl} target="_blank" rel="noopener noreferrer">The application page</a></> : null}
      </p>
      {job.alsoAt.length > 0 && <p className="sh-hint">Also seen at: {job.alsoAt.map((u) => <a key={u} className="sh-link" href={u} target="_blank" rel="noopener noreferrer">{new URL(u).hostname} </a>)}</p>}
      {BOARD_HOME[job.sourceKind as SourceKind] && <p className="sh-hint">Found through <a className="sh-link" href={BOARD_HOME[job.sourceKind as SourceKind]!.url} target="_blank" rel="noopener noreferrer">{BOARD_HOME[job.sourceKind as SourceKind]!.name}</a>.</p>}
      <FollowEmployer job={job} />
      <div className="sh-row sh-wrap">
        {moves.map((m) => <Btn key={m} variant={m === "passed" ? "ghost" : "secondary"} disabled={busy} onClick={() => void run(() => setStatus({ jobId: job._id, status: m }))}>{m === "passed" ? "Not for me" : m === "preparing" ? "Prepare an application" : STATUS_LABEL[m]}</Btn>)}
        <Btn variant="ghost" disabled={busy} onClick={() => void run(async () => { const r = await recheck({ jobId: job._id }); setNote(r === "yes" ? "The listing page answered. That usually means it's still up; confirm on the page itself." : r === "no" ? "The listing looks closed." : "The listing page didn't give a clear answer. Open it to check."); })}>Is it still open?</Btn>
      </div>
      {note && <Note>{note}</Note>}
      <ErrorNote error={error} />
      {!LOCKED.includes(status) && <button type="button" className="sh-link mt-3" disabled={busy} onClick={() => { if (window.confirm("Remove this job and its drafts?")) void run(async () => { await remove({ jobId: job._id }); router.push(`${LOOKOUT}/jobs`); }); }}>Remove this job</button>}
    </Card>
  );
}

/** When a job's link is on an employer's own board the Lookout can read, offer to follow that employer. */
function FollowEmployer({ job }: { job: Doc<"loJobs"> }) {
  const settings = useQuery(api.lookout.data.settings);
  const addBoard = useMutation(api.lookout.data.addBoard);
  const { busy, error, run } = useAction();
  const [done, setDone] = useState(false);
  const link = [job.applyUrl, job.url].find((u) => u && boardFromUrl(u));
  const board = link ? boardFromUrl(link) : null;
  if (!settings || !board || EMPLOYER_KINDS.includes(job.sourceKind as SourceKind)) return null;
  if (settings.sources.some((x) => x.kind === board.kind && x.token.toLowerCase() === board.token.toLowerCase() && x.enabled)) return null;
  return (
    <p className="sh-hint">
      {done ? `Following ${job.employer}'s job board now.` : <>This job is on {job.employer}&apos;s own job board. <button type="button" className="sh-link" disabled={busy} onClick={() => void run(async () => { await addBoard({ url: link!, name: job.employer }); setDone(true); })}>Follow {job.employer}</button> to see their other openings at every search.</>}
      <ErrorNote error={error} />
    </p>
  );
}

function FactsCard({ job }: { job: Doc<"loJobs"> }) {
  const verify = useMutation(api.lookout.data.verifyFact);
  const read = useConvexAction(api.lookout.ai.readListing);
  const { busy, error, run } = useAction();
  const [edit, setEdit] = useState<FactKey | null>(null);
  const [form, setForm] = useState({ state: "yes" as "yes" | "no" | "unknown", value: "", note: "" });
  const [readNote, setReadNote] = useState<string | null>(null);
  const facts = job.facts as Facts;

  function openEdit(k: FactKey) {
    const f = facts[k];
    setForm({ state: f?.state ?? "yes", value: f?.value ?? "", note: f?.source === "verified" ? f.note ?? "" : "" });
    setEdit(k);
  }

  const valueInput = (k: FactKey) => {
    if (k === "schedule") return <select className="sh-input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} aria-label="Schedule">{SCHEDULE_KINDS.map((s) => <option key={s} value={s}>{SCHEDULE_LABEL[s]}</option>)}</select>;
    if (k === "interaction") return <select className="sh-input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} aria-label="Contact">{INTERACTION_KINDS.map((s) => <option key={s} value={s}>{INTERACTION_LABEL[s]}</option>)}</select>;
    if (k === "payUnit") return <select className="sh-input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} aria-label="Per">{["hour", "week", "month", "year"].map((s) => <option key={s} value={s}>{s}</option>)}</select>;
    if (k === "employment") return <select className="sh-input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} aria-label="Employment">{["employee", "contractor"].map((s) => <option key={s} value={s}>{s}</option>)}</select>;
    if (k === "payMin" || k === "payMax" || k === "hours") return <input className="sh-input sh-input-sm" type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} aria-label={FACT_LABEL[k]} />;
    return null;
  };

  return (
    <Card>
      <h2 className="sh-h2">The facts, and where each came from</h2>
      <p className="sh-hint">&quot;From the listing&quot; and &quot;read by the assistant&quot; are what the posting seems to say. Only a fact you checked yourself (with a recruiter, the careers page, or the employer&apos;s written policy) is marked verified. Ask about working while traveling directly; many remote jobs still require one fixed address.</p>
      <div className="sh-row sh-wrap">
        <Btn variant="secondary" disabled={busy} onClick={() => void run(async () => { const r = await read({ jobId: job._id }); setReadNote(r.read ? `Read ${r.read} facts from the listing. Each one quotes the listing; please check them.` : "The listing didn't state anything new."); })}>{busy ? "Reading…" : "Read the listing for me"}</Btn>
      </div>
      {readNote && <Note>{readNote}</Note>}
      <ErrorNote error={error} />
      <table className="lo-facts">
        <tbody>
          {FACT_KEYS.map((k) => {
            const f = facts[k];
            return (
              <tr key={k}>
                <th scope="row">{FACT_LABEL[k]}</th>
                <td>
                  {f ? <>{f.state === "yes" ? (f.value ? valueLabel(k, f.value) : "Yes") : f.state === "no" ? "No" : "Unknown"} <span className={f.source === "verified" ? "lo-verified" : "lo-source"}>{SOURCE_LABEL[f.source]}</span>{f.note ? <><br /><span className="lo-source">&ldquo;{f.note}&rdquo;</span></> : null}</> : <span className="sh-muted">Unknown</span>}
                  {edit === k ? (
                    <div className="sh-stack-sm mt-3">
                      <div className="sh-row sh-wrap">
                        <select className="sh-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value as typeof form.state })} aria-label="Is it so">
                          <option value="yes">Yes{valueInput(k) ? " (with the value)" : ""}</option>
                          <option value="no">No</option>
                          <option value="unknown">Unknown (clear it)</option>
                        </select>
                        {form.state === "yes" && valueInput(k)}
                      </div>
                      <input className="sh-input" value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="How you know: who said it, where it's written" aria-label="How you know" />
                      <div className="sh-row">
                        <Btn disabled={busy || (form.state !== "unknown" && !form.note.trim())} onClick={() => void run(async () => { await verify({ jobId: job._id, key: k, state: form.state, value: form.value || undefined, note: form.note || undefined }); setEdit(null); })}>Save as verified</Btn>
                        <Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    <> <button type="button" className="sh-link" onClick={() => openEdit(k)}>{f?.source === "verified" ? "Change" : "I checked this"}</button></>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/** The questions still open, as a note he can send the recruiter. */
function AskCard({ job }: { job: Doc<"loJobs"> }) {
  const answers = useQuery(api.lookout.data.answers);
  const name = answers?.find((a) => a.key === "name")?.answer ?? "";
  const note = verificationNote(job.facts as Facts, job, name);
  if (!note) return null;
  return (
    <Card>
      <h2 className="sh-h2">Ask instead of guessing</h2>
      <p className="sh-hint">The questions this listing leaves open, as a short note for the recruiter or hiring contact. When they answer, mark each fact above as checked, with who said it.</p>
      <pre className="lo-doc" style={{ whiteSpace: "pre-wrap", minHeight: 0 }}>{note}</pre>
      <CopyButton text={note} label="Copy the note" />
    </Card>
  );
}

function valueLabel(k: FactKey, value: string) {
  if (k === "schedule") return SCHEDULE_LABEL[value as keyof typeof SCHEDULE_LABEL] ?? value;
  if (k === "interaction") return INTERACTION_LABEL[value as keyof typeof INTERACTION_LABEL] ?? value;
  if (k === "payMin" || k === "payMax") return `$${Number(value).toLocaleString("en-US")}`;
  return value;
}

function Documents({ job, docs, status }: { job: Doc<"loJobs">; docs: Doc<"loDocs">[]; status: Status }) {
  const draftResume = useConvexAction(api.lookout.ai.draftResume);
  const draftLetter = useConvexAction(api.lookout.ai.draftLetter);
  const draftAnswers = useConvexAction(api.lookout.ai.draftAnswers);
  const { busy, error, run } = useAction();
  const [printing, setPrinting] = useState<string | null>(null);
  const locked = LOCKED.includes(status);
  if (["rejected", "passed"].includes(status)) return null;
  if (["new", "review", "saved"].includes(status) && docs.length === 0 && !job.applicationQuestions) {
    return (
      <Card>
        <h2 className="sh-h2">Application</h2>
        <p className="sh-muted">When this one is worth pursuing, choose &quot;Prepare an application&quot; above, or draft the resume now.</p>
        <ErrorNote error={error} />
        <Btn disabled={busy} onClick={() => void run(() => draftResume({ jobId: job._id }))}>{busy ? "Writing…" : "Draft a tailored resume"}</Btn>
      </Card>
    );
  }
  const byKind = new Map(docs.map((d) => [d.kind, d]));
  const actions: Record<DocKind, () => Promise<unknown>> = {
    resume: () => draftResume({ jobId: job._id }),
    letter: () => draftLetter({ jobId: job._id }),
    answers: () => draftAnswers({ jobId: job._id }),
  };

  return (
    <Card>
      <h2 className="sh-h2">Application documents</h2>
      <p className="sh-hint">Drafted only from your confirmed history and answers. Everything here saves as you type and stays with this job. Every save is scanned: dashes are rewritten, and any number or detail not in your profile is flagged. Nothing here promises anything about AI detectors.</p>
      <ErrorNote error={error} />
      {(Object.keys(DOC_LABEL) as DocKind[]).map((kind) => {
        const d = byKind.get(kind);
        return (
          <div key={kind} className="lo-entry">
            <h3 className="sh-h3">{DOC_LABEL[kind]}</h3>
            {kind === "answers" && !locked && <QuestionsBox job={job} />}
            {!locked && (
              <div className="sh-row sh-wrap">
                <Btn variant={d ? "secondary" : "primary"} disabled={busy || (kind === "answers" && !job.applicationQuestions?.trim())} onClick={() => void run(actions[kind])}>{busy ? "Writing…" : d ? "Draft it again" : `Draft the ${DOC_LABEL[kind].toLowerCase()}`}</Btn>
                {d && kind === "answers" && <span className="sh-hint">Drafting again keeps every answer already given for this job.</span>}
              </div>
            )}
            {d && (
              <>
                {d.questions.length > 0 && (
                  <div className="sh-note">
                    <strong>Questions before this is final:</strong>
                    <ul className="sh-list">{d.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                    <span className="sh-hint">Answer these in the <Link className="sh-link" href={`${LOOKOUT}/interview`}>interview</Link> or <Link className="sh-link" href={`${LOOKOUT}/history`}>work history</Link>, then draft it again.</span>
                  </div>
                )}
                {d.issues.length > 0 ? (
                  <ul className="sh-list">
                    {d.issues.map((i) => <li key={i.text} className={i.level === "block" ? "sh-error" : undefined}>{i.level === "block" ? "Must fix: " : i.level === "fix" ? "Worth fixing: " : "Note: "}{i.text}</li>)}
                  </ul>
                ) : <p className="lo-verified">Checked: no dashes, nothing unsupported, nothing private.</p>}
                {kind === "answers" ? <AnswersEditor key={`${d._id}:${d.draftedAt ?? 0}`} job={job} doc={d} locked={locked} /> : <DocEditor key={`${d._id}:${d.draftedAt ?? 0}`} job={job} doc={d} locked={locked} />}
                <div className="sh-row sh-wrap mt-3">
                  <DocExports text={d.text} name={fileName(DOC_LABEL[kind], job.employer)} onPrint={() => { setPrinting(d.text); setTimeout(() => window.print(), 50); }} />
                </div>
              </>
            )}
          </div>
        );
      })}
      {printing && <div className="lo-print" aria-hidden>{printing}</div>}
    </Card>
  );
}

/** The employer's questions, pasted once and kept with the job. */
function QuestionsBox({ job }: { job: Doc<"loJobs"> }) {
  const save = useMutation(api.lookout.data.saveApplicationQuestions);
  const auto = useAutosave((text) => save({ jobId: job._id, text }));
  const [text, setText] = useState(job.applicationQuestions ?? "");
  return (
    <Field label="The application's questions" hint="Paste them from the employer's form, one per line. They're kept with this job. Anything only you can answer (eligibility, salary, start date) comes back as ASK FIRST, unless you've answered it on another application.">
      <textarea className="sh-textarea" rows={4} value={text} onChange={(e) => { setText(e.target.value); auto.change(e.target.value); }} onBlur={() => void auto.flush()} />
      <span className="sh-hint">{saveLabel(auto.state)}</span>
    </Field>
  );
}

function DocEditor({ job, doc, locked }: { job: Doc<"loJobs">; doc: Doc<"loDocs">; locked: boolean }) {
  const save = useMutation(api.lookout.data.saveDoc);
  const auto = useAutosave((text) => save({ jobId: job._id, kind: doc.kind, text }), 1800);
  const [text, setText] = useState(doc.text);
  return (
    <>
      <textarea className="sh-textarea lo-doc" value={text} readOnly={locked} onChange={(e) => { setText(e.target.value); auto.change(e.target.value); }} onBlur={() => void auto.flush()} aria-label={DOC_LABEL[doc.kind]} />
      <span className="sh-hint">{saveLabel(auto.state)}{auto.state === "error" && auto.error ? `: ${auto.error}` : ""}</span>
    </>
  );
}

/**
 * The answers one question at a time: each with its own box, saved as he
 * types, and a copy button for pasting into the employer's form. Open ones
 * (ASK FIRST) are marked. What he writes here is remembered for the same
 * question on later applications.
 */
function AnswersEditor({ job, doc, locked }: { job: Doc<"loJobs">; doc: Doc<"loDocs">; locked: boolean }) {
  const save = useMutation(api.lookout.data.saveDoc);
  const auto = useAutosave((text) => save({ jobId: job._id, kind: "answers", text }));
  const [pairs, setPairs] = useState(() => parseAnswerPairs(doc.text));
  const open = pairs.filter((p) => isOpenAnswer(p.answer)).length;
  function edit(i: number, answer: string) {
    const next = pairs.map((p, j) => (j === i ? { ...p, answer } : p));
    setPairs(next);
    auto.change(joinAnswerPairs(next));
  }
  return (
    <div className="sh-stack-sm">
      {open > 0 && <p className="sh-note">{open} {open === 1 ? "answer needs" : "answers need"} filling in: look for ASK FIRST.</p>}
      {pairs.map((p, i) => (
        <div key={`${i}:${p.question}`} className={isOpenAnswer(p.answer) ? "lo-fail" : undefined}>
          <p><strong>{p.question}</strong></p>
          <textarea className="sh-textarea" rows={Math.min(8, Math.max(2, Math.ceil(p.answer.length / 80)))} value={p.answer} readOnly={locked} onChange={(e) => edit(i, e.target.value)} onBlur={() => void auto.flush()} aria-label={p.question} />
          <CopyButton text={p.answer} label="Copy answer" />
        </div>
      ))}
      <span className="sh-hint">{saveLabel(auto.state)}{auto.state === "error" && auto.error ? `: ${auto.error}` : ""}</span>
    </div>
  );
}

function DocExports({ text, name, onPrint }: { text: string; name: string; onPrint: () => void }) {
  return (
    <>
      <Btn variant="secondary" onClick={() => void textToDocx(text).then((b) => download(b, `${name}.docx`))}>Word file</Btn>
      <Btn variant="secondary" onClick={onPrint}>Print or save as PDF</Btn>
      <CopyButton text={text} label="Copy text" />
    </>
  );
}

function Approval({ job, docs, application, status, verdict, owner }: { job: Doc<"loJobs">; docs: Doc<"loDocs">[]; application: Doc<"loApplications"> | null; status: Status; verdict: string; owner: boolean }) {
  const ready = useMutation(api.lookout.data.markReady);
  const approve = useMutation(api.lookout.data.approve);
  const { busy, error, run } = useAction();
  const [sure, setSure] = useState(false);
  const blocked = docs.some((d) => d.issues.some((i) => i.level === "block"));

  if (status === "preparing") {
    return (
      <Card>
        <h2 className="sh-h2">When the documents are right</h2>
        {verdict !== "eligible" && <p className="sh-note">Approval needs every requirement to pass. {verdict === "check" ? "Check the unknown ones above first." : "This job fails one."}</p>}
        <ErrorNote error={error} />
        <Btn disabled={busy || blocked || !docs.some((d) => d.kind === "resume")} onClick={() => void run(() => ready({ jobId: job._id }))}>Ready for approval</Btn>
      </Card>
    );
  }
  if (status === "ready") {
    return (
      <Card className="lo-fail">
        <h2 className="sh-h2">Approve this application</h2>
        {owner ? (
          <>
            <p>Approving keeps these exact documents on record for this job. Nothing is sent; you submit on the employer&apos;s page yourself.</p>
            <label className="sh-toggle"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /><span>I&apos;ve read every document, everything in them is true, and I want to apply.</span></label>
            <ErrorNote error={error} />
            <Btn big disabled={busy || !sure || verdict !== "eligible" || blocked} onClick={() => void run(() => approve({ jobId: job._id }))}>Approve</Btn>
          </>
        ) : (
          <p>Waiting for approval from the person applying. Only they can approve.</p>
        )}
      </Card>
    );
  }
  if (!application) return null;
  return (
    <Card>
      <h2 className="sh-h2">The application on record</h2>
      <p className="sh-hint">{application.approvedAt ? `Approved ${day(application.approvedAt)}.` : "Applied without approving here first."}{application.submittedAt ? ` Submitted ${day(application.submittedAt)}.` : " Not submitted yet."}</p>
      {application.resume || application.letter || application.answers ? (
      <details>
        <summary className="sh-link">The resume{application.letter ? ", letter" : ""}{application.answers ? ", and answers" : ""} on file for it</summary>
        <pre className="lo-doc" style={{ whiteSpace: "pre-wrap" }}>{application.resume}</pre>
        {application.letter && <pre className="lo-doc" style={{ whiteSpace: "pre-wrap" }}>{application.letter}</pre>}
        {application.answers && <pre className="lo-doc" style={{ whiteSpace: "pre-wrap" }}>{application.answers}</pre>}
      </details>
      ) : null}
      {application.approvedAt && <p className="sh-hint mt-3">Word files and PDFs of these are in the documents above, which can no longer be edited.</p>}
      {status === "approved" && (
        <div className="lo-entry">
          <h3 className="sh-h3">Submit it on the employer&apos;s page</h3>
          <p>
            <a className="sh-btn sh-btn-primary" href={job.applyUrl ?? job.url} target="_blank" rel="noopener noreferrer">Open the application page</a>
          </p>
          <p className="sh-hint">Fill it in with the documents above, then record it below. Don&apos;t give a Social Security number, bank details, or ID before an offer unless you&apos;re sure the page is the employer&apos;s own.</p>
        </div>
      )}
    </Card>
  );
}

const HOW: { key: "email" | "page" | "unsure" | "other"; label: string }[] = [
  { key: "email", label: "A confirmation email came" },
  { key: "page", label: "The site showed a confirmation" },
  { key: "unsure", label: "Not sure it went through yet" },
  { key: "other", label: "Something else" },
];

/**
 * "I applied to this": the Lookout never sends applications, so this is how
 * it learns one went in on the employer's site. Works from any stage.
 */
function Applied({ job, status, application }: { job: Doc<"loJobs">; status: Status; application: Doc<"loApplications"> | null }) {
  const mark = useMutation(api.lookout.data.markApplied);
  const unmark = useMutation(api.lookout.data.unmarkApplied);
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ how: "email" as (typeof HOW)[number]["key"], note: "", day: "" });
  if (status === "submitted" && application?.submittedAt) {
    return (
      <Card>
        <h2 className="sh-h2">Applied {day(application.submittedAt)}</h2>
        <p>{application.confirmation}</p>
        {application.howKnown === "unsure" && <p className="sh-note">Not confirmed yet. Look for an email from {job.employer} (check the spam folder too). A reminder to check is on the list below.</p>}
        {!application.resume && <p className="sh-hint">No resume was drafted here for this one, so there&apos;s no copy on file of what was sent.</p>}
        <ErrorNote error={error} />
        <button type="button" className="sh-link" disabled={busy} onClick={() => { if (window.confirm("Mark this as not applied after all?")) void run(() => unmark({ jobId: job._id })); }}>Not applied after all</button>
      </Card>
    );
  }
  if (!["new", "review", "saved", "preparing", "ready", "approved", "passed"].includes(status)) return null;
  return (
    <Card className={status === "approved" ? "lo-fail" : undefined}>
      <h2 className="sh-h2">Applied already?</h2>
      <p className="sh-hint">Applications are sent on the employer&apos;s own site, never from here. Once one is sent, record it so it shows as Submitted and the follow up is scheduled.</p>
      {open ? (
        <div className="sh-stack-sm">
          <div className="sh-radio-list" role="radiogroup" aria-label="How you know it went through">
            {HOW.map((h) => (
              <label key={h.key} className="sh-radio">
                <input type="radio" name={`how-${job._id}`} checked={f.how === h.key} onChange={() => setF({ ...f, how: h.key })} /> {h.label}
              </label>
            ))}
          </div>
          <div className="sh-row sh-wrap">
            <Field label="Applied on (blank for today)"><input className="sh-input" type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
            <Field label="Anything to note (optional)"><input className="sh-input" value={f.note} maxLength={400} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Reference number, which resume, who it went to" /></Field>
          </div>
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn disabled={busy} onClick={() => void run(async () => { await mark({ jobId: job._id, how: f.how, note: f.note || undefined, appliedOn: f.day || undefined }); setOpen(false); })}>Record it</Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <Btn variant="secondary" onClick={() => setOpen(true)}>I applied to this</Btn>
      )}
    </Card>
  );
}

function Events({ job, events }: { job: Doc<"loJobs">; events: Doc<"loEvents">[] }) {
  const add = useMutation(api.lookout.data.addEvent);
  const done = useMutation(api.lookout.data.setEventDone);
  const remove = useMutation(api.lookout.data.removeEvent);
  const notes = useMutation(api.lookout.data.setNotes);
  const { busy, error, run } = useAction();
  const [f, setF] = useState({ kind: "interview" as Doc<"loEvents">["kind"], when: "", text: "" });
  const LABEL = { interview: "Interview", followUp: "Follow up", note: "Note", feedback: "How it went" };
  return (
    <Card>
      <h2 className="sh-h2">Interviews, follow ups, and notes</h2>
      {events.length === 0 && <p className="sh-muted">Nothing yet.</p>}
      {events.map((e) => (
        <div key={e._id} className="lo-entry">
          <p><strong>{LABEL[e.kind]}</strong>{e.at ? ` · ${new Date(e.at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}{e.done && (e.kind === "interview" || e.kind === "followUp") ? " · done" : ""}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{e.text}</p>
          <div className="sh-row">
            {(e.kind === "interview" || e.kind === "followUp") && <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => done({ id: e._id, done: !e.done }))}>{e.done ? "Not done" : "Done"}</button>}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: e._id }))}>Remove</button>
          </div>
        </div>
      ))}
      <div className="lo-entry sh-stack-sm">
        <div className="sh-row sh-wrap">
          <select className="sh-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })} aria-label="Kind">
            {(Object.keys(LABEL) as (keyof typeof LABEL)[]).map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}
          </select>
          {(f.kind === "interview" || f.kind === "followUp") && <input className="sh-input" type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} aria-label="When" />}
        </div>
        <textarea className="sh-textarea" rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder={f.kind === "interview" ? "With whom, how (phone, video), what to prepare" : f.kind === "feedback" ? "What went well, what was hard, anything to remember next time" : ""} aria-label="Details" />
        <ErrorNote error={error} />
        <Btn disabled={busy || !f.text.trim()} onClick={() => void run(async () => { await add({ jobId: job._id, kind: f.kind, at: f.when ? new Date(f.when).getTime() : undefined, text: f.text }); setF({ ...f, when: "", text: "" }); })}>Add</Btn>
      </div>
      <div className="lo-entry">
        <Field label="Private notes on this job">
          <textarea className="sh-textarea" rows={3} defaultValue={job.notes ?? ""} onBlur={(e) => { if (e.target.value !== (job.notes ?? "")) void run(() => notes({ jobId: job._id, notes: e.target.value })); }} />
        </Field>
      </div>
    </Card>
  );
}

function Listing({ job }: { job: Doc<"loJobs"> }) {
  return (
    <Card tone="alt">
      <details>
        <summary className="sh-link">The listing as it was found</summary>
        <p style={{ whiteSpace: "pre-wrap" }} className="mt-3">{job.description}</p>
      </details>
    </Card>
  );
}
