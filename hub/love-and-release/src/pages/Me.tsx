import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { db } from '@/db/db'
import { useNotices } from '@/lib/notices'
import { updateSettings, useSettings } from '@/lib/settings'
import { cyclePosition } from '@/lib/cycle'
import { useValues } from '@/lib/unhooked'
import { fmtDate } from '@/lib/dates'

export function Me() {
  const s = useSettings()
  const values = useValues()
  const notices = useNotices()
  const cycle = cyclePosition(s)
  const counts = useLiveQuery(async () => ({ truths: await db.truths.count(), wins: await db.wins.count(), daily: await db.daily.count() }), [])
  return (
    <Shell title={s.name ? `${s.name}` : 'Me'} subtitle="Who I am beyond the loop, what I'm living for, and how far I've come.">
      <div className="stack-lg">
        <section>
          <h3>What I've noticed</h3>
          <div className="stack">{notices.slice(0, 3).map((n) => <Speak key={n.id}>{n.text}{n.link && <> <Link to={n.link}>{n.linkLabel ?? 'Open'}</Link></>}</Speak>)}</div>
          <Link to="/notices" className="btn btn-quiet btn-sm mt">Everything I've noticed</Link>
        </section>
        <div className="grid-links">
          <Link to="/truths">Truths Deck<span>{counts?.truths ?? ''} to hold onto</span></Link>
          <Link to="/unhooked/values">My values<span>{values.length ? values.map((v) => v.name).join(', ') : 'Not chosen yet'}</span></Link>
          <Link to="/unhooked/me">Who I am<span>Beyond the loop</span></Link>
          <Link to="/wins">Wins<span>{counts?.wins ?? ''} times I honored myself</span></Link>
          <Link to="/unhooked/progress">Skills and freedom<span>The garden</span></Link>
          <Link to="/why">Why my brain does this<span>CPTSD, ND, and the body</span></Link>
          <Link to="/daily/morning">Morning<span>Whose I am today</span></Link>
          <Link to="/daily/evening">Evening<span>Set today down</span></Link>
        </div>
        <section className="card">
          <h3>My month</h3>
          <p className="help">Optional. If the week before your period is a low place, I can gently name it when it's coming, and notice how much of the hard stuff lands there.</p>
          <div className="switch"><div><div style={{ fontWeight: 700 }}>Track my cycle</div></div><button type="button" role="switch" aria-checked={!!s.cycleTracking} aria-label="Track my cycle" className="toggle" onClick={() => updateSettings({ cycleTracking: !s.cycleTracking })} /></div>
          {s.cycleTracking && (
            <div className="stack mt">
              <div className="field"><label className="label" htmlFor="cs">Most recent period started</label><input id="cs" className="input" type="date" value={s.cycleStart ?? ''} onChange={(e) => updateSettings({ cycleStart: e.target.value || undefined })} /></div>
              <div className="row">
                <div className="field grow"><label className="label" htmlFor="cl">Cycle length (days)</label><input id="cl" className="input" type="number" min={20} max={45} value={s.cycleLength ?? 28} onChange={(e) => updateSettings({ cycleLength: Number(e.target.value) || 28 })} /></div>
                <div className="field grow"><label className="label" htmlFor="ld">Hard days before</label><input id="ld" className="input" type="number" min={2} max={16} value={s.lowDays ?? 10} onChange={(e) => updateSettings({ lowDays: Number(e.target.value) || 10 })} /></div>
              </div>
              {cycle && <p className="help">Day {cycle.day} of about {cycle.length}. {cycle.inLowWindow ? 'This is the harder stretch. Be extra gentle with yourself.' : `About ${cycle.daysUntilPeriod} days until the next one.`}</p>}
              <Link to="/why/pmdd" className="btn btn-sm btn-ghost">About PMS and PMDD</Link>
            </div>
          )}
        </section>
        <section className="card">
          <h3>What I'd like to be called</h3>
          <input className="input" value={s.name ?? ''} placeholder="A name, a nickname, or leave it blank" onChange={(e) => updateSettings({ name: e.target.value })} aria-label="What I'd like to be called" />
          <p className="help">Only used when I talk to you.</p>
        </section>
        {counts && counts.daily > 0 && <p className="faint center">{counts.daily} daily check-ins so far. No streaks. Just a record of showing up. Last one {fmtDate(new Date().toISOString())}.</p>}
      </div>
    </Shell>
  )
}

export function Notices() {
  const notices = useNotices()
  return (
    <Shell back="/me" title="What I've noticed" subtitle="Your own words, reflected back. Nothing here leaves your device.">
      <div className="stack">{notices.map((n) => <Speak key={n.id}>{n.text}{n.link && <> <Link to={n.link}>{n.linkLabel ?? 'Open'}</Link></>}</Speak>)}</div>
    </Shell>
  )
}
