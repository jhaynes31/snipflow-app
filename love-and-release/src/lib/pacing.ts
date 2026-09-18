import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { daysSince } from './dates'
import { CHECKIN_MILESTONES } from '@/data/pacing'

/** The first person whose pace milestone (14, 42, 90, 180 days) has arrived and hasn't been checked in on. */
export function usePaceDue() {
  return useLiveQuery(async () => {
    const people = await db.people.filter((p) => !!p.pace && !!p.metDate).toArray()
    for (const p of people) {
      const days = daysSince(p.metDate!)
      const hit = [...CHECKIN_MILESTONES].reverse().find((m) => days >= m)
      if (!hit) continue
      const done = (p.pace!.checkins ?? []).some((c) => daysSince(c) < Math.max(7, hit / 2))
      if (!done) return { id: p.id, name: p.name, days }
    }
    return null
  }, []) ?? null
}
