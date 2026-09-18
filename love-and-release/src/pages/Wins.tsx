import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { db, newId, now } from '@/db/db'
import type { WinType } from '@/db/types'
import { FREEDOM_TYPES, FREEDOM_WINS, WINS, WIN_LABEL } from '@/data/options'
import { Link } from 'react-router-dom'
import { getCurrentThread } from '@/lib/threads'
import { fmtDateTime } from '@/lib/dates'

export function Wins() {
  const [params, setParams] = useSearchParams()
  const [types, setTypes] = useState<WinType[]>(params.get('add') ? [params.get('add') as WinType] : [])
  const toggle = (t: WinType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [view, setView] = useState<'log' | 'far'>('log')
  const wins = useLiveQuery(() => db.wins.orderBy('createdAt').reverse().toArray(), []) ?? []

  useEffect(() => { if (params.get('add')) setParams({}, { replace: true }) }, [params, setParams])

  const save = async () => {
    if (!types.length) return
    const ts = now()
    await db.wins.bulkAdd(types.map((type) => ({ id: newId(), type, note: note.trim(), createdAt: ts, threadId: getCurrentThread() ?? undefined })))
    setTypes([]); setNote('')
    setFlash(['That counts.', 'Look at you.', 'Noted, and celebrated.', 'That was you honoring yourself.'][Math.floor(Math.random() * 4)])
    setTimeout(() => setFlash(''), 3000)
  }

  const counts = [...WINS, ...FREEDOM_WINS].map((w) => ({ ...w, n: wins.filter((x) => x.type === w.type).length })).filter((w) => w.n > 0).sort((a, b) => b.n - a.n)
  const first = wins.length ? wins[wins.length - 1] : undefined

  return (
    <Shell title="Wins" subtitle="Moments you honored yourself. Small ones count the most." action={<button type="button" className="btn btn-sm btn-ghost" onClick={() => setView(view === 'log' ? 'far' : 'log')}>{view === 'log' ? 'How far I\'ve come' : 'Back to log'}</button>}>
      {view === 'far' ? (
        <div className="stack-lg">
          <div className="card-gold">
            <h2>Look how far you've come.</h2>
            <p style={{ margin: 0 }}>
              {wins.length === 0 ? 'The first win is often just noticing there could be one.' : `${wins.length} ${wins.length === 1 ? 'moment' : 'moments'} of honoring yourself${first ? ` since ${fmtDateTime(first.createdAt).split(',')[0]}` : ''}. Each one was a choice.`}
            </p>
          </div>
          <div className="list">
            {counts.map((c) => (
              <div key={c.type} className="item row-between"><span style={{ fontWeight: 700 }}>{c.label}</span><span className="chip chip-sm on">{c.n}</span></div>
            ))}
          </div>
          {wins.some((w) => FREEDOM_TYPES.includes(w.type)) && <Link to="/unhooked/progress?tab=freedom" className="btn btn-ghost">Freedom moments in Unhooked</Link>}
          <p className="faint">No streaks here. Gaps are normal. Coming back is the win.</p>
        </div>
      ) : (
        <div className="stack-lg">
          <section className="card stack">
            <div className="label">Today I…</div>
            <div className="chips">
              {WINS.map((w) => <button key={w.type} type="button" className="chip chip-sage" aria-pressed={types.includes(w.type)} onClick={() => toggle(w.type)}>{w.label}</button>)}
            </div>
            <div className="label">Freedom moments</div>
            <div className="chips">
              {FREEDOM_WINS.map((w) => <button key={w.type} type="button" className="chip" aria-pressed={types.includes(w.type)} onClick={() => toggle(w.type)}>{w.label}</button>)}
            </div>
            <p className="help" style={{ margin: 0 }}>Tap as many as fit. One moment can be several wins.</p>
            {types.length > 0 && (
              <>
                <input className="input" value={note} placeholder="A note (optional, shared by all of them)" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} aria-label="Note" />
                <button type="button" className="btn btn-primary btn-block" onClick={save}>{types.length === 1 ? 'Log it' : `Log ${types.length} wins`}</button>
              </>
            )}
            {flash && <p className="faint center" aria-live="polite" style={{ margin: 0 }}>{flash}</p>}
          </section>
          <div className="list">
            {wins.slice(0, 30).map((w) => (
              <div key={w.id} className="item row-between">
                <div>
                  <div style={{ fontWeight: 700 }} className="small">{WIN_LABEL[w.type]}</div>
                  {w.note && <div className="small muted">{w.note}</div>}
                  <div className="item-meta">{fmtDateTime(w.createdAt)}</div>
                </div>
                <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove this win" onClick={() => db.wins.delete(w.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  )
}
