import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Confirm } from '@/components/Confirm'
import { VoiceTextarea } from '@/components/VoiceTextarea'
import { PlusIcon } from '@/components/Icons'
import { db, newId, now } from '@/db/db'
import type { BoundaryDraft } from '@/db/types'
import { clearDraft, useDraft } from '@/lib/drafts'
import { fmtDate } from '@/lib/dates'
import { speak } from '@/lib/speech'

const STARTERS = [
  { title: 'A kind no', body: "Thank you for thinking of me. I'm not able to do that, but I hope it goes well." },
  { title: "Here's what I need", body: "I've noticed I need a little more heads-up before plans change. Could you let me know as early as you can?" },
  { title: "I can't right now", body: "I can't take that on right now. I care about you, and I want to be honest about what I have to give." },
  { title: 'Pausing a conversation', body: "I want to keep talking about this, and I need a little time first. Can we come back to it tomorrow?" },
]

/** Gentle checks: observations, never verdicts. */
export function gentleChecks(text: string): string[] {
  const t = text.toLowerCase()
  const words = t.trim().split(/\s+/).filter(Boolean).length
  const out: string[] = []
  const because = (t.match(/\bbecause\b/g) ?? []).length
  if (words > 90 || because >= 2) out.push('Are you over-explaining? A clear no doesn\'t need a case file.')
  if (/\b(sorry|apolog|forgive me|i feel bad|i hate to)\b/.test(t)) out.push('Are you apologizing for having a need? Needs don\'t require an apology.')
  if (/\b(make it up to you|i'll make sure|don't be mad|don't be upset|i hope you're not|i promise|i'll fix|let me handle)\b/.test(t)) out.push('Is this yours to manage? Their feelings about your no are theirs to carry.')
  if (/\b(if that's okay|if you don't mind|is that alright|would that be ok)\b/.test(t)) out.push('You\'re allowed to state this without asking permission.')
  return out
}

export function BoundaryList() {
  const drafts = useLiveQuery(() => db.boundaries.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const templates = drafts.filter((d) => d.isTemplate)
  const others = drafts.filter((d) => !d.isTemplate)
  return (
    <Shell
      title="Boundary Builder"
      subtitle="Draft a no, a need, or an 'I can't right now.' Honest and kind is enough."
      action={<Link to="/boundaries/new" className="btn btn-icon btn-primary" aria-label="New boundary"><PlusIcon /></Link>}
    >
      <div className="stack-lg">
        <section>
          <h3>Start from a template</h3>
          <div className="list">
            {templates.map((t) => (
              <Link key={t.id} to={`/boundaries/new?from=${t.id}`} className="item card-link">
                <div className="item-title">{t.title || 'Untitled template'}</div>
                <div className="muted small" style={{ whiteSpace: 'pre-line' }}>{t.body.slice(0, 120)}{t.body.length > 120 ? '…' : ''}</div>
              </Link>
            ))}
            {STARTERS.map((s) => (
              <Link key={s.title} to={`/boundaries/new?starter=${encodeURIComponent(s.title)}`} className="item card-link">
                <div className="item-title">{s.title}</div>
                <div className="muted small">{s.body}</div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h3>My drafts</h3>
          <div className="list">
            {others.map((d) => (
              <Link key={d.id} to={`/boundaries/${d.id}`} className="item card-link">
                <div className="item-title">{d.title || 'Untitled'}</div>
                <div className="muted small">{d.body.slice(0, 100)}{d.body.length > 100 ? '…' : ''}</div>
                <div className="item-meta">{d.sentAt ? `Sent ${fmtDate(d.sentAt)}` : `Updated ${fmtDate(d.updatedAt)}`}{d.feltRating ? ` · felt ${FELT[d.feltRating - 1]}` : ''}</div>
              </Link>
            ))}
            {others.length === 0 && <p className="faint">No drafts yet.</p>}
          </div>
        </section>
      </div>
    </Shell>
  )
}

const FELT = ['tight', 'uneasy', 'okay', 'steady', 'settled']

interface Draft { title: string; body: string; isTemplate: boolean }

export function BoundaryEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const isNew = !id || id === 'new'
  const params = new URLSearchParams(window.location.search)
  const fromId = params.get('from')
  const starter = STARTERS.find((s) => s.title === params.get('starter'))
  const existing = useLiveQuery(() => (isNew ? undefined : db.boundaries.get(id!)), [id])
  const fromTemplate = useLiveQuery(() => (fromId ? db.boundaries.get(fromId) : undefined), [fromId])

  if (isNew) return <Editor key={fromId ?? starter?.title ?? 'new'} initial={{ title: fromTemplate?.title ?? starter?.title ?? '', body: fromTemplate?.body ?? starter?.body ?? '', isTemplate: false }} draftKey="boundary" waiting={!!fromId && !fromTemplate} onSaved={(d) => nav(`/boundaries/${d.id}`, { replace: true })} />
  if (!existing) return <Shell back="/boundaries"><p className="faint">Loading…</p></Shell>
  return <Editor key={existing.id} existing={existing} initial={{ title: existing.title, body: existing.body, isTemplate: existing.isTemplate }} draftKey={`boundary-${existing.id}`} onSaved={() => undefined} />
}

function Editor({ initial, existing, draftKey, waiting, onSaved }: { initial: Draft; existing?: BoundaryDraft; draftKey: string; waiting?: boolean; onSaved: (d: BoundaryDraft) => void }) {
  const nav = useNavigate()
  const [d, update] = useDraft<Draft>(draftKey, initial)
  const [mode, setMode] = useState<'write' | 'rehearse' | 'sent'>('write')
  const [rating, setRating] = useState(existing?.feltRating ?? 3)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const checks = useMemo(() => gentleChecks(d.body), [d.body])

  if (waiting) return <Shell back="/boundaries"><p className="faint">Loading…</p></Shell>

  const persist = async (extra: Partial<BoundaryDraft> = {}) => {
    const ts = now()
    const rec: BoundaryDraft = {
      id: existing?.id ?? newId(),
      title: d.title.trim(),
      body: d.body,
      isTemplate: d.isTemplate,
      feltRating: existing?.feltRating,
      sentAt: existing?.sentAt,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
      ...extra,
    }
    await db.boundaries.put(rec)
    clearDraft(draftKey)
    return rec
  }

  if (mode === 'sent') {
    return (
      <Shell back="/boundaries" hideNav>
        <div className="stack-lg center" style={{ paddingTop: 40 }}>
          <h1>Their reaction is theirs.</h1>
          <p className="truth truth-lg">You were honest and kind.</p>
          <p className="muted">Whatever comes back, you did your part well.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => nav('/wins?add=said-no')}>Log this as a win</button>
            <button type="button" className="btn btn-primary" onClick={() => nav('/')}>Home</button>
          </div>
        </div>
      </Shell>
    )
  }

  if (mode === 'rehearse') {
    return (
      <Shell back={true} hideNav>
        <div className="stack-lg">
          <div>
            <h1>Rehearse it.</h1>
            <p className="muted">Read it aloud, slowly. Then notice your body.</p>
          </div>
          <div className="card" style={{ fontSize: '1.15rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.body || '…'}</div>
          {'speechSynthesis' in window && <button type="button" className="btn btn-ghost" onClick={() => speak(d.body)}>Hear it read to me</button>}
          <div className="card-soft">
            <label className="label" htmlFor="felt">How does it feel in your body?</label>
            <input id="felt" className="range" type="range" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} />
            <div className="row-between small muted"><span>Tight</span><span style={{ fontWeight: 700, color: 'var(--text)' }}>{FELT[rating - 1]}</span><span>Settled</span></div>
            <p className="help mt">Tight doesn't mean wrong. New things often feel tight at first.</p>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setMode('write')}>Keep editing</button>
            <button type="button" className="btn btn-primary" onClick={async () => { const r = await persist({ feltRating: rating }); onSaved(r); setMode('write') }}>Save</button>
          </div>
          <button type="button" className="btn btn-sage btn-block" onClick={async () => { await persist({ feltRating: rating, sentAt: now() }); setMode('sent') }}>I sent it</button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell back="/boundaries" hideNav title={existing ? 'Edit boundary' : 'New boundary'}>
      <div className="stack">
        <input className="input" value={d.title} placeholder="Title (optional), e.g. Saying no to Sunday" onChange={(e) => update({ title: e.target.value })} aria-label="Title" />
        <VoiceTextarea large value={d.body} onChange={(body) => update({ body })} placeholder="Say what's true. Short is fine. Kind is enough." label="What I want to say" />
        {checks.length > 0 && (
          <div className="stack" aria-live="polite">
            {checks.map((c) => <div key={c} className="gentle-check"><span aria-hidden="true">🌿</span><span>{c}</span></div>)}
          </div>
        )}
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={d.isTemplate} onChange={(e) => update({ isTemplate: e.target.checked })} />
          <span>Save as a reusable template</span>
        </label>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => setMode('rehearse')} disabled={!d.body.trim()}>Rehearse</button>
          <button type="button" className="btn btn-primary" onClick={async () => { const r = await persist(); onSaved(r); nav('/boundaries') }} disabled={!d.body.trim() && !d.title.trim()}>Save</button>
        </div>
        {existing && !existing.sentAt && <button type="button" className="btn btn-sage btn-block" onClick={async () => { await persist({ sentAt: now() }); setMode('sent') }}>I sent it</button>}
        {existing && <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>Delete this draft</button>}
      </div>
      <Confirm open={confirmDelete} title="Delete this draft?" confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={async () => { if (existing) await db.boundaries.delete(existing.id); clearDraft(draftKey); nav('/boundaries') }} />
    </Shell>
  )
}
