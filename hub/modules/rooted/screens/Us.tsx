"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CoachChat } from "@/core/coach/CoachChat";
import { AGREEMENT_FIELDS, CATCH_ROLES, DANCE, MOVES, PRACTICES, SIDE_PROMPTS, US_WELCOME } from "@/core/rooted/us";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, CopyButton, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const PAGES: [string | null, string][] = [[null, "The dance"], ["side", "My side"], ["loop", "Our loop"], ["instead", "Instead"], ["agreements", "Agreements"], ["practices", "Together"], ["caught", "I caught it"], ["talk", "Talk"]];

/**
 * Us (2026-11-06): the anxious–avoidant dance in their marriage. Shared
 * where the two of them build something together (the loop map, the
 * agreements); private where each looks at their own part (my side, I
 * caught it), with sharing one answer at a time.
 */
export function Us({ page }: { page: string | null }) {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <div className="sh-chips">
        {PAGES.map(([k, l]) => (
          <Link key={l} href={k ? `/rooted/us/${k}` : "/rooted/us"} className="sh-chip" aria-pressed={page === k}>{l}</Link>
        ))}
      </div>
      {page === null && <Dance />}
      {page === "side" && <Side />}
      {page === "loop" && <Loop />}
      {page === "instead" && <Instead />}
      {page === "agreements" && <Agreements />}
      {page === "practices" && <Practices />}
      {page === "caught" && <Caught />}
      {page === "talk" && <Talk />}
    </div>
  );
}

function Dance() {
  const { partner } = useHub();
  return (
    <>
      <PageTitle title="Us" subtitle={`The loop between you and ${partner?.displayName ?? "your partner"}. Seen together, owned separately, changed on purpose.`} />
      <p className="rt-line">{US_WELCOME}</p>
      <Card>
        <h2 className="sh-h2">{DANCE.title}</h2>
        <p className="sh-muted">{DANCE.line}</p>
        {DANCE.sections.map((s) => (
          <div key={s.title} className="rt-entry">
            <h3 className="sh-h3">{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </Card>
      <div className="rt-faith"><strong>{DANCE.faith.ref}</strong>{DANCE.faith.plain}</div>
      <div className="sh-tiles">
        <Link href="/rooted/us/side" className="sh-tile"><span className="sh-tile-name">My side</span><span className="sh-tile-tagline">Nine honest questions about your move, your fear, where it came from, and your part. Private; share any answer on purpose.</span></Link>
        <Link href="/rooted/us/loop" className="sh-tile"><span className="sh-tile-name">Our loop</span><span className="sh-tile-tagline">Map it together, step by step, with what each of you feels, thinks, and needs at each step.</span></Link>
        <Link href="/rooted/us/instead" className="sh-tile"><span className="sh-tile-name">Instead</span><span className="sh-tile-tagline">Alternative moves for the one who reaches, the one who retreats, and both.</span></Link>
        <Link href="/rooted/us/agreements" className="sh-tile"><span className="sh-tile-name">Agreements</span><span className="sh-tile-tagline">The pause word, how long, how you come back, the weekly fifteen minutes. Both sign.</span></Link>
        <Link href="/rooted/us/practices" className="sh-tile"><span className="sh-tile-name">Together</span><span className="sh-tile-tagline">Six practices for a calm evening.</span></Link>
        <Link href="/rooted/us/caught" className="sh-tile"><span className="sh-tile-name">I caught it</span><span className="sh-tile-tagline">Your own log. The loop, your part, what you did instead. Nobody else sees it.</span></Link>
      </div>
      <Note>Both of you can open this wing from your own Rooted. The loop map and the agreements are shared and either of you can edit them. My side and I caught it are yours alone. The coach never takes sides here; the loop is the only thing it argues with.</Note>
    </>
  );
}

function Side() {
  const data = useQuery(api.rooted.us.mySide);
  const save = useMutation(api.rooted.us.saveSide);
  const share = useMutation(api.rooted.us.shareSide);
  const { busy, error, run } = useAction();
  if (!data) return <Spinner />;
  const mine = new Map(data.mine.map((r) => [r.key, r]));
  const theirs = new Map(data.theirs.map((r) => [r.key, r]));
  return (
    <>
      <PageTitle title="My side of the dance" subtitle="Private, one answer at a time. Share any answer with the switch under it; sharing is how the loop stops being a mystery to the other one." />
      <ErrorNote error={error} />
      {SIDE_PROMPTS.map((p) => {
        const row = mine.get(p.key);
        const other = theirs.get(p.key);
        return (
          <Card key={p.key}>
            <Field label={p.question} hint={p.hint}>
              <RichTextarea className="sh-input sh-textarea" rows={3} defaultValue={row?.text ?? ""} maxLength={4000} onBlur={(e) => { if (e.target.value !== (row?.text ?? "")) void run(() => save({ key: p.key, text: e.target.value })); }} />
            </Field>
            {row && (
              <label className="sh-hint"><input type="checkbox" checked={row.visibility === "shared"} disabled={busy} onChange={(e) => void run(() => share({ id: row._id, share: e.target.checked }))} /> share this answer with {data.partnerName ?? "my partner"}</label>
            )}
            {other && <p className="sh-muted" style={{ marginTop: "0.5rem" }}><strong>{data.partnerName} shared:</strong> <Rich text={other.text} /></p>}
            <CrisisNotice texts={[row?.text ?? ""]} />
          </Card>
        );
      })}
      <Note>Saved as you leave each box. The coach reads your own answers in Us conversations, and only the answers your partner chose to share.</Note>
    </>
  );
}

type Step = Doc<"rtUs">["steps"][number];

function Loop() {
  const data = useQuery(api.rooted.us.ours);
  const saveLoop = useMutation(api.rooted.us.saveLoop);
  const { busy, error, run } = useAction();
  if (!data) return <Spinner />;
  return <LoopEditor key={data.row?.updatedAt ?? 0} data={data} busy={busy} error={error} onSave={(trigger, steps, ends) => void run(() => saveLoop({ trigger, steps, ends }))} />;
}

function LoopEditor({ data, busy, error, onSave }: { data: { row: Doc<"rtUs"> | null; me: Id<"profiles">; partner: { id: Id<"profiles">; name: string } | null }; busy: boolean; error: string | null; onSave: (trigger: string, steps: Step[], ends: string) => void }) {
  const { profile } = useHub();
  const [trigger, setTrigger] = useState(data.row?.trigger ?? "");
  const [steps, setSteps] = useState<Step[]>(data.row?.steps ?? []);
  const [ends, setEnds] = useState(data.row?.ends ?? "");
  const name = (id: Id<"profiles">) => (id === data.me ? profile.displayName : data.partner?.name ?? "partner");
  const add = (who: Id<"profiles">) => setSteps([...steps, { who, does: "", feels: "", thinks: "", needs: "" }]);
  const set = (i: number, patch: Partial<Step>) => setSteps(steps.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const dirty = trigger !== (data.row?.trigger ?? "") || ends !== (data.row?.ends ?? "") || JSON.stringify(steps) !== JSON.stringify(data.row?.steps ?? []);
  return (
    <>
      <PageTitle title="Our loop" subtitle="Map it together on a calm day. Each step: who, what they do, and what's going on inside. The first move is usually earlier than either of you thinks." />
      {data.row && <p className="sh-hint">Last changed by {name(data.row.updatedBy)}, {timeAgo(data.row.updatedAt)}. Shared with both of you.</p>}
      <Card>
        <Field label="It usually starts when…" hint="The trigger. A tone, a text unanswered, a plan changed, tiredness, money.">
          <input className="sh-input" value={trigger} onChange={(e) => setTrigger(e.target.value)} maxLength={600} />
        </Field>
        {steps.map((s, i) => (
          <div key={i} className="rt-entry">
            <div className="sh-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
              <strong>{i + 1}. {name(s.who)}</strong>
              <span className="sh-row" style={{ gap: "0.4rem" }}>
                {data.partner && <button type="button" className="sh-link" onClick={() => set(i, { who: s.who === data.me ? data.partner!.id : data.me })}>switch to {s.who === data.me ? data.partner.name : profile.displayName}</button>}
                <button type="button" className="sh-link" onClick={() => setSteps(steps.filter((_, k) => k !== i))}>remove</button>
              </span>
            </div>
            <Field label="does"><input className="sh-input" value={s.does} onChange={(e) => set(i, { does: e.target.value })} maxLength={400} placeholder="goes quiet / asks again / leaves the room / says 'fine'" /></Field>
            <div className="rt-two">
              <Field label="feels"><input className="sh-input" value={s.feels} onChange={(e) => set(i, { feels: e.target.value })} maxLength={300} placeholder="panicked, flooded, alone, cornered" /></Field>
              <Field label="tells themselves"><input className="sh-input" value={s.thinks} onChange={(e) => set(i, { thinks: e.target.value })} maxLength={300} placeholder="'they don't care' / 'I'll make it worse'" /></Field>
            </div>
            <Field label="actually needs"><input className="sh-input" value={s.needs} onChange={(e) => set(i, { needs: e.target.value })} maxLength={300} placeholder="to know you're coming back / a minute without it meaning anything" /></Field>
          </div>
        ))}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}>
          <Btn variant="secondary" onClick={() => add(data.me)}>Add a step: {profile.displayName}</Btn>
          {data.partner && <Btn variant="secondary" onClick={() => add(data.partner!.id)}>Add a step: {data.partner.name}</Btn>}
        </div>
        <Field label="It usually ends with…" hint="Silence until morning, one of you apologizing for everything, sleep, a text later.">
          <input className="sh-input" value={ends} onChange={(e) => setEnds(e.target.value)} maxLength={600} />
        </Field>
        <ErrorNote error={error} />
        <Btn big disabled={busy || !dirty} onClick={() => onSave(trigger, steps, ends)}>{dirty ? "Save our loop" : "Saved"}</Btn>
      </Card>
      <Note>Once it&apos;s on paper, read it together once, out loud, in the third person: &ldquo;then the loop makes her…, then the loop makes him…&rdquo;. That&apos;s the practice called The loop in slow motion, under Together.</Note>
    </>
  );
}

function Instead() {
  const { profile, partner } = useHub();
  const [role, setRole] = useState<"pursuer" | "withdrawer" | "both" | "all">("all");
  const shown = MOVES.filter((m) => role === "all" || m.role === role);
  const label = { pursuer: "For the one who reaches", withdrawer: "For the one who retreats", both: "For both of you" } as const;
  return (
    <>
      <PageTitle title="Instead" subtitle="One different move breaks the loop. Find the one you're about to make, and take the other one." />
      <div className="sh-chips">
        {(["all", "pursuer", "withdrawer", "both"] as const).map((r) => <button key={r} type="button" className="sh-chip" aria-pressed={role === r} onClick={() => setRole(r)}>{r === "all" ? "All" : r === "pursuer" ? "I reach" : r === "withdrawer" ? "I retreat" : "Both of us"}</button>)}
      </div>
      {shown.map((m) => (
        <Card key={m.key}>
          <p className="sh-eyebrow">{label[m.role]}</p>
          <h2 className="sh-h2">{m.name}</h2>
          <p><strong>When:</strong> {m.when}</p>
          <p><strong>Instead of:</strong> {m.insteadOf}</p>
          <p><strong>Say:</strong> &ldquo;{m.say}&rdquo; <CopyButton text={m.say} /></p>
          <p className="sh-muted"><strong>Why it works:</strong> {m.why}</p>
        </Card>
      ))}
      <Note>Neither role is the bad one. {profile.displayName} and {partner?.displayName ?? "your partner"} can both read every card; the loop needs both moves to run, and either different move stops it.</Note>
    </>
  );
}

function Agreements() {
  const { profile } = useHub();
  const data = useQuery(api.rooted.us.ours);
  const save = useMutation(api.rooted.us.saveAgreement);
  const sign = useMutation(api.rooted.us.sign);
  const { busy, error, run } = useAction();
  if (!data) return <Spinner />;
  const a = data.row?.agreements ?? {};
  const signedMe = data.row?.signed.includes(data.me) ?? false;
  const signedThem = data.partner ? (data.row?.signed.includes(data.partner.id) ?? false) : false;
  return (
    <>
      <PageTitle title="Our agreements" subtitle="Decided on a calm day, kept on a hard one. Either of you can change a line; a change asks both of you to sign again." />
      <ErrorNote error={error} />
      {AGREEMENT_FIELDS.map((f) => (
        <Card key={f.key}>
          <Field label={f.label} hint={f.hint}>
            <RichTextarea className="sh-input sh-textarea" rows={2} defaultValue={a[f.key] ?? ""} placeholder={f.starter} maxLength={1000} onBlur={(e) => { if (e.target.value !== (a[f.key] ?? "")) void run(() => save({ key: f.key, text: e.target.value })); }} />
          </Field>
          {!a[f.key] && <Btn variant="secondary" disabled={busy} onClick={() => void run(() => save({ key: f.key, text: f.starter }))}>Use the starter</Btn>}
        </Card>
      ))}
      <Card tone="alt">
        <h2 className="sh-h2">Signed</h2>
        <p className="sh-muted">{profile.displayName}: {signedMe ? "signed" : "not yet"}. {data.partner ? `${data.partner.name}: ${signedThem ? "signed" : "not yet"}.` : ""}</p>
        {!signedMe && <Btn disabled={busy} onClick={() => void run(() => sign({}))}>I&apos;ve read these and I&apos;m in</Btn>}
        {signedMe && signedThem && <p className="rt-line">Both signed. When the loop starts, these are the rules, and the loop doesn&apos;t get a vote.</p>}
      </Card>
    </>
  );
}

function Practices() {
  return (
    <>
      <PageTitle title="Together" subtitle="For a calm evening, not mid-loop. Fifteen minutes, phones away, one of these." />
      {PRACTICES.map((p) => (
        <Card key={p.key}>
          <h2 className="sh-h2">{p.name}</h2>
          <p className="sh-hint">{p.time}</p>
          <ol style={{ paddingLeft: "1.2rem" }}>{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          {p.faith && <div className="rt-faith"><strong>{p.faith.ref}</strong>{p.faith.plain}</div>}
        </Card>
      ))}
    </>
  );
}

function Caught() {
  const rows = useQuery(api.rooted.us.catches);
  const add = useMutation(api.rooted.us.addCatch);
  const remove = useMutation(api.rooted.us.removeCatch);
  const { busy, error, run } = useAction();
  const [role, setRole] = useState<string>("pursued");
  const [what, setWhat] = useState("");
  const [instead, setInstead] = useState("");
  const [next, setNext] = useState("");
  return (
    <>
      <PageTitle title="I caught it" subtitle="Your own accountability, nobody else's. Catching the loop late still counts. Catching your own part is the whole game." />
      <Card>
        <Field label="What I noticed">
          <div className="sh-chips">{CATCH_ROLES.map((r) => <button key={r.key} type="button" className="sh-chip" aria-pressed={role === r.key} onClick={() => setRole(r.key)}>{r.label}</button>)}</div>
        </Field>
        <Field label="What happened" hint="Plainly, your part only."><RichTextarea className="sh-input sh-textarea" rows={3} value={what} onChange={(e) => setWhat(e.target.value)} maxLength={2000} /></Field>
        <Field label="What I did instead, if anything" hint="A different move, even a small one. Or 'nothing yet', which is honest."><RichTextarea className="sh-input sh-textarea" rows={2} value={instead} onChange={(e) => setInstead(e.target.value)} maxLength={2000} /></Field>
        <Field label="Next time" hint="One move from Instead."><input className="sh-input" value={next} onChange={(e) => setNext(e.target.value)} maxLength={2000} /></Field>
        <CrisisNotice texts={[what, instead]} />
        <ErrorNote error={error} />
        <Btn big disabled={busy || !what.trim()} onClick={() => void run(async () => { await add({ role, what, instead: instead || undefined, next: next || undefined }); setWhat(""); setInstead(""); setNext(""); })}>Keep it</Btn>
      </Card>
      {!rows ? <Spinner /> : rows.length > 0 ? (
        <Card tone="alt">
          <h2 className="sh-h2">What I&apos;ve caught</h2>
          {rows.map((r) => (
            <div key={r._id} className="rt-entry">
              <p><strong>{CATCH_ROLES.find((x) => x.key === r.role)?.label ?? r.role}</strong> <span className="sh-muted">· {timeAgo(r.createdAt)}</span></p>
              <p><Rich text={r.what} /></p>
              {r.instead && <p className="sh-muted">Instead: <Rich text={r.instead} /></p>}
              {r.next && <p className="sh-muted">Next time: {r.next}</p>}
              <p className="sh-hint"><button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</button></p>
            </div>
          ))}
        </Card>
      ) : <Note>Nothing yet. The first catch is usually after the fact. That still counts.</Note>}
    </>
  );
}

function Talk() {
  return (
    <>
      <PageTitle title="Talk it through" subtitle="The coach knows the loop, your agreements, your own side, and whatever your partner chose to share. It never takes sides; it argues with the loop." />
      <CoachChat module="rooted" task="rooted.us" placeholder="What's happening between us, in your own words." />
    </>
  );
}
