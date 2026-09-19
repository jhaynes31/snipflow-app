import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { TruthCard, useDailyTruth } from '@/components/TruthCard'
import { GearIcon } from '@/components/Icons'
import { hasDraft } from '@/lib/drafts'
import { daysSince } from '@/lib/dates'
import { useSettings } from '@/lib/settings'
import { reviewDue } from '@/lib/circles'
import { cyclePosition } from '@/lib/cycle'
import { useNotices } from '@/lib/notices'
import { useDailyValue } from '@/pages/UnhookedMe'
import { useTodayDaily } from '@/pages/Daily'
import { DOORS, GREETINGS } from '@/data/companion'
import { usePaceDue } from '@/lib/pacing'
import { SHIRE_ROOM, getPerson, planReady } from '@/app/person'

const LAST_KEY = 'lr:last-opened'

function useWelcome(name?: string): string {
  const [last] = useState(() => { const v = localStorage.getItem(LAST_KEY); localStorage.setItem(LAST_KEY, new Date().toISOString()); return v })
  const n = name?.trim() ? `, ${name.trim()}` : ''
  if (!last) return `Hi${n}. I'm glad you're here.`
  if (daysSince(last) >= 3) return `Welcome back${n}. No catching up needed.`
  return GREETINGS[new Date().getDate() % GREETINGS.length](n)
}

/** The front door. One question, in feeling-language. No menu. */
export function Home() {
  const nav = useNavigate()
  const settings = useSettings()
  const truth = useDailyTruth()
  const value = useDailyValue()
  const notices = useNotices()
  const today = useTodayDaily()
  const cycle = cyclePosition(settings)
  const welcome = useWelcome(settings.name)
  const [drafts, setDrafts] = useState<{ label: string; to: string }[]>([])
  useEffect(() => {
    setDrafts([
      { key: 'check-in', label: 'an unfinished check-in', to: '/check-in' },
      { key: 'release', label: 'an unfinished release entry', to: '/release/new' },
      { key: 'loop', label: 'a loop you stepped out of halfway', to: '/unhooked/loop' },
      { key: 'fawn', label: 'a fawn moment you were working through', to: '/fawn' },
      { key: 'boundary', label: 'a boundary draft in progress', to: '/boundaries/new' },
    ].filter((d) => hasDraft(d.key)))
  }, [])
  const hour = new Date().getHours()
  const eveningTime = hour >= 17 || hour < 4
  const dailyPrompt = useMemo(() => {
    if (!today) return null
    if (eveningTime && settings.dailyEvening !== false && !today.evening) return { to: '/daily/evening', text: 'Whenever you\'re ready to set today down, I\'m here for the evening check-in.' }
    if (!eveningTime && settings.dailyMorning !== false && !today.morning) return { to: '/daily/morning', text: 'Want to start the day with whose you are? Sixty seconds.' }
    return null
  }, [today, eveningTime, settings.dailyMorning, settings.dailyEvening])
  const notice = notices.find((n) => n.id !== 'empty')
  const paceDue = usePaceDue()
  const doors = DOORS.filter((d) => d.id !== 'low' || settings.cycleTracking !== false)
  // The "John, and me" room lives in The Shire; it is Jen's, so only her copy shows the door.
  const roomDoor = getPerson() === 'her'
  const plan = roomDoor && planReady()

  return (
    <Shell action={<Link to="/settings" className="btn btn-icon btn-ghost" aria-label="Settings"><GearIcon /></Link>}>
      <div className="stack-lg">
        {truth && <section aria-label="Today's truth"><div className="faint" style={{ marginBottom: 6 }}>Today's truth</div><TruthCard truth={truth} /></section>}
        <Speak>
          <p><strong>{welcome}</strong></p>
          <p>What's going on?</p>
        </Speak>

        {drafts.length > 0 && <div className="notice notice-sage">You left {drafts[0].label}. <Link to={drafts[0].to}>Pick it back up</Link>, or leave it. Either is fine.</div>}
        {plan && <div className="notice notice-sage">A word wasn't kept. The plan you wrote on a steady day is ready. <a href={SHIRE_ROOM}>Open it</a></div>}
        {cycle?.inLowWindow && <div className="notice">It's the harder stretch of the month. Some of what stings this week will sting less next week. Be extra gentle with yourself. <Link to="/why/pmdd">Why</Link></div>}

        <div className="doors">
          {doors.map((d) => (
            <button key={d.id} type="button" className={`door ${d.tint !== 'plain' ? `door-${d.tint}` : ''}`} onClick={() => nav(d.to)}>
              <i aria-hidden="true">{d.icon}</i>{d.label}<span>{d.sub}</span>
            </button>
          ))}
          {roomDoor && (
            <a href={SHIRE_ROOM} className="door door-sage" style={{ color: 'inherit' }}>
              <i aria-hidden="true">🏡</i>This is about John<span>Whose is this, the pause before rescuing, where I stand.</span>
            </a>
          )}
        </div>

        {paceDue && <Speak tone="gold">It's been {paceDue.days} days with {paceDue.name}. Want a quick look at what they've shown so far? <Link to={`/pace/${paceDue.id}`}>Let's look</Link></Speak>}
        {dailyPrompt && <Speak tone="sage">{dailyPrompt.text} <Link to={dailyPrompt.to}>Let's do it</Link></Speak>}

        {value && <p className="faint center" style={{ margin: 0 }}>Today, quietly: <strong>{value.name}</strong>{value.meaning ? ` · ${value.meaning}` : ''}</p>}
        {notice && <section aria-label="Something I noticed"><div className="faint" style={{ marginBottom: 6 }}>Something I noticed</div><Speak tone="gold">{notice.text}{notice.link && <> <Link to={notice.link}>{notice.linkLabel ?? 'Open'}</Link></>}</Speak></section>}


        {reviewDue(settings) && <div className="notice">It's been a while since you looked at your circles. <Link to="/circles/review">A gentle review</Link> is there when you want it.</div>}

        <p className="faint center"><Link to="/more">Everything</Link>, for the days you know exactly what you want.</p>
      </div>
    </Shell>
  )
}
