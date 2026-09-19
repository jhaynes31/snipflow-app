import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Confirm } from '@/components/Confirm'
import { db } from '@/db/db'
import type { Tag } from '@/db/types'
import { TAGS } from '@/data/tags'
import { RECIPROCITY_LABEL, WIN_LABEL } from '@/data/options'
import { fmtDateTime } from '@/lib/dates'
import { placementName } from '@/lib/circles'
import flagPatterns from '@/data/flagPatterns.json'
import type { FlagPattern } from '@/db/types'

const PATTERNS = flagPatterns as FlagPattern[]

type Kind = 'check-in' | 'pause' | 'release' | 'boundary' | 'win' | 'reciprocity' | 'circle' | 'loop' | 'fawn' | 'comfort' | 'daily' | 'pace' | 'personal'
interface Row { id: string; kind: Kind; table: string; title: string; body?: string; at: string; personId?: string; tags?: Tag[]; link?: string; detail?: [string, string][] }

const KIND_LABEL: Record<Kind, string> = { 'check-in': 'Fact vs. Story', pause: 'Pause', release: 'Release', boundary: 'Boundary', win: 'Win', reciprocity: 'People log', circle: 'Circles', loop: 'Unhooked', fawn: 'Fawn', comfort: 'Comfort', daily: 'Daily', pace: 'Pacing', personal: 'Personal' }
const METHOD_LABEL: Record<string, string> = { breathing: 'Breathing', senses: '5-4-3-2-1', feelings: 'Named feelings', truth: 'Held a truth' }

export function History() {
  const [params, setParams] = useSearchParams()
  const kind = (params.get('kind') as Kind | null) ?? null
  const person = params.get('person') ?? ''
  const tag = (params.get('tag') as Tag | null) ?? null
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [toDelete, setToDelete] = useState<Row | null>(null)
  const people = useLiveQuery(() => db.people.toArray(), []) ?? []
  const nameOf = (id?: string) => people.find((p) => p.id === id)?.name

  const rows = useLiveQuery(async () => {
    const [c, p, r, b, w, e, moves, sigs, flags, rings] = await Promise.all([
      db.checkIns.toArray(), db.pauses.toArray(), db.releases.toArray(), db.boundaries.toArray(), db.wins.toArray(), db.reciprocity.toArray(),
      db.ringMoves.toArray(), db.trustSignals.toArray(), db.redFlags.toArray(), db.rings.toArray(),
    ])
    const [loops, exposures, steps, fawns, comforts, dailies] = await Promise.all([db.loopEpisodes.toArray(), db.exposureSessions.toArray(), db.exposureSteps.toArray(), db.fawnMoments.toArray(), db.comforts.toArray(), db.daily.toArray()])
    const [favors, paceChecks, personals] = await Promise.all([db.favors.toArray(), db.paceChecks.toArray(), db.personalMoments.toArray()])
    const ringName = (id: string) => placementName(id, rings)
    const out: Row[] = [
      ...c.map((x): Row => ({ id: x.id, kind: 'check-in', table: 'checkIns', title: x.fact || x.story[0] || 'Check-in', at: x.createdAt, personId: x.personId, tags: x.tags, detail: [['Story', x.story.join(' · ')], ['Felt in', x.bodyAreas.join(', ')], ['Could be', x.alternatives.join(' · ')], ['Mine', x.mine], ['Theirs', x.theirs], ['Truth', x.truthText ?? '']] })),
      ...p.map((x): Row => ({ id: x.id, kind: 'pause', table: 'pauses', title: METHOD_LABEL[x.method] ?? x.method, body: x.feelings.join(', '), at: x.createdAt })),
      ...r.map((x): Row => ({ id: x.id, kind: 'release', table: 'releases', title: x.releasing || x.hurts || 'Release entry', at: x.createdAt, link: '/release', detail: [['Hurts', x.hurts], ['To God', x.toGod], ['Mine', x.mine], ['Theirs', x.theirs], ['Releasing', x.releasing], ['Prayer', x.prayer]] })),
      ...b.map((x): Row => ({ id: x.id, kind: 'boundary', table: 'boundaries', title: x.title || 'Boundary draft', body: x.body.slice(0, 140), at: x.updatedAt, link: `/boundaries/${x.id}` })),
      ...w.map((x): Row => ({ id: x.id, kind: 'win', table: 'wins', title: WIN_LABEL[x.type], body: x.note, at: x.createdAt })),
      ...e.map((x): Row => ({ id: x.id, kind: 'reciprocity', table: 'reciprocity', title: RECIPROCITY_LABEL[x.type], body: x.note, at: x.date, personId: x.personId, link: `/people/${x.personId}` })),
      ...moves.map((x): Row => ({ id: x.id, kind: 'circle', table: 'ringMoves', title: `Moved: ${ringName(x.fromRingId)} → ${ringName(x.toRingId)}`, body: x.reason, at: x.date, personId: x.personId, link: `/people/${x.personId}` })),
      ...sigs.map((x): Row => ({ id: x.id, kind: 'circle', table: 'trustSignals', title: `Green flag: ${x.type}`, body: x.note, at: x.date, personId: x.personId, link: `/people/${x.personId}` })),
      ...loops.map((x): Row => ({ id: x.id, kind: 'loop', table: 'loopEpisodes', title: `Loop: ${x.theme || x.triggerTags[0] || 'stepped out'}`, body: [x.toolsUsed.join(', '), x.urgeStart !== undefined ? `urge ${x.urgeStart}→${x.urgeEnd ?? '?'}` : '', x.note].filter(Boolean).join(' · '), at: x.createdAt, link: '/unhooked/map' })),
      ...exposures.map((x): Row => ({ id: x.id, kind: 'loop', table: 'exposureSessions', title: `Exposure: ${steps.find((st) => st.id === x.stepId)?.description ?? 'a rung'}`, body: `distress ${x.distressBefore} → peak ${x.distressPeak} → ${x.distressAfter}${x.note ? ` · ${x.note}` : ''}`, at: x.createdAt, link: '/unhooked/ladder' })),
      ...fawns.map((x): Row => ({ id: x.id, kind: 'fawn', table: 'fawnMoments', title: x.situation || x.kind, body: [x.want && `Wanted: ${x.want}`, x.honest && `Said: ${x.honest}`, x.outcome && `Outcome: ${x.outcome}`].filter(Boolean).join(' · '), at: x.createdAt, personId: x.personId })),
      ...comforts.map((x): Row => ({ id: x.id, kind: 'comfort', table: 'comforts', title: x.kind === 'low' ? 'A low day' : 'Came for comfort', body: x.flashback ? `Named a flashback: ${x.signs.join(', ')}` : '', at: x.createdAt })),
      ...dailies.map((x): Row => ({ id: x.id, kind: 'daily', table: 'daily', title: x.kind === 'morning' ? 'Morning' : 'Evening', body: Object.entries(x.answers).filter(([, v]) => (Array.isArray(v) ? v.length : v)).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · '), at: x.createdAt })),
      ...favors.map((x): Row => ({ id: x.id, kind: 'pace', table: 'favors', title: `Asked: ${x.asked}`, body: `${x.saidYes ? 'Said yes' : 'Said no'}${x.theyGave ? ` · they gave: ${x.theyGave}` : ''}`, at: x.date, personId: x.personId, link: `/pace/${x.personId}` })),
      ...paceChecks.map((x): Row => ({ id: x.id, kind: 'pace', table: 'paceChecks', title: x.kind === 'halo' ? 'Halo check' : x.kind === 'used' ? 'Am I being used?' : 'Pace check-in', body: x.verdict, at: x.createdAt, personId: x.personId, link: `/pace/${x.personId}` })),
      ...personals.map((x): Row => ({ id: x.id, kind: 'personal', table: 'personalMoments', title: x.fact || x.meanings[0] || 'Took something personally', body: [x.meanings.length && `Story: ${x.meanings.join(', ')}`, x.theirLens.length && `Their side: ${x.theirLens.join(', ')}`, `Slice ${x.sliceBefore}% → ${x.sliceAfter}%`, x.action && `Mine to do: ${x.action}`].filter(Boolean).join(' · '), at: x.createdAt, personId: x.personId })),
      ...flags.map((x): Row => ({ id: x.id, kind: 'circle', table: 'redFlags', title: `Watch note: ${PATTERNS.find((p) => p.id === x.patternId)?.name ?? x.patternId}${x.status === 'resolved' ? ' (resolved)' : ''}`, body: x.note, at: x.date, personId: x.personId, link: `/people/${x.personId}` })),
    ]
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, []) ?? []

  const filtered = useMemo(() => rows.filter((r) =>
    (!kind || r.kind === kind) && (!person || r.personId === person) && (!tag || r.tags?.includes(tag)) &&
    (!from || r.at >= new Date(from).toISOString()) && (!to || r.at <= new Date(`${to}T23:59:59`).toISOString()),
  ), [rows, kind, person, tag, from, to])

  const set = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }) }

  return (
    <Shell title="History" subtitle="Everything you've written down, in one place. Nothing here is a report card.">
      <div className="stack">
        <div className="chips">
          <button type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={!kind} onClick={() => set('kind', '')}>All</button>
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <button key={k} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={kind === k} onClick={() => set('kind', kind === k ? '' : k)}>{KIND_LABEL[k]}</button>)}
        </div>
        <div className="row">
          <select className="select grow" style={{ width: 'auto', minHeight: 44 }} value={person} onChange={(e) => set('person', e.target.value)} aria-label="Filter by person">
            <option value="">Anyone</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select grow" style={{ width: 'auto', minHeight: 44 }} value={tag ?? ''} onChange={(e) => set('tag', e.target.value)} aria-label="Filter by tag">
            <option value="">Any situation</option>{TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="row">
          <input className="input grow" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" style={{ minHeight: 44 }} />
          <span className="faint">to</span>
          <input className="input grow" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" style={{ minHeight: 44 }} />
        </div>
        <div className="list">
          {filtered.map((r) => (
            <details key={`${r.kind}-${r.id}`} className="acc">
              <summary>
                <span><span className="chip chip-sm" style={{ marginRight: 8 }}>{KIND_LABEL[r.kind]}</span>{r.title}</span>
                <span className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.at)}</span>
              </summary>
              <div className="acc-body stack">
                {r.body && <p className="muted" style={{ margin: 0, whiteSpace: 'pre-line' }}>{r.body}</p>}
                {r.detail && <dl className="kv">{r.detail.filter(([, v]) => v).map(([k, v]) => <ItemRow key={k} label={k} value={v} />)}</dl>}
                {r.personId && nameOf(r.personId) && <div className="faint">With: <Link to={`/people/${r.personId}`}>{nameOf(r.personId)}</Link></div>}
                {r.tags && r.tags.length > 0 && <div className="chips">{r.tags.map((t) => <span key={t} className="chip chip-sm">{t}</span>)}</div>}
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {r.link && <Link to={r.link} className="btn btn-quiet btn-sm">Open</Link>}
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setToDelete(r)}>Remove</button>
                </div>
              </div>
            </details>
          ))}
          {filtered.length === 0 && <p className="faint">Nothing matches those filters yet.</p>}
        </div>
      </div>
      <Confirm open={!!toDelete} title="Remove this entry?" body="This can't be undone." confirmLabel="Remove" onCancel={() => setToDelete(null)} onConfirm={async () => { if (toDelete) await db.table(toDelete.table).delete(toDelete.id); setToDelete(null) }} />
    </Shell>
  )
}

function ItemRow({ label, value }: { label: string; value: string }) {
  return (<><dt>{label}</dt><dd style={{ whiteSpace: 'pre-line' }}>{value}</dd></>)
}
