import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { Truth } from '@/db/types'
import { StarIcon } from './Icons'

export function TruthCard({ truth, large, tone = 'gold' }: { truth: Truth; large?: boolean; tone?: 'gold' | 'sage' | 'accent' }) {
  const toggleStar = () => db.truths.update(truth.id, { starred: !truth.starred })
  return (
    <div className={`card-${tone}`}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <p className={`truth ${large ? 'truth-lg' : ''}`} style={{ marginBottom: 0 }}>{truth.text}</p>
        <button
          type="button"
          className="btn btn-icon btn-quiet"
          aria-label={truth.starred ? 'Unstar this truth' : 'Star this truth'}
          aria-pressed={truth.starred}
          onClick={toggleStar}
          style={{ color: truth.starred ? 'var(--gold)' : 'var(--text-faint)' }}
        >
          <StarIcon filled={truth.starred} />
        </button>
      </div>
      {truth.source && <div className="truth-source">{truth.source}</div>}
    </div>
  )
}

/** Picks a truth for the day: rotates through starred truths first, then all. */
export function useDailyTruth(): Truth | undefined {
  return useLiveQuery(async () => {
    const all = await db.truths.orderBy('createdAt').toArray()
    if (!all.length) return undefined
    const pool = all.filter((t) => t.starred).length >= 3 ? all.filter((t) => t.starred) : all
    const d = new Date()
    const idx = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000) + d.getFullYear()
    return pool[idx % pool.length]
  }, [])
}
