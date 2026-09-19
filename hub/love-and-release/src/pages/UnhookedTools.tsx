import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { BreathGuide } from '@/components/BreathGuide'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId } from '@/db/db'
import type { Skill } from '@/db/types'
import { BODY_NEEDS, BODY_NEEDS_HELP, BREATH_PATTERNS, DELAY_OPTIONS, GENERIC_ACTIONS, GRACE_TRUTHS, GROUNDING, JESUS_WOULD_SAY_HINT, NAME_IT, SELF_COMPASSION, SEND_CHECK, SHRINK_OPTIONS, UNCERTAINTY_PHRASES, VALUE_ACTIONS } from '@/data/unhooked'
import { haptic, logFreedomWin, logSkill, markOffered, offeredThisEpisode, useBreathPrayers, useLoopGuard, useValues } from '@/lib/unhooked'
import { speak } from '@/lib/speech'
import { useSettings } from '@/lib/settings'

export interface ToolDef { id: string; title: string; desc: string; skill: Skill }
export const TOOLS: ToolDef[] = [
  { id: 'breathing', title: 'Breathe', desc: 'Physiological sigh, extended exhale, box, or breath prayer.', skill: 'breathing' },
  { id: 'grounding', title: 'Ground', desc: 'Senses, feet on the floor, cold water, colors, an object.', skill: 'grounding' },
  { id: 'name-it', title: 'Name it', desc: 'This is OCD, not me.', skill: 'name-it' },
  { id: 'defusion', title: 'Defuse the thought', desc: 'Observe it instead of obeying it. Watch it float away.', skill: 'defusion' },
  { id: 'urge-surfing', title: 'Ride the urge', desc: 'Urges peak and fall on their own. Two to five minutes.', skill: 'urge-surfing' },
  { id: 'delay', title: 'Delay or shrink', desc: 'Wait ten minutes. Do it once instead of three times.', skill: 'delay' },
  { id: 'uncertainty', title: 'Practice not knowing', desc: 'Maybe, maybe not. I can live either way.', skill: 'uncertainty' },
  { id: 'replay-stopper', title: 'Close the file', desc: 'For rereading texts and replaying conversations.', skill: 'replay-stopper' },
  { id: 'send-check', title: 'Before you send', desc: 'Connect, or reassurance? Wait an hour?', skill: 'send-check' },
  { id: 'one-prayer', title: 'One prayer, then rest', desc: 'Grace doesn\'t need to be earned again.', skill: 'one-prayer' },
  { id: 'values-action', title: 'Do one small true thing', desc: 'A values-based action, right now.', skill: 'values-action' },
  { id: 'body-check', title: 'Body and needs', desc: 'Hungry? Tired? Overstimulated? Lonely?', skill: 'self-compassion' },
  { id: 'self-compassion', title: 'Self-compassion break', desc: 'Talk to yourself like someone you love.', skill: 'self-compassion' },
]

export function LoopNotice({ tool }: { tool: string }) {
  return (
    <div className="notice notice-sage">
      It looks like the loop might be pulling. You've opened {tool} a few times in a short span. <Link to="/unhooked/tools/urge-surfing">Want to try riding the urge instead?</Link>
    </div>
  )
}

/* ---------- Breathing ---------- */
export function ToolBreathing({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState<string | null>(null)
  const [prayerId, setPrayerId] = useState<string | null>(null)
  const prayers = useBreathPrayers()
  const pattern = BREATH_PATTERNS.find((p) => p.id === id)
  const prayer = prayers.find((p) => p.id === prayerId)
  if (!pattern) {
    return (
      <div className="stack">
        <p className="question">Breathe first.</p>
        <p className="hint">Pick whichever feels easiest. No countdown pressure.</p>
        {BREATH_PATTERNS.map((p) => <button key={p.id} type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setId(p.id)}><div className="item-title">{p.name}</div><div className="small muted">{p.desc}</div></button>)}
        <button type="button" className="btn btn-quiet" onClick={onDone}>Skip breathing</button>
      </div>
    )
  }
  if (pattern.id === 'prayer' && !prayer) {
    return (
      <div className="stack">
        <p className="question">Which words?</p>
        {prayers.map((p) => <button key={p.id} type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setPrayerId(p.id)}><div className="item-title">{p.inhale} <span className="muted">/</span> {p.exhale}</div></button>)}
        <Link to="/unhooked/jesus" className="btn btn-quiet">Add my own breath prayer</Link>
      </div>
    )
  }
  return <BreathGuide pattern={pattern} prayer={prayer ? { inhale: prayer.inhale, exhale: prayer.exhale } : undefined} onDone={async () => { await logSkill('breathing'); onDone() }} />
}

/* ---------- Grounding ---------- */
export function ToolGrounding({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const ex = GROUNDING.find((g) => g.id === id)
  if (!ex) return (
    <div className="stack">
      <p className="question">Come back to the room.</p>
      {GROUNDING.map((g) => <button key={g.id} type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setId(g.id)}><div className="item-title">{g.title}</div></button>)}
    </div>
  )
  const last = i === ex.steps.length - 1
  return (
    <div className="stack center" style={{ paddingTop: 24 }}>
      <div className="faint">{ex.title}</div>
      <p className="question">{ex.steps[i]}</p>
      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={async () => { if (last) { await logSkill('grounding'); onDone() } else setI(i + 1) }}>{last ? 'Done' : 'Next'}</button>
      <button type="button" className="btn btn-quiet" onClick={onDone}>Skip ahead</button>
    </div>
  )
}

/* ---------- Name it ---------- */
export function ToolNameIt({ value, onChange, onDone }: { value: string[]; onChange: (v: string[]) => void; onDone: () => void }) {
  return (
    <div className="stack">
      <p className="question">Name what's here.</p>
      <p className="hint">Naming it creates distance. This is OCD, not me.</p>
      <Chips options={NAME_IT} value={value} onChange={onChange} />
      <p className="truth center mt">This is OCD, not me.</p>
      <button type="button" className="btn btn-primary btn-block" onClick={async () => { if (value.length) await logSkill('name-it'); onDone() }}>{value.length ? 'Named' : 'Nothing fits, move on'}</button>
    </div>
  )
}

/* ---------- Defusion ---------- */
export function ToolDefusion({ onDone }: { onDone: () => void }) {
  const [thought, setThought] = useState('')
  const [floating, setFloating] = useState(false)
  const [newNick, setNewNick] = useState('')
  const themes = useLiveQuery(() => db.thoughtThemes.toArray(), []) ?? []
  const settings = useSettings()
  const addTheme = async () => { if (!newNick.trim()) return; await db.thoughtThemes.add({ id: newId(), nickname: newNick.trim(), description: '' }); setNewNick('') }
  const silly = () => { if (!('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(`I'm having the thought that ${thought}`); u.pitch = 1.8; u.rate = 0.75; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) }
  return (
    <div className="stack">
      <p className="question">Turn it into something you can look at.</p>
      <p className="hint">Not something you have to obey.</p>
      <VoiceTextarea single value={thought} onChange={setThought} placeholder="The thought, in a few words" />
      {thought && !floating && <div className="card-gold"><p className="truth" style={{ margin: 0 }}>I'm having the thought that {thought}</p></div>}
      {themes.length > 0 && <div className="stack"><div className="label">Or name the story</div><div className="chips">{themes.map((t) => <button key={t.id} type="button" className="chip" onClick={() => setThought(`my brain is telling the "${t.nickname}" story again`)}>"{t.nickname}" story</button>)}</div></div>}
      <div className="row"><input className="input grow" value={newNick} placeholder={'Nickname a recurring theme, e.g. "they\'re mad"'} onChange={(e) => setNewNick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTheme()} aria-label="New theme nickname" /><button type="button" className="btn btn-sm btn-ghost" onClick={addTheme} disabled={!newNick.trim()}>Save</button></div>
      {floating && (
        <div className="float-stage" aria-live="polite">
          <div className={`leaf ${settings.reduceMotion ? 'leaf-still' : ''}`}>🍃 <span>{thought}</span></div>
          <p className="faint">Watch it drift. You don't have to chase it.</p>
        </div>
      )}
      <div className="btn-row">
        {'speechSynthesis' in window && <button type="button" className="btn btn-ghost" onClick={() => speak(`I'm having the thought that ${thought}`)} disabled={!thought}>Say it slowly</button>}
        {'speechSynthesis' in window && <button type="button" className="btn btn-ghost" onClick={silly} disabled={!thought}>Silly voice</button>}
      </div>
      {!floating ? (
        <button type="button" className="btn btn-primary btn-block" onClick={() => { setFloating(true); haptic() }} disabled={!thought.trim()}>Let it float away</button>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={async () => { await logSkill('defusion'); onDone() }}>It's drifting. I'm done.</button>
      )}
    </div>
  )
}

/* ---------- Urge surfing ---------- */
export function ToolUrgeSurf({ onDone, initialUrge }: { onDone: (r: { start: number; end: number; acted: 'no' | 'delayed' | 'yes' }) => void; initialUrge?: number }) {
  const [start, setStart] = useState(initialUrge ?? 7)
  const [mins, setMins] = useState(3)
  const [stage, setStage] = useState<'rate' | 'surf' | 'end'>('rate')
  const [left, setLeft] = useState(0)
  const [end, setEnd] = useState(initialUrge ?? 7)
  useEffect(() => {
    if (stage !== 'surf') return
    setLeft(mins * 60)
    const id = window.setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(id); setStage('end'); haptic([20, 60, 20]); return 0 } return l - 1 }), 1000)
    return () => clearInterval(id)
  }, [stage, mins])

  if (stage === 'rate') return (
    <div className="stack">
      <p className="question">How strong is the urge right now?</p>
      <input className="range" type="range" min={0} max={10} value={start} onChange={(e) => setStart(Number(e.target.value))} aria-label="Urge strength" />
      <div className="row-between small muted"><span>0, barely there</span><strong style={{ color: 'var(--text)' }}>{start}</strong><span>10, overwhelming</span></div>
      <div className="label">How long will you ride it?</div>
      <div className="chips">{[2, 3, 5].map((m) => <button key={m} type="button" className="chip" aria-pressed={mins === m} onClick={() => setMins(m)}>{m} min</button>)}</div>
      <p className="help">Urges are waves. They rise, peak, and fall on their own, whether or not you act.</p>
      <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('surf')}>Start riding</button>
    </div>
  )
  if (stage === 'surf') return (
    <div className="stack center">
      <p className="question">Breathe. Let the wave move.</p>
      <Wave />
      <div className="faint">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left. Nothing to do but breathe.</div>
      <button type="button" className="btn btn-quiet" onClick={() => setStage('end')}>End early</button>
    </div>
  )
  return (
    <div className="stack">
      <p className="question">And now?</p>
      <input className="range" type="range" min={0} max={10} value={end} onChange={(e) => setEnd(Number(e.target.value))} aria-label="Urge strength now" />
      <div className="row-between small muted"><span>Started at {start}</span><strong style={{ color: 'var(--text)' }}>{end}</strong></div>
      {end < start ? <p className="help">It fell. Not because you solved anything. Because that's what waves do.</p> : <p className="help">Still strong? That's okay. You rode it for {mins} minutes without feeding it. That's the skill.</p>}
      <div className="label">Did you act on the compulsion?</div>
      <div className="btn-row">
        <button type="button" className="btn btn-sage" onClick={async () => { await logSkill('urge-surfing'); await logFreedomWin('didnt-act', 'Rode the urge'); onDone({ start, end, acted: 'no' }) }}>No, I rode it out</button>
        <button type="button" className="btn btn-ghost" onClick={async () => { await logSkill('urge-surfing'); await logFreedomWin('didnt-act', 'Delayed the compulsion'); onDone({ start, end, acted: 'delayed' }) }}>I delayed it</button>
      </div>
      <button type="button" className="btn btn-quiet btn-block" onClick={async () => { await logSkill('urge-surfing'); onDone({ start, end, acted: 'yes' }) }}>I did it this time. That's okay.</button>
    </div>
  )
}

function Wave() {
  const settings = useSettings()
  return (
    <svg viewBox="0 0 320 120" className={`wave ${settings.reduceMotion ? 'wave-still' : ''}`} aria-hidden="true">
      <path className="wave-path" d="M0 70 C 40 30, 80 30, 120 70 S 200 110, 240 70 S 320 30, 360 70 S 440 110, 480 70 S 560 30, 600 70 V 120 H 0 Z" fill="var(--sage-soft)" />
      <path className="wave-path wave-2" d="M0 80 C 40 50, 80 50, 120 80 S 200 110, 240 80 S 320 50, 360 80 S 440 110, 480 80 S 560 50, 600 80 V 120 H 0 Z" fill="var(--sage)" opacity="0.5" />
    </svg>
  )
}

/* ---------- Delay and shrink ---------- */
const DELAY_KEY = 'lr:delay-until'
export function ToolDelay({ onDone }: { onDone: (kind: 'delayed' | 'shrunk') => void }) {
  const [until, setUntil] = useState<number | null>(() => { const v = Number(localStorage.getItem(DELAY_KEY)); return v > Date.now() ? v : null })
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id) }, [])
  const left = until ? Math.max(0, until - Date.now()) : 0
  void tick
  const startDelay = (m: number) => { const u = Date.now() + m * 60_000; localStorage.setItem(DELAY_KEY, String(u)); setUntil(u) }
  return (
    <div className="stack">
      <p className="question">When resisting fully feels too hard.</p>
      <p className="hint">Each delay or shrink counts as progress. The loop weakens either way.</p>
      {until && left > 0 ? (
        <div className="card-sage center">
          <div className="label">Waiting before I check, text, or confess</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}</div>
          <p className="help">Go do something else. Come back when it's done, or don't. Both count.</p>
          <button type="button" className="btn btn-quiet" onClick={() => { localStorage.removeItem(DELAY_KEY); setUntil(null) }}>Cancel the wait</button>
        </div>
      ) : until && left === 0 ? (
        <div className="card-sage center">
          <p className="truth">You waited. The urge had to sit without you.</p>
          <button type="button" className="btn btn-sage" onClick={async () => { localStorage.removeItem(DELAY_KEY); await logSkill('delay'); await logFreedomWin('didnt-act', 'Delayed'); onDone('delayed') }}>Count it</button>
        </div>
      ) : (
        <>
          <div className="label">Delay: can I wait…</div>
          <div className="chips">{DELAY_OPTIONS.map((m) => <button key={m} type="button" className="chip" onClick={() => startDelay(m)}>{m} minutes</button>)}</div>
          <div className="label mt">Shrink: can I…</div>
          <div className="chips">{SHRINK_OPTIONS.map((s) => <button key={s} type="button" className="chip chip-sage" onClick={async () => { await logSkill('shrink'); await logFreedomWin('didnt-act', `Shrunk: ${s}`); onDone('shrunk') }}>{s}</button>)}</div>
        </>
      )}
    </div>
  )
}

/* ---------- Uncertainty practice ---------- */
export function ToolUncertainty({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const phrase = UNCERTAINTY_PHRASES[i % UNCERTAINTY_PHRASES.length]
  return (
    <div className="stack center" style={{ paddingTop: 16 }}>
      <p className="hint">Say it slowly. Let it be true without proof.</p>
      <div className="card-gold"><p className="truth truth-lg" style={{ margin: 0 }}>{phrase}</p></div>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => setI(i + 1)}>Another</button>
        {'speechSynthesis' in window && <button type="button" className="btn btn-ghost" onClick={() => speak(phrase)}>Hear it</button>}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={async () => { await logSkill('uncertainty'); await logFreedomWin('sat-with-uncertainty', phrase); onDone() }}>I can sit with this</button>
    </div>
  )
}

/* ---------- Replay stopper ---------- */
export function ToolReplay({ onDone }: { onDone: () => void }) {
  const [closed, setClosed] = useState(false)
  return (
    <div className="stack center">
      <p className="question">I've already reviewed this.</p>
      <p className="hint">More reviewing won't bring certainty. It only brings more reviewing.</p>
      <div className={`file ${closed ? 'file-closed' : ''}`} aria-hidden="true"><div className="file-tab" /><div className="file-body">{closed ? 'closed' : 'the conversation'}</div></div>
      {!closed ? <button type="button" className="btn btn-primary btn-lg" onClick={() => { setClosed(true); haptic() }}>Close the file</button> : <button type="button" className="btn btn-primary btn-lg" onClick={async () => { await logSkill('replay-stopper'); onDone() }}>Set it down. Do something true instead.</button>}
    </div>
  )
}

/* ---------- Before you send ---------- */
export function ToolSendCheck({ onDone }: { onDone: (verdict: 'connect' | 'reassurance' | 'wait') => void }) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const q = SEND_CHECK[i]
  if (i < SEND_CHECK.length) return (
    <div className="stack">
      <p className="question">{q.q}</p>
      <p className="hint">{q.hint}</p>
      <VoiceTextarea single value={answers[i] ?? ''} onChange={(v) => { const a = [...answers]; a[i] = v; setAnswers(a) }} placeholder="A word or two is enough" />
      <button type="button" className="btn btn-primary btn-block" onClick={() => setI(i + 1)}>Next</button>
    </div>
  )
  return (
    <div className="stack">
      <p className="question">So, which is it?</p>
      <button type="button" className="card card-link card-sage" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={async () => { await logSkill('send-check'); await logFreedomWin('chose-connection', 'Sent to connect'); onDone('connect') }}><div className="item-title">Genuine connection</div><div className="small muted">Send it with peace.</div></button>
      <button type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={async () => { await logSkill('send-check'); await logFreedomWin('chose-connection', 'Waited instead of asking'); onDone('wait') }}><div className="item-title">Mostly reassurance. I'll wait an hour.</div><div className="small muted">Save the draft. Ride the urge, or go do one true thing.</div></button>
      <button type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={async () => { await logSkill('send-check'); onDone('reassurance') }}><div className="item-title">Reassurance seeking, and I'm not sure I can wait</div><div className="small muted">That's honest. Let's ride the urge together first.</div></button>
    </div>
  )
}

/* ---------- One prayer, then rest (healthy prayer guardrail) ---------- */
export function ToolOnePrayer({ onDone }: { onDone: () => void }) {
  const already = offeredThisEpisode('prayer')
  const [prayed, setPrayed] = useState(false)
  const [truth] = useState(() => GRACE_TRUTHS[Math.floor(Math.random() * GRACE_TRUTHS.length)])
  if (already && !prayed) return (
    <div className="stack center">
      <p className="question">You've already brought this to Him.</p>
      <p className="hint">Grace doesn't need to be earned again. Praying it again would be the loop, not faith.</p>
      <button type="button" className="btn btn-primary btn-block" onClick={onDone}>Back toward living</button>
    </div>
  )
  return (
    <div className="stack">
      <p className="question">One short prayer. Then rest.</p>
      <p className="hint">Not until it feels right. Just once, honestly, and then trust Him with the rest.</p>
      <div className="card-gold"><p className="truth" style={{ margin: 0 }}>{truth}</p></div>
      {!prayed ? (
        <button type="button" className="btn btn-primary btn-block" onClick={async () => { markOffered('prayer'); setPrayed(true); await logSkill('one-prayer'); await logFreedomWin('trusted-without-certainty', 'One prayer, then rest') }}>I've prayed it once</button>
      ) : (
        <div className="stack center"><p className="truth">It's in His hands now.</p><button type="button" className="btn btn-primary btn-block" onClick={onDone}>Now, one small true thing</button></div>
      )}
    </div>
  )
}

/* ---------- Values-based action ---------- */
export function ToolValuesAction({ onDone }: { onDone: () => void }) {
  const values = useValues()
  const [picked, setPicked] = useState('')
  const suggestions = useMemo(() => {
    const fromValues = values.flatMap((v) => (VALUE_ACTIONS[v.name] ?? []).map((a) => `${a}`))
    const pool = fromValues.length ? [...fromValues, ...GENERIC_ACTIONS.slice(0, 3)] : GENERIC_ACTIONS
    return [...new Set(pool)].slice(0, 9)
  }, [values])
  return (
    <div className="stack">
      <p className="question">What's one small thing I can do right now that matches my values?</p>
      <p className="hint">{values.length ? `Based on ${values.map((v) => v.name.toLowerCase()).join(', ')}.` : 'Pick your values under Unhooked to get suggestions that are yours.'}</p>
      <Chips options={suggestions} value={picked ? [picked] : []} onChange={(v) => setPicked(v[0] ?? '')} single allowCustom customLabel="Something else" />
      <button type="button" className="btn btn-primary btn-block" disabled={!picked} onClick={async () => { await logSkill('values-action'); await logFreedomWin('values-while-anxious', picked); onDone() }}>I'll do this. Count it.</button>
      <button type="button" className="btn btn-quiet" onClick={onDone}>Not right now</button>
    </div>
  )
}

/* ---------- Body and needs ---------- */
export function ToolBodyCheck({ onDone }: { onDone: () => void }) {
  const [needs, setNeeds] = useState<string[]>([])
  return (
    <div className="stack">
      <p className="question">What does my body need?</p>
      <p className="hint">OCD gets louder when basic needs are unmet. This isn't a fix. It's care.</p>
      <Chips options={BODY_NEEDS} value={needs} onChange={setNeeds} variant="sage" />
      {needs.length > 0 && <div className="stack">{needs.map((n) => <div key={n} className="item small"><strong>{n}.</strong> {BODY_NEEDS_HELP[n]}</div>)}</div>}
      <button type="button" className="btn btn-primary btn-block" onClick={onDone}>Noted. I'll tend to that.</button>
    </div>
  )
}

/* ---------- Self-compassion ---------- */
export function ToolSelfCompassion({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [jesus, setJesus] = useState('')
  if (i < SELF_COMPASSION.length) {
    const s = SELF_COMPASSION[i]
    return (
      <div className="stack center" style={{ paddingTop: 16 }}>
        <p className="question">{s.title}</p>
        <p className="hint">{s.body}</p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setI(i + 1)}>{i === SELF_COMPASSION.length - 1 ? 'One more' : 'Next'}</button>
      </div>
    )
  }
  return (
    <div className="stack">
      <p className="question">What would Jesus say to me right now?</p>
      <p className="hint">{JESUS_WOULD_SAY_HINT}</p>
      <VoiceTextarea value={jesus} onChange={setJesus} placeholder="One sentence, held loosely" />
      <button type="button" className="btn btn-primary btn-block" onClick={async () => { await logSkill('self-compassion'); onDone() }}>Receive it, and move on</button>
    </div>
  )
}

/* ---------- Standalone tool page ---------- */
export function ToolPage() {
  const { tool } = useParams()
  const nav = useNavigate()
  const def = TOOLS.find((t) => t.id === tool)
  const looping = useLoopGuard(def ? `tool:${def.id}` : undefined)
  const [named, setNamed] = useState<string[]>([])
  const [done, setDone] = useState(false)
  if (!def) return <Shell back="/unhooked"><p className="faint">Not found.</p></Shell>
  const finish = () => setDone(true)
  if (done) return (
    <Shell back="/unhooked" hideNav>
      <div className="stack-lg center" style={{ paddingTop: 40 }}>
        <h1>That counts.</h1>
        <p className="truth truth-lg">Every urge I ride out makes me freer.</p>
        <p className="muted">Now back toward living, not toward more checking.</p>
        <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={() => nav('/unhooked/tools/values-action')}>One small true thing</button><button type="button" className="btn btn-primary" onClick={() => nav('/')}>Home</button></div>
      </div>
    </Shell>
  )
  return (
    <Shell back="/unhooked" hideNav title={def.title}>
      {looping && def.id !== 'urge-surfing' && <div className="mb"><LoopNotice tool={def.title.toLowerCase()} /></div>}
      {def.id === 'breathing' && <ToolBreathing onDone={finish} />}
      {def.id === 'grounding' && <ToolGrounding onDone={finish} />}
      {def.id === 'name-it' && <ToolNameIt value={named} onChange={setNamed} onDone={finish} />}
      {def.id === 'defusion' && <ToolDefusion onDone={finish} />}
      {def.id === 'urge-surfing' && <ToolUrgeSurf onDone={finish} />}
      {def.id === 'delay' && <ToolDelay onDone={finish} />}
      {def.id === 'uncertainty' && <ToolUncertainty onDone={finish} />}
      {def.id === 'replay-stopper' && <ToolReplay onDone={finish} />}
      {def.id === 'send-check' && <ToolSendCheck onDone={(v) => (v === 'reassurance' ? nav('/unhooked/tools/urge-surfing', { replace: true }) : finish())} />}
      {def.id === 'one-prayer' && <ToolOnePrayer onDone={finish} />}
      {def.id === 'values-action' && <ToolValuesAction onDone={finish} />}
      {def.id === 'body-check' && <ToolBodyCheck onDone={finish} />}
      {def.id === 'self-compassion' && <ToolSelfCompassion onDone={finish} />}
    </Shell>
  )
}
