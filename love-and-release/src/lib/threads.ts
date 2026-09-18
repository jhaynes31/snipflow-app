import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, now } from '@/db/db'
import type { Thread } from '@/db/types'

const KEY = 'lr:thread'
export const getCurrentThread = (): string | null => sessionStorage.getItem(KEY)
export const setCurrentThread = (id: string | null) => (id ? sessionStorage.setItem(KEY, id) : sessionStorage.removeItem(KEY))

export const useThreads = () => useLiveQuery(() => db.threads.orderBy('updatedAt').reverse().toArray(), []) ?? []

export async function createThread(title: string, personId?: string): Promise<Thread> {
  const ts = now()
  const t: Thread = { id: newId(), title: title.trim(), personId, status: 'open', createdAt: ts, updatedAt: ts }
  await db.threads.add(t)
  return t
}

export const touchThread = (id: string) => db.threads.update(id, { updatedAt: now() })

export interface TimelineItem { id: string; kind: string; label: string; title: string; body?: string; at: string; link?: string }

/** Everything that belongs to a thread, by threadId or (when the thread has a person) by personId. */
export function useThreadTimeline(thread: Thread | undefined): TimelineItem[] {
  return useLiveQuery(async () => {
    if (!thread) return []
    const id = thread.id, pid = thread.personId
    const mine = <T extends { threadId?: string; personId?: string }>(rows: T[]) => rows.filter((r) => r.threadId === id || (pid && r.personId === pid))
    const [c, p, r, b, w, l, f, cf, rf, ts, mv] = await Promise.all([
      db.checkIns.toArray(), db.pauses.toArray(), db.releases.toArray(), db.boundaries.toArray(), db.wins.toArray(), db.loopEpisodes.toArray(), db.fawnMoments.toArray(), db.comforts.toArray(),
      pid ? db.redFlags.where('personId').equals(pid).toArray() : Promise.resolve([]), pid ? db.trustSignals.where('personId').equals(pid).toArray() : Promise.resolve([]), pid ? db.ringMoves.where('personId').equals(pid).toArray() : Promise.resolve([]),
    ])
    const items: TimelineItem[] = [
      ...mine(c).map((x) => ({ id: x.id, kind: 'check-in', label: 'Fact vs. Story', title: x.fact || x.story[0] || 'A check-in', body: [x.story.join(' · '), x.truthText].filter(Boolean).join(' — '), at: x.createdAt, link: `/history?kind=check-in` })),
      ...mine(p).map((x) => ({ id: x.id, kind: 'pause', label: 'Paused', title: 'Slowed down', body: x.feelings.join(', '), at: x.createdAt })),
      ...mine(r).map((x) => ({ id: x.id, kind: 'release', label: 'Released', title: x.releasing || x.hurts || 'Brought it to God', body: x.theirs ? `Theirs: ${x.theirs}` : undefined, at: x.createdAt, link: '/release' })),
      ...mine(b).map((x) => ({ id: x.id, kind: 'boundary', label: x.sentAt ? 'Said it' : 'Drafted', title: x.title || 'A boundary', body: x.body.slice(0, 120), at: x.sentAt ?? x.updatedAt, link: `/boundaries/${x.id}` })),
      ...mine(w).map((x) => ({ id: x.id, kind: 'win', label: 'Win', title: x.note || 'Honored myself', at: x.createdAt })),
      ...mine(l).map((x) => ({ id: x.id, kind: 'loop', label: 'Stepped out of a loop', title: x.theme || x.triggerTags[0] || 'A loop', at: x.createdAt })),
      ...mine(f).map((x) => ({ id: x.id, kind: 'fawn', label: 'Fawn moment', title: x.situation || x.kind, body: x.outcome === 'fawned' ? 'Fawned this time. Noticed it.' : x.outcome === 'not-yet' ? 'Still deciding' : x.honest, at: x.createdAt })),
      ...mine(cf).map((x) => ({ id: x.id, kind: 'comfort', label: 'Comfort', title: x.kind === 'low' ? 'A low day' : 'Came for comfort', body: x.flashback ? 'Named a flashback' : undefined, at: x.createdAt })),
      ...rf.map((x) => ({ id: x.id, kind: 'flag', label: 'Watch note', title: x.note || 'Noticed a pattern', at: x.date, link: pid ? `/people/${pid}` : undefined })),
      ...ts.map((x) => ({ id: x.id, kind: 'signal', label: 'Green flag', title: x.type, at: x.date })),
      ...mv.map((x) => ({ id: x.id, kind: 'move', label: 'Moved', title: x.reason || 'Changed their place', at: x.date })),
    ]
    return items.sort((a, b) => a.at.localeCompare(b.at))
  }, [thread?.id, thread?.personId]) ?? []
}
