import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { db } from '@/db/db'
import { CYCLE_STEPS, LEARN } from '@/data/unhooked'
import { FREEDOM_TYPES } from '@/data/options'
import { TOOLS } from '@/pages/UnhookedTools'
import { updateSettings, useSettings } from '@/lib/settings'
import { useState } from 'react'

export function UnhookedHome() {
  const s = useSettings()
  const counts = useLiveQuery(async () => ({
    practices: await db.skillPractices.count(),
    freedom: await db.wins.filter((w) => FREEDOM_TYPES.includes(w.type)).count(),
  }), [])
  return (
    <Shell title="Unhooked" subtitle="Ground, reconnect with myself, rest in Jesus, and move beyond the loop. Not just coping. Growing.">
      <div className="stack-lg">
        <Link to="/unhooked/loop" className="btn btn-primary btn-big btn-block">I'm in a loop</Link>
        <p className="help center" style={{ marginTop: -8 }}>The app will never tell you for sure. It will help you live without knowing for sure.</p>

        <Section title="In the moment">
          <div className="grid-links">
            {TOOLS.map((t) => <Link key={t.id} to={`/unhooked/tools/${t.id}`}>{t.title}<span>{t.desc}</span></Link>)}
          </div>
        </Section>

        <Section title="Understanding the loop">
          <div className="list">{LEARN.map((c) => <Link key={c.id} to={`/unhooked/learn/${c.id}`} className="item card-link"><div className="item-title">{c.title}</div><div className="item-meta">{c.minute}</div></Link>)}</div>
        </Section>

        <Section title="Beyond the loop">
          <div className="grid-links">
            <Link to="/unhooked/me">Who I am<span>Beyond the loop</span></Link>
            <Link to="/unhooked/values">My values<span>What I'm living for</span></Link>
            <Link to="/unhooked/tools/body-check">Body and needs<span>Hungry? Tired? Lonely?</span></Link>
            <Link to="/unhooked/tools/self-compassion">Self-compassion<span>A short break</span></Link>
          </div>
        </Section>

        <Section title="Rest in Jesus">
          <div className="grid-links">
            <Link to="/unhooked/jesus">Jesus in the storm<span>Cards, grace truths, breath prayers</span></Link>
            <Link to="/unhooked/tools/one-prayer">One prayer, then rest<span>Grace isn't earned twice</span></Link>
          </div>
        </Section>

        <Section title="Growth">
          <div className="grid-links">
            <Link to="/unhooked/map">Trigger and pattern map<span>What sets it off, what helps</span></Link>
            <Link to="/unhooked/ladder">Exposure ladder<span>ERP practice, one rung at a time</span></Link>
            <Link to="/unhooked/reassurance">Reassurance plan<span>Ask once, then let it be</span></Link>
            <Link to="/unhooked/progress">Skills and freedom moments<span>{counts ? `${counts.practices} practices · ${counts.freedom} freedom moments` : 'Growth over time'}</span></Link>
            <Link to="/unhooked/plan">If it gets loud again<span>My relapse plan</span></Link>
            <Link to="/unhooked/support">Support and safety<span>Therapist, ERP, crisis lines</span></Link>
          </div>
        </Section>

        <p className="faint center">A companion to care, not a diagnosis or treatment on its own.{s.therapistName ? ` Your therapist: ${s.therapistName}.` : ''}</p>
      </div>
    </Shell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3>{title}</h3>{children}</section>
}

/* ---------- education ---------- */
export function Learn() {
  const { id } = useParams()
  const card = LEARN.find((c) => c.id === id)
  if (!card) return <Shell back="/unhooked"><p className="faint">Not found.</p></Shell>
  return (
    <Shell back="/unhooked">
      <article className="stack-lg">
        <div><h1>{card.title}</h1><div className="faint">{card.minute}</div></div>
        <p className={card.kind === 'reframe' ? 'truth truth-lg' : ''}>{card.intro}</p>
        {card.kind === 'cycle' && <CycleDiagram />}
        {card.kind === 'cycle' && card.items && <div className="card-sage"><p style={{ margin: 0 }}><strong>The break point.</strong> {card.items[0]} {card.items[1]}</p></div>}
        {card.kind === 'list' && <ul className="list" style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>{card.items?.map((i) => <li key={i} className="item">{i}</li>)}</ul>}
        {card.kind === 'table' && (
          <div className="conscience">
            <div className="c-good c-head">Conscience</div><div className="c-ocd c-head">OCD / scrupulosity</div>
            {card.rows?.map(([a, b]) => <><div key={a} className="c-good">{a}</div><div key={b} className="c-ocd">{b}</div></>)}
          </div>
        )}
        {card.kind === 'reframe' && <div className="card-gold"><p style={{ margin: 0 }}>A thought showing up is not the same as wanting it, being it, or having done it. The loop wants you to treat noise as evidence. It isn't.</p></div>}
        {card.id === 'scrupulosity' && <div className="card-gold"><p className="truth" style={{ margin: 0 }}>Intrusive thoughts are not desires, character, or sin. They are noise the brain produces. What I do next is what matters.</p></div>}
        <div className="btn-row"><Link to="/unhooked/loop" className="btn btn-primary">I'm in a loop now</Link><Link to="/unhooked" className="btn btn-ghost">Back</Link></div>
      </article>
    </Shell>
  )
}

function CycleDiagram() {
  const n = CYCLE_STEPS.length, R = 120, C = 160
  const pts = CYCLE_STEPS.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) } })
  return (
    <svg viewBox="0 0 320 320" className="cycle" role="img" aria-label="The OCD cycle: trigger, intrusive thought, anxiety, compulsion, short relief, doubt returns">
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 6" />
      {pts.map((p, i) => {
        const isBreak = CYCLE_STEPS[i] === 'Compulsion'
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isBreak ? 30 : 24} fill={isBreak ? 'var(--accent)' : 'var(--surface)'} stroke={isBreak ? 'var(--accent)' : 'var(--line)'} strokeWidth="2" className={isBreak ? 'cycle-dot' : ''} />
            <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={isBreak ? 'var(--accent-text)' : 'var(--text)'}>
              {CYCLE_STEPS[i].split(' / ')[0].split(' ').slice(0, 2).join(' ')}
            </text>
          </g>
        )
      })}
      <text x={C} y={C - 6} textAnchor="middle" fontSize="9" fill="var(--text-soft)" fontWeight="700">the loop</text>
      <text x={C} y={C + 8} textAnchor="middle" fontSize="8" fill="var(--text-faint)">freedom is built at the break point</text>
    </svg>
  )
}

/* ---------- support & safety ---------- */
export function Support() {
  const s = useSettings()
  const [edit, setEdit] = useState(false)
  return (
    <Shell back="/unhooked" title="Support and safety" subtitle="This app is a companion to care, not a diagnosis or a treatment on its own.">
      <div className="stack-lg">
        <section className="card-accent">
          <h3>If you're not feeling safe</h3>
          <p>If you're having thoughts of harming yourself, or you don't feel safe, please reach out now. In the US you can call or text <strong>988</strong> (Suicide and Crisis Lifeline), any time. Outside the US, your local emergency number or crisis line.</p>
          <p style={{ margin: 0 }}>And tell one trusted person. You don't have to carry this alone, and you don't have to explain it perfectly.</p>
        </section>
        <section className="card">
          <div className="row-between"><h3 style={{ margin: 0 }}>My therapist or counselor</h3><button type="button" className="btn btn-quiet btn-sm" onClick={() => setEdit((v) => !v)}>{edit ? 'Done' : 'Edit'}</button></div>
          {edit ? (
            <div className="stack mt">
              <input className="input" value={s.therapistName ?? ''} placeholder="Name" onChange={(e) => updateSettings({ therapistName: e.target.value })} aria-label="Therapist name" />
              <input className="input" value={s.therapistContact ?? ''} placeholder="Phone, email, or portal" onChange={(e) => updateSettings({ therapistContact: e.target.value })} aria-label="Therapist contact" />
              <textarea className="textarea" value={s.therapistNotes ?? ''} placeholder="Notes: session day, what we're working on, homework" onChange={(e) => updateSettings({ therapistNotes: e.target.value })} aria-label="Therapist notes" />
            </div>
          ) : s.therapistName || s.therapistContact ? (
            <div className="mt"><div className="item-title">{s.therapistName}</div><div className="muted">{s.therapistContact}</div>{s.therapistNotes && <p className="small muted mt" style={{ whiteSpace: 'pre-line', margin: 0 }}>{s.therapistNotes}</p>}</div>
          ) : <p className="faint mt" style={{ margin: 0 }}>Optional. Keep their details here so they're one tap away when it's loud.</p>}
        </section>
        <section className="card">
          <h3>Finding support</h3>
          <p><strong>Exposure and Response Prevention (ERP)</strong> is the most researched treatment for OCD, including scrupulosity and relationship-focused OCD. It's a specific skill set, so it helps to look for a therapist trained in it.</p>
          <p style={{ margin: 0 }}>The <strong>International OCD Foundation</strong> (iocdf.org) has plain-language guides and a directory of providers who treat OCD. Faith-aware ERP therapists exist, and it's okay to ask for one.</p>
        </section>
        <section className="card-soft">
          <h3>What this app is, and isn't</h3>
          <p style={{ margin: 0 }}>It's a place to practice skills, log what a therapist assigns, and rest in Jesus. It won't give you certainty, on purpose. It isn't a diagnosis, and it isn't a substitute for a person who knows you.</p>
        </section>
      </div>
    </Shell>
  )
}

export function CrisisNotice() {
  return (
    <div className="notice" role="status">
      It sounds like it might be very heavy right now. If you're having thoughts of harming yourself or don't feel safe, please call or text <strong>988</strong> (US) or your local crisis line, and tell one trusted person. <Link to="/unhooked/support">Support options</Link>.
    </div>
  )
}
