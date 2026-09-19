import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { Stepper } from '@/components/Stepper'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId, now } from '@/db/db'
import type { ActedOn } from '@/db/types'
import { COMPULSIONS, TRIGGER_TAGS } from '@/data/unhooked'
import { useDraft } from '@/lib/drafts'
import { detectCrisis, resetEpisode, useLoopGuard } from '@/lib/unhooked'
import { CrisisNotice } from '@/pages/Unhooked'
import { getCurrentThread } from '@/lib/threads'
import { ThreadPicker } from '@/components/ThreadPicker'
import { JesusLine } from '@/components/JesusLine'
import { LoopNotice, TOOLS, ToolBodyCheck, ToolBreathing, ToolDefusion, ToolDelay, ToolGrounding, ToolNameIt, ToolOnePrayer, ToolReplay, ToolSelfCompassion, ToolSendCheck, ToolUncertainty, ToolUrgeSurf, ToolValuesAction } from '@/pages/UnhookedTools'

interface Draft {
  step: number
  named: string[]
  triggerTags: string[]
  theme: string
  compulsionUrge: string[]
  urgeStart?: number
  urgeEnd?: number
  toolsUsed: string[]
  tool?: string
  actedOn?: ActedOn
  note: string
}
const EMPTY: Draft = { step: 0, named: [], triggerTags: [], theme: '', compulsionUrge: [], toolsUsed: [], note: '' }
const STEPS = ['Breathe', 'Name it', 'A tool', 'One true thing', 'Wrap up']
const IN_MOMENT = TOOLS.filter((t) => !['values-action', 'body-check', 'self-compassion', 'breathing', 'name-it'].includes(t.id))

/** The "I'm in a loop" path: breathe → name it → choose a tool → values-based action → wrap up. */
export function LoopFlow() {
  const nav = useNavigate()
  const [d, update, reset] = useDraft<Draft>('loop', EMPTY)
  const [done, setDone] = useState(false)
  const looping = useLoopGuard('loop-flow')
  const go = (step: number) => update({ step })
  const usedTool = (id: string) => update({ toolsUsed: [...new Set([...d.toolsUsed, id])], tool: undefined })

  const save = async () => {
    await db.loopEpisodes.add({ id: newId(), triggerTags: d.triggerTags, theme: d.theme.trim(), compulsionUrge: d.compulsionUrge, urgeStart: d.urgeStart, urgeEnd: d.urgeEnd, toolsUsed: d.toolsUsed, actedOnCompulsion: d.actedOn, note: d.note.trim(), threadId: getCurrentThread() ?? undefined, createdAt: now() })
    reset(); resetEpisode(); setDone(true)
  }

  if (done) return (
    <Shell back="/" hideNav>
      <div className="stack-lg center" style={{ paddingTop: 40 }}>
        <h1>You stepped out of it.</h1>
        <p className="truth truth-lg">I'm not just coping. I'm growing.</p>
        <p className="muted">Now back toward living. The loop may knock again. That's not failure. Every attempt builds the skill.</p>
        <JesusLine tags={['Anxiety & Uncertainty']} />
        <div style={{ textAlign: 'left' }}><ThreadPicker onPick={() => undefined} /></div>
        <div className="btn-row"><Link to="/unhooked/progress" className="btn btn-ghost">See my progress</Link><button type="button" className="btn btn-primary" onClick={() => nav('/')}>Home</button></div>
      </div>
    </Shell>
  )

  const toolDef = TOOLS.find((t) => t.id === d.tool)

  return (
    <Shell back="/" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => nav('/')}>Pause for now</button>}>
      <Stepper step={d.step} total={STEPS.length} />
      {looping && d.step === 0 && <div className="mb"><LoopNotice tool="the loop flow" /></div>}

      {d.step === 0 && <ToolBreathing onDone={() => { update({ toolsUsed: [...new Set([...d.toolsUsed, 'breathing'])] }); go(1) }} />}

      {d.step === 1 && (
        <div className="stack">
          <ToolNameIt value={d.named} onChange={(named) => update({ named })} onDone={() => go(2)} />
          <details className="acc"><summary><span>What set it off, and what it wants (optional)</span></summary>
            <div className="acc-body stack">
              <div className="label">Trigger</div><Chips options={TRIGGER_TAGS} value={d.triggerTags} onChange={(triggerTags) => update({ triggerTags })} allowCustom />
              <div className="label">The urge is to…</div><Chips options={COMPULSIONS} value={d.compulsionUrge} onChange={(compulsionUrge) => update({ compulsionUrge })} allowCustom />
              <input className="input" value={d.theme} placeholder={'Theme nickname, e.g. "they\'re mad at me"'} onChange={(e) => update({ theme: e.target.value })} aria-label="Theme" />
              <div className="label">Urge right now: {d.urgeStart ?? '–'}</div>
              <input className="range" type="range" min={0} max={10} value={d.urgeStart ?? 5} onChange={(e) => update({ urgeStart: Number(e.target.value) })} aria-label="Urge strength" />
            </div>
          </details>
        </div>
      )}

      {d.step === 2 && !toolDef && (
        <div className="stack">
          <p className="question">Pick one tool.</p>
          <p className="hint">One is enough. More tools can become their own ritual.</p>
          <div className="list">{IN_MOMENT.map((t) => <button key={t.id} type="button" className="item card-link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => update({ tool: t.id })}><div className="item-title">{t.title}</div><div className="small muted">{t.desc}</div></button>)}</div>
          <button type="button" className="btn btn-quiet" onClick={() => go(3)}>I'm steady enough. Skip to one true thing.</button>
        </div>
      )}
      {d.step === 2 && toolDef && (
        <div className="stack">
          <div className="row-between"><strong>{toolDef.title}</strong><button type="button" className="btn btn-quiet btn-sm" onClick={() => update({ tool: undefined })}>Different tool</button></div>
          {toolDef.id === 'grounding' && <ToolGrounding onDone={() => { usedTool('grounding'); go(3) }} />}
          {toolDef.id === 'defusion' && <ToolDefusion onDone={() => { usedTool('defusion'); go(3) }} />}
          {toolDef.id === 'urge-surfing' && <ToolUrgeSurf initialUrge={d.urgeStart} onDone={(r) => { update({ urgeStart: r.start, urgeEnd: r.end, actedOn: r.acted, toolsUsed: [...new Set([...d.toolsUsed, 'urge-surfing'])], tool: undefined, step: 3 }) }} />}
          {toolDef.id === 'delay' && <ToolDelay onDone={(k) => { update({ actedOn: k, toolsUsed: [...new Set([...d.toolsUsed, 'delay'])], tool: undefined, step: 3 }) }} />}
          {toolDef.id === 'uncertainty' && <ToolUncertainty onDone={() => { usedTool('uncertainty'); go(3) }} />}
          {toolDef.id === 'replay-stopper' && <ToolReplay onDone={() => { usedTool('replay-stopper'); go(3) }} />}
          {toolDef.id === 'send-check' && <ToolSendCheck onDone={(v) => { usedTool('send-check'); if (v === 'reassurance') update({ tool: 'urge-surfing' }); else go(3) }} />}
          {toolDef.id === 'one-prayer' && <ToolOnePrayer onDone={() => { usedTool('one-prayer'); go(3) }} />}
          {toolDef.id === 'body-check' && <ToolBodyCheck onDone={() => { usedTool('body-check'); go(3) }} />}
          {toolDef.id === 'self-compassion' && <ToolSelfCompassion onDone={() => { usedTool('self-compassion'); go(3) }} />}
        </div>
      )}

      {d.step === 3 && <ToolValuesAction onDone={() => go(4)} />}

      {d.step === 4 && (
        <div className="stack">
          <p className="question">Before you go.</p>
          <div className="label">Urge now: {d.urgeEnd ?? '–'}</div>
          <input className="range" type="range" min={0} max={10} value={d.urgeEnd ?? d.urgeStart ?? 3} onChange={(e) => update({ urgeEnd: Number(e.target.value) })} aria-label="Urge now" />
          <div className="label">The compulsion</div>
          <div className="chips">
            {([['no', "I didn't do it"], ['delayed', 'I delayed it'], ['shrunk', 'I shrank it'], ['yes', 'I did it this time']] as [ActedOn, string][]).map(([k, l]) => <button key={k} type="button" className={`chip ${k !== 'yes' ? 'chip-sage' : ''}`} aria-pressed={d.actedOn === k} onClick={() => update({ actedOn: k })}>{l}</button>)}
          </div>
          {d.actedOn === 'yes' && <p className="help">That's okay. Healing isn't a straight line. Noticing it is the skill you just practiced.</p>}
          <VoiceTextarea value={d.note} onChange={(note) => update({ note })} placeholder="A note for the pattern map (optional)" />
          {detectCrisis(d.note) && <CrisisNotice />}
          <button type="button" className="btn btn-primary btn-block" onClick={save}>Done</button>
        </div>
      )}
    </Shell>
  )
}
