import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { Chips } from '@/components/Chips'
import { JesusLine } from '@/components/JesusLine'
import { Stepper } from '@/components/Stepper'
import { ThreadPicker } from '@/components/ThreadPicker'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId, now } from '@/db/db'
import { ACTIONS, INTENT_OPTIONS, MEANINGS, PERSONAL_OPENERS, PERSONAL_TRUTH, THEIR_LENS, sliceLabel } from '@/data/personal'
import { useDraft } from '@/lib/drafts'
import { getCurrentThread } from '@/lib/threads'
import { logFreedomWin, logSkill } from '@/lib/unhooked'
import { summarizeReciprocity } from '@/lib/circles'

interface Draft { step: number; fact: string; personId?: string; meanings: string[]; sliceBefore: number; theirLens: string[]; knowIntent: 'know' | 'guessing' | 'asked' | ''; friendWouldSay: string; sliceAfter: number; action: string }
const EMPTY: Draft = { step: 0, fact: '', meanings: [], sliceBefore: 80, theirLens: [], knowIntent: '', friendWouldSay: '', sliceAfter: 40, action: '' }
const STEPS = ['What happened', 'What I made it mean', 'First flash', 'Their side', 'Do I know', 'A friend', 'The slice now', 'Mine to do']

export function Personal() {
  const nav = useNavigate()
  const [d, update, reset] = useDraft<Draft>('personal', EMPTY)
  const [done, setDone] = useState<Draft | null>(null)
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const person = people.find((p) => p.id === d.personId)
  const history = useLiveQuery(async () => {
    if (!d.personId) return null
    const [events, flags, signals] = await Promise.all([db.reciprocity.where('personId').equals(d.personId).toArray(), db.redFlags.where('personId').equals(d.personId).toArray(), db.trustSignals.where('personId').equals(d.personId).toArray()])
    return { rec: summarizeReciprocity(events), flags: flags.filter((f) => f.status === 'open').length, signals: signals.length }
  }, [d.personId])
  const go = (step: number) => update({ step })
  const opener = PERSONAL_OPENERS[new Date().getDate() % PERSONAL_OPENERS.length]

  const save = async () => {
    const snapshot = { ...d }
    await db.personalMoments.add({ id: newId(), fact: d.fact.trim(), meanings: d.meanings, theirLens: d.theirLens, sliceBefore: d.sliceBefore, sliceAfter: d.sliceAfter, knowIntent: d.knowIntent, friendWouldSay: d.friendWouldSay.trim(), action: d.action, personId: d.personId, threadId: getCurrentThread() ?? undefined, createdAt: now() })
    await logSkill('defusion')
    if (d.sliceAfter < d.sliceBefore || d.action.startsWith('Nothing')) await logFreedomWin('sat-with-uncertainty', `Let it be theirs: ${d.fact.trim() || 'a sting'}`)
    reset(); setDone(snapshot)
  }

  if (done) {
    const drop = done.sliceBefore - done.sliceAfter
    return (
      <Shell back="/" hideNav>
        <div className="stack-lg">
          <Speak tone="sage">
            {done.fact && <p><strong>The fact:</strong> {done.fact}</p>}
            {done.meanings.length > 0 && <p><strong>The story:</strong> "{done.meanings[0].toLowerCase()}."</p>}
            {done.theirLens.length > 0 && <p><strong>The likelier truth:</strong> {done.theirLens.map((l) => l.toLowerCase()).slice(0, 2).join(', and ')}.</p>}
            <p>{drop > 0 ? `Your slice went from ${sliceLabel(done.sliceBefore).toLowerCase()} to ${sliceLabel(done.sliceAfter).toLowerCase()} once you looked. That's the skill. It gets faster.` : `You looked at it honestly, and some of it is yours. Owning your slice isn't the same as taking the whole thing. The rest is still theirs.`}</p>
            {done.action && <p><strong>Mine to do:</strong> {done.action}</p>}
          </Speak>
          <div className="card-gold"><p className="truth" style={{ margin: 0 }}>{PERSONAL_TRUTH}</p></div>
          <JesusLine tags={['Taking things personally']} count={2} />
          <ThreadPicker onPick={() => undefined} personId={done.personId} />
          <div className="btn-row">
            {done.action.startsWith('Ask') && <Link to="/boundaries/new" className="btn btn-ghost">Draft the question</Link>}
            {done.action.startsWith('Bring') && <Link to="/release/new" className="btn btn-ghost">Bring it to God</Link>}
            {done.action.startsWith('Set') && <Link to="/boundaries/new" className="btn btn-ghost">Draft the boundary</Link>}
            <button type="button" className="btn btn-primary" onClick={() => nav('/')}>Home</button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell back="/" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => nav('/')}>Pause for now</button>}>
      <Stepper step={d.step} total={STEPS.length} />

      {d.step === 0 && (<div className="stack">
        <Speak>{opener}</Speak>
        <p className="question">What happened?</p>
        <p className="hint">Just the fact. One line. What a camera would have seen.</p>
        <VoiceTextarea single value={d.fact} onChange={(fact) => update({ fact })} placeholder="e.g. He read my message and didn't reply" />
        {people.length > 0 && <select className="select" value={d.personId ?? ''} onChange={(e) => update({ personId: e.target.value || undefined })} aria-label="Who"><option value="">Who? (optional)</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(1)}>Next</button>
        {d.fact && <button type="button" className="btn btn-quiet" onClick={reset}>Start fresh instead</button>}
      </div>)}

      {d.step === 1 && (<div className="stack">
        <p className="question">What did I make it mean about me?</p>
        <p className="hint">These are stories, not facts. Naming them is half the work.</p>
        <Chips options={MEANINGS} value={d.meanings} onChange={(meanings) => update({ meanings })} allowCustom />
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(2)}>Next</button>
      </div>)}

      {d.step === 2 && (<div className="stack">
        <p className="question">First flash: how much of this is about me?</p>
        <p className="hint">The gut answer, before thinking. No wrong number.</p>
        <input className="range" type="range" min={0} max={100} step={10} value={d.sliceBefore} onChange={(e) => update({ sliceBefore: Number(e.target.value) })} aria-label="How much is about me, first flash" />
        <div className="row-between small muted"><span>Not mine</span><strong style={{ color: 'var(--text)' }}>{sliceLabel(d.sliceBefore)}</strong><span>All mine</span></div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(3)}>Next</button>
      </div>)}

      {d.step === 3 && (<div className="stack">
        <Speak>Now their side. What might be going on in {person ? `${person.name}'s` : 'their'} world that has nothing to do with you?</Speak>
        <Chips options={THEIR_LENS} value={d.theirLens} onChange={(theirLens) => update({ theirLens })} allowCustom variant="sage" />
        {history && (history.rec.total > 0 || history.signals > 0 || history.flags > 0) && (
          <p className="help">What I have on {person?.name}: {history.signals} green flag{history.signals === 1 ? '' : 's'}, {history.flags} open watch note{history.flags === 1 ? '' : 's'}, and in 90 days they reached out {history.rec.them} time{history.rec.them === 1 ? '' : 's'}. {history.flags === 0 && history.signals > 0 ? 'Nothing logged says this is about you.' : ''}</p>
        )}
        <JesusLine tags={['Taking things personally']} quiet />
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(4)}>Next</button>
      </div>)}

      {d.step === 4 && (<div className="stack">
        <p className="question">Do I actually know what they meant?</p>
        <div className="stack">{INTENT_OPTIONS.map((o) => <button key={o.id} type="button" className={`door ${d.knowIntent === o.id ? 'door-sage' : ''}`} onClick={() => update({ knowIntent: o.id })}><i aria-hidden="true">{o.id === 'guessing' ? '🤔' : o.id === 'asked' ? '💬' : '👁️'}</i>{o.label}<span>{d.knowIntent === o.id ? o.line : ''}</span></button>)}</div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(5)}>Next</button>
      </div>)}

      {d.step === 5 && (<div className="stack">
        <Speak>If your best friend told you this exact thing happened to her, what would you say to her?</Speak>
        <VoiceTextarea value={d.friendWouldSay} onChange={(friendWouldSay) => update({ friendWouldSay })} placeholder="I'd tell her…" />
        <p className="help">Say it to yourself in the same voice.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(6)}>Next</button>
      </div>)}

      {d.step === 6 && (<div className="stack">
        <p className="question">And now: how much of this is about me?</p>
        <p className="hint">After looking at their side. First flash was {sliceLabel(d.sliceBefore).toLowerCase()}.</p>
        <input className="range" type="range" min={0} max={100} step={10} value={d.sliceAfter} onChange={(e) => update({ sliceAfter: Number(e.target.value) })} aria-label="How much is about me, after looking" />
        <div className="row-between small muted"><span>Not mine</span><strong style={{ color: 'var(--text)' }}>{sliceLabel(d.sliceAfter)}</strong><span>All mine</span></div>
        {d.sliceAfter < d.sliceBefore && <Speak tone="sage">It moved. That's not you talking yourself out of a feeling. That's you seeing more of the picture.</Speak>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => go(7)}>Next</button>
      </div>)}

      {d.step === 7 && (<div className="stack">
        <p className="question">What's mine to do, if anything?</p>
        <p className="hint">"Nothing" is a complete answer. Most stings don't need a response, they need a release.</p>
        <Chips options={ACTIONS} value={d.action ? [d.action] : []} onChange={(v) => update({ action: v[0] ?? '' })} single allowCustom />
        <button type="button" className="btn btn-primary btn-block" onClick={save}>Set it down</button>
      </div>)}
    </Shell>
  )
}
