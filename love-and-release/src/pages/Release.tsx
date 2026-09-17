import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { StepActions, Stepper } from '@/components/Stepper'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { PlusIcon } from '@/components/Icons'
import { db, newId, now } from '@/db/db'
import { useDraft } from '@/lib/drafts'
import { fmtDateTime } from '@/lib/dates'

interface Draft { step: number; hurts: string; toGod: string; mine: string; theirs: string; releasing: string; prayer: string }
const EMPTY: Draft = { step: 0, hurts: '', toGod: '', mine: '', theirs: '', releasing: '', prayer: '' }

const PROMPTS: { key: keyof Omit<Draft, 'step'>; q: string; hint: string; placeholder: string }[] = [
  { key: 'hurts', q: 'What hurts right now?', hint: 'A few words is enough. You don\'t have to retell it.', placeholder: 'It hurts that…' },
  { key: 'toGod', q: 'What do I want to bring to God about it?', hint: 'Exactly as it is. He\'s heard worse and stayed.', placeholder: 'God, I…' },
  { key: 'mine', q: "What's mine to carry?", hint: 'My feelings, my choices, my next step.', placeholder: 'Mine is…' },
  { key: 'theirs', q: "What's theirs to carry?", hint: 'Their choices, their reaction, their capacity.', placeholder: 'Theirs is…' },
  { key: 'releasing', q: 'What am I choosing to release today?', hint: 'Not forever. Just today.', placeholder: 'Today I release…' },
  { key: 'prayer', q: 'A closing prayer, if you want one.', hint: 'Optional. Spoken or typed. Or just "Amen."', placeholder: '…' },
]

export function ReleaseNew() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const personId = params.get('person') ?? undefined
  const [d, update, reset] = useDraft<Draft>('release', EMPTY)
  const [done, setDone] = useState(false)
  const p = PROMPTS[d.step]
  const isLast = d.step === PROMPTS.length - 1
  const go = (n: number) => update({ step: Math.max(0, Math.min(PROMPTS.length - 1, n)) })

  const save = async () => {
    await db.releases.add({ id: newId(), personId, hurts: d.hurts.trim(), toGod: d.toGod.trim(), mine: d.mine.trim(), theirs: d.theirs.trim(), releasing: d.releasing.trim(), prayer: d.prayer.trim(), createdAt: now() })
    reset()
    setDone(true)
  }

  if (done) {
    return (
      <Shell back="/" hideNav>
        <div className="stack-lg center" style={{ paddingTop: 40 }}>
          <h1>Released, for today.</h1>
          <p className="truth truth-lg">Love and release can exist together.</p>
          <p className="muted">If it comes back tomorrow, you can bring it again. That's not failure. That's Gethsemane.</p>
          <div className="btn-row">
            <Link to="/release" className="btn btn-ghost">Past entries</Link>
            <button type="button" className="btn btn-primary" onClick={() => nav('/')}>Home</button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell back="/" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => nav('/')}>Pause for now</button>}>
      <Stepper step={d.step} total={PROMPTS.length} />
      <p className="question">{p.q}</p>
      <p className="hint">{p.hint}</p>
      <VoiceTextarea large value={d[p.key]} onChange={(v) => update({ [p.key]: v } as Partial<Draft>)} placeholder={p.placeholder} />
      <StepActions onBack={d.step > 0 ? () => go(d.step - 1) : undefined} onNext={isLast ? save : () => go(d.step + 1)} onSkip={() => go(d.step + 1)} isLast={isLast} nextLabel={isLast ? 'Amen' : undefined} />
      {d.step === 0 && d.hurts && <button type="button" className="btn btn-quiet" onClick={reset}>Start fresh instead</button>}
    </Shell>
  )
}

export function ReleaseList() {
  const entries = useLiveQuery(() => db.releases.orderBy('createdAt').reverse().toArray(), []) ?? []
  return (
    <Shell title="Release Journal" subtitle="What you've brought to God, and what you've set down." action={<Link to="/release/new" className="btn btn-icon btn-primary" aria-label="New entry"><PlusIcon /></Link>}>
      <div className="list">
        {entries.map((e) => (
          <details key={e.id} className="acc">
            <summary><span>{e.releasing || e.hurts || 'Entry'}</span><span className="faint">{fmtDateTime(e.createdAt)}</span></summary>
            <dl className="kv acc-body">
              {PROMPTS.map((p) => e[p.key] && <ItemRow key={p.key} label={p.q} value={e[p.key]} />)}
            </dl>
          </details>
        ))}
        {entries.length === 0 && <p className="faint">Nothing here yet. Whenever you're ready.</p>}
      </div>
    </Shell>
  )
}

function ItemRow({ label, value }: { label: string; value: string }) {
  return (<><dt>{label}</dt><dd style={{ whiteSpace: 'pre-line' }}>{value}</dd></>)
}
