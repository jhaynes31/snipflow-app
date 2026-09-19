import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { StepActions, Stepper } from '@/components/Stepper'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId, now } from '@/db/db'
import type { FlagPattern } from '@/db/types'
import flagPatterns from '@/data/flagPatterns.json'
import { HYPERVIGILANCE_CHECK } from '@/data/circles'

const PATTERNS = flagPatterns as FlagPattern[]

export function FlagLibrary() {
  return (
    <Shell back="/circles" title="Red flags library" subtitle="Behaviors, not people. Noticing a pattern isn't the same as labeling someone. Watch for repetition.">
      <div className="stack-lg">
        <section className="card-sage">
          <h3>Not every hurt is manipulation.</h3>
          <p className="small" style={{ margin: 0 }}>It helps to separate three things: <strong>harm with intent or control</strong> (manipulation), <strong>harm from limited capacity</strong> (overwhelm, neurodivergence, exhaustion, poor skills), and <strong>a single human mistake</strong>. All three can still need a boundary. The difference changes <em>how</em> you respond, not <em>whether</em> you're allowed to protect yourself.</p>
        </section>
        <div className="list">
          {PATTERNS.map((p) => (
            <Link key={p.id} to={`/circles/flags/${p.id}`} className="item card-link">
              <div className="item-title">{p.name}{p.isSpiritual && <span className="chip chip-sm" style={{ marginLeft: 8 }}>faith</span>}</div>
              <div className="small muted">{p.looksLike}</div>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function FlagDetail() {
  const { id } = useParams()
  const p = PATTERNS.find((x) => x.id === id)
  if (!p) return <Shell back="/circles/flags"><p className="faint">Not found.</p></Shell>
  return (
    <Shell back="/circles/flags">
      <article className="stack-lg">
        <h1>{p.name}</h1>
        <section><h3>What it can look like</h3><p>{p.looksLike}</p></section>
        <section className="card-soft"><h3>How it might feel in my body</h3><p style={{ margin: 0 }}>{p.bodyCues}</p></section>
        <section className="card-gold"><h3>A question to ask myself</h3><p className="truth" style={{ margin: 0 }}>{p.selfQuestion}</p></section>
        <section className="card-sage"><h3>A possible boundary response</h3><p style={{ margin: 0 }}>{p.boundaryResponse}</p></section>
        <p className="help">Naming a behavior is information, not a verdict on the person. Watch for repetition.</p>
        <Link to="/boundaries/new" className="btn btn-ghost">Draft the words in Boundary Builder</Link>
      </article>
    </Shell>
  )
}

/** Log a red flag on a person, with a hypervigilance check first. */
export function LogRedFlag() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const person = useLiveQuery(() => (id ? db.people.get(id) : undefined), [id])
  const priorFlags = useLiveQuery(() => (id ? db.redFlags.where('personId').equals(id).toArray() : []), [id]) ?? []
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [patternId, setPatternId] = useState(params.get('pattern') ?? '')
  const [note, setNote] = useState('')
  const total = HYPERVIGILANCE_CHECK.length + 1

  if (!person) return <Shell back="/circles"><p className="faint">Loading…</p></Shell>

  const repeats = priorFlags.filter((f) => f.patternId === patternId).length

  const save = async () => {
    if (!patternId) return
    const fact = answers.fact ? `${answers.fact}${note ? ` · ${note.trim()}` : ''}` : note.trim()
    await db.redFlags.add({ id: newId(), personId: person.id, patternId, note: fact, date: now(), status: 'open' })
    nav(`/people/${person.id}`, { replace: true })
  }

  if (step < HYPERVIGILANCE_CHECK.length) {
    const q = HYPERVIGILANCE_CHECK[step]
    return (
      <Shell back={`/people/${person.id}`} hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => setStep(HYPERVIGILANCE_CHECK.length)}>Skip the check</button>}>
        <Stepper step={step} total={total} />
        <p className="faint">A quick check first. It keeps this protective without feeding fear.</p>
        <p className="question">{q.q}</p>
        <p className="hint">{q.hint}</p>
        <VoiceTextarea value={answers[q.key] ?? ''} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} single={q.key === 'fact'} />
        <StepActions onBack={step > 0 ? () => setStep(step - 1) : undefined} onNext={() => setStep(step + 1)} onSkip={() => setStep(step + 1)} />
      </Shell>
    )
  }

  return (
    <Shell back={`/people/${person.id}`} hideNav>
      <Stepper step={step} total={total} />
      <p className="question">Which pattern does this look like?</p>
      <p className="hint">Behaviors, not verdicts. Pick the closest fit.</p>
      <div className="chips">{PATTERNS.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={patternId === p.id} onClick={() => setPatternId(p.id)}>{p.name}</button>)}</div>
      {patternId && repeats > 0 && <div className="notice mt">This is the {repeats + 1}{repeats + 1 === 2 ? 'nd' : repeats + 1 === 3 ? 'rd' : 'th'} time you've noted {PATTERNS.find((p) => p.id === patternId)?.name?.toLowerCase()} with {person.name}. Repetition is what makes it a pattern.</div>}
      {patternId && <p className="help mt">{PATTERNS.find((p) => p.id === patternId)?.selfQuestion}</p>}
      <input className="input mt" value={note} placeholder="A note (optional)" onChange={(e) => setNote(e.target.value)} aria-label="Note" />
      <div className="btn-row mt">
        <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!patternId}>Log watch note</button>
      </div>
    </Shell>
  )
}
