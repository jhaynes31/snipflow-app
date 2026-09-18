import { Link } from 'react-router-dom'
import { Shell } from '@/components/Shell'

/** Everything, for the days you know exactly what you want. */
export function More() {
  return (
    <Shell title="Everything" subtitle="Every tool, every module. For the days you know exactly what you want.">
      <div className="stack-lg">
        <section><h3>In the moment</h3><div className="grid-links">
          <Link to="/comfort">Comfort<span>I'll just be here</span></Link>
          <Link to="/pause">Pause<span>Something stung</span></Link>
          <Link to="/unhooked/loop">I'm in a loop<span>Step out of it</span></Link>
          <Link to="/fawn">Fawn alarm<span>Before the yes</span></Link>
          <Link to="/hurting">I'm hurting<span>Starred truths</span></Link>
          <Link to="/check-in">Fact vs. Story<span>Untangle it</span></Link>
        </div></section>
        <section><h3>Relationships</h3><div className="grid-links">
          <Link to="/circles">My Circles<span>Who sits where</span></Link>
          <Link to="/someone">Confused about someone<span>Look at what's there</span></Link>
          <Link to="/boundaries">Boundary Builder<span>Drafts and templates</span></Link>
          <Link to="/circles/flags">Red flags library<span>Behaviors, not people</span></Link>
          <Link to="/circles/boundaries">Boundaries by layer<span>What each ring gets</span></Link>
          <Link to="/threads">Threads<span>One story per situation</span></Link>
        </div></section>
        <section><h3>Reflection and growth</h3><div className="grid-links">
          <Link to="/release/new">Release Journal<span>Bring it to God</span></Link>
          <Link to="/wins">Wins<span>I honored myself</span></Link>
          <Link to="/unhooked">Unhooked<span>All the OCD tools</span></Link>
          <Link to="/why">Why my brain does this<span>CPTSD and ND</span></Link>
          <Link to="/daily/morning">Morning<span>Whose I am</span></Link>
          <Link to="/daily/evening">Evening<span>Set today down</span></Link>
          <Link to="/history">History<span>Everything, filterable</span></Link>
          <Link to="/settings">Settings<span>Theme, passcode, backup</span></Link>
        </div></section>
      </div>
    </Shell>
  )
}
