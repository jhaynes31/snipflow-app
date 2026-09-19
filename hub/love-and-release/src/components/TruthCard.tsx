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

/** Picks a truth for the day from the whole deck, in a shuffled-but-stable order so neighbors don't repeat. */
export function useDailyTruth(): Truth | undefined {
  return useLiveQuery(async () => {
    const all = await db.truths.orderBy('id').toArray()
    if (!all.length) return undefined
    const d = new Date()
    const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000) + d.getFullYear() * 366
    // Stride through the deck with a step coprime to its length, so consecutive days feel varied.
    const n = all.length
    let step = Math.max(1, Math.floor(n * 0.618))
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
    while (gcd(step, n) !== 1) step++
    return all[(day * step) % n]
  }, [])
}
