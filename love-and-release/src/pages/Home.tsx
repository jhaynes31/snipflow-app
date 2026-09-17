import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Shell } from '@/components/Shell'
import { TruthCard, useDailyTruth } from '@/components/TruthCard'
import { GearIcon } from '@/components/Icons'
import { hasDraft } from '@/lib/drafts'
import { daysSince } from '@/lib/dates'
import { useSettings } from '@/lib/settings'
import { reviewDue } from '@/lib/circles'
import { useDailyValue } from '@/pages/UnhookedMe'

const LAST_KEY = 'lr:last-opened'

function useWelcome(): string {
  const [msg] = useState(() => {
    const last = localStorage.getItem(LAST_KEY)
    localStorage.setItem(LAST_KEY, new Date().toISOString())
    if (!last) return "Hi. I'm glad you're here."
    const gap = daysSince(last)
    if (gap >= 3) return 'Welcome back. No catching up needed.'
    const h = new Date().getHours()
    return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.'
  })
  return msg
}

export function Home() {
  const truth = useDailyTruth()
  const nav = useNavigate()
  const welcome = useWelcome()
  const settings = useSettings()
  const value = useDailyValue()
  const [drafts, setDrafts] = useState<{ key: string; label: string; to: string }[]>([])
  useEffect(() => {
    const all = [
      { key: 'check-in', label: 'an unfinished check-in', to: '/check-in' },
      { key: 'release', label: 'an unfinished release entry', to: '/release/new' },
      { key: 'boundary', label: 'a boundary draft in progress', to: '/boundaries/new' },
    ]
    setDrafts(all.filter((d) => hasDraft(d.key)))
  }, [])

  return (
    <Shell action={<Link to="/settings" className="btn btn-icon btn-ghost" aria-label="Settings"><GearIcon /></Link>}>
      <div className="stack-lg">
        <div>
          <h1>{welcome}</h1>
          <p className="muted">You're not crazy, and you're not alone.</p>
        </div>

        {drafts.length > 0 && (
          <div className="notice notice-sage">
            You have {drafts[0].label}. <Link to={drafts[0].to}>Pick up where you left off</Link>, or leave it for now. Either is fine.
          </div>
        )}

        {reviewDue(settings) && (
          <div className="notice">
            It's been a while since you looked at your circles. <Link to="/circles/review">A gentle review</Link> is there when you want it. No rush.
          </div>
        )}

        {truth && (
          <section aria-label="Today's truth">
            <div className="faint" style={{ marginBottom: 6 }}>Today's truth</div>
            <TruthCard truth={truth} />
          </section>
        )}

        <button type="button" className="btn btn-primary btn-big btn-block" onClick={() => nav('/pause')}>
          Something stung
        </button>
        <button type="button" className="btn btn-sage btn-lg btn-block" onClick={() => nav('/unhooked/loop')}>
          I'm in a loop
        </button>
        {value && <p className="faint center" style={{ margin: 0 }}>Today, quietly: <strong>{value.name}</strong>{value.meaning ? ` · ${value.meaning}` : ''}</p>}

        <div className="grid-links">
          <Link to="/check-in">Fact vs. Story<span>Untangle what happened</span></Link>
          <Link to="/jesus">Walk With Jesus<span>How He handled it</span></Link>
          <Link to="/boundaries">Boundary Builder<span>Draft a kind no</span></Link>
          <Link to="/release/new">Release Journal<span>Bring it to God</span></Link>
          <Link to="/wins">Log a Win<span>I honored myself</span></Link>
          <Link to="/circles">My Circles<span>Who sits where</span></Link>
          <Link to="/unhooked">Unhooked<span>Beyond the loop</span></Link>
        </div>

        <button type="button" className="btn btn-lg btn-block" style={{ background: 'var(--gold-soft)' }} onClick={() => nav('/hurting')}>
          I'm hurting
        </button>
      </div>
    </Shell>
  )
}
