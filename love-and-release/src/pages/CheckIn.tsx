import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Chips } from '@/components/Chips'
import { StepActions, Stepper } from '@/components/Stepper'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { db, newId, now } from '@/db/db'
import type { Tag, Truth } from '@/db/types'
import { ALTERNATIVES, BODY_AREAS, MINE_SUGGESTIONS, STORIES, THEIRS_SUGGESTIONS } from '@/data/options'
import { useDraft } from '@/lib/drafts'

interface Draft {
  step: number
  fact: string
  story: string[]
  bodyAreas: string[]
  alternatives: string[]
  mine: string
  theirs: string
  truthId?: string
  truthText?: string
  personId?: string
}

const EMPTY: Draft = { step: 0, fact: '', story: [], bodyAreas: [], alternatives: [], mine: '', theirs: '' }
const TOTAL = 6

export function tagsForStories(stories: string[]): Tag[] {
  const set = new Set<Tag>()
  for (const s of stories) STORIES.find((o) => o.text === s)?.tags.forEach((t) => set.add(t))
  return [...set]
}

export function CheckIn() {
  const nav = useNavigate()
  const [d, update, reset] = useDraft<Draft>('check-in', EMPTY)
  const [saved, setSaved] = useState<{ truthText?: string; cards: typeof cards } | null>(null)
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const tags = useMemo(() => tagsForStories(d.story), [d.story])

  const truths = useLiveQuery(async () => {
    const all = await db.truths.toArray()
    const score = (t: Truth) => (t.starred ? 2 : 0) + (t.tags.some((x) => tags.includes(x)) ? 3 : 0)
    return all.sort((a, b) => score(b) - score(a))
  }, [tags]) ?? []

  const cards = useLiveQuery(async () => {
    const all = await db.jesusCards.toArray()
    return all.filter((c) => c.tags.some((t) => tags.includes(t))).slice(0, 3)
  }, [tags]) ?? []

  const go = (n: number) => update({ step: Math.max(0, Math.min(TOTAL, n)) })
  const next = () => go(d.step + 1)
  const back = () => go(d.step - 1)

  const save = async () => {
    await db.checkIns.add({
      id: newId(),
      fact: d.fact.trim(),
      story: d.story,
      bodyAreas: d.bodyAreas,
      alternatives: d.alternatives,
      mine: d.mine.trim(),
      theirs: d.theirs.trim(),
      truthId: d.truthId,
      truthText: d.truthText,
      personId: d.personId || undefined,
      tags,
      createdAt: now(),
    })
    setSaved({ truthText: d.truthText, cards })
    reset()
  }

  if (saved) {
    return (
      <Shell back="/" title="Untangled, a little." subtitle="You separated what happened from the story. That's real work.">
        <div className="stack">
          {saved.truthText && <div className="card-gold"><p className="truth" style={{ margin: 0 }}>{saved.truthText}</p></div>}
          {saved.cards.length > 0 && (
            <div className="card">
              <div className="item-title">Jesus faced something like this</div>
              <div className="list mt">
                {saved.cards.map((c) => (
                  <Link key={c.id} to={`/jesus/${c.id}`} className="item card-link">
                    <div className="item-title">{c.title}</div>
                    <div className="item-meta">{c.reference}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => nav('/release/new')}>Bring it to God</button>
            <button type="button" className="btn btn-primary" onClick={() => nav('/')}>Done for now</button>
          </div>
        </div>
      </Shell>
    )
  }

  const stepTitle = ['What happened?', 'What story is my brain telling?', 'Where do I feel it?', 'What else could be true?', "What's mine, and what's theirs?", 'A truth to hold onto.'][d.step] ?? 'Anything else?'

  return (
    <Shell back="/" hideNav action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => nav('/')}>Pause for now</button>}>
      <Stepper step={d.step} total={TOTAL + 1} />
      <p className="question">{stepTitle}</p>

      {d.step === 0 && (
        <div className="stack">
          <p className="hint">Just the fact, in one short line. No story yet, no explaining.</p>
          <VoiceTextarea single value={d.fact} onChange={(fact) => update({ fact })} placeholder="e.g. She didn't reply to my message." />
          <StepActions onNext={next} onSkip={next} />
          {(d.fact || d.story.length > 0) && <button type="button" className="btn btn-quiet" onClick={reset}>Start fresh instead</button>}
        </div>
      )}

      {d.step === 1 && (
        <div className="stack">
          <p className="hint">Tap the ones that fit. These are stories, not facts. Naming them takes some of their power.</p>
          <Chips options={STORIES.map((s) => s.text)} value={d.story} onChange={(story) => update({ story })} allowCustom />
          <StepActions onBack={back} onNext={next} onSkip={next} />
        </div>
      )}

      {d.step === 2 && (
        <div className="stack">
          <p className="hint">Where does it live in your body right now?</p>
          <Chips options={BODY_AREAS} value={d.bodyAreas} onChange={(bodyAreas) => update({ bodyAreas })} variant="sage" />
          <StepActions onBack={back} onNext={next} onSkip={next} />
        </div>
      )}

      {d.step === 3 && (
        <div className="stack">
          <p className="hint">Two or three possibilities about their capacity, fears, or patterns. Not about your worth.</p>
          <Chips options={ALTERNATIVES} value={d.alternatives} onChange={(alternatives) => update({ alternatives })} allowCustom customLabel="Something else" />
          <StepActions onBack={back} onNext={next} onSkip={next} />
        </div>
      )}

      {d.step === 4 && (
        <div className="stack">
          <p className="hint">Two columns. Tap a suggestion to add it, or write your own.</p>
          <div className="two-col">
            <div className="card-sage">
              <div className="label">Mine to carry</div>
              <textarea className="textarea" value={d.mine} onChange={(e) => update({ mine: e.target.value })} placeholder="My feelings, my response…" />
              <div className="chips mt">
                {MINE_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} onClick={() => update({ mine: d.mine ? `${d.mine}\n${s}` : s })}>{s}</button>
                ))}
              </div>
            </div>
            <div className="card-soft">
              <div className="label">Theirs to carry</div>
              <textarea className="textarea" value={d.theirs} onChange={(e) => update({ theirs: e.target.value })} placeholder="Their reaction, their choices…" />
              <div className="chips mt">
                {THEIRS_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} onClick={() => update({ theirs: d.theirs ? `${d.theirs}\n${s}` : s })}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <StepActions onBack={back} onNext={next} onSkip={next} />
        </div>
      )}

      {d.step === 5 && (
        <div className="stack">
          <p className="hint">Pick one from your deck, or borrow one from how Jesus handled it.</p>
          <div className="list" role="radiogroup" aria-label="Choose a truth">
            {truths.slice(0, 6).map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={d.truthId === t.id} className={`item card-link ${d.truthId === t.id ? 'card-gold' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => update({ truthId: t.id, truthText: t.text })}>
                <div className="truth" style={{ fontSize: '1rem' }}>{t.text}</div>
              </button>
            ))}
            {cards.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={d.truthId === c.id} className={`item card-link ${d.truthId === c.id ? 'card-gold' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => update({ truthId: c.id, truthText: c.meaningForMe })}>
                <div className="truth" style={{ fontSize: '1rem' }}>{c.meaningForMe}</div>
                <div className="item-meta">{c.title} · {c.reference}</div>
              </button>
            ))}
          </div>
          <StepActions onBack={back} onNext={next} onSkip={next} />
        </div>
      )}

      {d.step === 6 && (
        <div className="stack">
          <p className="hint">Optional. Link this to a person so one hard night doesn't rewrite the whole story.</p>
          {people.length ? (
            <select className="select" value={d.personId ?? ''} onChange={(e) => update({ personId: e.target.value || undefined })} aria-label="Link to a person">
              <option value="">No one in particular</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <p className="faint">No people added yet. You can add them under My People any time.</p>
          )}
          <div className="card-soft">
            <div className="label">Here's what you found</div>
            <dl className="kv mt">
              {d.fact && <><dt>Fact</dt><dd>{d.fact}</dd></>}
              {d.story.length > 0 && <><dt>Story</dt><dd>{d.story.join(' · ')}</dd></>}
              {d.alternatives.length > 0 && <><dt>Could be</dt><dd>{d.alternatives.join(' · ')}</dd></>}
              {d.mine && <><dt>Mine</dt><dd style={{ whiteSpace: 'pre-line' }}>{d.mine}</dd></>}
              {d.theirs && <><dt>Theirs</dt><dd style={{ whiteSpace: 'pre-line' }}>{d.theirs}</dd></>}
            </dl>
          </div>
          <StepActions onBack={back} onNext={save} isLast nextLabel="Save this" />
        </div>
      )}
    </Shell>
  )
}
