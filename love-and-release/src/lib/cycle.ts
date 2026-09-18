import type { Settings } from '@/db/types'

export interface CyclePosition { day: number; length: number; daysUntilPeriod: number; inLowWindow: boolean }

/** Where in the month we are, if tracking is on. Never a diagnosis, just a gentle heads-up. */
export function cyclePosition(s: Settings, at = new Date()): CyclePosition | null {
  if (!s.cycleTracking || !s.cycleStart) return null
  const length = s.cycleLength ?? 28
  const low = s.lowDays ?? 10
  const start = new Date(s.cycleStart + 'T00:00:00')
  const elapsed = Math.floor((at.getTime() - start.getTime()) / 86_400_000)
  if (elapsed < 0) return null
  const day = (elapsed % length) + 1
  const daysUntilPeriod = length - day + 1
  return { day, length, daysUntilPeriod, inLowWindow: daysUntilPeriod <= low || day <= 2 }
}

export const inLowWindowOn = (s: Settings, iso: string) => cyclePosition(s, new Date(iso))?.inLowWindow ?? false
