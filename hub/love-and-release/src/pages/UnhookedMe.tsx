import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { StepActions, Stepper } from '@/components/Stepper'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId } from '@/db/db'
import { VALUE_OPTIONS, WHO_I_AM } from '@/data/unhooked'
import { useValues } from '@/lib/unhooked'
import { dayOfYear } from '@/lib/dates'

export function WhoIAm() {
  const nav = useNavigate()
  const profile = useLiveQuery(() => db.selfProfile.get('self'), [])
  const [i, setI] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const answers = profile?.answers ?? {}
  const set = (key: string, v: string) => db.selfProfile.put({ id: 'self', answers: { ...answers, [key]: v } })
  const filled = WHO_I_AM.filter((q) => answers[q.key]?.trim())

  if (reviewing || (profile && filled.length === WHO_I_AM.length && i === 0)) {
    return (
      <Shell back="/unhooked" title="Who I am beyond the loop" subtitle="Remembering who I am when the noise isn't running the show." action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => { setReviewing(false); setI(0); }}>Edit</button>}>
        <div className="stack">
          {WHO_I_AM.map((q) => answers[q.key] && <div key={q.key} className="card"><div className="label">{q.q}</div><p style={{ margin: '6px 0 0', whiteSpace: 'pre-line' }}>{answers[q.key]}</p></div>)}
          {filled.length === 0 && <p className="faint">Nothing here yet.</p>}
          <button type="button" className="btn btn-primary" onClick={() => { setReviewing(false); setI(0) }}>{filled.length ? 'Revisit the questions' : 'Start'}</button>
        </div>
      </Shell>
    )
  }

  const q = WHO_I_AM[i]
  const last = i === WHO_I_AM.length - 1
  return (
    <Shell back="/unhooked" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => setReviewing(true)}>My answers</button>}>
      <Stepper step={i} total={WHO_I_AM.length} />
      <p className="question">{q.q}</p>
      <p className="hint">Saved as you type. Skip anything.</p>
      <VoiceTextarea value={answers[q.key] ?? ''} onChange={(v) => set(q.key, v)} placeholder="…" />
      <StepActions onBack={i > 0 ? () => setI(i - 1) : undefined} onNext={() => (last ? nav('/unhooked/values') : setI(i + 1))} onSkip={() => (last ? nav('/unhooked/values') : setI(i + 1))} isLast={last} nextLabel={last ? 'Now, my values' : undefined} />
    </Shell>
  )
}

export function Values() {
  const values = useValues()
  const picked = values.map((v) => v.name)
  const setPicked = async (names: string[]) => {
    const removed = values.filter((v) => !names.includes(v.name))
    for (const r of removed) await db.coreValues.delete(r.id)
    for (const n of names) if (!picked.includes(n)) await db.coreValues.add({ id: newId(), name: n, meaning: '', order: values.length + names.indexOf(n) })
  }
  return (
    <Shell back="/unhooked" title="My values" subtitle="What I'm living for, so I have somewhere to go when the loop lets go.">
      <div className="stack-lg">
        <section>
          <div className="label">Pick what matters most (a handful is plenty)</div>
          <Chips options={VALUE_OPTIONS} value={picked} onChange={setPicked} allowCustom customLabel="My own" variant="sage" />
        </section>
        {values.length > 0 && (
          <section className="stack">
            <div className="label">What each one means to me</div>
            {values.map((v) => (
              <div key={v.id} className="card">
                <div className="item-title">{v.name}</div>
                <input className="input mt" value={v.meaning} placeholder={`What ${v.name.toLowerCase()} means to me…`} onChange={(e) => db.coreValues.update(v.id, { meaning: e.target.value })} aria-label={`What ${v.name} means to me`} />
              </div>
            ))}
            <p className="help">One of these will show quietly on the home screen from time to time.</p>
            <Link to="/unhooked/tools/values-action" className="btn btn-primary">Do one small true thing now</Link>
          </section>
        )}
      </div>
    </Shell>
  )
}

/** A quiet value reminder for the home screen, rotating by day. Shows on most days, not all. */
export function useDailyValue() {
  const values = useValues()
  const day = dayOfYear()
  if (!values.length || day % 3 === 0) return undefined
  return values[day % values.length]
}
