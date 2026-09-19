import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { Chips } from '@/components/Chips'
import { JesusLine } from '@/components/JesusLine'
import { ThreadPicker } from '@/components/ThreadPicker'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { Stepper } from '@/components/Stepper'
import { db, newId, now } from '@/db/db'
import type { FawnKind, FawnOutcome } from '@/db/types'
import { FAWN_FEARS, FAWN_KINDS, FAWN_REFRAMES, FAWN_STARTERS } from '@/data/companion'
import { useDraft } from '@/lib/drafts'
import { getCurrentThread } from '@/lib/threads'
import { logSkill } from '@/lib/unhooked'

interface Draft { step: number; kind?: FawnKind; situation: string; want: string; fears: string[]; honest: string; personId?: string }
const EMPTY: Draft = { step: 0, situation: '', want: '', fears: [], honest: '' }
const STEPS = ['Which is it', 'What\'s happening', 'What I want', 'What I\'m afraid of', 'The honest version', 'What happened']

/** The fawn alarm: catch the yes before it leaves your mouth. */
export function Fawn() {
  const nav = useNavigate()
  const [d, update, reset] = useDraft<Draft>('fawn', EMPTY)
  const [outcome, setOutcome] = useState<FawnOutcome | null>(null)
  const [done, setDone] = useState(false)
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const go = (step: number) => update({ step })

  const save = async (o: FawnOutcome) => {
    setOutcome(o)
    await db.fawnMoments.add({ id: newId(), kind: d.kind ?? 'about-to-say-yes', situation: d.situation.trim(), want: d.want.trim(), fears: d.fears, honest: d.honest.trim(), outcome: o, personId: d.personId, threadId: getCurrentThread() ?? undefined, createdAt: now() })
    if (o === 'honest' || o === 'said-no') { await db.wins.add({ id: newId(), type: o === 'said-no' ? 'said-no' : d.kind === 'over-explaining' ? 'no-over-explain' : 'asked-for-need', note: d.honest.trim() || d.situation.trim(), createdAt: now(), threadId: getCurrentThread() ?? undefined }) }
    await logSkill('send-check')
    reset(); setDone(true)
  }

  if (done) return (
    <Shell back="/" hideNav>
      <div className="stack-lg" style={{ paddingTop: 8 }}>
        <Speak tone="sage">
          {outcome === 'fawned' ? <><p>You fawned this time, and you noticed. A year ago you wouldn't have seen it at all.</p><p className="muted" style={{ fontSize: '0.95rem' }}>Noticing is the first skill. The next one comes.</p></>
            : outcome === 'not-yet' ? <p>You don't have to decide right now. The pause itself is the win. The old you had no pause at all.</p>
            : <><p>You said the true thing. Their reaction is theirs. You were honest and kind.</p><p className="muted" style={{ fontSize: '0.95rem' }}>I logged it as a win, because it is one.</p></>}
        </Speak>
        <JesusLine tags={['Setting a boundary', 'Conflict & hard conversations']} salt={2} />
        <ThreadPicker onPick={() => undefined} personId={d.personId} />
        <div className="btn-row"><Link to="/wins" className="btn btn-ghost">My wins</Link><button type="button" className="btn btn-primary" onClick={() => nav('/')}>Home</button></div>
      </div>
    </Shell>
  )

  return (
    <Shell back="/" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => nav('/')}>Pause for now</button>}>
      <Stepper step={d.step} total={STEPS.length} />
      {d.step === 0 && (<div className="stack">
        <Speak>Good catch. The pause before the yes is the whole game. Which one is it?</Speak>
        <div className="doors">{FAWN_KINDS.map((k) => <button key={k.id} type="button" className={`door ${d.kind === k.id ? 'door-primary' : ''}`} onClick={() => { update({ kind: k.id }); go(1) }}>{k.label}<span>{k.sub}</span></button>)}</div>
        <Link to="/why/fawn" className="btn btn-quiet">Why my body does this</Link>
      </div>)}

      {d.step === 1 && (<div className="stack">
        <p className="question">What's happening?</p>
        <p className="hint">One line. Who's asking, what for. No story yet.</p>
        <VoiceTextarea single value={d.situation} onChange={(situation) => update({ situation })} placeholder="e.g. Mom wants me to host Sunday again" />
        {people.length > 0 && <select className="select" value={d.personId ?? ''} onChange={(e) => update({ personId: e.target.value || undefined })} aria-label="Who"><option value="">Who is it? (optional)</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(2)}>Next</button>
      </div>)}

      {d.step === 2 && (<div className="stack">
        <Speak>Before the yes. What do you actually want? Not what's reasonable. What you want.</Speak>
        <VoiceTextarea value={d.want} onChange={(want) => update({ want })} placeholder="I want…" />
        <p className="help">If nothing comes, that's information too. Fawning hides the want from you first.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(3)}>Next</button>
      </div>)}

      {d.step === 3 && (<div className="stack">
        <p className="question">What am I afraid happens if I say the true thing?</p>
        <Chips options={FAWN_FEARS} value={d.fears} onChange={(fears) => update({ fears })} allowCustom />
        {d.fears.length > 0 && <div className="stack">{d.fears.filter((f) => FAWN_REFRAMES[f]).map((f) => <Speak key={f} tone="sage"><strong>{f}.</strong> {FAWN_REFRAMES[f]}</Speak>)}</div>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(4)}>Next</button>
      </div>)}

      {d.step === 4 && (<div className="stack">
        <Speak>Here's the honest version. Short. No case file. Pick a starter or write your own.</Speak>
        <div className="chips">{(FAWN_STARTERS[d.kind ?? 'about-to-say-yes']).map((s) => <button key={s} type="button" className="chip" aria-pressed={d.honest === s} onClick={() => update({ honest: s })}>{s}</button>)}</div>
        <VoiceTextarea value={d.honest} onChange={(honest) => update({ honest })} placeholder="In my own words…" />
        <JesusLine tags={['Setting a boundary', 'Conflict & hard conversations']} />
        <div className="btn-row"><Link to={`/boundaries/new`} className="btn btn-ghost">Draft it properly</Link><button type="button" className="btn btn-primary" onClick={() => go(5)}>I've got my words</button></div>
      </div>)}

      {d.step === 5 && (<div className="stack">
        <p className="question">What happened?</p>
        <p className="hint">Or what will you do. Any answer is a good answer here.</p>
        <div className="stack">
          <button type="button" className="btn btn-sage btn-lg btn-block" onClick={() => save('honest')}>I said the honest thing</button>
          <button type="button" className="btn btn-sage btn-lg btn-block" onClick={() => save('said-no')}>I said no</button>
          <button type="button" className="btn btn-ghost btn-lg btn-block" onClick={() => save('not-yet')}>Not yet. I'm pausing first.</button>
          <button type="button" className="btn btn-quiet btn-block" onClick={() => save('fawned')}>I fawned this time</button>
        </div>
      </div>)}
    </Shell>
  )
}
