import { db, now } from './db'
import { DEFAULT_SETTINGS, type JesusCard, type Truth } from './types'
import truthsSeed from '@/data/truths.json'
import cardsSeed from '@/data/jesusCards.json'
import { DEFAULT_RINGS } from '@/data/circles'

const SEED_KEY = 'lr:seeded:v1'
const RINGS_KEY = 'lr:rings-seeded:v1'

export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get('settings')
  if (!settings) await db.settings.put(DEFAULT_SETTINGS)

  // Cards are app content: keep them current with the bundled JSON.
  const cards = cardsSeed as JesusCard[]
  await db.jesusCards.bulkPut(cards)

  // Rings are the user's own layers: seed the suggested defaults only once.
  if (!localStorage.getItem(RINGS_KEY)) {
    if ((await db.rings.count()) === 0) await db.rings.bulkAdd(DEFAULT_RINGS)
    localStorage.setItem(RINGS_KEY, '1')
  }

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
  localStorage.removeItem(RINGS_KEY)
}

/** Restore the suggested default rings (used from Layers when all rings were removed). */
export async function restoreDefaultRings(): Promise<void> {
  await db.rings.bulkPut(DEFAULT_RINGS)
}
