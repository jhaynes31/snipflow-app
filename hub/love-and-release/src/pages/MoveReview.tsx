import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { StepActions, Stepper } from '@/components/Stepper'
import { db, newId, now } from '@/db/db'
import { RELEASED, UNSURE, type Placement } from '@/db/types'
import { DEMOTION_REASONS, PAUSE_PROMPTS, RELEASE_SIGNALS } from '@/data/circles'
import flagPatterns from '@/data/flagPatterns.json'
import type { FlagPattern } from '@/db/types'
import { accessDiff, placementName, suggestCloser, timeKnown, usePersonSignals, useRings } from '@/lib/circles'
import { JesusLine } from '@/components/JesusLine'
import { Speak } from '@/components/Speak'
import { fmtDate } from '@/lib/dates'

const PATTERNS = flagPatterns as FlagPattern[]
type Kind = 'closer' | 'further' | 'release' | 'restore' | 'place'

export function MoveReview() {
  const { personId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const rings = useRings()
  const person = useLiveQuery(() => (personId ? db.people.get(personId) : undefined), [personId])
  const sig = usePersonSignals(personId)
  const [to, setTo] = useState<Placement>(params.get('to') ?? '')
  const [step, setStep] = useState(0)
  const [criteriaMet, setCriteriaMet] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [reasons, setReasons] = useState<string[]>([])
  const [pattern, setPattern] = useState<'pattern' | 'moment' | ''>('')
  const [communicated, setCommunicated] = useState<'yes' | 'no' | 'unsafe' | ''>('')
  const [releaseKind, setReleaseKind] = useState<'quiet' | 'conversation' | 'no-contact' | ''>('')
  const [done, setDone] = useState(false)

  const fromRing = rings.find((r) => r.id === person?.ringId)
  const toRing = rings.find((r) => r.id === to)
  const kind: Kind | null = useMemo(() => {
    if (!person || !to) return null
    if (to === RELEASED) return 'release'
    if (person.ringId === RELEASED) return 'restore'
    if (person.ringId === UNSURE) return 'place'
    if (to === UNSURE) return 'further'
    if (fromRing && toRing) return toRing.order < fromRing.order ? 'closer' : 'further'
    return 'place'
  }, [person, to, fromRing, toRing])

  if (!person || !sig) return <Shell back="/circles"><p className="faint">Loading…</p></Shell>
  const { openFlags, signals, reciprocity, flags } = sig

  const commit = async (extra?: { toReleaseJournal?: boolean }) => {
    await db.ringMoves.add({ id: newId(), personId: person.id, fromRingId: person.ringId, toRingId: to, reason: [reasons.join(', '), reason.trim()].filter(Boolean).join(' · '), criteriaMet, date: now() })
    await db.people.update(person.id, { ringId: to })
    if (extra?.toReleaseJournal) nav(`/release/new?person=${person.id}`)
    else setDone(true)
  }

  /* ---- choose destination ---- */
  if (!to) {
    return (
      <Shell back={`/people/${person.id}`} hideNav title={`Where does ${person.name} belong?`} subtitle="Adjusting someone's place isn't punishment. It's matching access to what they've shown.">
        <div className="list">
          {rings.map((r) => (
            <button key={r.id} type="button" className="item card-link" style={{ textAlign: 'left', cursor: 'pointer' }} disabled={r.id === person.ringId} onClick={() => setTo(r.id)}>
              <div className="row"><span className="ring-swatch" style={{ background: r.color }} /><span className="item-title">{r.name}</span>{r.id === person.ringId && <span className="faint">current</span>}</div>
              {r.meaning && <div className="small muted">{r.meaning}</div>}
            </button>
          ))}
          {person.ringId !== UNSURE && <button type="button" className="item card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setTo(UNSURE)}><div className="item-title">Unsure</div><div className="small muted">A holding place while I reconsider.</div></button>}
          {person.ringId !== RELEASED && <button type="button" className="item card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setTo(RELEASED)}><div className="item-title">Released</div><div className="small muted">Removed from my circles, with love. Can be restored later.</div></button>}
        </div>
      </Shell>
    )
  }

  if (done) {
    const isRelease = to === RELEASED
    return (
      <Shell back="/circles" hideNav>
        <div className="stack-lg center" style={{ paddingTop: 32 }}>
          <h1>{isRelease ? 'Released, with love.' : `${person.name} is now in ${placementName(to, rings)}.`}</h1>
          <p className="truth truth-lg">{isRelease ? 'Love and release can exist together.' : kind === 'closer' || kind === 'restore' ? 'Trust grows with time and consistency.' : "You're allowed to protect your heart."}</p>
          <div className="btn-row">
            {isRelease && <Link to="/jesus?tag=Letting%20someone%20walk%20away" className="btn btn-ghost">Walk With Jesus</Link>}
            {!isRelease && kind === 'further' && <button type="button" className="btn btn-ghost" onClick={() => nav(`/release/new?person=${person.id}`)}>Bring it to God</button>}
            <button type="button" className="btn btn-primary" onClick={() => nav('/circles')}>Back to circles</button>
          </div>
        </div>
      </Shell>
    )
  }

  const skip = () => commit()
  const header = <button type="button" className="btn btn-quiet btn-sm" onClick={skip}>Skip review, just move</button>

  /* ---- closer / place / restore ---- */
  if (kind === 'closer' || kind === 'place' || kind === 'restore') {
    const target = toRing
    const suggestion = target ? suggestCloser({ ring: target, criteriaMet, person, openFlags, signals: signals.length }) : null
    const steps = ['Entry criteria', 'What they\'ve shown', 'Pause before trusting', 'Confirm']
    return (
      <Shell back={`/people/${person.id}`} hideNav action={header}>
        <Stepper step={step} total={steps.length} />
        <p className="faint">{placementName(person.ringId, rings)} → {placementName(to, rings)}</p>
        {step === 0 && person.pace && new Date(person.pace.notBefore + 'T00:00:00').getTime() > Date.now() && (
          <Speak tone="gold">You set a pace for {person.name}: not closer before {fmtDate(person.pace.notBefore)}. That was you, on a clear day, protecting you today. You can still move them, but say why below, and let it be evidence, not a feeling.</Speak>
        )}
        {step === 0 && (<div className="stack">
          <p className="question">Which of these has {person.name} shown consistently?</p>
          {target?.entryCriteria.length ? <Chips options={target.entryCriteria} value={criteriaMet} onChange={setCriteriaMet} variant="sage" /> : <p className="faint">This layer has no entry criteria yet. You can add some under My layers.</p>}
          {target?.minTimeKnown && <p className="help">This layer asks for {target.minTimeKnown} known.{timeKnown(person) ? ` You've known ${person.name} ${timeKnown(person)}.` : ''}</p>}
          <StepActions onNext={() => setStep(1)} onSkip={() => setStep(1)} />
        </div>)}
        {step === 1 && (<div className="stack">
          <p className="question">Here's what you've logged.</p>
          <div className="card-sage"><strong>{signals.length} green flag{signals.length === 1 ? '' : 's'}</strong>{signals.slice(0, 5).map((s) => <div key={s.id} className="small muted">· {s.type}</div>)}</div>
          <div className="card-soft"><strong>Reciprocity, last 90 days</strong><div className="small muted">They: {reciprocity.them} · Me: {reciprocity.me} · Dropped: {reciprocity.dropped}{reciprocity.oneSided ? ' · mostly one-sided' : ''}</div></div>
          {openFlags.length > 0 && <div className="notice"><strong>{openFlags.length} open watch note{openFlags.length > 1 ? 's' : ''}:</strong> {openFlags.map((f) => PATTERNS.find((p) => p.id === f.patternId)?.name ?? f.patternId).join(', ')}</div>}
          <StepActions onBack={() => setStep(0)} onNext={() => setStep(2)} onSkip={() => setStep(2)} />
        </div>)}
        {step === 2 && (<div className="stack">
          <p className="question">Pause before trusting.</p>
          <p className="hint">No answers required. Just sit with each one for a breath.</p>
          {PAUSE_PROMPTS.map((q) => <div key={q} className="item">{q}</div>)}
          <StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} onSkip={() => setStep(3)} />
        </div>)}
        {step === 3 && (<div className="stack">
          {suggestion && <div className={`verdict verdict-${suggestion.verdict}`}>{suggestion.text}</div>}
          <JesusLine tags={['Redefining a relationship / chosen family', 'Unreciprocated effort']} quiet />
          {target && <p className="help">Moving closer adds: {accessDiff(fromRing, target).gained.join(', ') || 'no new access items'}.</p>}
          <input className="input" value={reason} placeholder="A short reason, for future me (optional)" onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
          <details className="acc"><summary><span>Want to try a trial step first?</span></summary><div className="acc-body stack"><p className="small muted">Share one more personal thing, log it under "What I've shared," and check back in 30 days before deciding.</p><Link to={`/people/${person.id}`} className="btn btn-sm btn-ghost">Log a small share instead</Link></div></details>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>Back</button><button type="button" className="btn btn-primary" onClick={() => commit()}>Move to {placementName(to, rings)}</button></div>
          <button type="button" className="btn btn-quiet" onClick={() => nav(`/people/${person.id}`)}>Not yet. Give it more time.</button>
        </div>)}
      </Shell>
    )
  }

  /* ---- further out ---- */
  if (kind === 'further') {
    const steps = ["What's happening", 'Pattern or moment', 'Have I said it', 'Fact vs. Story', 'What changes', 'Confirm']
    const diff = accessDiff(fromRing, toRing)
    return (
      <Shell back={`/people/${person.id}`} hideNav action={header}>
        <Stepper step={step} total={steps.length} />
        <p className="faint">{placementName(person.ringId, rings)} → {placementName(to, rings)}</p>
        <p className="help">Adjusting someone's place is not punishment. It's matching access to what they've shown.</p>
        {step === 0 && <JesusLine tags={['Setting a boundary', 'Naming poor behavior', 'Letting someone walk away']} quiet />}
        {step === 0 && (<div className="stack"><p className="question">What's been happening?</p><Chips options={DEMOTION_REASONS} value={reasons} onChange={setReasons} allowCustom /><StepActions onNext={() => setStep(1)} onSkip={() => setStep(1)} /></div>)}
        {step === 1 && (<div className="stack">
          <p className="question">Is this a pattern, or a single moment?</p>
          <div className="card-soft small"><div>Reciprocity, 90 days: they {reciprocity.them} · me {reciprocity.me} · dropped {reciprocity.dropped}</div><div>Watch notes: {openFlags.length} open, {flags.length - openFlags.length} resolved</div></div>
          <div className="chips"><button type="button" className="chip" aria-pressed={pattern === 'pattern'} onClick={() => setPattern('pattern')}>A pattern</button><button type="button" className="chip" aria-pressed={pattern === 'moment'} onClick={() => setPattern('moment')}>A single moment</button></div>
          {pattern === 'moment' && <p className="help">One moment can still hurt. It might also be worth a conversation before a move.</p>}
          <p className="help">Repeated doubt about how someone feels about you can be the loop, not evidence. Base this on what's logged, not on anxious what-ifs. <Link to="/unhooked/loop">If it feels like a loop, step out first.</Link></p>
          <StepActions onBack={() => setStep(0)} onNext={() => setStep(2)} onSkip={() => setStep(2)} />
        </div>)}
        {step === 2 && (<div className="stack">
          <p className="question">Have I told them what I need?</p>
          <div className="chips"><button type="button" className="chip" aria-pressed={communicated === 'yes'} onClick={() => setCommunicated('yes')}>Yes</button><button type="button" className="chip" aria-pressed={communicated === 'no'} onClick={() => setCommunicated('no')}>No</button><button type="button" className="chip" aria-pressed={communicated === 'unsafe'} onClick={() => setCommunicated('unsafe')}>Not safe to</button></div>
          {communicated === 'no' && <div className="notice notice-sage">Would you like to have the conversation first? <Link to="/boundaries/new">Draft it in Boundary Builder</Link>. You can come back to this any time.</div>}
          {communicated === 'unsafe' && <p className="help">Then you don't owe them the conversation. Your safety comes first.</p>}
          <StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} onSkip={() => setStep(3)} />
        </div>)}
        {step === 3 && (<div className="stack">
          <p className="question">Am I responding to what's happening now, or to an old wound?</p>
          <p className="hint">Both can be true. Naming it helps you respond to the right thing.</p>
          <Link to="/check-in" className="btn btn-ghost">Do a quick Fact vs. Story</Link>
          <StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} onSkip={() => setStep(4)} />
        </div>)}
        {step === 4 && (<div className="stack">
          <p className="question">What access changes with this move?</p>
          {diff.lost.length ? <div className="card-soft"><div className="label">Stays with closer circles now</div><div className="chips mt">{diff.lost.map((a) => <span key={a} className="chip chip-sm">{a}</span>)}</div></div> : <p className="faint">No access items change between these layers.</p>}
          <StepActions onBack={() => setStep(3)} onNext={() => setStep(5)} />
        </div>)}
        {step === 5 && (<div className="stack">
          <input className="input" value={reason} placeholder="A short reason, for future me (optional)" onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setStep(4)}>Back</button><button type="button" className="btn btn-primary" onClick={() => commit()}>Move to {placementName(to, rings)}</button></div>
          <button type="button" className="btn btn-sage btn-block" onClick={() => commit({ toReleaseJournal: true })}>Move, then bring it to God</button>
        </div>)}
      </Shell>
    )
  }

  /* ---- release ---- */
  const steps = ['Acknowledge', 'Walk With Jesus', 'Kind of release', 'Closing words', 'Release']
  return (
    <Shell back={`/people/${person.id}`} hideNav action={header}>
      <Stepper step={step} total={steps.length} />
      {step === 0 && (<div className="stack">
        <p className="question">This is a big decision, and it's allowed.</p>
        <p className="hint">Releasing someone is usually right when there are serious or repeated signals like these:</p>
        <Chips options={RELEASE_SIGNALS} value={reasons} onChange={setReasons} allowCustom />
        <div className="notice small">If someone's behavior involves threats, stalking, or physical danger, that goes beyond relationship sorting. Please reach out to trusted people or local support services.</div>
        <StepActions onNext={() => setStep(1)} onSkip={() => setStep(1)} />
      </div>)}
      {step === 1 && (<div className="stack">
        <p className="question">Jesus let people walk away.</p>
        <div className="list">
          <Link to="/jesus/jc-looked-and-loved" className="item card-link"><div className="item-title">Looked at Him and Loved Him</div><div className="item-meta">Mark 10:17–22</div></Link>
          <Link to="/jesus/jc-hometown" className="item card-link"><div className="item-title">Moved On From Hometown Rejection</div><div className="item-meta">Mark 6:1–6</div></Link>
          <Link to="/jesus/jc-rebuked-revenge" className="item card-link"><div className="item-title">Rebuked Revenge, Went Elsewhere</div><div className="item-meta">Luke 9:51–56</div></Link>
        </div>
        <StepActions onBack={() => setStep(0)} onNext={() => setStep(2)} onSkip={() => setStep(2)} />
      </div>)}
      {step === 2 && (<div className="stack">
        <p className="question">What kind of release?</p>
        <div className="list">
          {([['quiet', 'Quiet distance', 'Let contact fade without an announcement.'], ['conversation', 'Conversation, then distance', 'Say what needs saying, then step back.'], ['no-contact', 'Full no-contact', 'A clear, complete boundary.']] as const).map(([k, t, d]) => (
            <button key={k} type="button" className={`item card-link ${releaseKind === k ? 'card-gold' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} aria-pressed={releaseKind === k} onClick={() => setReleaseKind(k)}><div className="item-title">{t}</div><div className="small muted">{d}</div></button>
          ))}
        </div>
        <StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} onSkip={() => setStep(3)} />
      </div>)}
      {step === 3 && (<div className="stack">
        <p className="question">Do you want closing words?</p>
        <p className="hint">Optional. Honest and kind is enough. You don't owe a case file.</p>
        <Link to="/boundaries/new?starter=Pausing%20a%20conversation" className="btn btn-ghost">Draft a closing message</Link>
        <StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} onSkip={() => setStep(4)} />
      </div>)}
      {step === 4 && (<div className="stack">
        <input className="input" value={reason} placeholder="A short reason, for future me (optional)" onChange={(e) => { setReason(e.target.value) }} aria-label="Reason" />
        <p className="help">{person.name} will move to Released, hidden from the circle. You can restore them later with a move review.</p>
        <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>Back</button><button type="button" className="btn btn-primary" onClick={() => { if (releaseKind) setReasons((r) => [...r, `release: ${releaseKind}`]); commit({ toReleaseJournal: true }) }}>Release and bring it to God</button></div>
        <button type="button" className="btn btn-quiet btn-block" onClick={() => commit()}>Release without journaling</button>
      </div>)}
    </Shell>
  )
}
