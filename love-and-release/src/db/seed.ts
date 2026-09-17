import { db, now } from './db'
import { DEFAULT_SETTINGS, type JesusCard, type Truth } from './types'
import truthsSeed from '@/data/truths.json'
import cardsSeed from '@/data/jesusCards.json'

const SEED_KEY = 'lr:seeded:v1'

export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get('settings')
  if (!settings) await db.settings.put(DEFAULT_SETTINGS)

  // Cards are app content: keep them current with the bundled JSON.
  const cards = cardsSeed as JesusCard[]
  await db.jesusCards.bulkPut(cards)

  // Truths are the user's deck: only seed once so edits and deletions stick.
  if (localStorage.getItem(SEED_KEY)) return
  const count = await db.truths.count()
  if (count === 0) {
    const ts = now()
    const truths: Truth[] = (truthsSeed as Omit<Truth, 'createdAt'>[]).map((t) => ({ ...t, createdAt: ts }))
    await db.truths.bulkAdd(truths)
  }
  localStorage.setItem(SEED_KEY, '1')
}

export function markUnseeded(): void {
  localStorage.removeItem(SEED_KEY)
}
