import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { db, newId, now } from '@/db/db'
import { GRACE_TRUTHS, SUPPORT_VERSES } from '@/data/unhooked'
import { useBreathPrayers } from '@/lib/unhooked'

export function UnhookedJesus() {
  const cards = useLiveQuery(() => db.jesusCards.filter((c) => c.tags.includes('Anxiety & Uncertainty') || c.tags.includes('Scrupulosity & Grace')).toArray(), []) ?? []
  const prayers = useBreathPrayers()
  const truths = useLiveQuery(() => db.truths.toArray(), []) ?? []
  const [inhale, setInhale] = useState('')
  const [exhale, setExhale] = useState('')
  const [msg, setMsg] = useState('')
  const inDeck = (text: string) => truths.some((t) => t.text === text)
  const saveTruth = async (text: string, source: string) => { await db.truths.add({ id: newId(), text, source, starred: false, tags: ['Scrupulosity & Grace'], createdAt: now() }); setMsg('Saved to your Truths Deck.') }
  const addPrayer = async () => { if (!inhale.trim() || !exhale.trim()) return; await db.breathPrayers.add({ id: newId(), inhale: inhale.trim(), exhale: exhale.trim(), isCustom: true }); setInhale(''); setExhale('') }

  return (
    <Shell back="/unhooked" title="Jesus in the storm" subtitle="Faith as rest and connection. Never as another ritual.">
      <div className="stack-lg">
        <section>
          <h3>How He handled anxiety, doubt, and shame</h3>
          <div className="list">{cards.map((c) => <Link key={c.id} to={`/jesus/${c.id}`} className="item card-link"><div className="item-title">{c.title}</div><div className="item-meta">{c.reference}</div><div className="small muted">{c.howHeHandledIt.split('. ')[0]}.</div></Link>)}</div>
        </section>

        <section>
          <h3>Grace truths</h3>
          <p className="help">Truths that point to God's character without handing the loop the certainty it's demanding.</p>
          <div className="list">
            {GRACE_TRUTHS.map((t) => <div key={t} className="card-gold row-between" style={{ alignItems: 'flex-start' }}><p className="truth" style={{ margin: 0, fontSize: '1.05rem' }}>{t}</p>{!inDeck(t) && <button type="button" className="btn btn-quiet btn-sm" onClick={() => saveTruth(t, 'Grace truth')}>Save</button>}</div>)}
          </div>
          {msg && <p className="faint" aria-live="polite">{msg}</p>}
        </section>

        <section>
          <h3>Breath prayers</h3>
          <p className="help">Pair one with the breathing tool. Inhale the first half, exhale the second.</p>
          <div className="list">
            {prayers.map((p) => (
              <div key={p.id} className="item row-between">
                <div><span className="muted small">In:</span> <strong>{p.inhale}</strong> <span className="muted small">Out:</span> <strong>{p.exhale}</strong></div>
                <span className="row" style={{ gap: 2 }}>
                  {!inDeck(`${p.inhale} ${p.exhale}`) && <button type="button" className="btn btn-quiet btn-sm" onClick={() => saveTruth(`${p.inhale} ${p.exhale}`, 'Breath prayer')}>Save</button>}
                  {p.isCustom && <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove" onClick={() => db.breathPrayers.delete(p.id)}>✕</button>}
                </span>
              </div>
            ))}
          </div>
          <div className="row mt">
            <input className="input grow" value={inhale} placeholder="Inhale: …" onChange={(e) => setInhale(e.target.value)} aria-label="Inhale phrase" />
            <input className="input grow" value={exhale} placeholder="Exhale: …" onChange={(e) => setExhale(e.target.value)} aria-label="Exhale phrase" />
            <button type="button" className="btn btn-sm btn-primary" onClick={addPrayer} disabled={!inhale.trim() || !exhale.trim()}>Add</button>
          </div>
          <Link to="/unhooked/tools/breathing" className="btn btn-ghost mt">Breathe with one now</Link>
        </section>

        <section>
          <h3>Passages to rest on</h3>
          <div className="list">{SUPPORT_VERSES.map((v) => <div key={v.ref} className="item"><div className="truth" style={{ fontSize: '1rem' }}>{v.text}</div><div className="item-meta">{v.ref}, paraphrased</div></div>)}</div>
        </section>

        <div className="card-sage">
          <h3>Healthy prayer guardrail</h3>
          <p style={{ margin: 0 }}>If you notice yourself praying the same thing again "until it feels right," that's the loop borrowing your faith. You've already brought it to Him. <Link to="/unhooked/tools/one-prayer">One prayer, then rest.</Link></p>
        </div>
      </div>
    </Shell>
  )
}
