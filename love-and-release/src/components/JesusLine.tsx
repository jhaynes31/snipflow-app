import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { Tag } from '@/db/types'
import { dayOfYear } from '@/lib/dates'

/** One line of how Jesus handled this exact kind of thing, right where you are. */
export function JesusLine({ tags, salt = 0, quiet, count = 1 }: { tags: Tag[]; salt?: number; quiet?: boolean; count?: number }) {
  const cards = useLiveQuery(async () => {
    const all = await db.jesusCards.toArray()
    const pool = tags.length ? all.filter((c) => c.tags.some((t) => tags.includes(t))) : all
    const list = pool.length ? pool : all
    if (!list.length) return []
    const start = dayOfYear() + salt
    const step = Math.max(1, Math.floor(list.length / 3))
    return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i * step) % list.length])
  }, [tags.join('|'), salt, count]) ?? []
  if (!cards.length) return null
  return (
    <>
      {cards.map((card, i) => {
        const line = card.howHeHandledIt.split(/(?<=\.)\s/)[0]
        return (
          <Link key={card.id} to={`/jesus/${card.id}`} className={`jesus-line ${quiet || i > 0 ? 'jesus-line-quiet' : ''}`}>
            <span className="jesus-line-mark" aria-hidden="true">✝</span>
            <span><span className="jesus-line-text">{line}</span> <span className="jesus-line-ref">{card.title} · {card.reference}</span></span>
          </Link>
        )
      })}
    </>
  )
}
