import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { daysAgo, daysSince } from './dates'
import { hourBucket } from './unhooked'
import { inLowWindowOn } from './cycle'
import { DEFAULT_SETTINGS } from '@/db/types'
import { FREEDOM_TYPES } from '@/data/options'

export interface Notice { id: string; text: string; link?: string; linkLabel?: string }

const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]
const count = <T,>(rows: T[], get: (r: T) => string[]) => { const m = new Map<string, number>(); for (const r of rows) for (const k of get(r)) m.set(k, (m.get(k) ?? 0) + 1); return m }

/** Warm, rules-based reflections on the user's own words. Nothing leaves the device. */
export function useNotices(): Notice[] {
  return useLiveQuery(async () => {
    const since30 = daysAgo(30), since7 = daysAgo(7), since14 = daysAgo(14)
    const [checkIns, loops, fawns, wins, people, threads, daily, comforts, settings] = await Promise.all([
      db.checkIns.where('createdAt').above(since30).toArray(), db.loopEpisodes.where('createdAt').above(since30).toArray(), db.fawnMoments.toArray(),
      db.wins.where('createdAt').above(since30).toArray(), db.people.toArray(), db.threads.toArray(), db.daily.where('createdAt').above(since30).toArray(), db.comforts.toArray(),
      db.settings.get('settings'),
    ])
    const s = settings ?? DEFAULT_SETTINGS
    const out: Notice[] = []

    const story = top(count(checkIns, (c) => c.story))
    if (story && story[1] >= 3) {
      const alt = top(count(checkIns.filter((c) => c.story.includes(story[0])), (c) => c.alternatives))
      out.push({ id: 'story', text: `You've told me "${story[0]}" ${story[1]} times this month.${alt ? ` Each time, what else could be true was about them: "${alt[0].toLowerCase()}."` : ' I wonder what else could be true.'}`, link: '/check-in', linkLabel: 'Untangle the next one' })
    }

    const hour = top(count(loops, (l) => [hourBucket(l.createdAt)]))
    if (hour && hour[1] >= 3) out.push({ id: 'loop-time', text: `Loops hit hardest in the ${hour[0].toLowerCase()} lately, ${hour[1]} of them. ${hour[0] === 'Late' || hour[0] === 'Night' ? 'Rest might be part of the answer.' : 'Worth knowing when to expect them.'}`, link: '/unhooked/map', linkLabel: 'See the map' })

    const drops = loops.filter((l) => l.urgeStart !== undefined && l.urgeEnd !== undefined)
    if (drops.length >= 2) { const avg = drops.reduce((a, l) => a + (l.urgeStart! - l.urgeEnd!), 0) / drops.length; if (avg > 0) out.push({ id: 'urge-drop', text: `Every loop you've ridden lately, the urge fell, by about ${avg.toFixed(0)} points on average. You're teaching your brain something.` }) }

    const fThis = fawns.filter((f) => f.createdAt > since7).length, fLast = fawns.filter((f) => f.createdAt > since14 && f.createdAt <= since7).length
    const honest = fawns.filter((f) => f.createdAt > since30 && (f.outcome === 'honest' || f.outcome === 'said-no')).length
    if (fawns.length >= 1) out.push({ id: 'fawn', text: fThis < fLast ? `Fewer fawn moments this week than last: ${fThis} versus ${fLast}. That's the muscle growing.` : honest ? `${honest} time${honest === 1 ? '' : 's'} this month you caught the fawn and said the honest thing instead. That used to be impossible.` : `You've noticed the fawn ${fawns.length === 1 ? 'once' : `${fawns.length} times`}. Noticing is the first skill, and you have it.`, link: '/fawn', linkLabel: 'Catch the next one' })

    const freedom = wins.filter((w) => FREEDOM_TYPES.includes(w.type)).length
    if (wins.length >= 3) out.push({ id: 'wins', text: `${wins.length} times this month you honored yourself${freedom ? `, ${freedom} of them while anxious` : ''}. I keep a list. It's getting long.`, link: '/wins', linkLabel: 'Look how far' })

    const person = top(count(checkIns, (c) => (c.personId ? [c.personId] : [])))
    if (person && person[1] >= 3) { const name = people.find((p) => p.id === person[0])?.name; if (name) out.push({ id: 'person', text: `${name} has come up in ${person[1]} check-ins this month. Not a verdict, just a lot of weight in one place. Their thread might help you see the whole shape.`, link: `/people/${person[0]}`, linkLabel: `Open ${name}` }) }

    const oldest = threads.filter((t) => t.status === 'open').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
    if (oldest && daysSince(oldest.createdAt) >= 14) out.push({ id: 'thread', text: `"${oldest.title}" has been open for ${daysSince(oldest.createdAt)} days. You keep coming back to it, and that's allowed. Want to see the arc?`, link: `/threads/${oldest.id}`, linkLabel: 'Open the thread' })

    const evenings = daily.filter((d) => d.kind === 'evening')
    const loved = top(count(evenings, (d) => (Array.isArray(d.answers.loved) ? d.answers.loved : [])))
    if (loved && loved[1] >= 3 && !loved[0].startsWith('Nothing')) out.push({ id: 'loved', text: `"${loved[0]}" is where you've felt most loved lately, ${loved[1]} evenings this month. More of that.` })

    if (s.cycleTracking && s.cycleStart) {
      const hard = [...checkIns.map((c) => c.createdAt), ...loops.map((l) => l.createdAt), ...comforts.map((c) => c.createdAt)]
      if (hard.length >= 6) { const inWin = hard.filter((iso) => inLowWindowOn(s, iso)).length; if (inWin / hard.length >= 0.6) out.push({ id: 'cycle', text: `About ${Math.round((inWin / hard.length) * 100)}% of your hard moments this month landed in the week before your period. When it feels like everything's falling apart, some of that is the calendar.`, link: '/why/pmdd', linkLabel: 'Why that happens' }) }
    }

    if (!out.length) out.push({ id: 'empty', text: 'I don\'t have much to reflect back yet. The more you tell me, the more I can notice with you. No pressure, though.' })
    return out
  }, []) ?? []
}
