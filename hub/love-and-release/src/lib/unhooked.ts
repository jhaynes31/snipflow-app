import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, now } from '@/db/db'
import type { Skill, WinType } from '@/db/types'
import { CRISIS_PATTERNS } from '@/data/unhooked'

const OPENS_KEY = 'lr:opens'
const WINDOW_MS = 20 * 60_000
const LOOP_THRESHOLD = 3

type Opens = Record<string, number[]>
const readOpens = (): Opens => { try { return JSON.parse(localStorage.getItem(OPENS_KEY) ?? '{}') } catch { return {} } }

/**
 * Loop-detection guardrail. Records an open of `key` and reports whether the
 * same thing has been opened repeatedly in a short span. Never blocks; only notices.
 */
export function useLoopGuard(key: string | undefined): boolean {
  const [looping, setLooping] = useState(false)
  useEffect(() => {
    if (!key) return
    try {
      const opens = readOpens()
      const cutoff = Date.now() - WINDOW_MS
      const list = [...(opens[key] ?? []).filter((t) => t > cutoff), Date.now()]
      opens[key] = list
      for (const k of Object.keys(opens)) if (!opens[k].some((t) => t > cutoff)) delete opens[k]
      localStorage.setItem(OPENS_KEY, JSON.stringify(opens))
      setLooping(list.length >= LOOP_THRESHOLD)
    } catch { /* storage unavailable */ }
  }, [key])
  return looping
}

/** One-and-done: has a grace truth or prayer already been offered in this episode? */
const EPISODE_KEY = 'lr:episode-offered'
export const offeredThisEpisode = (what: string) => { try { return JSON.parse(sessionStorage.getItem(EPISODE_KEY) ?? '[]').includes(what) } catch { return false } }
export const markOffered = (what: string) => { try { const l = JSON.parse(sessionStorage.getItem(EPISODE_KEY) ?? '[]'); if (!l.includes(what)) l.push(what); sessionStorage.setItem(EPISODE_KEY, JSON.stringify(l)) } catch { /* ignore */ } }
export const resetEpisode = () => sessionStorage.removeItem(EPISODE_KEY)

export const detectCrisis = (text: string) => CRISIS_PATTERNS.test(text)

export async function logSkill(skill: Skill): Promise<void> {
  await db.skillPractices.add({ id: newId(), skill, createdAt: now() })
}

export async function logFreedomWin(type: WinType, note = ''): Promise<void> {
  await db.wins.add({ id: newId(), type, note, createdAt: now() })
}

export const useValues = () => useLiveQuery(() => db.coreValues.orderBy('order').toArray(), []) ?? []

export function useBreathPrayers() {
  return useLiveQuery(() => db.breathPrayers.toArray(), []) ?? []
}

export function haptic(pattern: number | number[] = 12): void {
  try {
    if (document.documentElement.dataset.haptics === 'false') return
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch { /* unsupported */ }
}

export const hourBucket = (iso: string) => {
  const h = new Date(iso).getHours()
  return h < 6 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Late'
}
