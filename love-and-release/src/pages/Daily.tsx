import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { Chips } from '@/components/Chips'
import { JesusLine } from '@/components/JesusLine'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { Stepper } from '@/components/Stepper'
import { TruthCard, useDailyTruth } from '@/components/TruthCard'
import { db, newId, now } from '@/db/db'
import { EVENING, MORNING } from '@/data/companion'
import { dayKey } from '@/lib/dates'
import { useSettings } from '@/lib/settings'
import { useValues } from '@/lib/unhooked'
import { cyclePosition } from '@/lib/cycle'
import { WINS } from '@/data/options'

export function useTodayDaily() {
  const today = dayKey()
  return useLiveQuery(async () => { const rows = await db.daily.where('date').equals(today).toArray(); return { morning: rows.find((r) => r.kind === 'morning'), evening: rows.find((r) => r.kind === 'evening') } }, [today])
}

/** Picks morning or evening by the clock and what's already done. */
export function Daily() {
  const nav = useNavigate()
  const today = useTodayDaily()
  useEffect(() => {
    if (!today) return
    const h = new Date().getHours()
    const eveningTime = h >= 17 || h < 4
    if (eveningTime && !today.evening) nav('/daily/evening', { replace: true })
    else if (!eveningTime && !today.morning) nav('/daily/morning', { replace: true })
    else if (!today.evening) nav('/daily/evening', { replace: true })
    else nav('/me', { replace: true })
  }, [today, nav])
  return null
}

export function Morning() {
  const nav = useNavigate()
  const values = useValues()
  const truth = useDailyTruth()
  const settings = useSettings()
  const cycle = cyclePosition(settings)
  const [step, setStep] = useState(0)
  const [intentions, setIntentions] = useState<string[]>([])
  const [body, setBody] = useState<string[]>([])
  const whose = MORNING.whose[new Date().getDate() % MORNING.whose.length]
  const value = values.length ? values[new Date().getDate() % values.length] : undefined
  const save = async () => { await db.daily.add({ id: newId(), date: dayKey(), kind: 'morning', answers: { whose, intentions, body, value: value?.name ?? '' }, createdAt: now() }); nav('/', { replace: true }) }
  return (
    <Shell back="/" hideNav>
      <Stepper step={step} total={3} />
      {step === 0 && (<div className="stack-lg">
        <Speak><p>Morning{settings.name ? `, ${settings.name}` : ''}. Before anything happens today, this is true:</p></Speak>
        <div className="card-gold"><p className="truth truth-lg" style={{ margin: 0 }}>{whose}</p></div>
        {truth && <TruthCard truth={truth} tone="sage" />}
        {cycle?.inLowWindow && <Speak tone="gold">It's the harder stretch of the month. Today's list is allowed to be short.</Speak>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(1)}>Okay</button>
      </div>)}
      {step === 1 && (<div className="stack">
        <Speak>{value ? <>Today, quietly: <strong>{value.name}</strong>{value.meaning ? `. ${value.meaning}` : ''}. One intention that fits it?</> : 'One small intention for today. Not a goal. A direction.'}</Speak>
        <Chips options={MORNING.intentions} value={intentions} onChange={setIntentions} allowCustom customLabel="My own" variant="sage" />
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(2)}>{intentions.length ? 'That\'s my direction' : 'No intention today, and that\'s fine'}</button>
      </div>)}
      {step === 2 && (<div className="stack">
        <p className="question">How's the body this morning?</p>
        <Chips options={EVENING.body} value={body} onChange={setBody} />
        <JesusLine tags={['Needing rest', 'Pressure to perform or prove myself']} quiet />
        <button type="button" className="btn btn-primary btn-block" onClick={save}>Go gently</button>
      </div>)}
    </Shell>
  )
}

export function Evening() {
  const nav = useNavigate()
  const settings = useSettings()
  const [step, setStep] = useState(0)
  const [loved, setLoved] = useState<string[]>([])
  const [fawned, setFawned] = useState<string[]>([])
  const [honored, setHonored] = useState<string[]>([])
  const [body, setBody] = useState<string[]>([])
  const [setting, setSetting] = useState('')
  const [prayer, setPrayer] = useState('')
  const save = async () => {
    const ts = now()
    await db.daily.add({ id: newId(), date: dayKey(), kind: 'evening', answers: { loved, fawned, honored, body, setting, prayer }, createdAt: ts })
    const winTypes = honored.map((h) => WINS.find((w) => w.label.replace(/^I /, '').toLowerCase() === h.toLowerCase())?.type).filter(Boolean)
    if (winTypes.length) await db.wins.bulkAdd(winTypes.map((type) => ({ id: newId(), type: type!, note: 'From tonight\'s check-in', createdAt: ts })))
    nav('/', { replace: true })
  }
  return (
    <Shell back="/" hideNav>
      <Stepper step={step} total={5} />
      {step === 0 && (<div className="stack">
        <Speak>Evening{settings.name ? `, ${settings.name}` : ''}. Let's set today down together. Where did you feel loved?</Speak>
        <Chips options={EVENING.loved} value={loved} onChange={setLoved} allowCustom variant="sage" />
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(1)}>Next</button>
      </div>)}
      {step === 1 && (<div className="stack">
        <Speak>Where did the fawn show up? No shame. Just noticing, like a friend would.</Speak>
        <Chips options={EVENING.fawned} value={fawned} onChange={setFawned} allowCustom />
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(2)}>Next</button>
      </div>)}
      {step === 2 && (<div className="stack">
        <Speak>And where did you honor yourself? Even a small one. Especially a small one.</Speak>
        <Chips options={EVENING.honored} value={honored} onChange={setHonored} allowCustom variant="sage" />
        <p className="help">These become wins. I'll log them for you.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(3)}>Next</button>
      </div>)}
      {step === 3 && (<div className="stack">
        <p className="question">How's the body tonight?</p>
        <Chips options={EVENING.body} value={body} onChange={setBody} />
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(4)}>Next</button>
      </div>)}
      {step === 4 && (<div className="stack">
        <Speak>What are you setting down before sleep? It'll keep until morning, and you don't have to carry it there.</Speak>
        <VoiceTextarea value={setting} onChange={setSetting} placeholder="Tonight I set down…" />
        <JesusLine tags={['Needing rest', 'Anxiety & Uncertainty', 'Grief over someone\'s choices']} />
        <VoiceTextarea single value={prayer} onChange={setPrayer} placeholder="One line of prayer, or just Amen (optional)" />
        <button type="button" className="btn btn-primary btn-block" onClick={save}>Amen. Goodnight.</button>
      </div>)}
      <p className="faint center mt"><Link to="/">Skip tonight</Link>. No streaks here.</p>
    </Shell>
  )
}
