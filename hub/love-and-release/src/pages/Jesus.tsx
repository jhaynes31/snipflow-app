import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { db, now } from '@/db/db'
import type { Tag } from '@/db/types'
import { TAGS } from '@/data/tags'
import { useLoopGuard } from '@/lib/unhooked'
import { LoopNotice } from '@/pages/UnhookedTools'

export function JesusLibrary() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('tag') as Tag | null) ?? null
  const cards = useLiveQuery(async () => {
    const all = await db.jesusCards.toArray()
    return filter ? all.filter((c) => c.tags.includes(filter)) : all
  }, [filter]) ?? []

  return (
    <Shell title="Walk With Jesus" subtitle="How He loved people, grieved, set boundaries, and released them to their own choices.">
      <div className="stack">
        <div className="chips" aria-label="Filter by situation">
          <button type="button" className="chip" aria-pressed={!filter} onClick={() => setParams({})}>All</button>
          {TAGS.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={filter === t} onClick={() => setParams(filter === t ? {} : { tag: t })}>{t}</button>
          ))}
        </div>
        <div className="list">
          {cards.map((c) => (
            <Link key={c.id} to={`/jesus/${c.id}`} className="item card-link">
              <div className="item-title">{c.title}</div>
              <div className="item-meta">{c.reference}</div>
              <div className="chips mt" style={{ gap: 6 }}>
                {c.tags.map((t) => <span key={t} className="chip chip-sm">{t}</span>)}
              </div>
            </Link>
          ))}
          {cards.length === 0 && <p className="faint">No cards under that tag yet.</p>}
        </div>
      </div>
    </Shell>
  )
}

export function JesusCardPage() {
  const { id } = useParams()
  const card = useLiveQuery(() => (id ? db.jesusCards.get(id) : undefined), [id])
  const [savedMsg, setSavedMsg] = useState('')
  const looping = useLoopGuard(id ? `card:${id}` : undefined)
  const alreadySaved = useLiveQuery(
    async () => (card ? (await db.truths.where('id').equals(`from-card-${card.id}`).count()) > 0 : false),
    [card?.id],
  )

  if (!card) return <Shell back="/jesus"><p className="faint">Loading…</p></Shell>

  const saveTruth = async () => {
    await db.truths.put({
      id: `from-card-${card.id}`,
      text: card.meaningForMe,
      source: `${card.title} · ${card.reference}`,
      starred: false,
      tags: card.tags,
      createdAt: now(),
    })
    setSavedMsg('Saved to your Truths Deck.')
  }

  return (
    <Shell back="/jesus" hideNav={false}>
      <article className="stack-lg">
        {looping && <LoopNotice tool="this card" />}
        <div>
          <h1>{card.title}</h1>
          <div className="muted">{card.reference}</div>
        </div>
        <section>
          <h3>What happened</h3>
          <p>{card.whatHappened}</p>
        </section>
        <section className="card-sage">
          <h3>How Jesus handled it</h3>
          <p style={{ margin: 0 }}>{card.howHeHandledIt}</p>
        </section>
        <section className="card-gold">
          <h3>What this means for me</h3>
          <p className="truth" style={{ margin: 0 }}>{card.meaningForMe}</p>
        </section>
        <section className="card">
          <h3>A question to sit with</h3>
          <p style={{ margin: 0 }}>{card.prompt}</p>
          <div className="btn-row mt">
            <Link to="/check-in" className="btn btn-ghost">Untangle something</Link>
            <Link to="/release/new" className="btn btn-ghost">Bring it to God</Link>
          </div>
        </section>
        <div className="stack">
          <button type="button" className="btn btn-primary btn-block" onClick={saveTruth} disabled={alreadySaved}>
            {alreadySaved ? 'In your Truths Deck' : 'Save to Truths Deck'}
          </button>
          {savedMsg && <p className="faint center" aria-live="polite">{savedMsg}</p>}
        </div>
        <div className="chips">
          {card.tags.map((t) => <Link key={t} to={`/jesus?tag=${encodeURIComponent(t)}`} className="chip chip-sm">{t}</Link>)}
        </div>
      </article>
    </Shell>
  )
}
