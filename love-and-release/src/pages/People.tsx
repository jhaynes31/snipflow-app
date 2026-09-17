import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Confirm } from '@/components/Confirm'
import { PlusIcon } from '@/components/Icons'
import { db, newId, now } from '@/db/db'
import type { Person, ReciprocityType } from '@/db/types'
import { RECIPROCITY, RECIPROCITY_LABEL, ROLES } from '@/data/options'
import { daysAgo, fmtDateTime } from '@/lib/dates'

const FRAMING = "This isn't scorekeeping. It's so one hard night doesn't rewrite the whole story."

export function PeopleList() {
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('Friend')
  const nav = useNavigate()

  const add = async () => {
    if (!name.trim()) return
    const p: Person = { id: newId(), name: name.trim(), role, notes: '', createdAt: now() }
    await db.people.add(p)
    setName(''); setAdding(false)
    nav(`/people/${p.id}`)
  }

  return (
    <Shell title="My People" subtitle={FRAMING} action={<button type="button" className="btn btn-icon btn-primary" aria-label="Add a person" onClick={() => setAdding(true)}><PlusIcon /></button>}>
      <div className="stack">
        {adding && (
          <div className="card stack">
            <input className="input" autoFocus placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Name" />
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role in my life">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={add} disabled={!name.trim()}>Add</button>
            </div>
          </div>
        )}
        {people.map((p) => (
          <Link key={p.id} to={`/people/${p.id}`} className="item card-link">
            <div className="item-title">{p.name}</div>
            <div className="item-meta">{p.role}</div>
          </Link>
        ))}
        {people.length === 0 && !adding && <p className="faint">No one here yet. Add the people in your circle whenever you like.</p>}
      </div>
    </Shell>
  )
}

export function PersonDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const person = useLiveQuery(() => (id ? db.people.get(id) : undefined), [id])
  const events = useLiveQuery(() => (id ? db.reciprocity.where('personId').equals(id).reverse().sortBy('date') : []), [id]) ?? []
  const checkIns = useLiveQuery(() => (id ? db.checkIns.where('personId').equals(id).reverse().sortBy('createdAt') : []), [id]) ?? []
  const [range, setRange] = useState<30 | 90 | 365>(90)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<ReciprocityType | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [flash, setFlash] = useState('')

  const balance = useMemo(() => {
    const since = daysAgo(range)
    const recent = events.filter((e) => e.date >= since)
    const count = (side: 'them' | 'me', tone?: 'warm' | 'neutral') =>
      recent.filter((e) => RECIPROCITY.find((r) => r.type === e.type)?.side === side && (!tone || RECIPROCITY.find((r) => r.type === e.type)?.tone === tone)).length
    const them = count('them', 'warm'), me = count('me'), dropped = count('them', 'neutral')
    const max = Math.max(1, them, me, dropped)
    return { them, me, dropped, max, total: recent.length }
  }, [events, range])

  if (!person) return <Shell back="/people"><p className="faint">Loading…</p></Shell>

  const log = async (type: ReciprocityType) => {
    await db.reciprocity.add({ id: newId(), personId: person.id, type, note: note.trim(), date: now() })
    setNote(''); setPending(null)
    setFlash('Noted. That\'s all it needs to be.')
    setTimeout(() => setFlash(''), 2500)
  }

  return (
    <Shell back="/people" title={person.name} subtitle={person.role}>
      <div className="stack-lg">
        <section className="card">
          <h3>Quick log</h3>
          <p className="help">{FRAMING}</p>
          <div className="chips">
            {RECIPROCITY.map((r) => (
              <button key={r.type} type="button" className={`chip ${r.side === 'them' ? 'chip-sage' : ''}`} aria-pressed={pending === r.type} onClick={() => (pending === r.type ? log(r.type) : setPending(r.type))}>{r.label}</button>
            ))}
          </div>
          {pending && (
            <div className="stack mt">
              <input className="input" value={note} placeholder="A note (optional)" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && log(pending)} aria-label="Note" />
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => log(pending)}>Log "{RECIPROCITY_LABEL[pending]}"</button>
              </div>
            </div>
          )}
          {flash && <p className="faint mt" aria-live="polite">{flash}</p>}
        </section>

        <section className="card-soft">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Over time</h3>
            <div className="row" style={{ gap: 4 }}>
              {([30, 90, 365] as const).map((r) => <button key={r} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={range === r} onClick={() => setRange(r)}>{r === 365 ? 'Year' : `${r}d`}</button>)}
            </div>
          </div>
          <p className="help">Not a score. Just a picture, so you can see the whole shape and not only the latest moment.</p>
          <div className="balance mt">
            <div className="balance-row"><span>They</span><div className="bar bar-them"><span style={{ width: `${(balance.them / balance.max) * 100}%` }} /></div><span>{balance.them}</span></div>
            <div className="balance-row"><span>Me</span><div className="bar bar-me"><span style={{ width: `${(balance.me / balance.max) * 100}%` }} /></div><span>{balance.me}</span></div>
            <div className="balance-row"><span>Dropped</span><div className="bar bar-drop"><span style={{ width: `${(balance.dropped / balance.max) * 100}%` }} /></div><span>{balance.dropped}</span></div>
          </div>
          {balance.total === 0 && <p className="faint mt">Nothing logged in this window yet.</p>}
        </section>

        <section className="card">
          <div className="row-between"><h3 style={{ margin: 0 }}>About {person.name}</h3><button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button></div>
          {editing ? (
            <div className="stack mt">
              <input className="input" value={person.name} onChange={(e) => db.people.update(person.id, { name: e.target.value })} aria-label="Name" />
              <input className="input" list="roles" value={person.role} placeholder="Role in my life" onChange={(e) => db.people.update(person.id, { role: e.target.value })} aria-label="Role in my life" />
              <datalist id="roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
              <textarea className="textarea" value={person.notes} placeholder="Notes: what I know about their capacity, patterns, what they're carrying…" onChange={(e) => db.people.update(person.id, { notes: e.target.value })} aria-label="Notes" />
              <p className="help">Roles can change. Adjusting closeness is allowed.</p>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>Remove {person.name} from my circle</button>
            </div>
          ) : (
            <p className="muted mt" style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{person.notes || 'No notes yet.'}</p>
          )}
        </section>

        {checkIns.length > 0 && (
          <section>
            <h3>Check-ins linked to {person.name}</h3>
            <div className="list">
              {checkIns.slice(0, 5).map((c) => (
                <Link key={c.id} to={`/history?person=${person.id}`} className="item card-link">
                  <div className="small">{c.fact || c.story.join(' · ') || 'Check-in'}</div>
                  <div className="item-meta">{fmtDateTime(c.createdAt)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3>Recent</h3>
          <div className="list">
            {events.slice(0, 20).map((e) => (
              <div key={e.id} className="item row-between">
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{RECIPROCITY_LABEL[e.type]}</div>
                  {e.note && <div className="small muted">{e.note}</div>}
                  <div className="item-meta">{fmtDateTime(e.date)}</div>
                </div>
                <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove this entry" onClick={() => db.reciprocity.delete(e.id)}>✕</button>
              </div>
            ))}
            {events.length === 0 && <p className="faint">Nothing logged yet.</p>}
          </div>
        </section>
      </div>
      <Confirm open={confirmDelete} title={`Remove ${person.name}?`} body="Their log entries will be removed too. Linked check-ins stay." confirmLabel="Remove" onCancel={() => setConfirmDelete(false)} onConfirm={async () => { await db.reciprocity.where('personId').equals(person.id).delete(); await db.people.delete(person.id); nav('/people') }} />
    </Shell>
  )
}
