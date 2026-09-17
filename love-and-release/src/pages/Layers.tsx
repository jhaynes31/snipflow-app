import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { Confirm } from '@/components/Confirm'
import { StepActions, Stepper } from '@/components/Stepper'
import { PlusIcon } from '@/components/Icons'
import { db, newId } from '@/db/db'
import { UNSURE, type Ring } from '@/db/types'
import { ACCESS_ITEMS, ENTRY_SUGGESTIONS, EXIT_SUGGESTIONS, EXPECTATION_SUGGESTIONS, RING_COLORS } from '@/data/circles'
import { useRings } from '@/lib/circles'
import { restoreDefaultRings } from '@/db/seed'

export function LayersList() {
  const rings = useRings()
  const people = useLiveQuery(() => db.people.toArray(), []) ?? []
  const [toDelete, setToDelete] = useState<Ring | null>(null)
  const nav = useNavigate()

  const addRing = async () => {
    const r: Ring = { id: newId(), name: 'New layer', order: rings.length, color: RING_COLORS[rings.length % RING_COLORS.length], meaning: '', access: [], expectations: [], entryCriteria: [], exitSignals: [] }
    await db.rings.add(r)
    nav(`/circles/layers/${r.id}`)
  }
  const move = async (r: Ring, dir: -1 | 1) => {
    const idx = rings.indexOf(r)
    const other = rings[idx + dir]
    if (!other) return
    await db.rings.bulkPut([{ ...r, order: other.order }, { ...other, order: r.order }])
  }
  const remove = async (r: Ring) => {
    await db.people.where('ringId').equals(r.id).modify({ ringId: UNSURE })
    await db.rings.delete(r.id)
    await db.layerBoundaries.where('ringId').equals(r.id).delete()
    setToDelete(null)
  }

  return (
    <Shell back="/circles" title="My layers" subtitle="Inside to outside. Each one is yours to define." action={<button type="button" className="btn btn-icon btn-primary" aria-label="Add a layer" onClick={addRing}><PlusIcon /></button>}>
      <div className="stack">
        <Link to="/circles/setup" className="btn btn-ghost btn-block">Walk me through defining each layer</Link>
        {rings.map((r, i) => (
          <div key={r.id} className="item">
            <div className="row-between">
              <Link to={`/circles/layers/${r.id}`} className="row" style={{ color: 'inherit' }}>
                <span className="ring-swatch" style={{ background: r.color }} />
                <span className="item-title">{r.name}</span>
                <span className="faint">{people.filter((p) => p.ringId === r.id).length}</span>
              </Link>
              <span className="row" style={{ gap: 2 }}>
                <button type="button" className="btn btn-quiet btn-sm" aria-label="Move inward" disabled={i === 0} onClick={() => move(r, -1)}>↑</button>
                <button type="button" className="btn btn-quiet btn-sm" aria-label="Move outward" disabled={i === rings.length - 1} onClick={() => move(r, 1)}>↓</button>
                <button type="button" className="btn btn-quiet btn-sm" aria-label={`Remove ${r.name}`} onClick={() => setToDelete(r)}>✕</button>
              </span>
            </div>
            {r.meaning && <div className="small muted" style={{ marginTop: 4 }}>{r.meaning}</div>}
          </div>
        ))}
        {rings.length === 0 && <button type="button" className="btn btn-primary" onClick={restoreDefaultRings}>Restore the suggested layers</button>}
      </div>
      <Confirm open={!!toDelete} title={`Remove the ${toDelete?.name} layer?`} body="People in it move to Unsure so no one is lost." confirmLabel="Remove" onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove(toDelete)} />
    </Shell>
  )
}

const STEPS = [
  'What does this layer mean to me?',
  'What access does someone in this layer get?',
  'What do I expect from people in this layer?',
  'What do they need to show me consistently to be here?',
  'What signs mean they may not belong here anymore?',
  'Roughly how many people do I want in this layer?',
  'Minimum time known before someone can join?',
  'Name and color',
]

/** One question per screen, all skippable. With ?setup=1 it walks every ring in order. */
export function LayerEditor() {
  const { ringId } = useParams()
  const [params] = useSearchParams()
  const setup = params.get('setup') === '1'
  const rings = useRings()
  const ring = rings.find((r) => r.id === ringId)
  const nav = useNavigate()
  const [step, setStep] = useState(0)

  if (!ring) return <Shell back="/circles/layers"><p className="faint">Loading…</p></Shell>
  const patch = (p: Partial<Ring>) => db.rings.update(ring.id, p)
  const idx = rings.indexOf(ring)
  const nextRing = rings[idx + 1]

  const finish = () => {
    if (setup && nextRing) { setStep(0); nav(`/circles/layers/${nextRing.id}?setup=1`) }
    else nav(setup ? '/circles' : '/circles/layers')
  }
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish())
  const back = () => (step > 0 ? setStep(step - 1) : nav(-1))

  return (
    <Shell back="/circles/layers" hideNav action={setup ? <span className="faint">Layer {idx + 1} of {rings.length}</span> : undefined}>
      <div className="row mb"><span className="ring-swatch" style={{ background: ring.color }} /><strong>{ring.name}</strong></div>
      <Stepper step={step} total={STEPS.length} />
      <p className="question">{STEPS[step]}</p>

      {step === 0 && (<div className="stack">
        <p className="hint">One sentence, in your own words.</p>
        <input className="input" value={ring.meaning} placeholder="e.g. Chosen family. Mutual choosing." onChange={(e) => patch({ meaning: e.target.value })} aria-label="Meaning" />
      </div>)}
      {step === 1 && (<div className="stack">
        <p className="hint">Tap everything this layer gets. Everything else stays with closer circles.</p>
        <Chips options={ACCESS_ITEMS} value={ring.access} onChange={(access) => patch({ access })} allowCustom customLabel="Custom item" variant="sage" />
      </div>)}
      {step === 2 && (<div className="stack">
        <p className="hint">What being here asks of them.</p>
        <Chips options={EXPECTATION_SUGGESTIONS} value={ring.expectations} onChange={(expectations) => patch({ expectations })} allowCustom />
      </div>)}
      {step === 3 && (<div className="stack">
        <p className="hint">Entry criteria. These show up in every move review toward this layer.</p>
        <Chips options={ENTRY_SUGGESTIONS} value={ring.entryCriteria} onChange={(entryCriteria) => patch({ entryCriteria })} allowCustom />
      </div>)}
      {step === 4 && (<div className="stack">
        <p className="hint">Exit signals. Noticing these isn't judgment. It's information.</p>
        <Chips options={EXIT_SUGGESTIONS} value={ring.exitSignals} onChange={(exitSignals) => patch({ exitSignals })} allowCustom />
      </div>)}
      {step === 5 && (<div className="stack">
        <p className="hint">A soft cap, not a rule. Leave it blank if you'd rather not.</p>
        <input className="input" type="number" min={1} value={ring.softCap ?? ''} placeholder="e.g. 5" onChange={(e) => patch({ softCap: e.target.value ? Number(e.target.value) : undefined })} aria-label="Soft cap" />
      </div>)}
      {step === 6 && (<div className="stack">
        <p className="hint">Optional. Time is one of the few things that can't be faked.</p>
        <Chips options={['3+ months', '6+ months', '1+ year', '2+ years']} value={ring.minTimeKnown ? [ring.minTimeKnown] : []} onChange={(v) => patch({ minTimeKnown: v[0] })} single allowCustom />
      </div>)}
      {step === 7 && (<div className="stack">
        <input className="input" value={ring.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Layer name" />
        <div className="row" role="radiogroup" aria-label="Layer color">
          {RING_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={ring.color === c} aria-label={`Color ${c}`} className="color-dot" style={{ background: c, outline: ring.color === c ? '3px solid var(--text)' : '1px solid var(--line)' }} onClick={() => patch({ color: c })} />)}
        </div>
      </div>)}

      <StepActions onBack={back} onNext={next} onSkip={next} isLast={step === STEPS.length - 1} nextLabel={step === STEPS.length - 1 ? (setup && nextRing ? `Next: ${nextRing.name}` : 'Done') : undefined} />
    </Shell>
  )
}

export function SetupRedirect() {
  const rings = useRings()
  const nav = useNavigate()
  if (rings.length) { nav(`/circles/layers/${rings[0].id}?setup=1`, { replace: true }); return null }
  return <Shell back="/circles"><p className="faint">Loading…</p></Shell>
}
