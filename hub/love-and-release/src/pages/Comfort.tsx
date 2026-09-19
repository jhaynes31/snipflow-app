import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { JesusLine } from '@/components/JesusLine'
import { Chips } from '@/components/Chips'
import { ThreadPicker } from '@/components/ThreadPicker'
import { BreathGuide } from '@/components/BreathGuide'
import { db, newId, now } from '@/db/db'
import { BREATH_PATTERNS } from '@/data/unhooked'
import { COMFORT_LINES, COMFORT_OPENERS, FLASHBACK_SIGNS, FLASHBACK_STEPS, LOW_LINES, LOW_OPENERS } from '@/data/companion'
import { useSettings } from '@/lib/settings'
import { cyclePosition } from '@/lib/cycle'
import { useLoopGuard } from '@/lib/unhooked'
import { LoopNotice } from '@/pages/UnhookedTools'

type Stage = 'here' | 'breath' | 'truth' | 'jesus' | 'flashback' | 'steps' | 'stay' | 'next'

/** The Comfort path. The app speaks first and asks nothing until you're ready. */
export function Comfort() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const settings = useSettings()
  const cycle = cyclePosition(settings)
  const low = params.get('low') === '1' || (cycle?.inLowWindow ?? false)
  const [stage, setStage] = useState<Stage>('here')
  const [signs, setSigns] = useState<string[]>([])
  const [lineIdx, setLineIdx] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [saved, setSaved] = useState(false)
  const looping = useLoopGuard('comfort')
  const name = settings.name ? `, ${settings.name}` : ''
  const truth = useLiveQuery(async () => { const starred = await db.truths.filter((t) => t.starred).toArray(); const pool = starred.length ? starred : await db.truths.toArray(); return pool[Math.floor(Math.random() * pool.length)] }, [])
  const opener = useMemo(() => (low ? LOW_OPENERS : COMFORT_OPENERS)[Math.floor(Math.random() * (low ? LOW_OPENERS : COMFORT_OPENERS).length)], [low])
  const lines = low ? [...LOW_LINES, ...COMFORT_LINES] : COMFORT_LINES

  const finish = async (flashback: boolean) => {
    if (!saved) { await db.comforts.add({ id: newId(), kind: low ? 'low' : 'comfort', flashback, signs, createdAt: now() }); setSaved(true) }
    setStage('next')
  }

  return (
    <Shell back="/" hideNav>
      <div className="stack-lg" style={{ paddingTop: 8 }}>
        {looping && stage === 'here' && <LoopNotice tool="comfort" />}

        {stage === 'here' && (<>
          <Speak><p>{opener}</p><p className="muted" style={{ fontSize: '0.95rem' }}>{low ? "This is the stretch of the month that lies to you. Let's get through today, not the whole week." : `You're not crazy${name}, and you're not alone. Take your time.`}</p></Speak>
          <div className="stack">
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setStage('breath')}>Breathe with me</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setStage('truth')}>Skip the breath. Just talk to me.</button>
          </div>
        </>)}

        {stage === 'breath' && (<>
          <Speak>Just one round. I'll count. You don't have to do it well.</Speak>
          <BreathGuide pattern={{ ...BREATH_PATTERNS[1], rounds: 3 }} onDone={() => setStage('truth')} doneLabel="Okay" stopLabel="That's enough" />
        </>)}

        {stage === 'truth' && (<>
          <Speak>{lines[0]}</Speak>
          {truth && <div className="card-gold"><p className="truth" style={{ margin: 0 }}>{truth.text}</p>{truth.source && <div className="truth-source">{truth.source}</div>}</div>}
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('jesus')}>Keep going</button>
        </>)}

        {stage === 'jesus' && (<>
          <Speak>He's been here too. Not watching from a distance. In it.</Speak>
          <JesusLine tags={low ? ['Needing rest', 'Anxiety & Uncertainty', 'Compassion fatigue', 'Scrupulosity & Grace'] : ['Feeling alone or unsupported', 'Anxiety & Uncertainty', 'Handling emotions', 'Rejection', 'Scrupulosity & Grace']} count={2} />
          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('flashback')}>Can I ask you one small thing?</button>
            <button type="button" className="btn btn-quiet" onClick={() => setStage('stay')}>Just stay with me</button>
          </div>
        </>)}

        {stage === 'flashback' && (<>
          <Speak>{low ? 'Does this feel like more than today deserves? Sometimes the hard week and an old feeling arrive together.' : 'Does any of this feel true right now? No wrong answer.'}</Speak>
          <Chips options={FLASHBACK_SIGNS} value={signs} onChange={setSigns} />
          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => (signs.length ? setStage('steps') : finish(false))}>{signs.length ? 'Yes, some of that' : 'Not really'}</button>
          </div>
        </>)}

        {stage === 'steps' && (<>
          <Speak tone="sage">
            <p>Then this might be an emotional flashback. That's CPTSD doing what it does{low ? ', turned up by the week' : ''}. It isn't a verdict on you, and it isn't the truth about anyone else.</p>
            <p className="muted" style={{ fontSize: '0.95rem' }}>Say this one with me, out loud if you can.</p>
          </Speak>
          <div className="card-gold"><p className="truth truth-lg" style={{ margin: 0 }}>{FLASHBACK_STEPS[stepIdx]}</p></div>
          <div className="btn-row">
            {stepIdx < FLASHBACK_STEPS.length - 1 ? <button type="button" className="btn btn-primary" onClick={() => setStepIdx(stepIdx + 1)}>Next one</button> : <button type="button" className="btn btn-primary" onClick={() => finish(true)}>I'm here, and it's now</button>}
            <Link to="/why/flashback" className="btn btn-ghost">Why this happens</Link>
          </div>
        </>)}

        {stage === 'stay' && (<>
          <Speak>{lines[(lineIdx + 1) % lines.length]}</Speak>
          <JesusLine tags={['Feeling alone or unsupported', 'Scrupulosity & Grace', 'Anxiety & Uncertainty', 'Rejection']} salt={lineIdx + 7} quiet />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setLineIdx(lineIdx + 1)}>Stay a little longer</button>
            <button type="button" className="btn btn-primary" onClick={() => finish(false)}>I'm okay for now</button>
          </div>
        </>)}

        {stage === 'next' && (<>
          <Speak tone="sage">
            <p>{low ? "That's enough for today. Small list: eat, rest, one true thing. The rest can wait for next week's you." : "You came here instead of carrying it alone. That's the whole skill."}</p>
            <p className="muted" style={{ fontSize: '0.95rem' }}>Nothing else is required. But if you want more, here's what's here.</p>
          </Speak>
          <ThreadPicker onPick={() => undefined} suggestedTitle="" />
          <div className="doors">
            <button type="button" className="door" onClick={() => nav('/check-in')}>Untangle what happened<span>Fact vs. Story, every step skippable</span></button>
            <button type="button" className="door" onClick={() => nav('/release/new')}>Bring it to God<span>The Release Journal</span></button>
            {low && <button type="button" className="door" onClick={() => nav('/why/pmdd')}>Why this week is like this<span>PMS, PMDD, and the hard stretch</span></button>}
            <button type="button" className="door door-sage" onClick={() => nav('/')}>I'm done for now<span>Welcome back whenever</span></button>
          </div>
        </>)}
      </div>
    </Shell>
  )
}
