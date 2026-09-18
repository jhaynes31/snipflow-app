import { db, now } from './db'
import { DEFAULT_SETTINGS, type JesusCard, type Truth } from './types'
import truthsSeed from '@/data/truths.json'
import cardsSeed from '@/data/jesusCards.json'
import { DEFAULT_RINGS } from '@/data/circles'
import { DEFAULT_BREATH_PRAYERS, GRACE_TRUTHS } from '@/data/unhooked'

const SEED_KEY = 'lr:seeded:v1'
const RINGS_KEY = 'lr:rings-seeded:v1'
const GRACE_KEY = 'lr:grace-seeded:v1'
const TRUTHS_V2_KEY = 'lr:truths-seeded:v2'

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

  // Breath prayers: keep the defaults present; custom ones are the user's.
  await db.breathPrayers.bulkPut(DEFAULT_BREATH_PRAYERS)

  // Truths are the user's deck: only seed once so edits and deletions stick.
  if (!localStorage.getItem(SEED_KEY)) {
    if ((await db.truths.count()) === 0) {
      const ts = now()
      const truths: Truth[] = (truthsSeed as Omit<Truth, 'createdAt'>[]).map((t) => ({ ...t, createdAt: ts }))
      await db.truths.bulkAdd(truths)
    }
    localStorage.setItem(SEED_KEY, '1')
  }

  // Later additions to the starter deck join once, without touching anything the user has edited.
  if (localStorage.getItem(SEED_KEY) && !localStorage.getItem(TRUTHS_V2_KEY)) {
    const ts = now()
    const have = new Set((await db.truths.toArray()).map((t) => t.id))
    const additions = (truthsSeed as Omit<Truth, 'createdAt'>[]).filter((t) => !have.has(t.id)).map((t) => ({ ...t, createdAt: ts }))
    if (additions.length) await db.truths.bulkAdd(additions)
  }
  localStorage.setItem(TRUTHS_V2_KEY, '1')

  // Grace truths join the deck once, after the starters.
  if (!localStorage.getItem(GRACE_KEY)) {
    const ts = now()
    await db.truths.bulkPut(GRACE_TRUTHS.map((text, i) => ({ id: `seed-grace-${i + 1}`, text, source: 'Grace truth', starred: i === 0, tags: ['Scrupulosity & Grace' as const], createdAt: ts })))
    localStorage.setItem(GRACE_KEY, '1')
  }
}

export function markUnseeded(): void {
  localStorage.removeItem(SEED_KEY)
  localStorage.removeItem(RINGS_KEY)
  localStorage.removeItem(GRACE_KEY)
  localStorage.removeItem(TRUTHS_V2_KEY)
}

/** Restore the suggested default rings (used from Layers when all rings were removed). */
export async function restoreDefaultRings(): Promise<void> {
  await db.rings.bulkPut(DEFAULT_RINGS)
}
