import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { RELEASED, UNSURE, type Person, type Placement, type ReciprocityEvent, type RedFlag, type Ring, type Settings } from '@/db/types'
import { RECIPROCITY } from '@/data/options'
import { ACCESS_ITEMS } from '@/data/circles'
import { daysAgo, daysSince } from './dates'

export const useRings = (): Ring[] => useLiveQuery(() => db.rings.orderBy('order').toArray(), []) ?? []

export function placementName(id: Placement, rings: Ring[]): string {
  if (id === UNSURE) return 'Unsure'
  if (id === RELEASED) return 'Released'
  return rings.find((r) => r.id === id)?.name ?? 'Unplaced'
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

export function timeKnown(p: Person): string | null {
  if (!p.metDate) return null
  const days = daysSince(p.metDate)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'}`
  const y = Math.floor(days / 365)
  return `${y} year${y === 1 ? '' : 's'}`
}

export interface ReciprocitySummary {
  them: number
  me: number
  dropped: number
  total: number
  oneSided: boolean
}

export function summarizeReciprocity(events: ReciprocityEvent[], days = 90): ReciprocitySummary {
  const since = daysAgo(days)
  const recent = events.filter((e) => e.date >= since)
  const side = (e: ReciprocityEvent) => RECIPROCITY.find((r) => r.type === e.type)
  const them = recent.filter((e) => side(e)?.side === 'them' && side(e)?.tone === 'warm').length
  const me = recent.filter((e) => side(e)?.side === 'me').length
  const dropped = recent.filter((e) => side(e)?.tone === 'neutral').length
  return { them, me, dropped, total: recent.length, oneSided: me >= 3 && them * 2 < me }
}

export type MoveVerdict = 'earned' | 'more-time' | 'concerns' | 'neutral'

export function suggestCloser(opts: { ring: Ring; criteriaMet: string[]; person: Person; openFlags: RedFlag[]; signals: number }): { verdict: MoveVerdict; text: string } {
  const { ring, criteriaMet, person, openFlags, signals } = opts
  if (openFlags.length) return { verdict: 'concerns', text: 'There are some concerns to consider first.' }
  const total = ring.entryCriteria.length
  const fraction = total ? criteriaMet.length / total : 1
  const known = person.metDate ? daysSince(person.metDate) : null
  const minDays = ring.minTimeKnown ? parseMinDays(ring.minTimeKnown) : 0
  const shortTime = known !== null && minDays > 0 && known < minDays
  if (fraction >= 0.7 && !shortTime && signals >= 2) return { verdict: 'earned', text: 'This looks well earned.' }
  if (fraction < 0.5 || shortTime) return { verdict: 'more-time', text: 'It might be worth giving this a bit more time.' }
  return { verdict: 'neutral', text: 'This is your call. Trust what you\'ve seen, not what you hope.' }
}

function parseMinDays(s: string): number {
  const m = s.match(/(\d+)\s*\+?\s*(year|month|week|day)/i)
  if (!m) return 0
  const n = Number(m[1])
  return { year: 365, month: 30, week: 7, day: 1 }[m[2].toLowerCase() as 'year' | 'month' | 'week' | 'day'] * n
}

/** Access a person loses or gains between rings. */
export function accessDiff(from: Ring | undefined, to: Ring | undefined) {
  const a = new Set(from?.access ?? [])
  const b = new Set(to?.access ?? [])
  return { gained: [...b].filter((x) => !a.has(x)), lost: [...a].filter((x) => !b.has(x)) }
}

/** Implied boundaries for a ring: what this ring does not get, phrased kindly. */
export function impliedBoundaries(ring: Ring): string[] {
  return ACCESS_ITEMS.filter((item) => !ring.access.includes(item) && !item.startsWith('My time:')).map((item) =>
    `${item.replace(/^My /, 'My ')} stays with closer circles for now.`,
  )
}

export function reviewDue(s: Settings): boolean {
  if (!s.circleReviewEnabled) return false
  const days = s.circleReviewDays ?? 90
  const nowT = Date.now()
  if (s.circleReviewSnoozedUntil && new Date(s.circleReviewSnoozedUntil).getTime() > nowT) return false
  if (!s.circleReviewLastAt) return false // never nag before the first one is started by choice
  return nowT - new Date(s.circleReviewLastAt).getTime() > days * 86_400_000
}

/** Everything the profile and cues need for one person. */
export function usePersonSignals(personId: string | undefined) {
  return useLiveQuery(async () => {
    if (!personId) return undefined
    const [events, signals, flags, disclosures, moves] = await Promise.all([
      db.reciprocity.where('personId').equals(personId).toArray(),
      db.trustSignals.where('personId').equals(personId).reverse().sortBy('date'),
      db.redFlags.where('personId').equals(personId).reverse().sortBy('date'),
      db.disclosures.where('personId').equals(personId).reverse().sortBy('dateShared'),
      db.ringMoves.where('personId').equals(personId).reverse().sortBy('date'),
    ])
    return { events, signals, flags, openFlags: flags.filter((f) => f.status === 'open'), disclosures, moves, reciprocity: summarizeReciprocity(events) }
  }, [personId])
}

/** Cue data for the circle view: one-sided and open-flag markers per person. */
export function useCircleCues(enabled: boolean) {
  return useLiveQuery(async () => {
    if (!enabled) return {}
    const [events, flags] = await Promise.all([db.reciprocity.toArray(), db.redFlags.where('status').equals('open').toArray()])
    const out: Record<string, { oneSided: boolean; watch: boolean }> = {}
    const byPerson = new Map<string, ReciprocityEvent[]>()
    for (const e of events) byPerson.set(e.personId, [...(byPerson.get(e.personId) ?? []), e])
    for (const [pid, evs] of byPerson) out[pid] = { oneSided: summarizeReciprocity(evs).oneSided, watch: false }
    for (const f of flags) out[f.personId] = { oneSided: out[f.personId]?.oneSided ?? false, watch: true }
    return out
  }, [enabled]) ?? {}
}
