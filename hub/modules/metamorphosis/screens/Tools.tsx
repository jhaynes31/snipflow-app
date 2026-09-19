"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { COMPASS_PROMPTS, SCOUT_POOL, SEEN_IDEAS, SHIELD_STEPS, TIRED_LINES } from "@/core/metamorphosis/tools";
import { pickForDay } from "@/convex/reCentered/pure";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const today = () => new Date().toISOString().slice(0, 10);

/** The Scout: what I noticed, and what I did about it before anyone asked. */
export function Scout() {
  const rows = useQuery(api.metamorphosis.tools.scout);
  const add = useMutation(api.metamorphosis.tools.addScout);
  const remove = useMutation(api.metamorphosis.tools.removeScout);
  const { busy, error, run } = useAction();
  const [noticed, setNoticed] = useState("");
  const [did, setDid] = useState("");
  const [day] = useState(today);
  const idea = pickForDay(SCOUT_POOL, day)!;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Scout" subtitle="Initiative is noticing, then moving, before anyone asks. Scouts see first. One line a day." />
      <Card tone="alt">
        <p className="sh-eyebrow">Somewhere to look today</p>
        <p>{idea}</p>
      </Card>
      <Card>
        <Field label="What I noticed today">
          <input className="sh-input" value={noticed} onChange={(e) => setNoticed(e.target.value)} maxLength={300} />
        </Field>
        <Field label="What I did about it, before anyone asked" hint="Small counts. 'Nothing yet' is honest and allowed.">
          <input className="sh-input" value={did} onChange={(e) => setDid(e.target.value)} maxLength={300} />
        </Field>
        <CrisisNotice texts={[noticed, did]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !noticed.trim()} onClick={() => void run(async () => { await add({ noticed, did: did || undefined }); setNoticed(""); setDid(""); })}>Scouted</Btn>
      </Card>
      <p className="sh-hint">Things your partner has already said she&apos;d feel loved by are in <Link href="/kept-word/ways" className="sh-link">Ways to show up</Link>. Scouting starts there.</p>
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Lately</h2>
          {rows.map((r) => (
            <div key={r._id} className="mm-entry">
              <p><strong>{r.noticed}</strong>{r.did ? <span> · {r.did}</span> : null}</p>
              <p className="sh-hint">{r.day} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</button></p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/** Do It Tired: hard things when motivation and willpower are not there. */
export function Tired() {
  const { profile } = useHub();
  const rows = useQuery(api.metamorphosis.tools.tired);
  const add = useMutation(api.metamorphosis.tools.addTired);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const settings = (profile.moduleSettings?.metamorphosis as { tiredPlan?: string } | undefined) ?? {};
  const [plan, setPlan] = useState(settings.tiredPlan ?? "");
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState<number | null>(null);
  const [day] = useState(today);
  const line = pickForDay(TIRED_LINES, day)!;
  const running = seconds !== null && seconds > 0;
  if (running) setTimeout(() => setSeconds((s) => (s && s > 0 ? s - 1 : 0)), 1000);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Do It Tired" subtitle="For when the motivation isn't there and isn't coming. It doesn't need to. Willpower is not the plan; the plan is the plan." />
      <Card className="rc-quote">
        <p className="mm-line">{line}</p>
      </Card>
      <Card>
        <Field label="The thing" hint="One thing. Smaller than you think.">
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
        </Field>
        <CrisisNotice texts={[text]} />
        <div className="sh-choices">
          <Btn big disabled={!text.trim() || running} onClick={() => setSeconds(120)}>Two minutes, tired</Btn>
          <LinkBtn href="/tend/tools/smallestStep" variant="secondary">Smallest Step</LinkBtn>
          <LinkBtn href="/tend/tools/focusMode" variant="secondary">Focus Mode</LinkBtn>
        </div>
        {running && <p className="tend-timer" aria-live="polite">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>}
        {seconds === 0 && (
          <div className="sh-stack-sm mt-3">
            <p>Two minutes, done tired. Keep going or stop; both are fine. Either way, it&apos;s on the record.</p>
            <ErrorNote error={error} />
            <Btn disabled={busy} onClick={() => void run(async () => { await add({ text }); setText(""); setSeconds(null); })}>I did it tired</Btn>
          </div>
        )}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">My plan for tired days</h2>
        <p className="sh-hint">Written on a good day. &ldquo;When I don&apos;t want to, I will…&rdquo; This room shows it back when you need it.</p>
        <textarea className="sh-input sh-textarea" rows={3} value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={800} aria-label="My plan for tired days" />
        <Btn variant="secondary" disabled={busy || plan === (settings.tiredPlan ?? "")} onClick={() => void run(() => setModuleSettings({ moduleId: "metamorphosis", settings: { ...settings, tiredPlan: plan.trim() } }))}>Save the plan</Btn>
      </Card>
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card>
          <h2 className="sh-h2">Done tired</h2>
          <p className="sh-hint">Each of these was the version that builds something.</p>
          {rows.map((r) => (
            <p key={r._id} className="mm-entry">{r.day}: {r.text}</p>
          ))}
        </Card>
      )}
    </div>
  );
}

/** Shield Down: defensiveness in conflict, practiced when calm. */
export function Shield() {
  const rows = useQuery(api.metamorphosis.tools.shields);
  const add = useMutation(api.metamorphosis.tools.addShield);
  const remove = useMutation(api.metamorphosis.tools.removeShield);
  const { busy, error, run } = useAction();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [saved, setSaved] = useState(false);
  const [asking, setAsking] = useState(false);
  const step = SHIELD_STEPS[i];
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Shield Down" subtitle="Defensiveness is the shield going up before you've decided to raise it. This is how to lower it. Practice it calm; use it when it's not." />
      {!saved ? (
        <Card>
          <p className="sh-eyebrow">{i + 1} of {SHIELD_STEPS.length} · {step.title}</p>
          <Field label={step.prompt} hint={step.hint}>
            <textarea className="sh-input sh-textarea" rows={3} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} maxLength={800} />
          </Field>
          <CrisisNotice texts={answers} />
          <ErrorNote error={error} />
          <div className="sh-choices">
            {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
            {i < SHIELD_STEPS.length - 1 ? (
              <Btn onClick={() => setI(i + 1)} disabled={!answers[i].trim()}>Next</Btn>
            ) : (
              <Btn disabled={busy || answers.some((a) => !a.trim())} onClick={() => void run(async () => { await add({ threat: answers[0], truePart: answers[1], sentences: answers[2] }); setSaved(true); })}>Shield down</Btn>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Note>Kept. You now have three sentences you didn&apos;t have before. That&apos;s the whole tool.</Note>
          <Btn variant="secondary" onClick={() => { setSaved(false); setI(0); setAnswers(["", "", ""]); }}>Another</Btn>
        </Card>
      )}
      <Btn variant={asking ? "ghost" : "secondary"} onClick={() => setAsking(!asking)}>{asking ? "Close the mentor" : "Work it through with the mentor"}</Btn>
      {asking && <CoachChat module="metamorphosis" task="metamorphosis.shieldDown" opening={answers[0] ? `What felt under attack: ${answers[0]}` : undefined} placeholder="Here's what was said, and what I felt…" />}
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Sentences I have now</h2>
          {rows.map((r) => (
            <div key={r._id} className="mm-entry">
              <p className="sh-muted">Threat: {r.threat} · True part: {r.truePart}</p>
              <p>{r.sentences}</p>
              <p className="sh-hint">{timeAgo(r.createdAt)} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</button></p>
            </div>
          ))}
        </Card>
      )}
      <p className="sh-hint">If it&apos;s a hurt that needs a real conversation, <Link href="/tend/together" className="sh-link">Repair in Tend</Link> is built for that.</p>
    </div>
  );
}

/** Quest Log: one main quest at a time. Abandoned, never failed. */
export function Quests() {
  const rows = useQuery(api.metamorphosis.tools.quests);
  const add = useMutation(api.metamorphosis.tools.addQuest);
  const close = useMutation(api.metamorphosis.tools.closeQuest);
  const toEveryBox = useMutation(api.metamorphosis.tools.questToEveryBox);
  const { busy, error, run } = useAction();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"main" | "side">("main");
  if (!rows) return <Spinner />;
  const active = rows.filter((q) => q.status === "active");
  const closed = rows.filter((q) => q.status !== "active");
  const hasMain = active.some((q) => q.kind === "main");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Quest Log" subtitle="One main quest at a time, small, chosen by you. Side quests allowed. Done is done. Set down is honest, never failed." />
      <Card>
        <Field label="The quest" hint="Small enough to finish this week. 'Fix the gate latch.' 'Call one insurance lead.' 'Plan Friday.'">
          <input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <div className="sh-choices">
          <Btn variant={kind === "main" ? "primary" : "secondary"} onClick={() => setKind("main")} disabled={hasMain}>Main quest{hasMain ? " (one at a time)" : ""}</Btn>
          <Btn variant={kind === "side" ? "primary" : "secondary"} onClick={() => setKind("side")}>Side quest</Btn>
        </div>
        <ErrorNote error={error} />
        <Btn disabled={busy || !title.trim() || (kind === "main" && hasMain)} onClick={() => void run(async () => { await add({ title, kind }); setTitle(""); })}>Take it on</Btn>
      </Card>
      <Card>
        <h2 className="sh-h2">Active</h2>
        {active.length === 0 && <p className="sh-muted">Nothing active. That&apos;s allowed too.</p>}
        {active.map((q) => (
          <QuestRow key={q._id} q={q} busy={busy} onClose={(status, note) => void run(() => close({ id: q._id, status, note }))} onEveryBox={() => void run(() => toEveryBox({ id: q._id }))} />
        ))}
      </Card>
      {closed.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Earlier</h2>
          {closed.map((q) => (
            <p key={q._id} className="mm-entry">
              <strong>{q.status === "done" ? "Done" : "Set down"}:</strong> {q.title}{q.note ? <span className="sh-muted"> · {q.note}</span> : null}
            </p>
          ))}
        </Card>
      )}
    </div>
  );
}

function QuestRow({ q, busy, onClose, onEveryBox }: { q: Doc<"mmQuests">; busy: boolean; onClose: (status: "done" | "abandoned", note?: string) => void; onEveryBox: () => void }) {
  const [setting, setSetting] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="mm-entry">
      <p><strong>{q.kind === "main" ? "Main" : "Side"}:</strong> {q.title}{q.sentToEveryBoxAt ? <span className="sh-muted"> · in Every Box</span> : null}</p>
      {!setting ? (
        <div className="sh-choices">
          <Btn disabled={busy} onClick={() => onClose("done")}>Done</Btn>
          <Btn variant="secondary" disabled={busy} onClick={() => setSetting(true)}>Set it down</Btn>
          {!q.sentToEveryBoxAt && <Btn variant="ghost" disabled={busy} onClick={onEveryBox}>To Every Box</Btn>}
          <LinkBtn href="/tend/tools/smallestStep" variant="ghost">Smallest Step</LinkBtn>
        </div>
      ) : (
        <div className="sh-stack-sm">
          <p className="sh-hint">Setting it down is honest. A line, if you want one.</p>
          <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} aria-label="A line" />
          <div className="sh-row">
            <Btn disabled={busy} onClick={() => onClose("abandoned", note || undefined)}>Set down</Btn>
            <Btn variant="ghost" onClick={() => setSetting(false)}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/** Iron: his word to himself. Asked by the room and only the room. */
export function Iron() {
  const data = useQuery(api.metamorphosis.tools.iron);
  const give = useMutation(api.metamorphosis.tools.giveIron);
  const close = useMutation(api.metamorphosis.tools.closeIron);
  const remove = useMutation(api.metamorphosis.tools.removeIron);
  const week = useMutation(api.metamorphosis.tools.ironWeek);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [man, setMan] = useState("");
  if (!data) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Iron" subtitle="Your word to yourself. Not to Jen; that's Kept Word. This one only this room asks about. Self-trust is built here, one kept word at a time." />
      <Card>
        <Field label="My word to me" hint="'Phone away at dinner.' 'Shower before I sit down.' 'Call my brother Thursday.'">
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
        </Field>
        <Field label="By when" hint="Optional.">
          <input className="sh-input" type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
        <CrisisNotice texts={[text]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await give({ text, dueDay: dueDay || undefined }); setText(""); setDueDay(""); })}>That&apos;s my word</Btn>
      </Card>
      <Card>
        <h2 className="sh-h2">Open</h2>
        {data.open.length === 0 && <p className="sh-muted">Nothing open.</p>}
        {data.open.map((r) => (
          <div key={r._id} className="mm-entry">
            <p><strong>{r.text}</strong>{r.dueDay ? <span className="sh-muted"> · by {r.dueDay}</span> : null}</p>
            <div className="sh-choices">
              <Btn disabled={busy} onClick={() => void run(() => close({ id: r._id, status: "kept" }))}>Kept</Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => void run(() => close({ id: r._id, status: "didnt" }))}>Didn&apos;t</Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</Btn>
            </div>
          </div>
        ))}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">This week: which older man did you talk to?</h2>
        <p className="sh-hint">A mentor, a friend, a pastor, a brother, a guy at the game shop. An app can be a mentor&apos;s voice; it can&apos;t be a mentor. This question is here every week on purpose.</p>
        {data.week ? <p>This week: <strong>{data.week.man}</strong></p> : null}
        <div className="sh-row sh-wrap">
          <input className="sh-input" value={man} onChange={(e) => setMan(e.target.value)} maxLength={120} placeholder="Who, and about what" aria-label="Who" />
          <Btn variant="secondary" disabled={busy || !man.trim()} onClick={() => void run(async () => { await week({ man }); setMan(""); })}>{data.week ? "Change" : "Noted"}</Btn>
        </div>
        <p className="sh-hint">Finding those men is what <strong>The Party</strong> is for, coming in the next build.</p>
      </Card>
      {data.kept.length > 0 && (
        <Card>
          <h2 className="sh-h2">Kept, to myself</h2>
          <p className="sh-hint">The only follow-through record that builds self-trust is this one.</p>
          {data.kept.map((r) => (
            <p key={r._id} className="mm-entry">{r.text} <span className="sh-muted">· {r.closedAt ? timeAgo(r.closedAt) : ""}</span></p>
          ))}
        </Card>
      )}
    </div>
  );
}

/** The Compass: leading himself and his family. */
export function CompassScreen() {
  const { profile } = useHub();
  const data = useQuery(api.metamorphosis.tools.compass);
  const set = useMutation(api.metamorphosis.tools.setCompass);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const settings = (profile.moduleSettings?.metamorphosis as Record<string, unknown> | undefined) ?? {};
  const [vision, setVision] = useState<Record<string, string>>(() => Object.fromEntries(COMPASS_PROMPTS.map((p) => [p.key, typeof settings[`vision_${p.key}`] === "string" ? (settings[`vision_${p.key}`] as string) : ""])));
  const [lead, setLead] = useState("");
  const [decision, setDecision] = useState("");
  if (!data) return <Spinner />;
  const dirty = COMPASS_PROMPTS.some((p) => vision[p.key] !== ((settings[`vision_${p.key}`] as string | undefined) ?? ""));
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Compass" subtitle="Leading yourself and your family. Not being in charge: deciding, saying, and doing, before you're asked and without deferring." />
      <Card>
        <h2 className="sh-h2">This week</h2>
        {data.week ? (
          <>
            <p><strong>I&apos;ll lead:</strong> {data.week.lead}</p>
            {data.week.decision && <p><strong>I&apos;ll decide:</strong> {data.week.decision}</p>}
            <div className="sh-choices">
              {!data.week.done && <Btn disabled={busy} onClick={() => void run(() => set({ lead: data.week!.lead, decision: data.week!.decision, done: true }))}>I did it</Btn>}
              {data.week.done && <Note>Led. On the record.</Note>}
            </div>
          </>
        ) : (
          <>
            <Field label="One thing I'll lead this week, without being asked" hint="Plan Friday. Sort the insurance paperwork. Call the landlord. Take the kids Saturday morning.">
              <input className="sh-input" value={lead} onChange={(e) => setLead(e.target.value)} maxLength={300} />
            </Field>
            <Field label="One decision I'll make myself" hint="Optional. Something you'd usually defer.">
              <input className="sh-input" value={decision} onChange={(e) => setDecision(e.target.value)} maxLength={300} />
            </Field>
            <ErrorNote error={error} />
            <Btn disabled={busy || !lead.trim()} onClick={() => void run(async () => { await set({ lead, decision: decision || undefined }); setLead(""); setDecision(""); })}>Set the compass</Btn>
          </>
        )}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">Where I&apos;m headed</h2>
        {COMPASS_PROMPTS.map((p) => (
          <Field key={p.key} label={p.label} hint={p.hint}>
            <textarea className="sh-input sh-textarea" rows={2} value={vision[p.key]} onChange={(e) => setVision({ ...vision, [p.key]: e.target.value })} maxLength={1000} />
          </Field>
        ))}
        <Btn variant="secondary" disabled={busy || !dirty} onClick={() => void run(() => setModuleSettings({ moduleId: "metamorphosis", settings: { ...settings, ...Object.fromEntries(COMPASS_PROMPTS.map((p) => [`vision_${p.key}`, vision[p.key].trim()])) } }))}>Save</Btn>
      </Card>
      {data.earlier.length > 0 && (
        <Card>
          <h2 className="sh-h2">Weeks I led</h2>
          {data.earlier.map((e) => (
            <p key={e._id} className="mm-entry">{e.weekKey}: {e.lead}{e.done ? " · done" : ""}</p>
          ))}
        </Card>
      )}
    </div>
  );
}

/** Seen: small, chosen acts of being seen. */
export function Seen() {
  const rows = useQuery(api.metamorphosis.tools.seen);
  const add = useMutation(api.metamorphosis.tools.addSeen);
  const done = useMutation(api.metamorphosis.tools.doneSeen);
  const remove = useMutation(api.metamorphosis.tools.removeSeen);
  const { busy, error, run } = useAction();
  const [act, setAct] = useState("");
  const [afterFor, setAfterFor] = useState<string | null>(null);
  const [after, setAfter] = useState("");
  if (!rows) return <Spinner />;
  const open = rows.filter((r) => !r.done);
  const finished = rows.filter((r) => r.done);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Seen" subtitle="The fear of being seen shrinks one small chosen act at a time. Never assigned. You pick, you size it, you go." />
      <Card>
        <Field label="One small act of being seen" hint="Pick your own, or borrow one below.">
          <input className="sh-input" value={act} onChange={(e) => setAct(e.target.value)} maxLength={300} />
        </Field>
        <div className="sh-chips">
          {SEEN_IDEAS.map((s) => (
            <button key={s} type="button" className="sh-chip" onClick={() => setAct(s)}>{s}</button>
          ))}
        </div>
        <ErrorNote error={error} />
        <Btn disabled={busy || !act.trim()} onClick={() => void run(async () => { await add({ act }); setAct(""); })}>I&apos;ll do this one</Btn>
      </Card>
      {open.length > 0 && (
        <Card>
          <h2 className="sh-h2">Chosen</h2>
          {open.map((r) => (
            <div key={r._id} className="mm-entry">
              <p>{r.act}</p>
              {afterFor === r._id ? (
                <div className="sh-row sh-wrap">
                  <input className="sh-input" value={after} onChange={(e) => setAfter(e.target.value)} maxLength={400} placeholder="How it went, in a line" aria-label="How it went" />
                  <Btn disabled={busy} onClick={() => void run(async () => { await done({ id: r._id, after: after || undefined }); setAfterFor(null); setAfter(""); })}>Done</Btn>
                </div>
              ) : (
                <div className="sh-choices">
                  <Btn disabled={busy} onClick={() => setAfterFor(r._id)}>I did it</Btn>
                  <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Not this one</Btn>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
      {finished.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Seen, and still here</h2>
          {finished.map((r) => (
            <p key={r._id} className="mm-entry">{r.act}{r.after ? <span className="sh-muted"> · {r.after}</span> : null}</p>
          ))}
        </Card>
      )}
    </div>
  );
}
