import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { db, newId, now } from '@/db/db'
import type { PauseMethod } from '@/db/types'
import { FEELINGS } from '@/data/options'
import { useSettings } from '@/lib/settings'

type Stage = 'choose' | 'do' | 'after'

const METHODS: { id: PauseMethod; title: string; desc: string }[] = [
  { id: 'breathing', title: 'Breathe with me', desc: 'A slow circle to breathe along with. About a minute.' },
  { id: 'senses', title: '5-4-3-2-1', desc: 'Come back to the room through your senses.' },
  { id: 'feelings', title: 'Name what I feel', desc: 'Tap the words that fit. No explaining.' },
  { id: 'truth', title: 'A truth to hold', desc: 'One grounding line from your deck.' },
]

export function Pause() {
  const nav = useNavigate()
  const [stage, setStage] = useState<Stage>('choose')
  const [method, setMethod] = useState<PauseMethod>('breathing')
  const [feelings, setFeelings] = useState<string[]>([])

  const finish = async () => {
    await db.pauses.add({ id: newId(), method, feelings, createdAt: now() })
    setStage('after')
  }

  if (stage === 'choose') {
    return (
      <Shell back="/" title="Something stung." subtitle="Let's slow down together. Pick whatever feels easiest.">
        <div className="stack">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="card card-link"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => { setMethod(m.id); setStage('do') }}
            >
              <div className="item-title">{m.title}</div>
              <div className="muted small">{m.desc}</div>
            </button>
          ))}
          <button type="button" className="btn btn-sage btn-lg btn-block" onClick={() => nav('/unhooked/loop')}>It's a loop, not a sting</button>
          <button type="button" className="btn btn-quiet" onClick={() => nav('/')}>I just needed to see this. Take me home.</button>
        </div>
      </Shell>
    )
  }

  if (stage === 'do') {
    return (
      <Shell back={true} hideNav>
        {method === 'breathing' && <Breathing onDone={finish} />}
        {method === 'senses' && <Senses onDone={finish} />}
        {method === 'feelings' && (
          <div className="stack">
            <p className="question">What's here right now?</p>
            <p className="hint">Tap anything that fits. You don't have to explain it.</p>
            <Chips options={FEELINGS} value={feelings} onChange={setFeelings} allowCustom />
            <div className="step-actions">
              <button type="button" className="btn btn-primary" onClick={finish}>That's what's here</button>
            </div>
          </div>
        )}
        {method === 'truth' && <TruthHold onDone={finish} />}
      </Shell>
    )
  }

  return (
    <Shell back="/" title="You're here. That counts." subtitle="Whatever you do next is your choice. Nothing is required.">
      <div className="stack">
        <button type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => nav('/check-in')}>
          <div className="item-title">Want to untangle it?</div>
          <div className="muted small">Fact vs. Story: separate what happened from what my brain is telling me.</div>
        </button>
        <button type="button" className="card card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => nav('/jesus')}>
          <div className="item-title">Want a reminder?</div>
          <div className="muted small">Walk With Jesus: how He handled something like this.</div>
        </button>
        <button type="button" className="btn btn-lg btn-block" onClick={() => nav('/')}>I'm done for now</button>
      </div>
    </Shell>
  )
}

/* ---------- Breathing ---------- */
const PHASES = [
  { label: 'Breathe in', secs: 4, scale: 1 },
  { label: 'Hold', secs: 4, scale: 1 },
  { label: 'Breathe out', secs: 6, scale: 0.6 },
]
const ROUNDS = 4

function Breathing({ onDone }: { onDone: () => void }) {
  const settings = useSettings()
  const [running, setRunning] = useState(false)
  const [st, setSt] = useState({ phase: 0, round: 0, left: PHASES[0].secs })
  const done = st.round >= ROUNDS

  useEffect(() => {
    if (!running || done) return
    const id = window.setInterval(() => {
      setSt((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 }
        const phase = (s.phase + 1) % PHASES.length
        const round = phase === 0 ? s.round + 1 : s.round
        return { phase, round, left: PHASES[phase].secs }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, done])

  const p = PHASES[st.phase]
  const style = useMemo(
    () => ({ '--breath-scale': running && !done ? p.scale : 0.6, '--breath-dur': `${p.secs}s` }) as React.CSSProperties,
    [p, running, done],
  )

  return (
    <div className="breath-wrap">
      <div className="breath-circle" style={style} aria-hidden="true" />
      <div className="breath-label" aria-live="polite">
        {!running ? 'Ready when you are' : done ? 'Well done. Stay as long as you like.' : `${p.label}${settings.reduceMotion ? ` · ${st.left}` : ''}`}
      </div>
      {running && !done && <div className="faint">Round {st.round + 1} of {ROUNDS}</div>}
      {!running ? (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setRunning(true)}>Begin</button>
      ) : (
        <button type="button" className={`btn ${done ? 'btn-primary' : 'btn-ghost'} btn-lg`} onClick={onDone}>{done ? 'Continue' : "That's enough for now"}</button>
      )}
    </div>
  )
}

/* ---------- 5-4-3-2-1 ---------- */
const SENSES = [
  { n: 5, text: 'things you can see' },
  { n: 4, text: 'things you can touch' },
  { n: 3, text: 'things you can hear' },
  { n: 2, text: 'things you can smell' },
  { n: 1, text: 'thing you can taste' },
]

function Senses({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [count, setCount] = useState(0)
  const s = SENSES[i]
  const next = () => {
    if (count + 1 < s.n) return setCount(count + 1)
    if (i + 1 < SENSES.length) { setI(i + 1); setCount(0) } else onDone()
  }
  return (
    <div className="stack center" style={{ paddingTop: 40 }}>
      <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{s.n - count}</div>
      <p className="question">Notice {s.n} {s.text}.</p>
      <p className="hint">Tap once for each one you notice. No need to write them down.</p>
      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={next}>I noticed one</button>
      <button type="button" className="btn btn-quiet" onClick={onDone}>Skip ahead</button>
    </div>
  )
}

/* ---------- Truth ---------- */
function TruthHold({ onDone }: { onDone: () => void }) {
  const [seed, setSeed] = useState(0)
  const truth = useLiveQuery(async () => {
    const starred = await db.truths.filter((t) => t.starred).toArray()
    const pool = starred.length ? starred : await db.truths.toArray()
    return pool[Math.floor(Math.random() * pool.length)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])
  return (
    <div className="stack" style={{ paddingTop: 24 }}>
      <p className="hint">Read it slowly. Read it twice.</p>
      <div className="card-gold"><p className="truth truth-lg" style={{ margin: 0 }}>{truth?.text ?? '…'}</p>{truth?.source && <div className="truth-source">{truth.source}</div>}</div>
      <div className="step-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setSeed((s) => s + 1)}>Another one</button>
        <button type="button" className="btn btn-primary" onClick={onDone}>I'll hold this</button>
      </div>
    </div>
  )
}
