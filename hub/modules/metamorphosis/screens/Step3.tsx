"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { BLESSING_SCRIPTURE, BUILDER_LINES, CONVICTION_VS_SHAME, FAILURE_CHECK, HORIZON_PROMPTS, LETTER_PROMPTS, MEN_IN_STORY, NO_CONDEMNATION, ORIGINS, PARTY_STEPS, PARTY_WHERE, PRESENT_PROMPTS, SMALL_WAYS } from "@/core/metamorphosis/step3";
import { pickForDay } from "@/convex/reCentered/pure";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, CopyButton, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";
import { Passage } from "@/modules/the-well/components/Passage";

const today = () => new Date().toISOString().slice(0, 10);

export function NoCondemnation() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="No Condemnation" subtitle="Guilt, shame, and condemnation have been living in you like they pay rent. Here is what the text actually says, and how to tell conviction from shame." />
      <Card>
        <h2 className="sh-h2">Conviction or shame?</h2>
        <div className="mm-charter">
          <div className="mm-charter-row" style={{ borderTop: "none" }}><span className="sh-eyebrow">Conviction</span><span className="sh-eyebrow">Shame</span></div>
          {CONVICTION_VS_SHAME.map((r, i) => (
            <div key={i} className="mm-charter-row"><p>{r.conviction}</p><p className="sh-muted">{r.shame}</p></div>
          ))}
        </div>
        <p className="sh-hint mt-3">Conviction is his. Shame is not. If it crushes and hides you, it didn&apos;t come from him.</p>
      </Card>
      {NO_CONDEMNATION.map((n, i) => (
        <Card key={i}>
          <p className="well-did">{n.note}</p>
          <div className="mt-3"><Passage r={n.ref} actions={false} /></div>
        </Card>
      ))}
      <p className="sh-hint">More in <Link href="/the-well/lies" className="sh-link">Lies and truth</Link> in The Well, and your own <Link href="/tend/tools/evidenceBank" className="sh-link">Evidence Bank</Link> in Tend.</p>
    </div>
  );
}

export function Origins() {
  const letters = useQuery(api.metamorphosis.more.letters);
  const write = useMutation(api.metamorphosis.more.writeLetter);
  const remove = useMutation(api.metamorphosis.more.removeLetter);
  const { busy, error, run } = useAction();
  const [key, setKey] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const prompt = LETTER_PROMPTS.find((p) => p.key === key);
  const mine = (letters ?? []).filter((l) => l.kind === "mine");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Where This Came From" subtitle="The survival story, told straight. Then letters you will never send, which is exactly why they work." />
      {ORIGINS.map((o, i) => (
        <Card key={i}>
          <h2 className="sh-h2">{o.title}</h2>
          <p>{o.body}</p>
          {o.ref && <div className="mt-3"><Passage r={o.ref} actions={false} /></div>}
        </Card>
      ))}
      <Card>
        <h2 className="sh-h2">Letters I won&apos;t send</h2>
        <div className="sh-chips">
          {LETTER_PROMPTS.map((p) => (
            <button key={p.key} type="button" className="sh-chip" aria-pressed={key === p.key} style={key === p.key ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} onClick={() => setKey(p.key)}>{p.title}</button>
          ))}
        </div>
        {prompt && (
          <div className="sh-stack-sm mt-3">
            <p className="sh-hint">{prompt.prompt}</p>
            <textarea className="sh-input sh-textarea" rows={8} value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} aria-label={prompt.title} />
            <CrisisNotice texts={[body]} />
            <ErrorNote error={error} />
            <Btn disabled={busy || !body.trim()} onClick={() => void run(async () => { await write({ key: prompt.key, title: prompt.title, body }); setBody(""); setKey(null); })}>Keep it, unsent</Btn>
          </div>
        )}
      </Card>
      {mine.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Written</h2>
          {mine.map((l) => (
            <details key={l._id} className="mm-entry">
              <summary>{l.title} <span className="sh-muted">· {timeAgo(l.createdAt)}</span></summary>
              <p style={{ whiteSpace: "pre-wrap" }}>{l.body}</p>
              <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: l._id }))}>Delete</button>
            </details>
          ))}
        </Card>
      )}
    </div>
  );
}

export function Party() {
  const rows = useQuery(api.metamorphosis.more.party);
  const add = useMutation(api.metamorphosis.more.addParty);
  const update = useMutation(api.metamorphosis.more.updateParty);
  const remove = useMutation(api.metamorphosis.more.removeParty);
  const { busy, error, run } = useAction();
  const [name, setName] = useState("");
  const [where, setWhere] = useState("");
  const [next, setNext] = useState("");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Party" subtitle="You don't have friends right now, and your family isn't the answer. That's the starting point, not a verdict. Here's where people like you are, and how it actually goes." />
      <Card>
        <h2 className="sh-h2">Where people like you are</h2>
        <ul className="sh-list">
          {PARTY_WHERE.map((w) => (
            <li key={w} className="mm-entry">{w}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="sh-h2">How it goes, step by step</h2>
        {PARTY_STEPS.map((s, i) => (
          <div key={i} className="mm-entry">
            <p><strong>{i + 1}. {s.title}</strong></p>
            <p className="sh-muted">{s.body}</p>
          </div>
        ))}
      </Card>
      <Card>
        <h2 className="sh-h2">The men</h2>
        <p className="sh-hint">Anyone you already like a little, or could reach. One at a time.</p>
        <div className="sh-row sh-wrap">
          <input className="sh-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Name" aria-label="Name" />
          <input className="sh-input" value={where} onChange={(e) => setWhere(e.target.value)} maxLength={120} placeholder="Where you know him from" aria-label="Where" />
          <input className="sh-input" value={next} onChange={(e) => setNext(e.target.value)} maxLength={200} placeholder="The one small ask" aria-label="Next step" />
          <Btn disabled={busy || !name.trim()} onClick={() => void run(async () => { await add({ name, where: where || undefined, nextStep: next || undefined }); setName(""); setWhere(""); setNext(""); })}>Add</Btn>
        </div>
        <ErrorNote error={error} />
        {!rows ? <Spinner /> : rows.map((r) => <PartyRow key={r._id} r={r} busy={busy} onUpdate={(lastTalked, nextStep) => void run(() => update({ id: r._id, lastTalked, nextStep }))} onRemove={() => void run(() => remove({ id: r._id }))} />)}
      </Card>
    </div>
  );
}

function PartyRow({ r, busy, onUpdate, onRemove }: { r: Doc<"mmParty">; busy: boolean; onUpdate: (lastTalked?: string, nextStep?: string) => void; onRemove: () => void }) {
  const [last, setLast] = useState(r.lastTalked ?? "");
  const [next, setNext] = useState(r.nextStep ?? "");
  const dirty = last !== (r.lastTalked ?? "") || next !== (r.nextStep ?? "");
  return (
    <div className="mm-entry">
      <p><strong>{r.name}</strong>{r.where ? <span className="sh-muted"> · {r.where}</span> : null}</p>
      <div className="sh-row sh-wrap">
        <input className="sh-input" value={last} onChange={(e) => setLast(e.target.value)} maxLength={200} placeholder="Last talked, in your words" aria-label="Last talked" />
        <input className="sh-input" value={next} onChange={(e) => setNext(e.target.value)} maxLength={200} placeholder="Next small ask" aria-label="Next step" />
        <Btn variant="secondary" disabled={busy || !dirty} onClick={() => onUpdate(last || undefined, next || undefined)}>Save</Btn>
        <Btn variant="ghost" disabled={busy} onClick={onRemove}>Remove</Btn>
      </div>
    </div>
  );
}

export function MenInStory() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Men in the Story" subtitle="From Scripture, and from the stories you love. Mirrors, not rules." />
      <Card>
        <h2 className="sh-h2">From the text</h2>
        {MEN_IN_STORY.filter((m) => m.source === "scripture").map((m) => (
          <div key={m.name} className="mm-entry">
            <p><strong>{m.name}.</strong> {m.line}</p>
            {m.ref && <div className="mt-3"><Passage r={m.ref} actions={false} /></div>}
          </div>
        ))}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">From the stories you love</h2>
        <p className="sh-hint">Not scripture. Mirrors. You already know why each one is here.</p>
        {MEN_IN_STORY.filter((m) => m.source === "story").map((m) => (
          <p key={m.name} className="mm-entry"><strong>{m.name}.</strong> {m.line}</p>
        ))}
      </Card>
    </div>
  );
}

export function Horizon() {
  const rows = useQuery(api.metamorphosis.more.horizon);
  const add = useMutation(api.metamorphosis.more.addHorizon);
  const remove = useMutation(api.metamorphosis.more.removeHorizon);
  const { busy, error, run } = useAction();
  const [day] = useState(today);
  const [prompt, setPrompt] = useState<string>(() => pickForDay(HORIZON_PROMPTS, day)!);
  const [text, setText] = useState("");
  const [riffing, setRiffing] = useState(false);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Horizon" subtitle="Survival took your dreams because it needed all your attention. This is where you get them back. Nothing here becomes a task unless you say so." />
      <Card>
        <div className="sh-chips">
          {HORIZON_PROMPTS.map((p) => (
            <button key={p} type="button" className="sh-chip" aria-pressed={prompt === p} style={prompt === p ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} onClick={() => setPrompt(p)}>{p.slice(0, 40)}{p.length > 40 ? "…" : ""}</button>
          ))}
        </div>
        <p className="mm-line mt-3">{prompt}</p>
        <textarea className="sh-input sh-textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} aria-label="Dream" placeholder="Sketch it. Half-sentences count." />
        <CrisisNotice texts={[text]} />
        <ErrorNote error={error} />
        <div className="sh-choices">
          <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ prompt, text }); setText(""); })}>Keep it</Btn>
          <Btn variant="secondary" onClick={() => setRiffing(!riffing)}>{riffing ? "Close" : "Riff with the mentor"}</Btn>
        </div>
      </Card>
      {riffing && <CoachChat module="metamorphosis" task="metamorphosis.horizon" opening={`The prompt: ${prompt}${text ? `\nWhat I've got so far: ${text}` : ""}`} placeholder="Okay, what if…" />}
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Sketches</h2>
          {rows.map((r) => (
            <div key={r._id} className="mm-entry">
              {r.prompt && <p className="sh-eyebrow">{r.prompt}</p>}
              <p style={{ whiteSpace: "pre-wrap" }}>{r.text}</p>
              <p className="sh-hint">{timeAgo(r.createdAt)} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</button></p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function SmallWaysScreen() {
  const rows = useQuery(api.metamorphosis.more.smallWays);
  const did = useMutation(api.metamorphosis.more.didSmallWay);
  const { busy, error, run } = useAction();
  const [day] = useState(today);
  const pick = pickForDay(SMALL_WAYS, day)!;
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Small Ways" subtitle="Practical ways to think for yourself and care for yourself and the people around you. Things a father teaches. One a day, never assigned." />
      <Card className="rc-quote">
        <p className="sh-eyebrow">Today&apos;s</p>
        <p><strong>{pick.title}</strong> {pick.body}</p>
      </Card>
      <Card>
        {SMALL_WAYS.map((w) => (
          <div key={w.title} className="mm-entry">
            <p><strong>{w.title}</strong> <span className="sh-muted">{w.body}</span></p>
            {open === w.title ? (
              <div className="sh-row sh-wrap">
                <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What you did, in a line (optional)" aria-label="Note" />
                <Btn disabled={busy} onClick={() => void run(async () => { await did({ title: w.title, note: note || undefined }); setOpen(null); setNote(""); })}>Did it</Btn>
              </div>
            ) : (
              <button type="button" className="sh-link" onClick={() => setOpen(w.title)}>I did this one</button>
            )}
          </div>
        ))}
        <ErrorNote error={error} />
      </Card>
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Done</h2>
          {rows.map((r) => (
            <p key={r._id} className="mm-entry">{r.day}: {r.title}{r.note ? <span className="sh-muted"> · {r.note}</span> : null}</p>
          ))}
        </Card>
      )}
    </div>
  );
}

export function Actually() {
  const data = useQuery(api.metamorphosis.more.actually);
  const checks = useQuery(api.metamorphosis.more.failureChecks);
  const add = useMutation(api.metamorphosis.more.addFailureCheck);
  const { busy, error, run } = useAction();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const step = FAILURE_CHECK[i];
  const done = i >= FAILURE_CHECK.length;
  if (!data) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Actually" subtitle="Your brain says you fail all the time and shows you no evidence of the rest. This page is the rest, caught from your own logs. Named, never counted." />
      <Card>
        <h2 className="sh-h2">The last two weeks, actually</h2>
        {data.items.length === 0 ? (
          <p className="sh-muted">Nothing caught yet. As you use the room, this fills with what you actually did.</p>
        ) : (
          data.items.map((it, k) => (
            <p key={k} className="mm-entry"><span className="sh-muted">{it.day}:</span> {it.text}</p>
          ))
        )}
      </Card>
      <Card>
        <h2 className="sh-h2">Failure Check</h2>
        <p className="sh-hint">For the moment &ldquo;I failed&rdquo; lands. Five questions. Then look at it again.</p>
        {!saved && !done && (
          <>
            <p className="sh-eyebrow">{i + 1} of {FAILURE_CHECK.length}</p>
            <Field label={step.label} hint={step.hint}>
              <textarea className="sh-input sh-textarea" rows={3} value={answers[step.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [step.key]: e.target.value })} maxLength={800} />
            </Field>
            <CrisisNotice texts={Object.values(answers)} />
            <div className="sh-choices">
              {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
              <Btn onClick={() => setI(i + 1)} disabled={i === 0 && !(answers.fact ?? "").trim()}>{i === FAILURE_CHECK.length - 1 ? "Look at it" : "Next"}</Btn>
            </div>
          </>
        )}
        {!saved && done && (
          <>
            {FAILURE_CHECK.filter((f) => (answers[f.key] ?? "").trim()).map((f) => (
              <p key={f.key}><strong>{f.label}</strong> {answers[f.key]}</p>
            ))}
            <ErrorNote error={error} />
            <div className="sh-choices mt-3">
              <Btn disabled={busy} onClick={() => void run(async () => { await add({ answers: FAILURE_CHECK.map((f) => ({ key: f.key, text: answers[f.key] ?? "" })) }); setSaved(true); })}>Keep it</Btn>
              <Btn variant="ghost" onClick={() => setI(0)}>Edit</Btn>
            </div>
          </>
        )}
        {saved && (
          <div className="sh-stack-sm">
            <Note>Kept. One thing didn&apos;t work, once. That&apos;s what it proves.</Note>
            <Btn variant="secondary" onClick={() => { setSaved(false); setI(0); setAnswers({}); }}>Another</Btn>
          </div>
        )}
      </Card>
      {checks && checks.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Earlier checks</h2>
          {checks.map((c) => (
            <p key={c._id} className="mm-entry">{c.answers.find((a) => a.key === "fact")?.text} <span className="sh-muted">· {timeAgo(c.createdAt)}</span></p>
          ))}
        </Card>
      )}
      <p className="sh-hint"><Link href="/tend/tools/storyCheck" className="sh-link">Story Check</Link> in Tend does the same job for the sting of feeling rejected.</p>
    </div>
  );
}

export function Present() {
  const data = useQuery(api.metamorphosis.more.present);
  const set = useMutation(api.metamorphosis.more.setPresent);
  const { busy, error, run } = useAction();
  const [here, setHere] = useState("");
  const [fought, setFought] = useState("");
  if (!data) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Present" subtitle="You can be in the room and still be absent. This is a tiny daily practice in being here, and in fighting for what's yours." />
      <Card>
        {data.todays ? (
          <>
            <p className="sh-eyebrow">Today</p>
            {data.todays.here && <p><strong>Here:</strong> {data.todays.here}</p>}
            {data.todays.fought && <p><strong>Fought for:</strong> {data.todays.fought}</p>}
          </>
        ) : null}
        <Field label={PRESENT_PROMPTS.here}>
          <input className="sh-input" value={here} onChange={(e) => setHere(e.target.value)} maxLength={300} />
        </Field>
        <Field label={PRESENT_PROMPTS.fought} hint={PRESENT_PROMPTS.hint}>
          <input className="sh-input" value={fought} onChange={(e) => setFought(e.target.value)} maxLength={300} />
        </Field>
        <CrisisNotice texts={[here, fought]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || (!here.trim() && !fought.trim())} onClick={() => void run(async () => { await set({ here: here || undefined, fought: fought || undefined }); setHere(""); setFought(""); })}>I was here</Btn>
      </Card>
      {data.rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Days you were here</h2>
          {data.rows.map((r) => (
            <p key={r._id} className="mm-entry"><span className="sh-muted">{r.day}:</span> {[r.here, r.fought].filter(Boolean).join(" · ")}</p>
          ))}
        </Card>
      )}
      <p className="sh-hint">What she has already said she&apos;d feel loved by: <Link href="/kept-word/ways" className="sh-link">Ways to show up</Link>.</p>
    </div>
  );
}

export function Builder() {
  const rows = useQuery(api.metamorphosis.more.builder);
  const add = useMutation(api.metamorphosis.more.addBuilder);
  const { busy, error, run } = useAction();
  const [day] = useState(today);
  const line = pickForDay(BUILDER_LINES, day)!;
  const [action, setAction] = useState("");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Builder" subtitle="You've worked for other people your whole life and shown up every time. The business gets that same man. One action a day." />
      <Card className="rc-quote"><p className="mm-line">{line}</p></Card>
      <Card>
        <Field label="Today's one business action" hint="One call, one email, one page, one follow-up. Small and done beats big and planned.">
          <input className="sh-input" value={action} onChange={(e) => setAction(e.target.value)} maxLength={300} />
        </Field>
        <ErrorNote error={error} />
        <div className="sh-choices">
          <Btn disabled={busy || !action.trim()} onClick={() => void run(async () => { await add({ action }); setAction(""); })}>Done</Btn>
          <LinkBtn href="/metamorphosis/quests" variant="secondary">Make it a quest</LinkBtn>
          <LinkBtn href="/every-box" variant="ghost">Every Box</LinkBtn>
        </div>
      </Card>
      <Card tone="alt">
        <p><strong>The reluctant ones.</strong> Moses at the bush said &ldquo;not me.&rdquo; Gideon in the winepress said &ldquo;my clan is the weakest.&rdquo; Aragorn didn&apos;t want the crown. All the right man. Reluctance is not disqualification.</p>
        <div className="sh-choices mt-3">
          <LinkBtn href="/the-well/bible/exodus/3" variant="ghost">Exodus 3</LinkBtn>
          <LinkBtn href="/the-well/bible/judges/6" variant="ghost">Judges 6</LinkBtn>
        </div>
      </Card>
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card>
          <h2 className="sh-h2">Built, one action at a time</h2>
          {rows.map((r) => (
            <p key={r._id} className="mm-entry"><span className="sh-muted">{r.day}:</span> {r.action}</p>
          ))}
        </Card>
      )}
    </div>
  );
}

const SHARE_SECTIONS = [
  { key: "sheet", label: "Character Sheet" },
  { key: "mirror", label: "The Mirror" },
  { key: "maps", label: "The Map" },
  { key: "letters", label: "Letters" },
  { key: "failure", label: "Failure Checks" },
  { key: "present", label: "Present" },
];

export function Therapist() {
  const shares = useQuery(api.metamorphosis.more.shares);
  const create = useMutation(api.metamorphosis.more.createShare);
  const revoke = useMutation(api.metamorphosis.more.revokeShare);
  const { busy, error, run } = useAction();
  const [sections, setSections] = useState<string[]>(["sheet", "mirror"]);
  const [days, setDays] = useState(30);
  const [now] = useState(() => Date.now());
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="For my therapist" subtitle="A read-only link to the sections you pick, that expires when you say and can be turned off any time. They see only what you chose." />
      <Card>
        <p className="sh-label">Sections</p>
        <div className="sh-chips">
          {SHARE_SECTIONS.map((s) => (
            <button key={s.key} type="button" className="sh-chip" aria-pressed={sections.includes(s.key)} style={sections.includes(s.key) ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} onClick={() => setSections(sections.includes(s.key) ? sections.filter((x) => x !== s.key) : [...sections, s.key])}>{s.label}</button>
          ))}
        </div>
        <Field label="Expires after (days)">
          <input className="sh-input sh-input-sm" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </Field>
        <ErrorNote error={error} />
        <Btn disabled={busy || sections.length === 0} onClick={() => void run(() => create({ sections, days }))}>Make a link</Btn>
      </Card>
      {!shares ? <Spinner /> : shares.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Links</h2>
          {shares.map((s) => {
            const live = !s.revokedAt && s.expiresAt > now;
            const url = `${origin}/share/${s.token}`;
            return (
              <div key={s._id} className="mm-entry">
                <p>{s.sections.map((k) => SHARE_SECTIONS.find((x) => x.key === k)?.label ?? k).join(", ")} <span className="sh-muted">· {live ? `until ${new Date(s.expiresAt).toLocaleDateString()}` : s.revokedAt ? "turned off" : "expired"}</span></p>
                {live && (
                  <div className="sh-row sh-wrap">
                    <code style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{url}</code>
                    <CopyButton text={url} label="Copy link" />
                    <Btn variant="ghost" disabled={busy} onClick={() => void run(() => revoke({ id: s._id }))}>Turn off</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
      <p className="sh-hint">Everything, as a file, is under <Link href="/metamorphosis/export" className="sh-link">My pages</Link>.</p>
    </div>
  );
}

export function Blessing() {
  const rows = useQuery(api.metamorphosis.more.blessingsForMe);
  const open = useMutation(api.metamorphosis.more.openBlessing);
  const { busy, error, run } = useAction();
  const [day] = useState(today);
  const pick = pickForDay(BLESSING_SCRIPTURE, day)!;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Blessing" subtitle="The thing fathers give. Open it on any day." />
      <Card>
        <p className="well-did">{pick.note}</p>
        <div className="mt-3"><Passage r={pick.ref} /></div>
      </Card>
      <ErrorNote error={error} />
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Sealed for you</h2>
          {rows.map((b) => (
            <div key={b._id} className="mm-entry">
              <p className="sh-eyebrow">{b.occasion} · {new Date(b.createdAt).toLocaleDateString()}</p>
              {b.body ? <p className="mm-voice" style={{ whiteSpace: "pre-wrap" }}>{b.body}</p> : <Btn disabled={busy} onClick={() => void run(() => open({ id: b._id }))}>Open it</Btn>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/** The partner's side: write a sealed blessing for the room's owner. Shown under "This room is John's." */
export function BlessingWriter({ ownerName }: { ownerName: string }) {
  const mine = useQuery(api.metamorphosis.more.myBlessings);
  const write = useMutation(api.metamorphosis.more.writeBlessing);
  const revise = useMutation(api.metamorphosis.more.reviseBlessing);
  const remove = useMutation(api.metamorphosis.more.removeBlessing);
  const { busy, error, run } = useAction();
  const [occasion, setOccasion] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Card>
      <h2 className="sh-h2">A blessing for {ownerName}</h2>
      <p className="sh-hint">Sealed until they open it. True, and with no correction in it, or leave it out. You&apos;ll see only that it was opened. Rare on purpose; this is not a channel.</p>
      <Field label="The occasion" hint="The first one. A birthday. After a hard season. For no reason.">
        <input className="sh-input" value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={120} />
      </Field>
      <Field label="The blessing">
        <textarea className="sh-input sh-textarea" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={6000} />
      </Field>
      <ErrorNote error={error} />
      <div className="sh-row">
        <Btn disabled={busy || !occasion.trim() || !body.trim()} onClick={() => void run(async () => { if (editing) await revise({ id: editing as Doc<"mmBlessings">["_id"], occasion, body }); else await write({ occasion, body }); setOccasion(""); setBody(""); setEditing(null); })}>{editing ? "Save the change" : "Seal it"}</Btn>
        {editing && <Btn variant="ghost" onClick={() => { setEditing(null); setOccasion(""); setBody(""); }}>Cancel</Btn>}
      </div>
      {mine && mine.length > 0 && (
        <div className="mt-3">
          {mine.map((b) => (
            <div key={b._id} className="mm-entry">
              <p><strong>{b.occasion}</strong> <span className="sh-muted">· {b.opened ? "opened" : "sealed"} · {timeAgo(b.createdAt)}</span></p>
              {!b.opened && (
                <p className="sh-hint">
                  <button type="button" className="sh-link" onClick={() => { setEditing(b._id); setOccasion(b.occasion); setBody(b.body); }}>Edit</button> ·{" "}
                  <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: b._id }))}>Delete</button>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function Letters() {
  const { profile } = useHub();
  const rows = useQuery(api.metamorphosis.more.letters);
  const writeNow = useConvexAction(api.metamorphosis.letter.writeNow);
  const openLetter = useMutation(api.metamorphosis.more.openLetter);
  const remove = useMutation(api.metamorphosis.more.removeLetter);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const settings = (profile.moduleSettings?.metamorphosis as Record<string, unknown> | undefined) ?? {};
  const lettersOn = settings.letters !== false;
  const mentor = (rows ?? []).filter((l) => l.kind === "mentor");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Letters" subtitle="Once a month, the mentor writes you a letter from what you logged. Not a report. A letter. Turn it off any time." />
      <Card>
        <Toggle checked={lettersOn} onChange={(on) => void run(() => setModuleSettings({ moduleId: "metamorphosis", settings: { ...settings, letters: on } }))} label="A letter on the 1st of each month" />
        <ErrorNote error={error} />
        <div className="sh-row sh-wrap mt-3">
          <Btn disabled={busy || !lettersOn} onClick={() => void run(() => writeNow({}))}>{busy ? "Writing…" : "Write me one now, for the last 30 days"}</Btn>
          <span className="sh-hint">Takes about half a minute. Reads only what you allowed on your Character Sheet, plus your own logs.</span>
        </div>
      </Card>
      {!rows ? <Spinner /> : mentor.length === 0 ? (
        <Card tone="alt"><p className="sh-muted">No letters yet.</p></Card>
      ) : (
        mentor.map((l) => (
          <Card key={l._id}>
            <p className="sh-eyebrow">{l.title} · {new Date(l.createdAt).toLocaleDateString()}</p>
            {l.openedAt ? (
              <p className="mm-voice" style={{ whiteSpace: "pre-wrap" }}>{l.body}</p>
            ) : (
              <Btn disabled={busy} onClick={() => void run(() => openLetter({ id: l._id }))}>Open it</Btn>
            )}
            <p className="sh-hint mt-3"><button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: l._id }))}>Delete</button></p>
          </Card>
        ))
      )}
      <p className="sh-hint">Letters you wrote and won&apos;t send are under <Link href="/metamorphosis/origins" className="sh-link">Where This Came From</Link>.</p>
    </div>
  );
}
