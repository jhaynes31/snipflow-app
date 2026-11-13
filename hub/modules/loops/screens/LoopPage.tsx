"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CYCLE_COPY, ENCOURAGEMENT, ENCOURAGEMENT_FAITH, FAITH_STARTERS, HABIT_COPY, HALT, HEALTHIER, NEEDS, NEEDS_COPY, SHARING_COPY, SPIRAL_COPY, STAGE_OF_CHANGE } from "@/core/loops/content";
import { cardsForStage } from "@/core/loops/learn";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";
import { Ring } from "../Ring";
import { readLoopSettings } from "../settings";
import { THEMES, type LoopTheme } from "../theme";
import { LearnCardView } from "./Learn";

type Loop = Doc<"lpLoops">;
type Stage = Loop["stages"][number];
type Data = NonNullable<ReturnType<typeof useLoop>>;
function useLoop(id: string) { return useQuery(api.loops.entries.get, { id: id as Id<"lpLoops"> }); }

const TABS: [string | null, string][] = [[null, "Map"], ["check", "Where am I?"], ["beliefs", "Beliefs"], ["guardrails", "Guardrails"], ["kids", "Inner kids"], ["habits", "New path"], ["patterns", "Patterns"], ["prayer", "Prayer"], ["settings", "Settings"]];

export function LoopPage({ theme, id, tab }: { theme: LoopTheme; id: string; tab: string | null }) {
  const t = THEMES[theme];
  const data = useLoop(id);
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  if (data === undefined) return <Spinner />;
  if (data === null) return <Card><p>That loop isn&apos;t here.</p><Link href={t.mount} className="sh-link">My loops</Link></Card>;
  const { loop } = data;
  const sel = loop.stages.find((s) => s.id === selected) ?? null;
  const flagged = new Set<string>();
  if (data.guardrails.some((g) => g.type === "body" || g.type === "situation" || g.type === "thought" || g.type === "behavior")) for (const s of loop.stages.slice(0, 2)) flagged.add(s.id);
  const pinned = data.beliefs.find((b) => b._id === loop.pinnedBeliefId);
  const checkParam = params.get("check");

  return (
    <>
      <PageTitle title={loop.name} subtitle={data.open ? `You marked ${loop.stages.find((s) => s.id === data.open!.stageId)?.name ?? "a stage"} ${timeAgo(data.open.at)}.` : data.growth ?? undefined} action={<Link href={t.mount} className="sh-btn sh-btn-secondary">My loops</Link>} />
      <nav className="lp-subnav" aria-label="This loop">
        {TABS.map(([k, l]) => <Link key={l} href={k ? `${t.mount}/${loop._id}/${k}` : `${t.mount}/${loop._id}`} aria-current={tab === k ? "page" : undefined}>{l}</Link>)}
      </nav>
      {(tab === null || tab === "map") && (
        <div className="lp-paper">
          <Ring theme={t} stages={loop.stages} hereId={data.open?.stageId ?? null} selectedId={selected} onSelect={(sid) => setSelected(sid === selected ? null : sid)} spiral={!!loop.spiral} passes={data.patterns.totalPasses} flagged={flagged} pinnedLine={pinned?.text ?? null} truth={loop.truthVerse ?? null} kids={loop.kidPlacement} />
          {loop.spiral && <p className="sh-hint" style={{ textAlign: "center" }}>{SPIRAL_COPY}</p>}
          <div className="sh-choices" style={{ justifyContent: "center" }}>
            <Link href={`${t.mount}/${loop._id}/check`} className="sh-btn sh-btn-primary lp-big">I think I&apos;m in this loop</Link>
          </div>
          {!sel && <p className="sh-hint" style={{ textAlign: "center" }}>Tap a stage for what it looks like, its doors out, what it gives you, and why it happens.</p>}
          {sel && <StageDetail theme={theme} data={data} stage={sel} />}
        </div>
      )}
      {tab === "check" && <CheckIn theme={theme} data={data} openParam={checkParam} />}
      {tab === "beliefs" && <Beliefs theme={theme} data={data} />}
      {tab === "guardrails" && <Guardrails theme={theme} data={data} />}
      {tab === "kids" && <Kids theme={theme} data={data} />}
      {tab === "habits" && <Habits data={data} />}
      {tab === "patterns" && <Patterns theme={theme} data={data} />}
      {tab === "prayer" && <Prayer data={data} />}
      {tab === "settings" && <Settings theme={theme} data={data} />}
    </>
  );
}

// ---------- Stage detail: exits, needs, why ----------

function StageDetail({ theme, data, stage }: { theme: LoopTheme; data: Data; stage: Stage }) {
  const t = THEMES[theme];
  const { profile } = useHub();
  const faith = readLoopSettings(profile.moduleSettings, theme).faith;
  const update = useMutation(api.loops.entries.update);
  const addExit = useMutation(api.loops.entries.addExit);
  const editExit = useMutation(api.loops.entries.editExit);
  const tryExit = useMutation(api.loops.entries.useExit);
  const rateExit = useMutation(api.loops.entries.rateExit);
  const { busy, error, run } = useAction();
  const [own, setOwn] = useState("");
  const [rated, setRated] = useState<Id<"lpExits"> | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const exits = data.exits.filter((e) => e.stageId === stage.id).filter((e) => showHidden || !e.isHidden).sort((a, b) => Number(b.isCustom) - Number(a.isCustom) || Number(b.isPinned) - Number(a.isPinned) || b.helpful - a.helpful);
  const idx = data.loop.stages.findIndex((s) => s.id === stage.id);
  const saveStage = (patch: Partial<Stage>) => void run(() => update({ id: data.loop._id, stages: data.loop.stages.map((s) => (s.id === stage.id ? { ...s, ...patch } : s)) }));
  const why = cardsForStage(stage.key, faith);
  return (
    <div className="lp-stage-detail">
      <h2 className="sh-h2">{idx + 1}. {stage.name}</h2>
      <p className="sh-hint">{stage.prompt}</p>
      <RichTextarea className="sh-input sh-textarea" rows={2} defaultValue={stage.description} maxLength={600} placeholder="What it looks like for you." onBlur={(e) => e.target.value !== stage.description && saveStage({ description: e.target.value })} />
      <ErrorNote error={error} />

      <h3 className="sh-h3 mt-3">Doors out of this stage</h3>
      {exits.map((e) => (
        <div key={e._id} className="lp-exit">
          <span className="lp-exit-text">{e.isPinned ? "★ " : ""}{e.text}{e.used > 0 && <span className="sh-hint"> · used {e.used}×{e.helpful > 0 ? `, helped` : ""}</span>}</span>
          <span className="sh-row" style={{ gap: "0.3rem", flexWrap: "wrap" }}>
            {rated === e._id ? (
              <>
                <span className="sh-hint">Did it help?</span>
                {([["👍", 1], ["😐", 0], ["👎", -1]] as const).map(([face, r]) => <button key={face} type="button" className="sh-chip" disabled={busy} onClick={() => void run(async () => { await rateExit({ id: e._id, rating: r }); setRated(null); })}>{face}</button>)}
              </>
            ) : (
              <Btn disabled={busy} onClick={() => void run(async () => { await tryExit({ id: e._id, checkInId: data.open?._id }); setRated(e._id); })}>Try one now</Btn>
            )}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => editExit({ id: e._id, isPinned: !e.isPinned }))} aria-label="Pin">{e.isPinned ? "unpin" : "pin"}</button>
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => editExit({ id: e._id, isHidden: !e.isHidden }))}>{e.isHidden ? "show" : "hide"}</button>
          </span>
        </div>
      ))}
      <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}>
        <input className="sh-input" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={300} placeholder="My own exit" style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter" && own.trim()) { e.preventDefault(); void run(async () => { await addExit({ loopId: data.loop._id, stageId: stage.id, text: own }); setOwn(""); }); } }} />
        <Btn disabled={busy || !own.trim()} onClick={() => void run(async () => { await addExit({ loopId: data.loop._id, stageId: stage.id, text: own }); setOwn(""); })}>Add</Btn>
        {data.exits.some((e) => e.stageId === stage.id && e.isHidden) && <button type="button" className="sh-link" onClick={() => setShowHidden(!showHidden)}>{showHidden ? "hide hidden" : "show hidden"}</button>}
      </div>

      <h3 className="sh-h3 mt-3">What this part gives me</h3>
      <p className="sh-hint">{NEEDS_COPY}</p>
      <div className="sh-chips">{NEEDS.map((n) => <button key={n} type="button" className="sh-chip" aria-pressed={stage.needs.includes(n)} disabled={busy} onClick={() => saveStage({ needs: stage.needs.includes(n) ? stage.needs.filter((x) => x !== n) : [...stage.needs, n] })}>{n}</button>)}</div>
      {stage.needs.length > 0 && (
        <div className="mt-2">
          <p className="sh-hint">A healthier way to meet that same need. Some ideas:</p>
          <ul style={{ paddingLeft: "1.2rem", margin: "0.2rem 0" }}>{stage.needs.flatMap((n) => (HEALTHIER[n] ?? []).slice(0, 2)).map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      )}
      <input className="sh-input mt-2" defaultValue={stage.healthierWay} maxLength={600} placeholder="My healthier way, in my words" onBlur={(e) => e.target.value !== stage.healthierWay && saveStage({ healthierWay: e.target.value })} />

      {why.length > 0 && (
        <>
          <h3 className="sh-h3 mt-3">Why this happens</h3>
          <div className="lp-three">{why.map((c) => <LearnCardView key={c.key} card={c} theme={theme} loopId={data.loop._id} />)}</div>
        </>
      )}
      <div className="sh-choices mt-3">
        <Link href={`/talk?place=tend&about=${encodeURIComponent(`I'm looking at my loop "${data.loop.name}", at the stage called "${stage.name}".`)}`} className="sh-btn sh-btn-secondary">Talk this through</Link>
        {/* The embedded app is served as static files, so a plain link is the right one. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        {data.loop.templateType === "pleasing" && theme === "shire" && <a href="/love-and-release/app/fawn?who=her" className="sh-btn sh-btn-secondary">Open in Re-Centered</a>}
        <Link href={`${t.mount}/${data.loop._id}/check`} className="sh-btn sh-btn-primary">I&apos;m at this stage now</Link>
      </div>
    </div>
  );
}

// ---------- Check-in ----------

function CheckIn({ theme, data, openParam }: { theme: LoopTheme; data: Data; openParam: string | null }) {
  const t = THEMES[theme];
  const router = useRouter();
  const { profile } = useHub();
  const faith = readLoopSettings(profile.moduleSettings, theme).faith;
  const checkIn = useMutation(api.loops.entries.checkIn);
  const resolve = useMutation(api.loops.entries.resolve);
  const retro = useMutation(api.loops.entries.retro);
  const sendSignal = useMutation(api.loops.entries.sendSignal);
  const encourage = useConvexAction(api.loops.encourage.line);
  const { busy, error, run } = useAction();
  const [stageId, setStageId] = useState<string | null>(data.open?.stageId ?? null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const deck = [...ENCOURAGEMENT, ...(faith ? ENCOURAGEMENT_FAITH : [])];
  const [card, setCard] = useState<string | null>(() => deck[Math.floor(Math.random() * deck.length)] ?? null);
  const [voiceLine, setVoiceLine] = useState<string | null>(null);
  const [retroFirst, setRetroFirst] = useState<string>(data.loop.stages[0]?.id ?? "");
  const [retroOut, setRetroOut] = useState<string>("");
  const [retroNote, setRetroNote] = useState("");
  const [outAt, setOutAt] = useState<string>("");
  const open = data.open ?? (openParam ? data.checks.find((c) => c._id === openParam && !c.outcome) ?? null : null);
  const pickCard = () => setCard(deck[Math.floor(Math.random() * deck.length)]);
  const stageName = (id?: string | null) => data.loop.stages.find((s) => s.id === id)?.name ?? "";
  const voices: ("coach" | "mom" | "dad" | "mentor")[] = theme === "shire" ? ["coach", "mom", "dad"] : ["coach", "mentor"];

  return (
    <div className="sh-stack">
      {open ? (
        <Card>
          <h2 className="sh-h2">You&apos;re marked at {stageName(open.stageId)}, {timeAgo(open.at)}.</h2>
          <p className="sh-hint">How did it go? No wrong answer.</p>
          <ErrorNote error={error} />
          <Field label="I got out at">
            <div className="sh-chips">{data.loop.stages.map((s) => <button key={s.id} type="button" className="sh-chip" aria-pressed={outAt === s.id} onClick={() => setOutAt(s.id)}>{s.name}</button>)}</div>
          </Field>
          <div className="sh-row sh-wrap" style={{ gap: "0.5rem" }}>
            <Btn disabled={busy} onClick={() => void run(async () => { await resolve({ id: open._id, outcome: "out", exitedStageId: outAt || open.stageId }); setCard(null); })}>I got out 🎉</Btn>
            <Btn variant="secondary" disabled={busy} onClick={() => void run(async () => { await resolve({ id: open._id, outcome: "around" }); pickCard(); })}>I went around, and I&apos;m back now</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => void run(() => resolve({ id: open._id, outcome: "still" }))}>Still in it</Btn>
          </div>
          <p className="sh-hint mt-2">Doors out of {stageName(open.stageId)} are on the <Link href={t.mount + "/" + data.loop._id} className="sh-link">Map</Link>; tap that stage.</p>
          {data.level === "signal" && <Btn variant="secondary" disabled={busy} onClick={() => void run(() => sendSignal({ loopId: data.loop._id }))}>Send {data.loop.signalToken ?? "🍂"} to {data.partnerName ?? "my spouse"}</Btn>}
        </Card>
      ) : (
        <Card>
          <h2 className="sh-h2">I think I&apos;m in this loop</h2>
          <p className="sh-hint">Noticing is the whole first half. Tap the stage you&apos;re at.</p>
          <Ring theme={t} stages={data.loop.stages} selectedId={stageId} hereId={stageId} onSelect={setStageId} compact />
          <Field label="How strong is it?" hint={intensity <= 1 ? "A little pull." : intensity >= 5 ? "Fully in it." : intensity === 3 ? "Somewhere in the middle." : intensity === 2 ? "A real pull." : "Most of the way in."}>
            <input className="lp-slider" type="range" min={1} max={5} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} aria-label="Intensity" />
          </Field>
          <Field label="A quick note (optional)"><RichTextarea className="sh-input sh-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
          <CrisisNotice texts={[note]} />
          <ErrorNote error={error} />
          <Btn big disabled={busy || !stageId} onClick={() => void run(async () => { await checkIn({ loopId: data.loop._id, stageId: stageId!, intensity, note: note || undefined }); setNote(""); })}>Mark it</Btn>
          <p className="sh-hint mt-2">After you mark it, the doors out of that stage and one encouragement line are right here. An hour later, if notifications are on, a gentle &ldquo;how did it go?&rdquo;</p>
        </Card>
      )}

      {open && (
        <Card tone="alt">
          <h2 className="sh-h2">Doors out of {stageName(open.stageId)}</h2>
          {data.exits.filter((e) => e.stageId === open.stageId && !e.isHidden).sort((a, b) => Number(b.isCustom) - Number(a.isCustom) || Number(b.isPinned) - Number(a.isPinned) || b.helpful - a.helpful).slice(0, 5).map((e) => <p key={e._id} className="lp-entry">{e.isPinned ? "★ " : ""}{e.text}</p>)}
          {card && <p className="lp-deck">&ldquo;{card}&rdquo;</p>}
          <div className="sh-choices" style={{ justifyContent: "center" }}>
            <Btn variant="ghost" onClick={pickCard}>Another line</Btn>
            {voices.map((vc) => <Btn key={vc} variant="secondary" disabled={busy} onClick={() => void run(async () => setVoiceLine(await encourage({ loopId: data.loop._id, voice: vc, caughtAt: stageName(open.stageId) })))}>Hear from {vc === "coach" ? "the coach" : vc === "mom" ? "Mom" : vc === "dad" ? "Dad" : "the mentor"}</Btn>)}
          </div>
          {voiceLine && <p className="rt-line"><Rich text={voiceLine} /></p>}
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">I noticed afterward</h2>
        <p className="sh-hint">A whole pass, logged after the fact. It still counts, and it still moves the catch point.</p>
        <Field label="Where did I first notice?"><div className="sh-chips">{data.loop.stages.map((s) => <button key={s.id} type="button" className="sh-chip" aria-pressed={retroFirst === s.id} onClick={() => setRetroFirst(s.id)}>{s.name}</button>)}</div></Field>
        <Field label="Where did I get out? (leave empty if it went all the way around)"><div className="sh-chips">{data.loop.stages.map((s) => <button key={s.id} type="button" className="sh-chip" aria-pressed={retroOut === s.id} onClick={() => setRetroOut(retroOut === s.id ? "" : s.id)}>{s.name}</button>)}</div></Field>
        <Field label="What I learned (optional)"><RichTextarea className="sh-input sh-textarea" rows={2} value={retroNote} onChange={(e) => setRetroNote(e.target.value)} maxLength={1000} /></Field>
        <Btn disabled={busy || !retroFirst} onClick={() => void run(async () => { await retro({ loopId: data.loop._id, firstNoticedStageId: retroFirst, exitedStageId: retroOut || undefined, note: retroNote || undefined }); setRetroNote(""); if (!retroOut) pickCard(); router.push(`${t.mount}/${data.loop._id}/patterns`); })}>Log the pass</Btn>
      </Card>
    </div>
  );
}

// ---------- Beliefs ----------

function Beliefs({ theme, data }: { theme: LoopTheme; data: Data }) {
  const { profile } = useHub();
  const faith = readLoopSettings(profile.moduleSettings, theme).faith;
  const add = useMutation(api.loops.entries.addBelief);
  const edit = useMutation(api.loops.entries.editBelief);
  const remove = useMutation(api.loops.entries.removeBelief);
  const update = useMutation(api.loops.entries.update);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState<Doc<"lpBeliefs"> | "new" | null>(null);
  return (
    <div className="sh-stack">
      <p className="sh-muted">Usually these come from The Story. A gentle push-back, step by step. The truer belief doesn&apos;t have to be the perfect opposite; it has to be something you can actually believe today.</p>
      <ErrorNote error={error} />
      {editing && <BeliefEditor theme={theme} faith={faith} initial={editing === "new" ? null : editing} busy={busy} onCancel={() => setEditing(null)} onSave={(b) => void run(async () => { if (editing === "new") await add({ loopId: data.loop._id, ...b }); else await edit({ id: editing._id, ...b }); setEditing(null); })} />}
      {!editing && <Btn onClick={() => setEditing("new")}>+ A belief to push back on</Btn>}
      {data.beliefs.map((b) => (
        <Card key={b._id}>
          <p className="sh-eyebrow">Felt {b.initialRating}% true{b.finalRating !== undefined ? ` → now ${b.finalRating}%` : ""}{data.loop.pinnedBeliefId === b._id ? " · pinned to the ring" : ""}</p>
          <p><strong>Old:</strong> {b.text}</p>
          {b.truerBelief && <p><strong>Truer:</strong> {b.truerBelief}</p>}
          {b.scripture && <p className="sh-muted"><strong>What God says:</strong> {b.scripture}</p>}
          <p className="sh-hint">
            <button type="button" className="sh-link" onClick={() => setEditing(b)}>Open</button> ·{" "}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => update({ id: data.loop._id, pinnedBeliefId: data.loop.pinnedBeliefId === b._id ? null : b._id }))}>{data.loop.pinnedBeliefId === b._id ? "unpin" : "pin to the ring"}</button> ·{" "}
            <button type="button" className="sh-link" disabled={busy} onClick={() => { if (window.confirm("Delete this belief card?")) void run(() => remove({ id: b._id })); }}>delete</button>
          </p>
        </Card>
      ))}
    </div>
  );
}

function BeliefEditor({ theme, faith, initial, busy, onCancel, onSave }: { theme: LoopTheme; faith: boolean; initial: Doc<"lpBeliefs"> | null; busy: boolean; onCancel: () => void; onSave: (b: { text: string; initialRating: number; origin: string; evidenceFor: string; evidenceAgainst: string; friendResponse: string; protectsFrom: string; truerBelief: string; scripture?: string; finalRating?: number }) => void }) {
  const t = THEMES[theme];
  const [b, setB] = useState({ text: initial?.text ?? "", initialRating: initial?.initialRating ?? 70, origin: initial?.origin ?? "", evidenceFor: initial?.evidenceFor ?? "", evidenceAgainst: initial?.evidenceAgainst ?? "", friendResponse: initial?.friendResponse ?? "", protectsFrom: initial?.protectsFrom ?? "", truerBelief: initial?.truerBelief ?? "", scripture: initial?.scripture ?? "", finalRating: initial?.finalRating ?? initial?.initialRating ?? 70 });
  const [step, setStep] = useState(0);
  const steps = [
    { label: "The belief, in your own words", hint: '"If I say no, they\'ll leave."', field: "text" as const },
    { label: "How true does it feel?", hint: "0 to 100.", field: "initialRating" as const },
    { label: "Where did I learn this?", hint: "Who taught it, or what experience. The inner kids tab is next door.", field: "origin" as const },
    { label: "Evidence for it", hint: "Be honest.", field: "evidenceFor" as const },
    { label: "Evidence against it", hint: "Times it wasn't true. What you know now.", field: "evidenceAgainst" as const },
    { label: "What would I tell someone I love who believed this?", hint: "", field: "friendResponse" as const },
    { label: "What is this belief trying to protect me from?", hint: "Beliefs usually started as protection.", field: "protectsFrom" as const },
    { label: "A truer belief", hint: '"People who truly love me can handle a no. And if someone leaves over a boundary, that tells me something about the relationship, not my worth."', field: "truerBelief" as const },
    ...(faith ? [{ label: "What does God say about this?", hint: "Scripture or a truth, in a version you trust. Starters below.", field: "scripture" as const }] : []),
    { label: "How true does the old belief feel now?", hint: "0 to 100. The change is the point.", field: "finalRating" as const },
  ];
  const s = steps[step];
  return (
    <Card tone="alt">
      <p className="sh-eyebrow">Step {step + 1} of {steps.length}</p>
      <Field label={s.label} hint={s.hint}>
        {s.field === "initialRating" || s.field === "finalRating" ? (
          <>
            <input className="lp-slider" type="range" min={0} max={100} value={b[s.field]} onChange={(e) => setB({ ...b, [s.field]: Number(e.target.value) })} aria-label={s.label} />
            <p className="sh-hint">{b[s.field]}%{s.field === "finalRating" && b.finalRating !== b.initialRating ? ` (was ${b.initialRating}%)` : ""}</p>
          </>
        ) : (
          <RichTextarea className="sh-input sh-textarea" rows={3} value={b[s.field]} onChange={(e) => setB({ ...b, [s.field]: e.target.value })} maxLength={2000} />
        )}
      </Field>
      {s.field === "scripture" && (
        <div className="sh-chips">{FAITH_STARTERS.map((f) => <button key={f.ref} type="button" className="sh-chip" onClick={() => setB({ ...b, scripture: `${f.ref}: ${f.plain}` })}>{f.ref}</button>)}<Link href={`/the-well/bible`} className="sh-chip">Read in The Well</Link></div>
      )}
      <div className="sh-row sh-wrap mt-3" style={{ gap: "0.5rem" }}>
        {step > 0 && <Btn variant="secondary" onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < steps.length - 1 ? <Btn disabled={step === 0 && !b.text.trim()} onClick={() => setStep(step + 1)}>Next</Btn> : <Btn big disabled={busy || !b.text.trim()} onClick={() => onSave({ ...b, scripture: b.scripture || undefined })}>Keep this card</Btn>}
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
      {theme === "chrysalis" && !faith && step === steps.length - 1 && <p className="sh-hint">A &ldquo;What does God say?&rdquo; step is available under Settings, faith layer. {t.toolName} leaves it to you.</p>}
    </Card>
  );
}

// ---------- Guardrails ----------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function Guardrails({ theme, data }: { theme: LoopTheme; data: Data }) {
  const t = THEMES[theme];
  const add = useMutation(api.loops.entries.addGuardrail);
  const edit = useMutation(api.loops.entries.editGuardrail);
  const remove = useMutation(api.loops.entries.removeGuardrail);
  const { busy, error, run } = useAction();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [days, setDays] = useState<number[]>([0]);
  const [now] = useState(() => Date.now());
  const [hour, setHour] = useState(20);
  const kinds: { type: Doc<"lpGuardrails">["type"]; label: string; hint: string; placeholder: string }[] = [
    { type: "ifThen", label: "If-then plans", hint: "Decided now, so future-you doesn't decide under pressure. One of the best-supported habit tools there is.", placeholder: 'If I feel the urge to say yes before checking my calendar, then I\'ll say "Let me check and get back to you."' },
    { type: "body", label: "Early warning: body", hint: "The first signs.", placeholder: "my jaw clenches, I stop eating lunch" },
    { type: "thought", label: "Early warning: thoughts", hint: "", placeholder: "I start saying 'I'll just…'" },
    { type: "behavior", label: "Early warning: behaviors", hint: "", placeholder: "I stop replying to texts, I stay up late" },
    { type: "situation", label: "Early warning: situations", hint: HALT, placeholder: "Sunday nights, after client calls, when I'm hungry" },
  ];
  const list = (type: string) => data.guardrails.filter((g) => g.type === type);
  return (
    <div className="sh-stack">
      <p className="sh-muted">Goal: recognize the slide sooner. Warning signs show as small lookout flags on the first two stages of the ring.</p>
      <ErrorNote error={error} />
      {kinds.map((k) => (
        <Card key={k.type}>
          <h2 className="sh-h2">{k.label}</h2>
          {k.hint && <p className="sh-hint">{k.hint}</p>}
          {list(k.type).map((g) => <p key={g._id} className="lp-entry">{g.text} <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: g._id }))}>remove</button></p>)}
          <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}>
            <input className="sh-input" value={drafts[k.type] ?? ""} placeholder={k.placeholder} maxLength={400} style={{ flex: 1 }} onChange={(e) => setDrafts({ ...drafts, [k.type]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && drafts[k.type]?.trim()) { e.preventDefault(); void run(async () => { await add({ loopId: data.loop._id, type: k.type, text: drafts[k.type] }); setDrafts({ ...drafts, [k.type]: "" }); }); } }} />
            <Btn disabled={busy || !drafts[k.type]?.trim()} onClick={() => void run(async () => { await add({ loopId: data.loop._id, type: k.type, text: drafts[k.type] }); setDrafts({ ...drafts, [k.type]: "" }); })}>Add</Btn>
          </div>
        </Card>
      ))}
      <Card>
        <h2 className="sh-h2">{t.checkWord}s</h2>
        <p className="sh-hint">A light nudge at your own risky times: &ldquo;{t.checkWord}: anywhere near the {data.loop.name} loop right now?&rdquo; Sent the ways you chose under Notifications. Snooze or remove any time; no guilt copy.</p>
        {list("tripwire").map((g) => (
          <p key={g._id} className="lp-entry">{g.text} <span className="sh-hint">· {g.schedule?.days.map((d) => DAYS[d]).join(", ")} at {new Date(2000, 0, 1, g.schedule?.hour ?? 0).toLocaleTimeString(undefined, { hour: "numeric" })}{g.snoozedUntil && g.snoozedUntil > now ? ` · snoozed until ${new Date(g.snoozedUntil).toLocaleDateString()}` : ""}</span>{" "}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => edit({ id: g._id, snoozeDays: 7 }))}>snooze a week</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: g._id }))}>remove</button></p>
        ))}
        <Field label="When" hint="Days and an hour, in your time zone.">
          <div className="sh-chips">{DAYS.map((d, i) => <button key={d} type="button" className="sh-chip" aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}>{d}</button>)}</div>
          <select className="sh-input mt-2" value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Hour">{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" })}</option>)}</select>
        </Field>
        <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}>
          <input className="sh-input" value={drafts.tripwire ?? ""} placeholder="A word for the nudge: 'Sunday dread window', 'after client calls'" maxLength={400} style={{ flex: 1 }} onChange={(e) => setDrafts({ ...drafts, tripwire: e.target.value })} />
          <Btn disabled={busy || !drafts.tripwire?.trim() || days.length === 0} onClick={() => void run(async () => { await add({ loopId: data.loop._id, type: "tripwire", text: drafts.tripwire, schedule: { days, hour } }); setDrafts({ ...drafts, tripwire: "" }); })}>Add nudge</Btn>
        </div>
      </Card>
    </div>
  );
}

// ---------- Inner kids ----------

function Kids({ theme, data }: { theme: LoopTheme; data: Data }) {
  const t = THEMES[theme];
  const save = useMutation(api.loops.entries.saveKid);
  const update = useMutation(api.loops.entries.update);
  const { busy, error, run } = useAction();
  const child = data.kids.find((k) => k.age === "child");
  const teen = data.kids.find((k) => k.age === "teen");
  return (
    <div className="sh-stack">
      <p className="sh-muted">Gentle and self-led. The parts of you that run this loop were trying to help, once. Adult-you can take over the job now.</p>
      <ErrorNote error={error} />
      <Card>
        <Field label="How old does this loop feel?">
          <div className="sh-chips">{["Little kid (under about 10)", "Teen", "Both", "Not sure"].map((o) => <button key={o} type="button" className="sh-chip" aria-pressed={data.loop.howOld === o} disabled={busy} onClick={() => void run(() => update({ id: data.loop._id, howOld: o }))}>{o}</button>)}</div>
        </Field>
      </Card>
      <KidCard age="child" label={t.kids.child} prompts={[["need", "What was little me needing back then?", "safety, attention, comfort, someone to stay calm…"], ["learned", "What did little me learn to do to get it?", ""], ["message", "What would I say to little me now?", "Letter style is fine."], ["newAgreement", "How adult-me takes over the job", "A new agreement: little me doesn't have to run this anymore."]]} row={child} data={data} busy={busy} onSave={(r) => void run(() => save({ loopId: data.loop._id, age: "child", need: r.need ?? child?.need ?? "", learned: r.learned ?? child?.learned ?? "", rule: child?.rule ?? "", message: r.message ?? child?.message ?? "", newAgreement: r.newAgreement ?? child?.newAgreement ?? "" }))} onPlace={(sid) => void run(() => update({ id: data.loop._id, kidPlacement: { ...(data.loop.kidPlacement ?? {}), child: sid } }))} placed={data.loop.kidPlacement?.child} />
      <KidCard age="teen" label={t.kids.teen} prompts={[["need", "What was teen me protecting?", "pride, independence, not getting hurt again…"], ["rule", "What rule did teen me make?", '"Never need anyone." "Be perfect so no one can criticize."'], ["message", "What would I say to teen me now?", ""], ["newAgreement", "How adult-me takes over the job", "A new agreement with the teenager."]]} row={teen} data={data} busy={busy} onSave={(r) => void run(() => save({ loopId: data.loop._id, age: "teen", need: r.need ?? teen?.need ?? "", learned: teen?.learned ?? "", rule: r.rule ?? teen?.rule ?? "", message: r.message ?? teen?.message ?? "", newAgreement: r.newAgreement ?? teen?.newAgreement ?? "" }))} onPlace={(sid) => void run(() => update({ id: data.loop._id, kidPlacement: { ...(data.loop.kidPlacement ?? {}), teen: sid } }))} placed={data.loop.kidPlacement?.teen} />
      {theme === "shire" && (
        <Card tone="alt">
          <h2 className="sh-h2">Where this loop came from in my family line</h2>
          <p className="sh-hint">{CYCLE_COPY}</p>
          <Field label="Where did it come from?"><RichTextarea className="sh-input sh-textarea" rows={3} defaultValue={data.loop.familyOrigin ?? ""} maxLength={2000} onBlur={(e) => e.target.value !== (data.loop.familyOrigin ?? "") && void run(() => update({ id: data.loop._id, familyOrigin: e.target.value }))} /></Field>
          <Field label="What I'm choosing to pass down instead"><RichTextarea className="sh-input sh-textarea" rows={3} defaultValue={data.loop.passDown ?? ""} maxLength={2000} onBlur={(e) => e.target.value !== (data.loop.passDown ?? "") && void run(() => update({ id: data.loop._id, passDown: e.target.value }))} /></Field>
        </Card>
      )}
      {theme === "chrysalis" && (
        <details className="sh-menu">
          <summary>Where this loop came from in my family line (optional)</summary>
          <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
            <p className="sh-hint">{CYCLE_COPY}</p>
            <Field label="Where did it come from?"><RichTextarea className="sh-input sh-textarea" rows={3} defaultValue={data.loop.familyOrigin ?? ""} maxLength={2000} onBlur={(e) => e.target.value !== (data.loop.familyOrigin ?? "") && void run(() => update({ id: data.loop._id, familyOrigin: e.target.value }))} /></Field>
            <Field label="What I'm choosing to pass down instead"><RichTextarea className="sh-input sh-textarea" rows={3} defaultValue={data.loop.passDown ?? ""} maxLength={2000} onBlur={(e) => e.target.value !== (data.loop.passDown ?? "") && void run(() => update({ id: data.loop._id, passDown: e.target.value }))} /></Field>
          </div>
        </details>
      )}
    </div>
  );
}

function KidCard({ age, label, prompts, row, data, busy, onSave, onPlace, placed }: { age: "child" | "teen"; label: string; prompts: [string, string, string][]; row: Doc<"lpInnerKids"> | undefined; data: Data; busy: boolean; onSave: (r: Record<string, string>) => void; onPlace: (sid: string | undefined) => void; placed?: string }) {
  return (
    <Card>
      <h2 className="sh-h2">{age === "child" ? "Inner child" : "Inner teen"} <span className="sh-hint">· {label}</span></h2>
      {prompts.map(([field, q, hint]) => (
        <Field key={field} label={q} hint={hint}>
          <RichTextarea className="sh-input sh-textarea" rows={2} defaultValue={(row as Record<string, unknown> | undefined)?.[field] as string ?? ""} maxLength={4000} onBlur={(e) => { const cur = ((row as Record<string, unknown> | undefined)?.[field] as string) ?? ""; if (e.target.value !== cur) onSave({ [field]: e.target.value }); }} />
        </Field>
      ))}
      <Field label="Sit this figure beside a stage on the ring" hint="The stage this part is most tied to.">
        <div className="sh-chips">
          <button type="button" className="sh-chip" aria-pressed={!placed} disabled={busy} onClick={() => onPlace(undefined)}>nowhere yet</button>
          {data.loop.stages.map((s) => <button key={s.id} type="button" className="sh-chip" aria-pressed={placed === s.id} disabled={busy} onClick={() => onPlace(s.id)}>{s.name}</button>)}
        </div>
      </Field>
    </Card>
  );
}

// ---------- Habits ----------

function Habits({ data }: { data: Data }) {
  const add = useMutation(api.loops.entries.addHabit);
  const practice = useMutation(api.loops.entries.practice);
  const remove = useMutation(api.loops.entries.removeHabit);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  return (
    <div className="sh-stack">
      <p className="sh-muted">{HABIT_COPY}</p>
      <ErrorNote error={error} />
      {data.habits.map((h) => (
        <Card key={h._id}>
          <p><strong>{h.text}</strong></p>
          <p className="sh-hint">Practiced {h.practiced.length} {h.practiced.length === 1 ? "time" : "times"}{h.practiced.length ? `, last ${timeAgo(h.practiced[h.practiced.length - 1])}` : ""}. Practice runs count, even when nothing triggered you.</p>
          <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}>
            <Btn disabled={busy} onClick={() => void run(() => practice({ id: h._id }))}>I practiced it</Btn>
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: h._id }))}>retire</button>
          </div>
        </Card>
      ))}
      {data.habits.length < 3 && (
        <Card tone="alt">
          <Field label="A new path habit" hint="The healthy routine you're building to replace the loop's behavior. One to three per loop.">
            <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}><input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} style={{ flex: 1 }} /><Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ loopId: data.loop._id, text }); setText(""); })}>Add</Btn></div>
          </Field>
        </Card>
      )}
    </div>
  );
}

// ---------- Patterns ----------

function Patterns({ theme, data }: { theme: LoopTheme; data: Data }) {
  const t = THEMES[theme];
  const removeCheck = useMutation(api.loops.entries.removeCheckIn);
  const { busy, run } = useAction();
  const p = data.patterns;
  const n = data.loop.stages.length;
  const hours = Object.entries(p.byHour).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const days = Object.entries(p.byDay).sort((a, b) => b[1] - a[1]).slice(0, 2);
  return (
    <div className="sh-stack">
      {data.growth && <p className="rt-line">{data.growth}</p>}
      <Card>
        <h2 className="sh-h2">Where I caught it</h2>
        <p className="sh-hint">Each dot is a catch; height is the stage. The hope is lower dots over time: earlier catches.</p>
        {p.catches.length === 0 ? <p className="sh-muted">Nothing yet. Mark a stage, or log a pass after the fact.</p> : (
          <div className="lp-dots" aria-label="Catch points over time">
            {p.catches.slice(-40).map((c, i) => <span key={i} className="lp-dot" title={`${c.name}, ${new Date(c.at).toLocaleDateString()}`} style={{ height: `${0.6 + (c.index / Math.max(1, n - 1)) * 2.4}rem`, background: t.accent, opacity: 0.35 + 0.65 * (1 - c.index / Math.max(1, n - 1)) }} />)}
          </div>
        )}
        <p className="sh-muted mt-2">Times you caught it early (first half of the ring): <strong>{p.earlyCount}</strong>. {p.medianRecoveryMin !== null && <>Typical time from noticing to out: <strong>{Math.round(p.medianRecoveryMin)} min</strong>.</>}</p>
        {(hours.length > 0 || days.length > 0) && <p className="sh-hint">Most often {hours.map(([h, c]) => `around ${new Date(2000, 0, 1, Number(h)).toLocaleTimeString(undefined, { hour: "numeric" })} (${c})`).join(", ")}{days.length ? `; ${days.map(([d]) => DAYS[Number(d)]).join(" and ")}` : ""}. Counts only, no guessing.</p>}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">Every mark</h2>
        {data.checks.length === 0 && <p className="sh-muted">None yet.</p>}
        {data.checks.map((c) => (
          <p key={c._id} className="lp-entry">
            <strong>{data.loop.stages.find((s) => s.id === (c.firstNoticedStageId ?? c.stageId))?.name ?? "?"}</strong>
            <span className="sh-muted"> · {timeAgo(c.at)} · {c.kind === "retro" ? "logged after" : `strength ${c.intensity}`} · {c.outcome === "out" ? `out at ${data.loop.stages.find((s) => s.id === c.exitedStageId)?.name ?? "?"}` : c.outcome === "around" ? "went around" : c.outcome === "still" ? "still in it" : "open"}</span>
            {c.note && <> · <Rich text={c.note} /></>}{" "}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeCheck({ id: c._id }))}>delete</button>
          </p>
        ))}
      </Card>
      <Note>No streaks that reset to zero. Just counts that only go up, and a catch point that moves.</Note>
    </div>
  );
}

// ---------- Prayer ----------

function Prayer({ data }: { data: Data }) {
  const add = useMutation(api.loops.entries.addPrayer);
  const mark = useMutation(api.loops.entries.markPrayer);
  const remove = useMutation(api.loops.entries.removePrayer);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  return (
    <div className="sh-stack">
      <Card>
        <h2 className="sh-h2">Prayers about this loop</h2>
        <p className="sh-hint">Write them here; mark the answered ones over time. &ldquo;Search me, God, and know my heart&rdquo; is a good start.</p>
        <RichTextarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ loopId: data.loop._id, text }); setText(""); })}>Keep it</Btn>
      </Card>
      {data.prayers.map((p) => (
        <div key={p._id} className="lp-entry">
          <p><Rich text={p.text} /></p>
          <p className="sh-hint">{timeAgo(p.createdAt)}{p.answeredAt ? ` · answered ${timeAgo(p.answeredAt)}` : ""} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => mark({ id: p._id, answered: !p.answeredAt }))}>{p.answeredAt ? "not yet, actually" : "answered"}</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: p._id }))}>delete</button></p>
        </div>
      ))}
    </div>
  );
}

// ---------- Settings ----------

function Settings({ theme, data }: { theme: LoopTheme; data: Data }) {
  const t = THEMES[theme];
  const router = useRouter();
  const { profile } = useHub();
  const settings = readLoopSettings(profile.moduleSettings, theme);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const update = useMutation(api.loops.entries.update);
  const setSharing = useMutation(api.loops.entries.setSharing);
  const remove = useMutation(api.loops.entries.remove);
  const { busy, error, run } = useAction();
  const [stages, setStages] = useState<Stage[]>(data.loop.stages);
  const dirty = JSON.stringify(stages) !== JSON.stringify(data.loop.stages);
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= stages.length) return; const next = [...stages]; [next[i], next[j]] = [next[j], next[i]]; setStages(next); };
  return (
    <div className="sh-stack">
      <ErrorNote error={error} />
      <Card>
        <h2 className="sh-h2">Sharing</h2>
        <p className="sh-hint">Per loop. An invitation for support, not monitoring. {data.partnerName ?? "Your spouse"} can never edit anything here, and never sees your marks, notes, beliefs, or inner-kid entries.</p>
        {(["private", "nameOnly", "signal"] as const).map((lvl) => (
          <label key={lvl} className="lp-entry" style={{ display: "block", cursor: "pointer" }}>
            <input type="radio" name="sharing" checked={data.level === lvl} disabled={busy} onChange={() => void run(() => setSharing({ id: data.loop._id, level: lvl }))} />{" "}
            <strong>{lvl === "private" ? "Private" : lvl === "nameOnly" ? "Shared, name only" : "Shared, with signal"}</strong> <span className="sh-muted">· {SHARING_COPY[lvl === "nameOnly" ? "sharedSummary" : lvl === "signal" ? "shared" : "private"]}</span>
          </label>
        ))}
        {data.level === "signal" && (
          <Field label="My signal word or emoji" hint={"Means \"I'm in it, I don't want to explain, please just be kind.\""}>
            <input className="sh-input" defaultValue={data.loop.signalToken ?? ""} placeholder="🍂 or acorn" maxLength={40} onBlur={(e) => e.target.value !== (data.loop.signalToken ?? "") && void run(() => update({ id: data.loop._id, signalToken: e.target.value || null }))} />
          </Field>
        )}
      </Card>
      <Card>
        <h2 className="sh-h2">This loop</h2>
        <Field label="Name"><input className="sh-input" defaultValue={data.loop.name} maxLength={80} onBlur={(e) => e.target.value.trim() && e.target.value !== data.loop.name && void run(() => update({ id: data.loop._id, name: e.target.value }))} /></Field>
        <Toggle checked={!!data.loop.spiral} disabled={busy} onChange={(v) => void run(() => update({ id: data.loop._id, spiral: v }))} label="Spiral mode" hint={SPIRAL_COPY} />
        <Field label="Stage of change" hint="Where you are with this loop, so the next step starts from there.">
          <div className="sh-chips">{STAGE_OF_CHANGE.map((s) => <button key={s} type="button" className="sh-chip" aria-pressed={data.loop.stageOfChange === s} disabled={busy} onClick={() => void run(() => update({ id: data.loop._id, stageOfChange: data.loop.stageOfChange === s ? null : s }))}>{s}</button>)}</div>
        </Field>
        <Field label="Truth to stand on" hint="One verse or line pinned on the ring next to The Story, opposite the old belief.">
          <input className="sh-input" defaultValue={data.loop.truthVerse ?? ""} maxLength={200} placeholder="Romans 8:1, no condemnation" onBlur={(e) => e.target.value !== (data.loop.truthVerse ?? "") && void run(() => update({ id: data.loop._id, truthVerse: e.target.value || null }))} />
        </Field>
      </Card>
      <Card>
        <h2 className="sh-h2">Stages</h2>
        <p className="sh-hint">Rename, reorder, add, or remove. Four to ten.</p>
        {stages.map((s, i) => (
          <div key={s.id} className="lp-entry sh-row sh-wrap" style={{ gap: "0.4rem", alignItems: "center" }}>
            <span className="sh-hint">{i + 1}.</span>
            <input className="sh-input" value={s.name} maxLength={40} style={{ flex: 1, minWidth: "8rem" }} onChange={(e) => setStages(stages.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
            <button type="button" className="sh-iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="sh-iconbtn" aria-label="Move down" disabled={i === stages.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="sh-link" disabled={stages.length <= 4} onClick={() => setStages(stages.filter((_, k) => k !== i))}>remove</button>
          </div>
        ))}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}>
          {stages.length < 10 && <Btn variant="secondary" onClick={() => setStages([...stages, { id: "", key: "behavior", name: `Stage ${stages.length + 1}`, prompt: "Then what?", description: "", needs: [], healthierWay: "" }])}>Add a stage</Btn>}
          <Btn disabled={busy || !dirty} onClick={() => void run(() => update({ id: data.loop._id, stages }))}>{dirty ? "Save stages" : "Saved"}</Btn>
        </div>
      </Card>
      <Card>
        <h2 className="sh-h2">Faith layer</h2>
        <Toggle checked={settings.faith} disabled={busy} onChange={(v) => void run(() => setModuleSettings({ moduleId: "loops", settings: { faith: v } }))} label={`Show the faith lens and "What does God say?" in ${t.toolName}`} hint={theme === "shire" ? "On by default here." : "Off by default here, so it's your choice."} />
      </Card>
      <details className="sh-menu">
        <summary>Delete this loop</summary>
        <p className="sh-hint">Everything about it: stages, exits, marks, beliefs, inner kids, guardrails, habits, prayers. Not undoable.</p>
        <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm(`Delete "${data.loop.name}" and everything in it?`)) void run(async () => { await remove({ id: data.loop._id }); router.push(t.mount); }); }}>Delete the loop</Btn>
      </details>
    </div>
  );
}
