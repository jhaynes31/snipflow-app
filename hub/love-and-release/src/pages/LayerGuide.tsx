import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { db } from '@/db/db'
import type { Ring } from '@/db/types'
import { GUIDE_LABEL, guideFor, LIST_KEYS, TEXT_KEYS, type LayerGuide as Guide } from '@/data/layerGuide'
import { useRings } from '@/lib/circles'

/**
 * One layer, opened from the circle (2026-10-03, Jen's ask): how long
 * someone usually sits here, what is safe to share and give, what to
 * reasonably expect, the rhythm of talking and seeing each other, what each
 * owes the other, and what would qualify someone to move to the next layer
 * in. Suggested words first; every line can be made hers.
 */
export function LayerGuidePage() {
  const { ringId } = useParams()
  const rings = useRings()
  const people = useLiveQuery(() => db.people.toArray(), []) ?? []
  const [editing, setEditing] = useState(false)
  const ring = rings.find((r) => r.id === ringId)
  if (!ring) return <Shell back="/circles"><p className="faint">Loading…</p></Shell>
  const idx = rings.indexOf(ring)
  const inner = rings[idx - 1]
  const outer = rings[idx + 1]
  const g = guideFor(ring, rings)
  const here = people.filter((p) => p.ringId === ring.id)
  const own = ring.guide ?? {}

  const List = ({ items, empty }: { items: string[]; empty: string }) => (items.length ? <ul className="guide-list">{items.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="faint">{empty}</p>)

  return (
    <Shell back="/circles" title={ring.name} subtitle={ring.meaning || undefined} action={<Link to={`/circles/layers/${ring.id}/edit`} className="btn btn-quiet btn-sm">Edit layer</Link>}>
      <div className="stack-lg">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="chip chip-sm" style={{ background: ring.color, color: '#2f2a24', borderColor: 'transparent' }}>Layer {idx + 1} of {rings.length}</span>
          <span className="chip chip-sm">{here.length} here{ring.softCap ? ` of ~${ring.softCap}` : ''}</span>
          {ring.minTimeKnown && <span className="chip chip-sm">Known {ring.minTimeKnown}</span>}
          {inner && <Link to={`/circles/layers/${inner.id}`} className="chip chip-sm">← {inner.name}</Link>}
          {outer && <Link to={`/circles/layers/${outer.id}`} className="chip chip-sm">{outer.name} →</Link>}
        </div>

        <section className="card-gold">
          <h3>{GUIDE_LABEL.timeline}</h3>
          <p style={{ margin: 0 }}>{g.timeline}</p>
        </section>

        <section className="card-sage">
          <h3>{GUIDE_LABEL.share}</h3>
          <List items={g.share} empty="Nothing written yet." />
          {ring.access.length > 0 && <p className="small muted" style={{ marginTop: 8 }}>Access this layer gets: {ring.access.join(' · ')}</p>}
        </section>
        <section className="card">
          <h3>{GUIDE_LABEL.keep}</h3>
          <List items={g.keep} empty="Nothing held back here." />
        </section>

        <section className="card">
          <h3>{GUIDE_LABEL.patterns}</h3>
          <p className="small muted">Patterns and actions, not promises. If these are mostly true over time, they belong here.</p>
          <List items={g.patterns} empty="Nothing written yet." />
        </section>

        <section className="card">
          <h3>The rhythm</h3>
          <p><strong>{GUIDE_LABEL.talk}.</strong> {g.talk}</p>
          <p><strong>{GUIDE_LABEL.howOften}.</strong> {g.howOften}</p>
          <p style={{ margin: 0 }}><strong>{GUIDE_LABEL.hangOut}.</strong> {g.hangOut}</p>
        </section>

        <section className="card">
          <h3>Responsibilities to each other</h3>
          <div className="guide-two">
            <div><div className="label">{GUIDE_LABEL.mine}</div><List items={g.mine} empty="Nothing written yet." /></div>
            <div><div className="label">{GUIDE_LABEL.theirs}</div><List items={g.theirs} empty="Nothing written yet." /></div>
          </div>
        </section>

        <section className="card-sage">
          <h3>{inner ? `What would qualify someone to move to ${inner.name}` : GUIDE_LABEL.qualities}</h3>
          <List items={g.qualities} empty="Nothing written yet." />
          {inner && inner.entryCriteria.length > 0 && (
            <div className="mt"><div className="label">What a move review toward {inner.name} will ask about</div><List items={inner.entryCriteria} empty="" /></div>
          )}
          {inner?.minTimeKnown && <p className="small muted" style={{ margin: '8px 0 0' }}>{inner.name} asks for {inner.minTimeKnown} known. Time is one of the few things that can't be faked.</p>}
        </section>

        {ring.exitSignals.length > 0 && (
          <section className="card-soft">
            <h3>Signs they may not belong here any more</h3>
            <List items={ring.exitSignals} empty="" />
          </section>
        )}

        <section className="card">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Make this mine</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing((e) => !e)}>{editing ? 'Done' : 'Edit these words'}</button>
          </div>
          {!editing ? (
            <p className="small muted" style={{ margin: '8px 0 0' }}>These are suggested words until you change them. Anything you leave blank keeps the suggestion.</p>
          ) : (
            <GuideEditor ring={ring} own={own} suggested={g} />
          )}
        </section>

        {here.length > 0 && (
          <section>
            <h3>In this layer</h3>
            <div className="list">{here.map((p) => <Link key={p.id} to={`/people/${p.id}`} className="item card-link"><div className="item-title">{p.emoji ? `${p.emoji} ` : ''}{p.name}</div></Link>)}</div>
          </section>
        )}
      </div>
    </Shell>
  )
}

function GuideEditor({ ring, own, suggested }: { ring: Ring; own: Partial<Guide>; suggested: Guide }) {
  const save = (patch: Partial<Guide>) => db.rings.update(ring.id, { guide: { ...own, ...patch } })
  return (
    <div className="stack mt">
      {TEXT_KEYS.map((k) => (
        <div key={k}>
          <label className="label" htmlFor={`g-${k}`}>{GUIDE_LABEL[k]}</label>
          <textarea id={`g-${k}`} className="input" rows={2} defaultValue={(own[k] as string | undefined) ?? ''} placeholder={suggested[k] as string} onBlur={(e) => save({ [k]: e.target.value } as Partial<Guide>)} />
        </div>
      ))}
      {LIST_KEYS.map((k) => (
        <div key={k}>
          <label className="label" htmlFor={`g-${k}`}>{GUIDE_LABEL[k]} <span className="faint">(one per line)</span></label>
          <textarea id={`g-${k}`} className="input" rows={4} defaultValue={((own[k] as string[] | undefined) ?? []).join('\n')} placeholder={(suggested[k] as string[]).join('\n')} onBlur={(e) => save({ [k]: e.target.value.split('\n').map((t) => t.trim()).filter(Boolean) } as Partial<Guide>)} />
        </div>
      ))}
      <p className="small muted">Saved as you leave each box. Clear a box to go back to the suggested words.</p>
    </div>
  )
}
