import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Confirm } from '@/components/Confirm'
import { Avatar } from '@/pages/Circles'
import { db, newId, now } from '@/db/db'
import { RELEASED, UNSURE, type DisclosureOutcome, type ReciprocityType } from '@/db/types'
import { RECIPROCITY, RECIPROCITY_LABEL, ROLES } from '@/data/options'
import { DISCLOSURE_OUTCOMES, PERSON_COLORS, PERSON_EMOJIS, RELATIONSHIP_TYPES, TRUST_SIGNALS } from '@/data/circles'
import flagPatterns from '@/data/flagPatterns.json'
import type { FlagPattern } from '@/db/types'
import { fmtDate, fmtDateTime } from '@/lib/dates'
import { placementName, timeKnown, usePersonSignals, useRings } from '@/lib/circles'

const FRAMING = "This isn't scorekeeping. It's so one hard night doesn't rewrite the whole story."
const PATTERNS = flagPatterns as FlagPattern[]

/** The old people list now lives inside Circles. */
export function PeopleList() {
  const nav = useNavigate()
  useEffect(() => { nav('/circles?tab=list', { replace: true }) }, [nav])
  return null
}

export function PersonDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const rings = useRings()
  const person = useLiveQuery(() => (id ? db.people.get(id) : undefined), [id])
  const sig = usePersonSignals(id)
  const checkIns = useLiveQuery(() => (id ? db.checkIns.where('personId').equals(id).reverse().sortBy('createdAt') : []), [id]) ?? []
  const releases = useLiveQuery(() => (id ? db.releases.where('personId').equals(id).reverse().sortBy('createdAt') : []), [id]) ?? []
  const boundaries = useLiveQuery(() => (id ? db.layerBoundaries.where('personId').equals(id).toArray() : []), [id]) ?? []
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<ReciprocityType | null>(null)
  const [signalPick, setSignalPick] = useState<string | null>(null)
  const [signalNote, setSignalNote] = useState('')
  const [shareText, setShareText] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [flash, setFlash] = useState('')
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(''), 2500) }

  const ring = useMemo(() => rings.find((r) => r.id === person?.ringId), [rings, person?.ringId])
  if (!person || !sig) return <Shell back="/circles"><p className="faint">Loading…</p></Shell>
  const { events, signals, flags, openFlags, disclosures, moves, reciprocity } = sig
  const known = timeKnown(person)

  const log = async (type: ReciprocityType) => {
    await db.reciprocity.add({ id: newId(), personId: person.id, type, note: note.trim(), date: now() })
    setNote(''); setPending(null); say("Noted. That's all it needs to be.")
  }
  const logSignal = async () => {
    if (!signalPick) return
    await db.trustSignals.add({ id: newId(), personId: person.id, type: signalPick, note: signalNote.trim(), date: now() })
    setSignalPick(null); setSignalNote(''); say('Green flag noted. Trust grows in small steps.')
  }
  const logShare = async () => {
    if (!shareText.trim()) return
    await db.disclosures.add({ id: newId(), personId: person.id, whatShared: shareText.trim(), dateShared: now() })
    setShareText(''); say('Logged. Check back later on how it was handled.')
  }
  const setOutcome = (did: string, outcome: DisclosureOutcome) => db.disclosures.update(did, { outcome, outcomeDate: now() })
  const boundaryCrossed = () => nav(`/people/${person.id}/flag?pattern=boundary-testing`)
  const patternName = (pid: string) => PATTERNS.find((p) => p.id === pid)?.name ?? pid
  const max = Math.max(1, reciprocity.them, reciprocity.me, reciprocity.dropped)

  return (
    <Shell back="/circles" hideNav={false} action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button>}>
      <div className="stack-lg">
        <header className="row">
          <Avatar person={person} size={56} />
          <div>
            <h1 style={{ marginBottom: 2 }}>{person.name}</h1>
            <div className="muted">{person.role}{person.relationshipType && person.relationshipType !== person.role ? ` · ${person.relationshipType}` : ''}</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <span className="chip chip-sm on"><span className="ring-swatch" style={{ background: ring?.color ?? 'var(--line)', marginRight: 6 }} />{placementName(person.ringId, rings)}</span>
              {known && <span className="chip chip-sm">Known {known}</span>}
            </div>
          </div>
        </header>

        {editing && (
          <section className="card stack">
            <input className="input" value={person.name} onChange={(e) => db.people.update(person.id, { name: e.target.value })} aria-label="Name" />
            <input className="input" list="roles" value={person.role} placeholder="Who they are to me" onChange={(e) => db.people.update(person.id, { role: e.target.value })} aria-label="Who they are to me" />
            <datalist id="roles">{[...ROLES, ...RELATIONSHIP_TYPES].map((r) => <option key={r} value={r} />)}</datalist>
            <div className="chips">{RELATIONSHIP_TYPES.map((t) => <button key={t} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={person.relationshipType === t} onClick={() => db.people.update(person.id, { relationshipType: t })}>{t}</button>)}</div>
            <div className="chips">{PERSON_EMOJIS.map((e) => <button key={e} type="button" className="chip" aria-pressed={person.emoji === e} onClick={() => db.people.update(person.id, { emoji: person.emoji === e ? undefined : e })}>{e}</button>)}</div>
            <div className="row">{PERSON_COLORS.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} className="color-dot" style={{ background: c, outline: person.color === c ? '3px solid var(--text)' : 'none' }} onClick={() => db.people.update(person.id, { color: c })} />)}</div>
            <div className="field"><label className="label" htmlFor="met">When we met</label><input id="met" className="input" type="date" value={person.metDate ?? ''} onChange={(e) => db.people.update(person.id, { metDate: e.target.value || undefined })} /></div>
            <textarea className="textarea" value={person.notes} placeholder="Private notes: what I know about their capacity, patterns, what they're carrying…" onChange={(e) => db.people.update(person.id, { notes: e.target.value })} aria-label="Notes" />
            <p className="help">Roles can change. Adjusting closeness is allowed.</p>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>Delete {person.name} entirely</button>
          </section>
        )}

        <section className="chips" aria-label="Quick actions">
          <button type="button" className="chip chip-sage" onClick={() => setSignalPick(signalPick ? null : TRUST_SIGNALS[0])}>+ Green flag</button>
          <Link to={`/people/${person.id}/flag`} className="chip">+ Red flag</Link>
          <button type="button" className="chip" onClick={() => setPending(pending ? null : 'they-initiated')}>+ Reciprocity</button>
          <button type="button" className="chip" onClick={boundaryCrossed}>Boundary crossed</button>
          <Link to={`/circles/move/${person.id}`} className="chip">Move review</Link>
          <Link to={`/pace/${person.id}`} className="chip">{person.pace ? 'Pace' : 'Set a pace'}</Link>
          <Link to="/boundaries/new" className="chip">Draft a message</Link>
        </section>
        {flash && <p className="faint" aria-live="polite" style={{ margin: 0 }}>{flash}</p>}

        {signalPick && (
          <section className="card-sage stack">
            <h3>What did they show?</h3>
            <div className="chips">{TRUST_SIGNALS.map((s) => <button key={s} type="button" className="chip chip-sage" aria-pressed={signalPick === s} onClick={() => setSignalPick(s)}>{s}</button>)}</div>
            <input className="input" value={signalNote} placeholder="A note (optional)" onChange={(e) => setSignalNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && logSignal()} aria-label="Note" />
            <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setSignalPick(null)}>Cancel</button><button type="button" className="btn btn-sage" onClick={logSignal}>Log it</button></div>
          </section>
        )}

        {pending && (
          <section className="card stack">
            <h3>Quick log</h3>
            <p className="help">{FRAMING}</p>
            <div className="chips">{RECIPROCITY.map((r) => <button key={r.type} type="button" className={`chip ${r.side === 'them' ? 'chip-sage' : ''}`} aria-pressed={pending === r.type} onClick={() => setPending(r.type)}>{r.label}</button>)}</div>
            <input className="input" value={note} placeholder="A note (optional)" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && log(pending)} aria-label="Note" />
            <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => log(pending)}>Log "{RECIPROCITY_LABEL[pending]}"</button></div>
          </section>
        )}

        {person.pace && (
          <section className="card-gold">
            <strong>Pace:</strong> not closer before {fmtDate(person.pace.notBefore)}.{person.pace.disclosureHold.length ? ` Holding back ${person.pace.disclosureHold.length} things for now.` : ''} <Link to={`/pace/${person.id}`}>What they've shown</Link>
          </section>
        )}
        {openFlags.length > 0 && (
          <section className="notice">
            <strong>{openFlags.length} open watch note{openFlags.length > 1 ? 's' : ''}.</strong> {openFlags.map((f) => patternName(f.patternId)).join(', ')}. Watch for repetition, not for proof.
          </section>
        )}

        <section className="card-soft">
          <div className="row-between"><h3 style={{ margin: 0 }}>Reciprocity, last 90 days</h3><span className="faint">{reciprocity.total} logged</span></div>
          <div className="balance mt">
            <div className="balance-row"><span>They</span><div className="bar bar-them"><span style={{ width: `${(reciprocity.them / max) * 100}%` }} /></div><span>{reciprocity.them}</span></div>
            <div className="balance-row"><span>Me</span><div className="bar bar-me"><span style={{ width: `${(reciprocity.me / max) * 100}%` }} /></div><span>{reciprocity.me}</span></div>
            <div className="balance-row"><span>Dropped</span><div className="bar bar-drop"><span style={{ width: `${(reciprocity.dropped / max) * 100}%` }} /></div><span>{reciprocity.dropped}</span></div>
          </div>
          {reciprocity.oneSided && <p className="help mt">Mostly one-sided lately. Not a verdict, just a pattern worth noticing.</p>}
          <p className="help mt" style={{ marginBottom: 0 }}>{FRAMING}</p>
        </section>

        {ring && (
          <details className="acc">
            <summary><span>What {ring.name} gets from me</span><span className="faint">{ring.access.length} items</span></summary>
            <div className="acc-body stack">
              {ring.access.length ? <div className="chips">{ring.access.map((a) => <span key={a} className="chip chip-sm">{a}</span>)}</div> : <p className="faint">Public-facing me only.</p>}
              {boundaries.length > 0 && <><div className="label">Custom boundaries for {person.name}</div>{boundaries.map((b) => <div key={b.id} className="item small"><strong>{b.text}</strong>{b.why && <div className="muted">{b.why}</div>}</div>)}</>}
              <Link to={`/circles/boundaries?person=${person.id}`} className="btn btn-sm btn-ghost">Boundaries for {person.name}</Link>
            </div>
          </details>
        )}

        <details className="acc">
          <summary><span>Green flags</span><span className="faint">{signals.length}</span></summary>
          <div className="acc-body list">
            {signals.map((s) => <div key={s.id} className="item row-between"><div><div className="small" style={{ fontWeight: 700 }}>{s.type}</div>{s.note && <div className="small muted">{s.note}</div>}<div className="item-meta">{fmtDateTime(s.date)}</div></div><button type="button" className="btn btn-quiet btn-sm" aria-label="Remove" onClick={() => db.trustSignals.delete(s.id)}>✕</button></div>)}
            {signals.length === 0 && <p className="faint">None logged yet. Small things count: a kept promise, a remembered detail.</p>}
          </div>
        </details>

        <details className="acc" open={openFlags.length > 0}>
          <summary><span>Red flags and watch notes</span><span className="faint">{openFlags.length} open · {flags.length - openFlags.length} resolved</span></summary>
          <div className="acc-body list">
            <p className="help" style={{ margin: 0 }}>Noticing a pattern isn't the same as labeling someone. Watch for repetition.</p>
            {flags.map((f) => <FlagRow key={f.id} f={f} name={patternName(f.patternId)} />)}
            <Link to={`/people/${person.id}/flag`} className="btn btn-sm btn-ghost">Log a red flag</Link>
          </div>
        </details>

        <details className="acc">
          <summary><span>What I've shared</span><span className="faint">{disclosures.length}</span></summary>
          <div className="acc-body stack">
            <p className="help" style={{ margin: 0 }}>Share a little, watch how it's handled, then share a little more.</p>
            <div className="row"><input className="input grow" value={shareText} placeholder="I shared something small with them…" onChange={(e) => setShareText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && logShare()} aria-label="What I shared" /><button type="button" className="btn btn-sm btn-primary" onClick={logShare} disabled={!shareText.trim()}>Log</button></div>
            {disclosures.map((d) => (
              <div key={d.id} className="item">
                <div className="small" style={{ fontWeight: 700 }}>{d.whatShared}</div>
                <div className="item-meta">Shared {fmtDate(d.dateShared)}{d.outcome ? ` · ${DISCLOSURE_OUTCOMES.find((o) => o.id === d.outcome)?.label}` : ''}</div>
                {!d.outcome && <div className="chips mt" style={{ gap: 6 }}><span className="faint small">How was it handled?</span>{DISCLOSURE_OUTCOMES.map((o) => <button key={o.id} type="button" className={`chip chip-sm ${o.tone === 'good' ? 'chip-sage' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setOutcome(d.id, o.id)}>{o.label}</button>)}</div>}
              </div>
            ))}
          </div>
        </details>

        <details className="acc">
          <summary><span>Moves</span><span className="faint">{moves.length}</span></summary>
          <div className="acc-body list">
            {moves.map((m) => <div key={m.id} className="item"><div className="small" style={{ fontWeight: 700 }}>{placementName(m.fromRingId, rings)} → {placementName(m.toRingId, rings)}</div>{m.reason && <div className="small muted">{m.reason}</div>}<div className="item-meta">{fmtDate(m.date)}</div></div>)}
            {moves.length === 0 && <p className="faint">No moves yet.</p>}
          </div>
        </details>

        {(checkIns.length > 0 || releases.length > 0) && (
          <details className="acc">
            <summary><span>Linked entries</span><span className="faint">{checkIns.length + releases.length}</span></summary>
            <div className="acc-body list">
              {checkIns.map((c) => <Link key={c.id} to={`/history?person=${person.id}&kind=check-in`} className="item card-link"><div className="small">Fact vs. Story: {c.fact || c.story.join(' · ') || 'check-in'}</div><div className="item-meta">{fmtDateTime(c.createdAt)}</div></Link>)}
              {releases.map((r) => <Link key={r.id} to={`/history?person=${person.id}&kind=release`} className="item card-link"><div className="small">Release: {r.releasing || r.hurts}</div><div className="item-meta">{fmtDateTime(r.createdAt)}</div></Link>)}
            </div>
          </details>
        )}

        {!editing && person.notes && <section className="card"><h3>Notes</h3><p className="muted" style={{ whiteSpace: 'pre-line', margin: 0 }}>{person.notes}</p></section>}

        <details className="acc">
          <summary><span>Recent reciprocity</span><span className="faint">{events.length}</span></summary>
          <div className="acc-body list">
            {[...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((e) => <div key={e.id} className="item row-between"><div><div className="small" style={{ fontWeight: 700 }}>{RECIPROCITY_LABEL[e.type]}</div>{e.note && <div className="small muted">{e.note}</div>}<div className="item-meta">{fmtDateTime(e.date)}</div></div><button type="button" className="btn btn-quiet btn-sm" aria-label="Remove this entry" onClick={() => db.reciprocity.delete(e.id)}>✕</button></div>)}
            {events.length === 0 && <p className="faint">Nothing logged yet.</p>}
          </div>
        </details>
      </div>
      <Confirm open={confirmDelete} title={`Delete ${person.name}?`} body="This removes them and their logs entirely. If you just need distance, a move review to Released keeps the history." confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={async () => {
        await Promise.all([db.reciprocity, db.trustSignals, db.redFlags, db.disclosures, db.ringMoves, db.layerBoundaries].map((t) => t.where('personId').equals(person.id).delete()))
        await db.people.delete(person.id); nav('/circles')
      }} />
      <span className="sr-only">{UNSURE}{RELEASED}</span>
    </Shell>
  )
}

function FlagRow({ f, name }: { f: { id: string; note: string; date: string; status: 'open' | 'resolved'; resolutionNote?: string }; name: string }) {
  const [resolving, setResolving] = useState(false)
  const [text, setText] = useState('')
  return (
    <div className={`item ${f.status === 'open' ? 'flag-open' : 'flag-resolved'}`}>
      <div className="row-between">
        <div><div className="small" style={{ fontWeight: 700 }}>{name}</div>{f.note && <div className="small muted">{f.note}</div>}<div className="item-meta">{fmtDate(f.date)}{f.status === 'resolved' ? ` · resolved${f.resolutionNote ? `: ${f.resolutionNote}` : ''}` : ''}</div></div>
        {f.status === 'open' ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => setResolving((v) => !v)}>Resolve</button> : <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove" onClick={() => db.redFlags.delete(f.id)}>✕</button>}
      </div>
      {resolving && <div className="row mt"><input className="input grow" value={text} placeholder="How? e.g. talked it through, behavior changed" onChange={(e) => setText(e.target.value)} aria-label="Resolution note" /><button type="button" className="btn btn-sm btn-sage" onClick={async () => { await db.redFlags.update(f.id, { status: 'resolved', resolutionNote: text.trim() }); setResolving(false) }}>Mark resolved</button></div>}
    </div>
  )
}
