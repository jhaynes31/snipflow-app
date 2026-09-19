import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Stepper } from '@/components/Stepper'
import { Avatar } from '@/pages/Circles'
import { db, newId, now } from '@/db/db'
import { RELEASED, UNSURE, type ReviewAnswer } from '@/db/types'
import { REVIEW_OPTIONS } from '@/data/circles'
import { placementName, summarizeReciprocity, useRings } from '@/lib/circles'
import { updateSettings } from '@/lib/settings'

export function CircleReview() {
  const nav = useNavigate()
  const rings = useRings()
  const data = useLiveQuery(async () => {
    const [people, events, flags] = await Promise.all([db.people.toArray(), db.reciprocity.toArray(), db.redFlags.where('status').equals('open').toArray()])
    return { people: people.filter((p) => p.ringId !== RELEASED && p.ringId !== UNSURE), events, flags }
  }, [])
  const [i, setI] = useState(0)
  const [results, setResults] = useState<{ personId: string; answer: ReviewAnswer }[]>([])
  const [done, setDone] = useState(false)

  const ordered = useMemo(() => {
    if (!data) return []
    const score = (id: string) => (data.flags.some((f) => f.personId === id) ? 2 : 0) + (summarizeReciprocity(data.events.filter((e) => e.personId === id)).oneSided ? 1 : 0)
    return [...data.people].sort((a, b) => score(b.id) - score(a.id))
  }, [data])

  if (!data) return <Shell back="/circles"><p className="faint">Loading…</p></Shell>

  const finish = async (final: typeof results) => {
    await db.reviewSessions.add({ id: newId(), date: now(), results: final })
    await updateSettings({ circleReviewLastAt: now(), circleReviewSnoozedUntil: undefined })
    setDone(true)
  }
  const answer = async (a: ReviewAnswer) => {
    const next = [...results, { personId: ordered[i].id, answer: a }]
    setResults(next)
    if (i + 1 < ordered.length) setI(i + 1)
    else await finish(next)
  }

  if (ordered.length === 0) return <Shell back="/circles" title="Nothing to review yet." subtitle="Add a few people to your circles first."><Link to="/circles/add" className="btn btn-primary">Add a person</Link></Shell>

  if (done) {
    const closer = results.filter((r) => r.answer === 'closer'), out = results.filter((r) => r.answer === 'out'), unsure = results.filter((r) => r.answer === 'unsure')
    const name = (id: string) => ordered.find((p) => p.id === id)?.name ?? ''
    return (
      <Shell back="/circles" hideNav title="That's the whole circle." subtitle="Nothing moved yet. These are just the ones you paused on.">
        <div className="stack">
          {closer.length > 0 && <div className="card-sage"><strong>Maybe closer</strong>{closer.map((r) => <div key={r.personId} className="row-between small"><span>{name(r.personId)}</span><Link to={`/circles/move/${r.personId}`} className="btn btn-sm btn-ghost">Move review</Link></div>)}</div>}
          {out.length > 0 && <div className="card-soft"><strong>Maybe out</strong>{out.map((r) => <div key={r.personId} className="row-between small"><span>{name(r.personId)}</span><Link to={`/circles/move/${r.personId}`} className="btn btn-sm btn-ghost">Move review</Link></div>)}</div>}
          {unsure.length > 0 && <div className="card-gold"><strong>Not sure</strong>{unsure.map((r) => <div key={r.personId} className="row-between small"><span>{name(r.personId)}</span><Link to={`/people/${r.personId}`} className="btn btn-sm btn-ghost">Open</Link></div>)}</div>}
          {closer.length + out.length + unsure.length === 0 && <p className="muted">Everyone feels right where they are. That's worth noticing too.</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={() => nav('/circles')}>Back to circles</button>
        </div>
      </Shell>
    )
  }

  const p = ordered[i]
  return (
    <Shell back="/circles" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => finish(results)}>Stop here</button>}>
      <Stepper step={i} total={ordered.length} />
      <div className="stack-lg center" style={{ paddingTop: 16 }}>
        <Avatar person={p} size={72} />
        <p className="question">Does {p.name} still feel right in {placementName(p.ringId, rings)}?</p>
        {data.flags.some((f) => f.personId === p.id) && <p className="help">There's an open watch note on {p.name}.</p>}
        <div className="stack">
          {REVIEW_OPTIONS.map((o) => <button key={o.id} type="button" className={`btn btn-lg ${o.id === 'yes' ? 'btn-sage' : ''}`} onClick={() => answer(o.id)}>{o.label}</button>)}
        </div>
        <p className="faint">{i + 1} of {ordered.length}. Never mandatory. Stop whenever you like.</p>
      </div>
    </Shell>
  )
}
