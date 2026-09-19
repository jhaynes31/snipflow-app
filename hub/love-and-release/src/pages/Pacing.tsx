import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { Chips } from '@/components/Chips'
import { JesusLine } from '@/components/JesusLine'
import { Stepper } from '@/components/Stepper'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { Avatar } from '@/pages/Circles'
import { db, newId, now } from '@/db/db'
import { UNSURE, type Pace, type Person } from '@/db/types'
import { ACCESS_ITEMS, PERSON_COLORS, RELATIONSHIP_TYPES } from '@/data/circles'
import { CHECKIN_MILESTONES, DISCLOSURE_HOLD_DEFAULT, HALO_QUESTIONS, PACE_DAYS_BY_ORDER, PACE_NAMING, PACE_OPENERS, PACE_TRUTH, USED_QUESTIONS, USED_READS, WATCH_FOR } from '@/data/pacing'
import { dayKey, daysSince, fmtDate } from '@/lib/dates'
import { placementName, timeKnown, usePersonSignals, useRings } from '@/lib/circles'
import { logFreedomWin } from '@/lib/unhooked'

const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d) }

/** "I met someone and I'm excited": set the pace before the attachment sets in. */
export function NewPerson() {
  const nav = useNavigate()
  const rings = useRings()
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const [step, setStep] = useState(0)
  const [existingId, setExistingId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [type, setType] = useState<string[]>([])
  const [target, setTarget] = useState<string>('')
  const [days, setDays] = useState<number>(60)
  const [hold, setHold] = useState<string[]>(DISCLOSURE_HOLD_DEFAULT)
  const [watch, setWatch] = useState<string[]>(WATCH_FOR.slice(0, 5))
  const [note, setNote] = useState('')
  const opener = useMemo(() => PACE_OPENERS[new Date().getDate() % PACE_OPENERS.length], [])
  const outer = rings[rings.length - 1]
  const friends = rings.find((r) => r.order === 2) ?? rings[Math.min(2, rings.length - 1)]

  const pickTarget = (id: string) => { setTarget(id); const r = rings.find((x) => x.id === id); setDays(PACE_DAYS_BY_ORDER[r?.order ?? 2] ?? 60) }
  const save = async () => {
    const pace: Pace = { setAt: now(), notBefore: addDays(days), targetRingId: target || friends?.id, disclosureHold: hold, watch, note: note.trim(), checkins: [] }
    let id = existingId
    if (!id) {
      if (!name.trim()) return
      const p: Person = { id: newId(), name: name.trim(), role: role.trim() || type[0] || 'New person', notes: '', createdAt: now(), ringId: outer?.id ?? UNSURE, relationshipType: type[0], metDate: dayKey(), color: PERSON_COLORS[people.length % PERSON_COLORS.length], pace }
      await db.people.add(p); id = p.id
    } else await db.people.update(id, { pace, metDate: (await db.people.get(id))?.metDate ?? dayKey() })
    await logFreedomWin('sat-with-uncertainty', `Set a pace with ${name || people.find((p) => p.id === id)?.name}`)
    nav(`/pace/${id}`, { replace: true })
  }

  return (
    <Shell back="/" hideNav>
      <Stepper step={step} total={5} />
      {step === 0 && (<div className="stack-lg">
        <Speak><p><strong>{opener}</strong></p><p>{PACE_NAMING}</p></Speak>
        <JesusLine tags={['Going slow & self-protection']} />
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(1)}>Okay. Let's set a pace.</button>
      </div>)}

      {step === 1 && (<div className="stack">
        <p className="question">Who is it?</p>
        {people.length > 0 && <select className="select" value={existingId} onChange={(e) => setExistingId(e.target.value)} aria-label="Someone already in my circles"><option value="">Someone new</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name} · {placementName(p.ringId, rings)}</option>)}</select>}
        {!existingId && (<>
          <input className="input" value={name} placeholder="Name" onChange={(e) => setName(e.target.value)} aria-label="Name" />
          <input className="input" value={role} placeholder="Who they are to me, so far" onChange={(e) => setRole(e.target.value)} aria-label="Who they are to me" />
          <Chips options={RELATIONSHIP_TYPES} value={type} onChange={setType} single />
          <p className="help">They'll start in the {outer?.name ?? 'outer circle'}. That's not cold. That's wise. Everyone starts there.</p>
        </>)}
        <button type="button" className="btn btn-primary btn-block" disabled={!existingId && !name.trim()} onClick={() => setStep(2)}>Next</button>
      </div>)}

      {step === 2 && (<div className="stack">
        <Speak>Where do you feel them heading? I'll suggest how long to wait before they get there. Time is the one thing that can't be faked.</Speak>
        <div className="chips">{rings.filter((r) => r !== outer).map((r) => <button key={r.id} type="button" className="chip" aria-pressed={target === r.id} onClick={() => pickTarget(r.id)}><span className="ring-swatch" style={{ background: r.color }} />{r.name}</button>)}</div>
        <div className="label">Not before</div>
        <div className="chips">{[14, 30, 60, 90, 180, 365].map((n) => <button key={n} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={days === n} onClick={() => setDays(n)}>{n < 30 ? `${n} days` : n < 365 ? `${Math.round(n / 30)} months` : 'A year'}</button>)}</div>
        <p className="help">If they're still here, still consistent, and still kind after {days < 30 ? `${days} days` : days < 365 ? `${Math.round(days / 30)} months` : 'a year'}, that's when we look again. Not because of a feeling. Because of a date.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(3)}>Next</button>
      </div>)}

      {step === 3 && (<div className="stack">
        <Speak>What are you holding back for now? These are pearls. They come out when they've been earned, not when it feels safe.</Speak>
        <Chips options={ACCESS_ITEMS.filter((a) => !a.startsWith('My time'))} value={hold} onChange={setHold} allowCustom />
        <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(4)}>Next</button>
      </div>)}

      {step === 4 && (<div className="stack">
        <Speak>What will you watch for? Small things. People show you who they are in the mundane.</Speak>
        <Chips options={WATCH_FOR} value={watch} onChange={setWatch} allowCustom variant="sage" />
        <VoiceTextarea value={note} onChange={setNote} placeholder="Anything else future-you should remember about right now (optional)" />
        <div className="card-gold"><p className="truth" style={{ margin: 0 }}>{PACE_TRUTH}</p></div>
        <button type="button" className="btn btn-primary btn-block" onClick={save}>Set the pace</button>
      </div>)}
    </Shell>
  )
}

/** A person's pace: what they've shown, the halo check, the used check, the favor log. */
export function PacePage() {
  const { personId } = useParams()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') ?? 'review'
  const nav = useNavigate()
  const rings = useRings()
  const person = useLiveQuery(() => (personId ? db.people.get(personId) : undefined), [personId])
  const sig = usePersonSignals(personId)
  const favors = useLiveQuery(() => (personId ? db.favors.where('personId').equals(personId).reverse().sortBy('date') : []), [personId]) ?? []
  const checks = useLiveQuery(() => (personId ? db.paceChecks.where('personId').equals(personId).reverse().sortBy('createdAt') : []), [personId]) ?? []
  const [asked, setAsked] = useState(''); const [saidYes, setSaidYes] = useState(true); const [theyGave, setTheyGave] = useState('')
  const [watchAnswers, setWatchAnswers] = useState<Record<string, string>>({})
  if (!person || !sig) return <Shell back="/circles"><p className="faint">Loading…</p></Shell>
  const pace = person.pace
  const known = timeKnown(person)
  const daysKnown = person.metDate ? daysSince(person.metDate) : null
  const target = rings.find((r) => r.id === pace?.targetRingId)
  const waitLeft = pace ? Math.ceil((new Date(pace.notBefore + 'T00:00:00').getTime() - Date.now()) / 86_400_000) : null
  const gaveCount = favors.filter((f) => f.theyGave.trim()).length, askedCount = favors.length, yesCount = favors.filter((f) => f.saidYes).length
  const { reciprocity, signals, openFlags, disclosures } = sig
  const badDisclosures = disclosures.filter((d) => d.outcome === 'shared-without-permission' || d.outcome === 'used-against-me' || d.outcome === 'dismissed').length

  const logFavor = async () => { if (!asked.trim()) return; await db.favors.add({ id: newId(), personId: person.id, asked: asked.trim(), saidYes, theyGave: theyGave.trim(), date: now() }); setAsked(''); setTheyGave(''); setSaidYes(true) }
  const doneCheckin = async () => { await db.people.update(person.id, { pace: { ...pace!, checkins: [...(pace?.checkins ?? []), dayKey()] } }); await db.paceChecks.add({ id: newId(), personId: person.id, kind: 'review', answers: watchAnswers, verdict: read, createdAt: now() }); setWatchAnswers({}) }

  const read = (() => {
    const parts: string[] = []
    parts.push(known ? `You've known ${person.name} ${known}.` : `I don't know when you met ${person.name}.`)
    if (pace && waitLeft !== null) parts.push(waitLeft > 0 ? `The pace you set says not closer than ${placementName(person.ringId, rings)} until ${fmtDate(pace.notBefore)}, ${waitLeft} day${waitLeft === 1 ? '' : 's'} from now.` : `The date you set has passed. If what they've shown holds up, you can look at ${target?.name ?? 'moving closer'} with clear eyes.`)
    parts.push(`${signals.length} green flag${signals.length === 1 ? '' : 's'}, ${openFlags.length} open watch note${openFlags.length === 1 ? '' : 's'}. Reciprocity in 90 days: they ${reciprocity.them}, you ${reciprocity.me}.`)
    if (askedCount) parts.push(`They've asked ${askedCount} favor${askedCount === 1 ? '' : 's'}${yesCount ? `, you said yes to ${yesCount}` : ''}, and gave something back ${gaveCount} time${gaveCount === 1 ? '' : 's'}.`)
    if (badDisclosures) parts.push(`${badDisclosures} thing${badDisclosures === 1 ? '' : 's'} you shared didn't land safely. That's the pearls test, and they didn't pass it.`)
    const drain = reciprocity.oneSided || (askedCount >= 2 && gaveCount === 0) || badDisclosures > 0
    parts.push(drain ? 'The shape so far leans one way. Not a verdict. A reason to keep the pace and hold the pearls.' : signals.length >= 3 && !openFlags.length ? 'The shape so far is good. Slow is still right. Good and slow can both be true.' : 'Not enough yet to say much. That\'s fine. That\'s what time is for.')
    return parts.join(' ')
  })()

  return (
    <Shell back={`/people/${person.id}`}>
      <div className="stack-lg">
        <div className="row"><Avatar person={person} size={48} /><div><h1 style={{ marginBottom: 0 }}>{person.name}</h1><div className="muted">{placementName(person.ringId, rings)}{known ? ` · known ${known}` : ''}</div></div></div>
        <div className="chips">{(['review', 'halo', 'used'] as const).map((m) => <button key={m} type="button" className="chip" aria-pressed={mode === m} onClick={() => setParams({ mode: m })}>{m === 'review' ? 'What they\'ve shown' : m === 'halo' ? 'Halo check' : 'Am I being used?'}</button>)}</div>

        {mode === 'review' && (<>
          <Speak>{read}</Speak>
          {pace ? (
            <section className="card">
              <div className="row-between"><h3 style={{ margin: 0 }}>The pace</h3><Link to="/new-person" className="btn btn-quiet btn-sm">Reset</Link></div>
              <div className="kv mt">
                <dt>Not before</dt><dd>{fmtDate(pace.notBefore)}{target ? ` for ${target.name}` : ''}</dd>
                <dt>Holding back</dt><dd>{pace.disclosureHold.length ? pace.disclosureHold.join(', ') : 'Nothing held'}</dd>
                {pace.note && <><dt>Note to self</dt><dd>{pace.note}</dd></>}
              </div>
            </section>
          ) : <Speak tone="gold">No pace set for {person.name} yet. <Link to="/new-person">Set one</Link>, even now. It's never too late to slow down.</Speak>}
          {pace && pace.watch.length > 0 && (
            <section className="card stack">
              <h3>What have they shown?</h3>
              {pace.watch.map((w) => (
                <div key={w} className="stack" style={{ gap: 6 }}>
                  <div className="small" style={{ fontWeight: 700 }}>{w}</div>
                  <div className="chips">{['Yes, good', 'Not yet seen', 'Not good'].map((a) => <button key={a} type="button" className={`chip chip-sm ${a === 'Yes, good' ? 'chip-sage' : ''}`} style={{ cursor: 'pointer' }} aria-pressed={watchAnswers[w] === a} onClick={() => setWatchAnswers({ ...watchAnswers, [w]: a })}>{a}</button>)}</div>
                </div>
              ))}
              <button type="button" className="btn btn-sage" onClick={doneCheckin} disabled={!Object.keys(watchAnswers).length}>Log this check-in</button>
              {pace.checkins.length > 0 && <p className="help">Check-ins so far: {pace.checkins.map(fmtDate).join(', ')}.{daysKnown !== null && ` Next milestone: ${CHECKIN_MILESTONES.find((m) => m > daysKnown) ?? 'you\'re past them all'}${typeof CHECKIN_MILESTONES.find((m) => m > daysKnown) === 'number' ? ' days' : ''}.`}</p>}
            </section>
          )}
          <section className="card stack">
            <h3>Favors and gifts</h3>
            <p className="help">Not scorekeeping. Just making the flow visible, because the halo hides it.</p>
            <input className="input" value={asked} placeholder="They asked me for…" onChange={(e) => setAsked(e.target.value)} aria-label="They asked me for" />
            <div className="chips"><button type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={saidYes} onClick={() => setSaidYes(true)}>I said yes</button><button type="button" className="chip chip-sm chip-sage" style={{ cursor: 'pointer' }} aria-pressed={!saidYes} onClick={() => setSaidYes(false)}>I said no</button></div>
            <input className="input" value={theyGave} placeholder="What they've given me, if anything (optional)" onChange={(e) => setTheyGave(e.target.value)} aria-label="What they gave" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={logFavor} disabled={!asked.trim()}>Log it</button>
            {favors.slice(0, 8).map((f) => <div key={f.id} className="item small"><strong>{f.asked}</strong> · {f.saidYes ? 'said yes' : 'said no'}{f.theyGave ? ` · they gave: ${f.theyGave}` : ''}<div className="item-meta">{fmtDate(f.date)}</div></div>)}
          </section>
          <JesusLine tags={['Going slow & self-protection']} salt={1} quiet />
          {checks.filter((c) => c.kind !== 'review').length > 0 && <details className="acc"><summary><span>Past checks</span><span className="faint">{checks.length}</span></summary><div className="acc-body list">{checks.map((c) => <div key={c.id} className="item small"><div style={{ fontWeight: 700 }}>{c.kind === 'halo' ? 'Halo check' : c.kind === 'used' ? 'Am I being used?' : 'Check-in'}</div><div className="muted">{c.verdict}</div><div className="item-meta">{fmtDate(c.createdAt)}</div></div>)}</div></details>}
          <div className="btn-row"><Link to={`/circles/move/${person.id}`} className="btn btn-ghost">Move review</Link><button type="button" className="btn btn-primary" onClick={() => nav(`/people/${person.id}`)}>Their profile</button></div>
        </>)}

        {mode === 'halo' && <HaloCheck person={person} onDone={() => setParams({ mode: 'review' })} />}
        {mode === 'used' && <UsedCheck person={person} onDone={() => setParams({ mode: 'review' })} />}
      </div>
    </Shell>
  )
}

function HaloCheck({ person, onDone }: { person: Person; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [verdict, setVerdict] = useState('')
  const known = timeKnown(person)
  const finish = async () => {
    const days = person.metDate ? daysSince(person.metDate) : null
    const v = days !== null && days < 60
      ? `You've known ${person.name} ${known}. That's not long enough for anyone to be amazing yet. Probably wonderful, possibly. Proven, no. Keep the pace and let the next month do the talking.`
      : `Enough time has passed to have real data. Trust what you wrote under "what I've actually seen," and nothing else. ${answers.no?.trim() ? '' : 'You still haven\'t seen them handle a no. That test is worth running on purpose.'}`
    await db.paceChecks.add({ id: newId(), personId: person.id, kind: 'halo', answers, verdict: v, createdAt: now() })
    setVerdict(v)
  }
  if (verdict) return (<div className="stack-lg"><Speak tone="sage">{verdict}</Speak><div className="card-gold"><p className="truth" style={{ margin: 0 }}>I don't have to decide they're amazing. I get to find out.</p></div><JesusLine tags={['Going slow & self-protection']} salt={2} /><button type="button" className="btn btn-primary btn-block" onClick={onDone}>Keep the pace</button></div>)
  const q = HALO_QUESTIONS[i]
  return (
    <div className="stack">
      <Speak>{i === 0 ? `"${person.name} is amazing." Maybe. Let's find out slowly. Five questions.` : q.q}</Speak>
      {i === 0 && <p className="question">{q.q}</p>}
      <p className="hint">{q.hint}</p>
      <VoiceTextarea value={answers[q.key] ?? ''} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} placeholder="…" />
      <div className="btn-row">{i > 0 && <button type="button" className="btn btn-ghost" onClick={() => setI(i - 1)}>Back</button>}<button type="button" className="btn btn-primary" onClick={() => (i < HALO_QUESTIONS.length - 1 ? setI(i + 1) : finish())}>{i < HALO_QUESTIONS.length - 1 ? 'Next' : 'What do you think?'}</button></div>
    </div>
  )
}

function UsedCheck({ person, onDone }: { person: Person; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no' | 'unsure'>>({})
  const [verdict, setVerdict] = useState('')
  const answered = Object.keys(answers).length
  const finish = async () => {
    const nos = Object.values(answers).filter((a) => a === 'no').length
    const level = nos >= 4 ? 'high' : nos >= 2 ? 'mid' : 'low'
    const v = USED_READS[level]
    await db.paceChecks.add({ id: newId(), personId: person.id, kind: 'used', answers, verdict: v, createdAt: now() })
    if (level === 'high') await logFreedomWin('sat-with-uncertainty', `Saw the pattern with ${person.name}`)
    setVerdict(v)
  }
  if (verdict) return (<div className="stack-lg"><Speak tone="sage">{verdict}</Speak><JesusLine tags={['Going slow & self-protection', 'Unreciprocated effort']} count={2} /><div className="btn-row"><Link to={`/circles/move/${person.id}`} className="btn btn-ghost">Adjust their place</Link><button type="button" className="btn btn-primary" onClick={onDone}>Okay</button></div></div>)
  return (
    <div className="stack">
      <Speak>Being wanted for what you provide isn't the same as being loved. Six honest questions about {person.name}. Answer from evidence, not hope.</Speak>
      {USED_QUESTIONS.map((q) => (
        <div key={q.key} className="card-soft stack" style={{ gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{q.q}</div>
          <div className="chips">
            <button type="button" className="chip chip-sm chip-sage" style={{ cursor: 'pointer' }} aria-pressed={answers[q.key] === 'yes'} onClick={() => setAnswers({ ...answers, [q.key]: 'yes' })}>{q.yes}</button>
            <button type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={answers[q.key] === 'no'} onClick={() => setAnswers({ ...answers, [q.key]: 'no' })}>{q.no}</button>
            <button type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={answers[q.key] === 'unsure'} onClick={() => setAnswers({ ...answers, [q.key]: 'unsure' })}>{q.unsure}</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-primary btn-block" onClick={finish} disabled={answered < 4}>What does this add up to?</button>
    </div>
  )
}
