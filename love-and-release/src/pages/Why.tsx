import { Link, useParams } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { WHY } from '@/data/why'

export function WhyList() {
  return (
    <Shell back="/" title="Why my brain does this" subtitle="CPTSD, neurodivergence, and the body. Named out loud, so you never have to wonder if you're broken.">
      <div className="stack">
        <Speak>None of this is a character flaw. It's wiring and history. Knowing which one is talking makes it easier to answer kindly.</Speak>
        <div className="list">{WHY.map((w) => <Link key={w.id} to={`/why/${w.id}`} className="item card-link"><div className="item-title">{w.title}</div><div className="small muted">{w.whatItIs.split('. ')[0]}.</div></Link>)}</div>
      </div>
    </Shell>
  )
}

export function WhyCard() {
  const { id } = useParams()
  const w = WHY.find((x) => x.id === id)
  if (!w) return <Shell back="/why"><p className="faint">Not found.</p></Shell>
  return (
    <Shell back="/why">
      <article className="stack-lg">
        <h1>{w.title}</h1>
        <p>{w.whatItIs}</p>
        <section className="card-soft"><h3>How it can feel</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{w.howItFeels.map((h) => <li key={h}>{h}</li>)}</ul></section>
        <section className="card-sage"><h3>What helps</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{w.whatHelps.map((h) => <li key={h}>{h}</li>)}</ul></section>
        <div className="card-gold"><p className="truth" style={{ margin: 0 }}>{w.truth}</p></div>
        <div className="btn-row"><Link to="/comfort" className="btn btn-primary">I need comfort</Link><Link to="/" className="btn btn-ghost">Home</Link></div>
      </article>
    </Shell>
  )
}
