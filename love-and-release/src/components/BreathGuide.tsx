import { useEffect, useMemo, useState } from 'react'
import type { BreathPattern } from '@/data/unhooked'
import { useSettings } from '@/lib/settings'
import { haptic } from '@/lib/unhooked'

interface Props {
  pattern: BreathPattern
  prayer?: { inhale: string; exhale: string }
  onDone: () => void
  doneLabel?: string
  stopLabel?: string
}

/** A timed, visual breathing guide. No countdown pressure unless motion is reduced. */
export function BreathGuide({ pattern, prayer, onDone, doneLabel = 'Continue', stopLabel = "That's enough for now" }: Props) {
  const settings = useSettings()
  const [running, setRunning] = useState(false)
  const [st, setSt] = useState({ phase: 0, round: 0, left: pattern.phases[0].secs })
  const done = st.round >= pattern.rounds

  useEffect(() => { setSt({ phase: 0, round: 0, left: pattern.phases[0].secs }); setRunning(false) }, [pattern])

  useEffect(() => {
    if (!running || done) return
    const id = window.setInterval(() => {
      setSt((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 }
        const phase = (s.phase + 1) % pattern.phases.length
        const round = phase === 0 ? s.round + 1 : s.round
        haptic(phase === 0 ? [10, 40, 10] : 10)
        return { phase, round, left: pattern.phases[phase].secs }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, done, pattern])

  const p = pattern.phases[st.phase]
  const style = useMemo(() => ({ '--breath-scale': running && !done ? p.scale : 0.6, '--breath-dur': `${p.secs}s` }) as React.CSSProperties, [p, running, done])
  const isIn = p.scale >= 0.85 && !p.label.startsWith('Hold')
  const isOut = p.scale < 0.85 && !p.label.startsWith('Hold')
  const label = prayer ? (isIn ? prayer.inhale : isOut ? prayer.exhale : '…') : p.label

  return (
    <div className="breath-wrap">
      <div className="breath-circle" style={style} aria-hidden="true" />
      <div className="breath-label" aria-live="polite">
        {!running ? 'Ready when you are' : done ? 'Well done. Stay as long as you like.' : `${label}${settings.reduceMotion ? ` · ${st.left}` : ''}`}
      </div>
      {running && !done && prayer && <div className="faint">{p.label}</div>}
      {running && !done && <div className="faint">Round {st.round + 1} of {pattern.rounds}</div>}
      {!running ? (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setRunning(true)}>Begin</button>
      ) : (
        <button type="button" className={`btn ${done ? 'btn-primary' : 'btn-ghost'} btn-lg`} onClick={onDone}>{done ? doneLabel : stopLabel}</button>
      )}
    </div>
  )
}
