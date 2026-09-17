import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { db, newId, now } from '@/db/db'
import type { LayerBoundary } from '@/db/types'
import { BOUNDARY_TEMPLATES } from '@/data/circles'
import { impliedBoundaries, useRings } from '@/lib/circles'

export function LayerBoundaries() {
  const [params, setParams] = useSearchParams()
  const personId = params.get('person') ?? ''
  const rings = useRings()
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const person = people.find((p) => p.id === personId)
  const [ringId, setRingId] = useState('')
  const activeRing = rings.find((r) => r.id === (person ? person.ringId : ringId || rings[0]?.id))
  const custom = useLiveQuery(async () => {
    if (person) return db.layerBoundaries.where('personId').equals(person.id).toArray()
    if (activeRing) return db.layerBoundaries.where('ringId').equals(activeRing.id).toArray()
    return []
  }, [person?.id, activeRing?.id]) ?? []
  const ringDefaults = useLiveQuery(() => (person && activeRing ? db.layerBoundaries.where('ringId').equals(activeRing.id).toArray() : []), [person?.id, activeRing?.id]) ?? []
  const [draft, setDraft] = useState<Partial<LayerBoundary> | null>(null)

  const save = async () => {
    if (!draft?.text?.trim()) return
    await db.layerBoundaries.put({ id: draft.id ?? newId(), ringId: person ? undefined : activeRing?.id, personId: person?.id, text: draft.text.trim(), why: draft.why?.trim() ?? '', response: draft.response?.trim() ?? '', createdAt: draft.createdAt ?? now() })
    setDraft(null)
  }

  return (
    <Shell back="/circles" title={person ? `Boundaries for ${person.name}` : 'Boundaries by layer'} subtitle={person ? `Custom boundaries add to, or override, the ${activeRing?.name ?? 'layer'} defaults.` : 'Each layer has a default boundary set. Anyone can have their own.'}>
      <div className="stack-lg">
        {!person && (
          <div className="chips">
            {rings.map((r) => <button key={r.id} type="button" className="chip" aria-pressed={activeRing?.id === r.id} onClick={() => setRingId(r.id)}><span className="ring-swatch" style={{ background: r.color }} />{r.name}</button>)}
          </div>
        )}
        {people.length > 0 && (
          <select className="select" value={personId} onChange={(e) => setParams(e.target.value ? { person: e.target.value } : {})} aria-label="Boundaries for a specific person">
            <option value="">Layer defaults</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        {activeRing && (
          <section className="card-soft">
            <h3>Implied by what {activeRing.name} gets</h3>
            {impliedBoundaries(activeRing).length ? <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{impliedBoundaries(activeRing).map((b) => <li key={b}>{b}</li>)}</ul> : <p className="faint" style={{ margin: 0 }}>This layer gets everything on the access list.</p>}
            {person && ringDefaults.length > 0 && <><div className="label mt">{activeRing.name} defaults</div>{ringDefaults.map((b) => <div key={b.id} className="small">· {b.text}</div>)}</>}
          </section>
        )}

        <section className="stack">
          <div className="row-between"><h3 style={{ margin: 0 }}>{person ? 'Custom for ' + person.name : `${activeRing?.name ?? ''} boundaries`}</h3><button type="button" className="btn btn-sm btn-primary" onClick={() => setDraft({})}>Add</button></div>
          {draft && (
            <div className="card stack">
              <input className="input" autoFocus value={draft.text ?? ''} placeholder="The boundary" onChange={(e) => setDraft({ ...draft, text: e.target.value })} aria-label="Boundary" />
              <input className="input" value={draft.why ?? ''} placeholder="Why it matters to me" onChange={(e) => setDraft({ ...draft, why: e.target.value })} aria-label="Why it matters" />
              <input className="input" value={draft.response ?? ''} placeholder="How I'll respond if it's crossed" onChange={(e) => setDraft({ ...draft, response: e.target.value })} aria-label="Response" />
              <div className="chips">{BOUNDARY_TEMPLATES.map((t) => <button key={t.text} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} onClick={() => setDraft({ ...draft, ...t })}>{t.text}</button>)}</div>
              <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={save} disabled={!draft.text?.trim()}>Save</button></div>
            </div>
          )}
          <div className="list">
            {custom.map((b) => (
              <div key={b.id} className="item">
                <div className="row-between"><strong>{b.text}</strong><span className="row" style={{ gap: 2 }}><button type="button" className="btn btn-quiet btn-sm" onClick={() => setDraft(b)}>Edit</button><button type="button" className="btn btn-quiet btn-sm" aria-label="Remove" onClick={() => db.layerBoundaries.delete(b.id)}>✕</button></span></div>
                {b.why && <div className="small muted">Why: {b.why}</div>}
                {b.response && <div className="small muted">If crossed: {b.response}</div>}
              </div>
            ))}
            {custom.length === 0 && !draft && <p className="faint">None yet. Tap Add to start from a template.</p>}
          </div>
        </section>
        <Link to="/boundaries/new" className="btn btn-ghost">Draft the words in Boundary Builder</Link>
      </div>
    </Shell>
  )
}
