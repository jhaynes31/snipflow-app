import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { Confirm } from '@/components/Confirm'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId, now } from '@/db/db'
import type { ExposureStep, Skill } from '@/db/types'
import { ERP_NOTE, REASSURANCE_SCRIPTS, RELAPSE_HELPS, RELAPSE_SIGNS, SKILL_LABEL } from '@/data/unhooked'
import { FREEDOM_WINS, WIN_LABEL, FREEDOM_TYPES } from '@/data/options'
import { dayKey, fmtDate, fmtDateTime } from '@/lib/dates'
import { detectCrisis, hourBucket, logFreedomWin, logSkill } from '@/lib/unhooked'
import { updateSettings, useSettings } from '@/lib/settings'
import { CrisisNotice } from '@/pages/Unhooked'
import { TOOLS } from '@/pages/UnhookedTools'

/* ---------- Trigger & pattern map ---------- */
export function TriggerMap() {
  const episodes = useLiveQuery(() => db.loopEpisodes.orderBy('createdAt').reverse().toArray(), []) ?? []
  const tally = (get: (e: (typeof episodes)[number]) => string[]) => {
    const m = new Map<string, number>()
    for (const e of episodes) for (const k of get(e)) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }
  const triggers = tally((e) => e.triggerTags), themes = tally((e) => (e.theme ? [e.theme] : [])), urges = tally((e) => e.compulsionUrge)
  const helped = tally((e) => e.toolsUsed.map((t) => TOOLS.find((x) => x.id === t)?.title ?? t)), times = tally((e) => [hourBucket(e.createdAt)])
  const acted = tally((e) => (e.actedOnCompulsion ? [{ no: "Didn't act", delayed: 'Delayed', shrunk: 'Shrank it', yes: 'Acted' }[e.actedOnCompulsion]] : []))
  const drops = episodes.filter((e) => e.urgeStart !== undefined && e.urgeEnd !== undefined)
  const avgDrop = drops.length ? (drops.reduce((s, e) => s + (e.urgeStart! - e.urgeEnd!), 0) / drops.length).toFixed(1) : null

  return (
    <Shell back="/unhooked" title="Trigger and pattern map" subtitle="Not a report card. A weather map, so you can see what's coming and what helps.">
      <div className="stack-lg">
        {episodes.length === 0 && <p className="faint">No loops logged yet. Each "I'm in a loop" flow adds a point to the map.</p>}
        {avgDrop && <div className="card-sage"><strong>Urges fall.</strong> Across {drops.length} logged loop{drops.length === 1 ? '' : 's'}, the urge dropped an average of {avgDrop} points by the end. That's the wave doing what waves do.</div>}
        <Bars title="Common triggers" rows={triggers} />
        <Bars title="Themes" rows={themes} />
        <Bars title="What the urge wanted" rows={urges} />
        <Bars title="What helped" rows={helped} tone="sage" />
        <Bars title="Time of day" rows={times} />
        <Bars title="What I did with the compulsion" rows={acted} tone="sage" />
        <details className="acc"><summary><span>Recent loops</span><span className="faint">{episodes.length}</span></summary>
          <div className="acc-body list">{episodes.slice(0, 20).map((e) => <div key={e.id} className="item"><div className="small" style={{ fontWeight: 700 }}>{e.theme || e.triggerTags.join(', ') || 'A loop'}</div><div className="small muted">{e.toolsUsed.map((t) => TOOLS.find((x) => x.id === t)?.title ?? t).join(' · ')}{e.urgeStart !== undefined ? ` · urge ${e.urgeStart}→${e.urgeEnd ?? '?'}` : ''}</div>{e.note && <div className="small muted">{e.note}</div>}<div className="item-meta">{fmtDateTime(e.createdAt)}</div></div>)}</div>
        </details>
      </div>
    </Shell>
  )
}

function Bars({ title, rows, tone = 'accent' }: { title: string; rows: [string, number][]; tone?: 'accent' | 'sage' }) {
  if (!rows.length) return null
  const max = Math.max(...rows.map((r) => r[1]))
  return (
    <section className="card-soft">
      <h3>{title}</h3>
      <div className="balance">{rows.map(([k, n]) => <div key={k} className="balance-row" style={{ gridTemplateColumns: '120px 1fr 28px' }}><span className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span><div className={`bar ${tone === 'sage' ? 'bar-them' : 'bar-me'}`}><span style={{ width: `${(n / max) * 100}%` }} /></div><span>{n}</span></div>)}</div>
    </section>
  )
}

/* ---------- Exposure ladder ---------- */
export function ExposureLadder() {
  const steps = useLiveQuery(() => db.exposureSteps.orderBy('order').toArray(), []) ?? []
  const sessions = useLiveQuery(() => db.exposureSessions.orderBy('createdAt').toArray(), []) ?? []
  const [adding, setAdding] = useState<'mine' | 'therapist' | null>(null)
  const [desc, setDesc] = useState('')
  const [rating, setRating] = useState(4)
  const [practicing, setPracticing] = useState<ExposureStep | null>(null)
  const [toDelete, setToDelete] = useState<ExposureStep | null>(null)

  const add = async () => {
    if (!desc.trim()) return
    await db.exposureSteps.add({ id: newId(), description: desc.trim(), distressRating: rating, order: steps.length, assignedByTherapist: adding === 'therapist' })
    setDesc(''); setRating(4); setAdding(null)
  }
  const sortByDistress = async () => { const sorted = [...steps].sort((a, b) => a.distressRating - b.distressRating); await db.exposureSteps.bulkPut(sorted.map((s, i) => ({ ...s, order: i }))) }
  const move = async (s: ExposureStep, dir: -1 | 1) => { const i = steps.indexOf(s); const o = steps[i + dir]; if (!o) return; await db.exposureSteps.bulkPut([{ ...s, order: o.order }, { ...o, order: s.order }]) }
  const forStep = (id: string) => sessions.filter((x) => x.stepId === id)

  if (practicing) return <ExposureSession step={practicing} onDone={() => setPracticing(null)} />

  const Rung = ({ s, i }: { s: ExposureStep; i: number }) => {
    const ss = forStep(s.id)
    return (
      <div className="item">
        <div className="ladder-rung">
          <div className="num" aria-label={`Distress ${s.distressRating}`}>{s.distressRating}</div>
          <div><div className="item-title">{s.description}</div><div className="item-meta">{ss.length ? `${ss.length} practice${ss.length === 1 ? '' : 's'} · after: ${ss.map((x) => x.distressAfter).join(' → ')}` : 'Not practiced yet'}</div></div>
          <span className="row" style={{ gap: 2 }}>
            <button type="button" className="btn btn-quiet btn-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(s, -1)}>↑</button>
            <button type="button" className="btn btn-quiet btn-sm" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => move(s, 1)}>↓</button>
          </span>
        </div>
        {ss.length > 1 && <div className="bar mt" style={{ height: 8 }}><span style={{ width: `${Math.max(5, 100 - (ss[ss.length - 1].distressAfter / 10) * 100)}%`, background: 'var(--sage)' }} /></div>}
        <div className="row mt" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setToDelete(s)}>Remove</button>
          <button type="button" className="btn btn-sm btn-sage" onClick={() => setPracticing(s)}>Practice this rung</button>
        </div>
      </div>
    )
  }

  return (
    <Shell back="/unhooked" title="Exposure ladder" subtitle="Easiest at the bottom. One rung at a time, without doing the compulsion.">
      <div className="stack-lg">
        <div className="notice small">{ERP_NOTE}</div>
        {(['therapist', 'mine'] as const).map((kind) => {
          const list = steps.filter((s) => s.assignedByTherapist === (kind === 'therapist'))
          return (
            <section key={kind}>
              <div className="row-between"><h3 style={{ margin: 0 }}>{kind === 'therapist' ? 'Assigned by my therapist' : 'My own gentle practice'}</h3><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAdding(kind)}>Add a rung</button></div>
              {adding === kind && (
                <div className="card stack mt">
                  <input className="input" autoFocus value={desc} placeholder="e.g. Send a text and don't reread it for an hour" onChange={(e) => setDesc(e.target.value)} aria-label="Step description" />
                  <div className="label">Expected distress: {rating}</div>
                  <input className="range" type="range" min={0} max={10} value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Expected distress" />
                  <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setAdding(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={add} disabled={!desc.trim()}>Add</button></div>
                </div>
              )}
              <div className="list mt">{list.map((s) => <Rung key={s.id} s={s} i={steps.indexOf(s)} />)}{list.length === 0 && adding !== kind && <p className="faint">Nothing here yet.</p>}</div>
            </section>
          )
        })}
        {steps.length > 1 && <button type="button" className="btn btn-quiet" onClick={sortByDistress}>Sort easiest to hardest</button>}
      </div>
      <Confirm open={!!toDelete} title="Remove this rung?" body="Its practice log goes with it." confirmLabel="Remove" onCancel={() => setToDelete(null)} onConfirm={async () => { if (toDelete) { await db.exposureSessions.where('stepId').equals(toDelete.id).delete(); await db.exposureSteps.delete(toDelete.id) } setToDelete(null) }} />
    </Shell>
  )
}

function ExposureSession({ step, onDone }: { step: ExposureStep; onDone: () => void }) {
  const [stage, setStage] = useState<'before' | 'during' | 'after'>('before')
  const [before, setBefore] = useState(step.distressRating)
  const [peak, setPeak] = useState(step.distressRating)
  const [after, setAfter] = useState(Math.max(0, step.distressRating - 2))
  const [mins, setMins] = useState(10)
  const [note, setNote] = useState('')
  const [started] = useState(Date.now())
  const save = async () => {
    await db.exposureSessions.add({ id: newId(), stepId: step.id, distressBefore: before, distressPeak: peak, distressAfter: after, durationMin: Math.max(1, Math.round((Date.now() - started) / 60000)) || mins, note: note.trim(), createdAt: now() })
    await logSkill('exposure'); await logFreedomWin('didnt-act', `Exposure: ${step.description}`)
    onDone()
  }
  const Slider = ({ v, set, label }: { v: number; set: (n: number) => void; label: string }) => (<><div className="label">{label}: {v}</div><input className="range" type="range" min={0} max={10} value={v} onChange={(e) => set(Number(e.target.value))} aria-label={label} /></>)
  return (
    <Shell back="/unhooked/ladder" hideNav title="Practicing a rung">
      <div className="stack">
        <div className="card"><div className="item-title">{step.description}</div><div className="item-meta">Expected distress {step.distressRating}</div></div>
        {stage === 'before' && (<>
          <Slider v={before} set={setBefore} label="Distress before" />
          <div className="label">Roughly how long?</div>
          <div className="chips">{[5, 10, 15, 20, 30].map((m) => <button key={m} type="button" className="chip" aria-pressed={mins === m} onClick={() => setMins(m)}>{m} min</button>)}</div>
          <p className="help">Do the step. Let the distress be there. Don't do the compulsion. Come back when you're done or when it's enough.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('during')}>I'm doing it</button>
        </>)}
        {stage === 'during' && (<>
          <p className="question">Stay with it.</p>
          <p className="hint">Distress rises, peaks, and falls. You're teaching your brain that it can.</p>
          <Slider v={peak} set={setPeak} label="Distress at its peak" />
          <div className="btn-row"><Link to="/unhooked/tools/breathing" className="btn btn-ghost">Breathe</Link><button type="button" className="btn btn-primary" onClick={() => setStage('after')}>I'm through it</button></div>
          <p className="faint center">If it becomes overwhelming, stop, and reach out for support. That's wisdom, not failure.</p>
        </>)}
        {stage === 'after' && (<>
          <Slider v={after} set={setAfter} label="Distress now" />
          <VoiceTextarea value={note} onChange={setNote} placeholder="What did you notice? (optional)" />
          {detectCrisis(note) && <CrisisNotice />}
          <button type="button" className="btn btn-sage btn-block" onClick={save}>Log it. That was brave.</button>
        </>)}
      </div>
    </Shell>
  )
}

/* ---------- Reassurance reduction plan ---------- */
export function ReassurancePlan() {
  const s = useSettings()
  const nav = useNavigate()
  const today = dayKey()
  const log = useLiveQuery(() => db.reassuranceLog.orderBy('date').reverse().limit(14).toArray(), []) ?? []
  const todayRow = log.find((r) => r.date === today)
  const bump = async () => { if (todayRow) await db.reassuranceLog.update(todayRow.id, { count: todayRow.count + 1 }); else await db.reassuranceLog.add({ id: newId(), date: today, count: 1, note: '' }) }
  const max = Math.max(1, ...log.map((r) => r.count))
  return (
    <Shell back="/unhooked" title="Reassurance plan" subtitle="Noticing, not policing. A gradual goal, and words for the people who love me.">
      <div className="stack-lg">
        <section className="card">
          <h3>Gentle counter</h3>
          <p className="help">Optional. Tap when you notice yourself asking for reassurance. No judgment. Just data.</p>
          <div className="row-between"><div style={{ fontSize: '2rem', fontWeight: 800 }}>{todayRow?.count ?? 0}<span className="faint small"> today</span></div><button type="button" className="btn btn-ghost" onClick={bump}>I noticed one</button></div>
          {log.length > 0 && <div className="balance mt">{[...log].reverse().map((r) => <div key={r.id} className="balance-row" style={{ gridTemplateColumns: '64px 1fr 28px' }}><span className="small">{fmtDate(r.date).split(',')[0]}</span><div className="bar bar-me"><span style={{ width: `${(r.count / max) * 100}%` }} /></div><span>{r.count}</span></div>)}</div>}
        </section>
        <section className="card">
          <h3>My gradual goal</h3>
          <input className="input" value={s.reassuranceGoal ?? ''} placeholder="e.g. Ask once instead of multiple times. Then wait an hour before asking again." onChange={(e) => updateSettings({ reassuranceGoal: e.target.value })} aria-label="Reassurance goal" />
          <div className="chips mt">{['Ask once, then let it be', 'Wait an hour before asking', 'Say it instead of asking it', 'Ride the urge first, then decide'].map((g) => <button key={g} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} onClick={() => updateSettings({ reassuranceGoal: g })}>{g}</button>)}</div>
        </section>
        <section>
          <h3>Scripts for the people who love me</h3>
          <p className="help">Yours to share, or not. Nothing is sent automatically. Open one in Boundary Builder to make it your own.</p>
          <div className="list">{REASSURANCE_SCRIPTS.map((r) => <button key={r.title} type="button" className="item card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => nav(`/boundaries/new?starter=${encodeURIComponent(r.title)}`)}><div className="item-title">{r.title}</div><div className="small muted">{r.body}</div></button>)}</div>
        </section>
        <Link to="/unhooked/tools/send-check" className="btn btn-ghost">Before you send: the check</Link>
      </div>
    </Shell>
  )
}

/* ---------- Skills progress + Freedom moments ---------- */
export function SkillsProgress() {
  const practices = useLiveQuery(() => db.skillPractices.orderBy('createdAt').toArray(), []) ?? []
  const wins = useLiveQuery(() => db.wins.filter((w) => FREEDOM_TYPES.includes(w.type)).reverse().sortBy('createdAt'), []) ?? []
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'skills' | 'freedom'>(params.get('tab') === 'freedom' ? 'freedom' : 'skills')
  const [pick, setPick] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')

  const bySkill = useMemo(() => { const m = new Map<Skill, number>(); for (const p of practices) m.set(p.skill, (m.get(p.skill) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [practices])
  const weeks = useMemo(() => Array.from({ length: 8 }, (_, i) => { const end = Date.now() - i * 7 * 86_400_000, start = end - 7 * 86_400_000; const n = practices.filter((p) => { const t = new Date(p.createdAt).getTime(); return t > start && t <= end }).length; return { n, label: i === 0 ? 'now' : `${i}w` } }).reverse(), [practices])
  const plant = (n: number) => (n === 0 ? '·' : n < 3 ? '🌱' : n < 7 ? '🌿' : n < 14 ? '🪴' : '🌳')

  return (
    <Shell back="/unhooked" title="Skills and freedom" subtitle="Healing isn't a straight line. Every attempt builds the skill.">
      <div className="stack-lg">
        <div className="chips"><button type="button" className="chip" aria-pressed={tab === 'skills'} onClick={() => setTab('skills')}>Skills practiced</button><button type="button" className="chip" aria-pressed={tab === 'freedom'} onClick={() => setTab('freedom')}>Freedom moments</button></div>
        {tab === 'skills' && (<>
          <section className="card-sage">
            <h3>The garden, last eight weeks</h3>
            <div className="garden">{weeks.map((w, i) => <div key={i}><span aria-label={`${w.n} practices`}>{plant(w.n)}</span><small>{w.label}</small></div>)}</div>
            <p className="help mt" style={{ margin: 0 }}>Gaps are normal. A seed week isn't a failed week. Things grow in seasons.</p>
          </section>
          <section className="card-soft">
            <h3>Practices</h3>
            {bySkill.length ? <div className="balance">{bySkill.map(([k, n]) => <div key={k} className="balance-row" style={{ gridTemplateColumns: '150px 1fr 28px' }}><span className="small">{SKILL_LABEL[k]}</span><div className="bar bar-them"><span style={{ width: `${(n / bySkill[0][1]) * 100}%` }} /></div><span>{n}</span></div>)}</div> : <p className="faint">Nothing yet. Every tool you finish plants something here.</p>}
          </section>
        </>)}
        {tab === 'freedom' && (<>
          <section className="card stack">
            <div className="label">Log a freedom moment</div>
            <div className="chips">{FREEDOM_WINS.map((w) => <button key={w.type} type="button" className="chip chip-sage" aria-pressed={pick === w.type} onClick={() => setPick(pick === w.type ? null : w.type)}>{w.label}</button>)}</div>
            {pick && <><input className="input" value={note} placeholder="A note (optional)" onChange={(e) => setNote(e.target.value)} aria-label="Note" /><button type="button" className="btn btn-sage btn-block" onClick={async () => { await logFreedomWin(pick as never, note.trim()); setPick(null); setNote(''); setFlash('Every urge you ride out makes you freer.'); setTimeout(() => setFlash(''), 3000) }}>Count it</button></>}
            {flash && <p className="faint center" aria-live="polite" style={{ margin: 0 }}>{flash}</p>}
          </section>
          <div className="list">{wins.slice(0, 40).map((w) => <div key={w.id} className="item"><div className="small" style={{ fontWeight: 700 }}>{WIN_LABEL[w.type]}</div>{w.note && <div className="small muted">{w.note}</div>}<div className="item-meta">{fmtDateTime(w.createdAt)}</div></div>)}{wins.length === 0 && <p className="faint">None yet. They're coming.</p>}</div>
          <Link to="/wins" className="btn btn-quiet">All my wins</Link>
        </>)}
      </div>
    </Shell>
  )
}

/* ---------- Relapse prevention ---------- */
export function RelapsePlanPage() {
  const plan = useLiveQuery(() => db.relapsePlan.get('plan'), [])
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const p = plan ?? { id: 'plan' as const, warningSigns: [], helps: [], people: [], plan: '' }
  const set = (patch: Partial<typeof p>) => db.relapsePlan.put({ ...p, ...patch })
  return (
    <Shell back="/unhooked" title="If it gets loud again" subtitle="Written by me, for me, while it's quiet.">
      <div className="stack-lg">
        <section><h3>My early warning signs</h3><Chips options={RELAPSE_SIGNS} value={p.warningSigns} onChange={(warningSigns) => set({ warningSigns })} allowCustom /></section>
        <section><h3>What helps most</h3><Chips options={RELAPSE_HELPS} value={p.helps} onChange={(helps) => set({ helps })} allowCustom variant="sage" /></section>
        <section><h3>Who I can reach out to</h3><Chips options={people.map((x) => x.name)} value={p.people} onChange={(ppl) => set({ people: ppl })} allowCustom customLabel="Someone else" /></section>
        <section>
          <h3>My short plan</h3>
          <VoiceTextarea large value={p.plan} onChange={(v) => set({ plan: v })} placeholder="When I notice the signs, I will… (breathe first, name it, tell someone, one prayer, then one true thing)" />
          {detectCrisis(p.plan) && <CrisisNotice />}
        </section>
        <div className="card-gold"><p className="truth" style={{ margin: 0 }}>Every urge I ride out makes me freer. Jesus meets me in the storm, not only after it's calm.</p></div>
      </div>
    </Shell>
  )
}
