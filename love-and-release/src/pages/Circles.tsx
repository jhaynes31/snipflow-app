import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { PlusIcon } from '@/components/Icons'
import { db, newId, now } from '@/db/db'
import { RELEASED, UNSURE, type Person, type Placement, type Ring } from '@/db/types'
import { CIRCLE_LESSONS, CIRCLE_VERSES, JESUS_CIRCLES, PERSON_COLORS, PERSON_EMOJIS, RELATIONSHIP_TYPES } from '@/data/circles'
import { initials, placementName, reviewDue, useCircleCues, useRings } from '@/lib/circles'
import { updateSettings, useSettings } from '@/lib/settings'

type Tab = 'circle' | 'list' | 'unsure' | 'released'

export function CircleView() {
  const settings = useSettings()
  const rings = useRings()
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'circle'
  const setTab = (t: Tab) => setParams(t === 'circle' ? {} : { tab: t }, { replace: true })
  const nav = useNavigate()
  const cues = useCircleCues(settings.circleCues !== false)
  const due = reviewDue(settings)

  if (!settings.circlesIntroSeen) return <Intro onDone={(setup) => { updateSettings({ circlesIntroSeen: true }); if (setup) nav('/circles/setup') }} />

  const placed = people.filter((p) => p.ringId !== UNSURE && p.ringId !== RELEASED)
  const unsure = people.filter((p) => p.ringId === UNSURE)
  const released = people.filter((p) => p.ringId === RELEASED)

  return (
    <Shell
      title="My Circles"
      subtitle="Everyone deserves love. Not everyone gets access. Access is earned over time."
      action={<Link to="/circles/add" className="btn btn-icon btn-primary" aria-label="Add a person"><PlusIcon /></Link>}
    >
      <div className="stack">
        <div className="chips" role="tablist" aria-label="View">
          {([['circle', 'Circle'], ['list', 'List'], ['unsure', `Unsure${unsure.length ? ` · ${unsure.length}` : ''}`], ['released', 'Released']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} type="button" role="tab" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>{label}</button>
          ))}
        </div>

        {due && (
          <div className="notice notice-sage row-between">
            <span>It's been a while. Want a gentle look at the whole circle?</span>
            <span className="row" style={{ gap: 6 }}>
              <Link to="/circles/review" className="btn btn-sm btn-sage">Review</Link>
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => updateSettings({ circleReviewSnoozedUntil: new Date(Date.now() + 14 * 86_400_000).toISOString() })}>Later</button>
            </span>
          </div>
        )}

        {tab === 'circle' && (
          <>
            {rings.length === 0 ? (
              <div className="card center"><p className="muted">No layers yet.</p><Link to="/circles/layers" className="btn btn-primary">Set up my layers</Link></div>
            ) : (
              <RingMap rings={rings} people={placed} cues={cues} onOpen={(id) => nav(`/people/${id}`)} onMove={(id, to) => nav(`/circles/move/${id}?to=${encodeURIComponent(to)}`)} />
            )}
            <p className="help center">Tap a person to open them. Drag them to another ring to start a move.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/circles/layers" className="btn btn-sm btn-ghost">My layers</Link>
              <Link to="/circles/boundaries" className="btn btn-sm btn-ghost">Boundaries by layer</Link>
              <Link to="/circles/flags" className="btn btn-sm btn-ghost">Red flags library</Link>
              <Link to="/circles/why" className="btn btn-sm btn-quiet">Why circles?</Link>
            </div>
            {placed.length === 0 && <p className="faint center">No one placed yet. New people start in the outer circle, and move closer as they show who they are.</p>}
          </>
        )}

        {tab === 'list' && (
          <div className="stack-lg">
            {rings.map((r) => (
              <section key={r.id}>
                <div className="row-between"><h3 style={{ margin: 0 }}><span className="ring-swatch" style={{ background: r.color }} />{r.name}</h3><span className="faint">{people.filter((p) => p.ringId === r.id).length}{r.softCap ? ` of ~${r.softCap}` : ''}</span></div>
                <PersonList people={people.filter((p) => p.ringId === r.id)} cues={cues} empty="No one here yet." />
              </section>
            ))}
          </div>
        )}

        {tab === 'unsure' && (
          <div className="stack">
            <p className="muted">A holding place for people you haven't placed yet, or are reconsidering. No rush.</p>
            <PersonList people={unsure} cues={cues} empty="No one is in the unsure space." action={(p) => <Link to={`/circles/move/${p.id}`} className="btn btn-sm btn-ghost">Place them</Link>} />
          </div>
        )}

        {tab === 'released' && (
          <div className="stack">
            <p className="muted">People you've released with love. Hidden from the circle. They can be restored any time with a move review.</p>
            <PersonList people={released} cues={{}} empty="No one has been released." action={(p) => <Link to={`/circles/move/${p.id}`} className="btn btn-sm btn-ghost">Restore</Link>} />
          </div>
        )}
      </div>
    </Shell>
  )
}

function PersonList({ people, cues, empty, action }: { people: Person[]; cues: Record<string, { oneSided: boolean; watch: boolean }>; empty: string; action?: (p: Person) => React.ReactNode }) {
  if (!people.length) return <p className="faint">{empty}</p>
  return (
    <div className="list">
      {people.map((p) => (
        <div key={p.id} className="item row-between">
          <Link to={`/people/${p.id}`} className="row" style={{ color: 'inherit', flex: 1 }}>
            <Avatar person={p} size={36} />
            <div>
              <div className="item-title">{p.name}</div>
              <div className="item-meta">{p.role}{cues[p.id]?.oneSided ? ' · one-sided lately' : ''}{cues[p.id]?.watch ? ' · watch note open' : ''}</div>
            </div>
          </Link>
          {action?.(p)}
        </div>
      ))}
    </div>
  )
}

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: person.color ?? 'var(--surface-2)', fontSize: size * 0.4 }} aria-hidden="true">
      {person.emoji ?? initials(person.name)}
    </span>
  )
}

/* ---------- the visual circle ---------- */
const SIZE = 400, C = 200, ME_R = 30, PAD = 4

function RingMap({ rings, people, cues, onOpen, onMove }: { rings: Ring[]; people: Person[]; cues: Record<string, { oneSided: boolean; watch: boolean }>; onOpen: (id: string) => void; onMove: (id: string, to: Placement) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null)
  const w = (C - ME_R - PAD) / rings.length
  const dot = Math.min(18, w * 0.46)

  const positions = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {}
    rings.forEach((r, i) => {
      const inner = ME_R + i * w
      const members = people.filter((p) => p.ringId === r.id)
      const n = members.length
      const circumference = 2 * Math.PI * (inner + w / 2)
      const crowded = n * dot * 2.4 > circumference
      members.forEach((p, k) => {
        // Start at the top and, for even counts, shift half a step so no dot sits on the label at the bottom.
        const angle = -Math.PI / 2 + (k * 2 * Math.PI) / Math.max(n, 1) + (n % 2 === 0 ? Math.PI / n : 0) + i * 0.12
        const radius = inner + w / 2 + (crowded ? (k % 2 ? w * 0.22 : -w * 0.22) : 0)
        out[p.id] = { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) }
      })
    })
    return out
  }, [rings, people, w, dot])

  const toSvg = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * SIZE, y: ((e.clientY - rect.top) / rect.height) * SIZE }
  }
  const ringAt = (x: number, y: number): Placement => {
    const d = Math.hypot(x - C, y - C)
    if (d > C - PAD) return UNSURE
    const i = Math.max(0, Math.min(rings.length - 1, Math.floor((d - ME_R) / w)))
    return rings[i].id
  }

  const onDown = (p: Person) => (e: React.PointerEvent) => {
    const { x, y } = toSvg(e)
    svgRef.current?.setPointerCapture(e.pointerId)
    setDrag({ id: p.id, x, y, startX: x, startY: y, moved: false })
  }
  const onMoveP = (e: React.PointerEvent) => {
    if (!drag) return
    const { x, y } = toSvg(e)
    setDrag({ ...drag, x, y, moved: drag.moved || Math.hypot(x - drag.startX, y - drag.startY) > 6 })
  }
  const onUp = () => {
    if (!drag) return
    const p = people.find((x) => x.id === drag.id)
    setDrag(null)
    if (!p) return
    if (!drag.moved) return onOpen(p.id)
    const target = ringAt(drag.x, drag.y)
    if (target !== p.ringId) onMove(p.id, target)
  }
  const hover = drag?.moved ? ringAt(drag.x, drag.y) : null

  return (
    <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} className="ringmap" role="img" aria-label="Relationship circles" onPointerMove={onMoveP} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
      {[...rings].reverse().map((r) => {
        const i = rings.indexOf(r)
        const outer = ME_R + (i + 1) * w
        return (
          <g key={r.id}>
            <circle cx={C} cy={C} r={outer} fill={r.color} stroke={hover === r.id ? 'var(--accent)' : 'var(--surface)'} strokeWidth={hover === r.id ? 3 : 1.5} />
            <text x={C} y={C + outer - 6} textAnchor="middle" fontSize="10.5" fill="var(--text-soft)" fontWeight="700">{r.name}</text>
          </g>
        )
      })}
      <circle cx={C} cy={C} r={ME_R} fill="var(--accent)" />
      <text x={C} y={C + 4.5} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--accent-text)">Me</text>
      {people.map((p) => {
        const pos = drag?.id === p.id && drag.moved ? { x: drag.x, y: drag.y } : positions[p.id]
        if (!pos) return null
        const cue = cues[p.id]
        return (
          <g key={p.id} transform={`translate(${pos.x} ${pos.y})`} className="person-dot" onPointerDown={onDown(p)} role="button" tabIndex={0} aria-label={`${p.name}, ${placementName(p.ringId, rings)}`} onKeyDown={(e) => e.key === 'Enter' && onOpen(p.id)}>
            <circle r={dot} fill={p.color ?? 'var(--surface)'} stroke="var(--surface)" strokeWidth="2" />
            <text y={dot * 0.35} textAnchor="middle" fontSize={p.emoji ? dot * 1.1 : dot * 0.75} fontWeight="800" fill={p.color ? '#fff' : 'var(--text)'}>{p.emoji ?? initials(p.name)}</text>
            {cue?.oneSided && <circle cx={dot * 0.75} cy={-dot * 0.75} r={3.5} fill="var(--gold)" stroke="var(--surface)" strokeWidth="1" />}
            {cue?.watch && <circle cx={-dot * 0.75} cy={-dot * 0.75} r={3.5} fill="var(--text-soft)" stroke="var(--surface)" strokeWidth="1" />}
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- intro ---------- */
function Intro({ onDone }: { onDone: (setup: boolean) => void }) {
  return (
    <Shell back="/" hideNav>
      <div className="stack-lg">
        <div>
          <h1>Jesus had circles too.</h1>
          <p className="muted">Having layers isn't cold. It's wise, and it's Christlike. He loved everyone. He didn't give everyone the same access.</p>
        </div>
        <JesusCirclesTable />
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => onDone(true)}>Define my layers</button>
          <button type="button" className="btn btn-primary" onClick={() => onDone(false)}>Use suggested layers</button>
        </div>
        <p className="help center">You can rename, recolor, add, or remove layers any time.</p>
      </div>
    </Shell>
  )
}

export function WhyCircles() {
  return (
    <Shell back="/circles" title="Why circles?" subtitle="A visual map of my relationships, and a system for trust that is earned, not assumed.">
      <div className="stack-lg">
        <JesusCirclesTable />
        <section className="card-gold">
          <h3>What this means for me</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{CIRCLE_LESSONS.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
        <section>
          <h3>Verses to hold</h3>
          <div className="list">{CIRCLE_VERSES.map((v) => <div key={v.ref} className="item"><div className="truth" style={{ fontSize: '1rem' }}>{v.text}</div><div className="item-meta">{v.ref}, paraphrased</div></div>)}</div>
        </section>
        <p className="truth center">Everyone deserves love and respect. Not everyone gets access.</p>
      </div>
    </Shell>
  )
}

function JesusCirclesTable() {
  return (
    <div className="list">
      {JESUS_CIRCLES.map((c, i) => (
        <div key={c.circle} className="item" style={{ marginLeft: i * 6 }}>
          <div className="row-between"><span className="item-title">{c.circle}</span><span className="faint">{c.who}</span></div>
          <div className="small muted">{c.what}</div>
          <div className="item-meta">{c.ref}</div>
        </div>
      ))}
    </div>
  )
}

/* ---------- add person ---------- */
export function AddPerson() {
  const nav = useNavigate()
  const rings = useRings()
  const outer = rings[rings.length - 1]
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [emoji, setEmoji] = useState<string | undefined>()
  const [color, setColor] = useState<string | undefined>(PERSON_COLORS[0])
  const [ringId, setRingId] = useState<Placement | ''>('')
  const [metDate, setMetDate] = useState('')

  const save = async () => {
    if (!name.trim()) return
    const p: Person = {
      id: newId(), name: name.trim(), role: role.trim() || types[0] || '', notes: '', createdAt: now(),
      ringId: ringId || outer?.id || UNSURE, emoji, color, relationshipType: types[0], metDate: metDate || undefined,
    }
    await db.people.add(p)
    nav(`/people/${p.id}`, { replace: true })
  }

  return (
    <Shell back="/circles" hideNav title="Add a person">
      <div className="stack">
        <input className="input" autoFocus placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        <input className="input" placeholder="Who they are to me (e.g. sister, church friend, my boss)" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Who they are to me" />
        <div className="label">Relationship type</div>
        <Chips options={RELATIONSHIP_TYPES} value={types} onChange={setTypes} single />
        <div className="label">A small marker (optional)</div>
        <div className="chips">
          {PERSON_EMOJIS.map((e) => <button key={e} type="button" className="chip" aria-pressed={emoji === e} onClick={() => setEmoji(emoji === e ? undefined : e)}>{e}</button>)}
        </div>
        <div className="row" role="radiogroup" aria-label="Color">
          {PERSON_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Color ${c}`} className="color-dot" style={{ background: c, outline: color === c ? '3px solid var(--text)' : 'none' }} onClick={() => setColor(c)} />)}
        </div>
        <div className="field">
          <label className="label" htmlFor="met">When did we meet? (optional)</label>
          <input id="met" className="input" type="date" value={metDate} onChange={(e) => setMetDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="ring">Starting layer</label>
          <select id="ring" className="select" value={ringId || outer?.id || UNSURE} onChange={(e) => setRingId(e.target.value)}>
            {rings.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            <option value={UNSURE}>Unsure for now</option>
          </select>
          <p className="help">Trust grows with time. New people start in the outer circle, and you can move them closer as they show who they are.</p>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={!name.trim()}>Add {name.trim() || 'them'}</button>
      </div>
    </Shell>
  )
}
