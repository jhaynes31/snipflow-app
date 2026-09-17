import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { TruthCard } from '@/components/TruthCard'
import { Chips } from '@/components/Chips'
import { Confirm } from '@/components/Confirm'
import { db, newId, now } from '@/db/db'
import type { Tag, Truth } from '@/db/types'
import { TAGS } from '@/data/tags'
import { PlusIcon } from '@/components/Icons'
import { useLoopGuard } from '@/lib/unhooked'
import { LoopNotice } from '@/pages/UnhookedTools'

export function Truths() {
  const [filter, setFilter] = useState<'all' | 'starred'>('all')
  const [tag, setTag] = useState<Tag | null>(null)
  const [editing, setEditing] = useState<Partial<Truth> | null>(null)
  const [toDelete, setToDelete] = useState<Truth | null>(null)
  const truths = useLiveQuery(async () => {
    const all = await db.truths.orderBy('createdAt').reverse().toArray()
    return all.filter((t) => (filter === 'starred' ? t.starred : true)).filter((t) => (tag ? t.tags.includes(tag) : true))
  }, [filter, tag]) ?? []

  const save = async () => {
    if (!editing?.text?.trim()) return
    const base: Truth = {
      id: editing.id ?? newId(),
      text: editing.text.trim(),
      source: editing.source?.trim() ?? '',
      starred: editing.starred ?? false,
      tags: (editing.tags as Tag[]) ?? [],
      createdAt: editing.createdAt ?? now(),
    }
    await db.truths.put(base)
    setEditing(null)
  }

  return (
    <Shell
      title="Truths Deck"
      subtitle="Words to hold onto. Star the ones that steady you most."
      action={<button type="button" className="btn btn-icon btn-primary" aria-label="Add a truth" onClick={() => setEditing({ tags: [] })}><PlusIcon /></button>}
    >
      <div className="stack">
        <div className="row">
          <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
          <button type="button" className="chip" aria-pressed={filter === 'starred'} onClick={() => setFilter('starred')}>★ Starred</button>
          <select className="select grow" style={{ minHeight: 44, padding: '8px 12px', width: 'auto' }} value={tag ?? ''} onChange={(e) => setTag((e.target.value || null) as Tag | null)} aria-label="Filter by tag">
            <option value="">Any situation</option>
            {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {editing && (
          <div className="card stack">
            <h3>{editing.id ? 'Edit truth' : 'New truth'}</h3>
            <textarea className="textarea" autoFocus value={editing.text ?? ''} placeholder="A quote, a verse, something true…" onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
            <input className="input" value={editing.source ?? ''} placeholder="Source (optional)" onChange={(e) => setEditing({ ...editing, source: e.target.value })} />
            <div className="label">Tags</div>
            <Chips options={TAGS} value={editing.tags ?? []} onChange={(tags) => setEditing({ ...editing, tags: tags as Tag[] })} />
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!editing.text?.trim()}>Save</button>
            </div>
          </div>
        )}

        {truths.map((t) => (
          <div key={t.id} className="stack" style={{ gap: 4 }}>
            <TruthCard truth={t} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(t)}>Edit</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setToDelete(t)}>Remove</button>
            </div>
          </div>
        ))}
        {truths.length === 0 && <p className="faint">Nothing here yet. Add one, or save a line from Walk With Jesus.</p>}
      </div>
      <Confirm
        open={!!toDelete}
        title="Remove this truth?"
        body="It'll be gone from your deck. You can always add it again."
        confirmLabel="Remove"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await db.truths.delete(toDelete.id); setToDelete(null) }}
      />
    </Shell>
  )
}

/** The "I'm hurting" view: starred truths, one at a time. */
export function Hurting() {
  const nav = useNavigate()
  const [i, setI] = useState(0)
  const looping = useLoopGuard('hurting')
  const pool = useLiveQuery(async () => {
    const starred = await db.truths.filter((t) => t.starred).toArray()
    return starred.length ? starred : db.truths.toArray()
  }, []) ?? []
  const t = pool[i % Math.max(1, pool.length)]

  return (
    <Shell back="/" hideNav>
      <div className="stack-lg" style={{ paddingTop: 16 }}>
        <div>
          <h1>I'm here with you.</h1>
          <p className="muted">You don't have to do anything. Just read.</p>
        </div>
        {looping && <LoopNotice tool="this page" />}
        {t ? <TruthCard truth={t} large /> : <p className="faint">Star a few truths and they'll show up here.</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => setI((n) => n + 1)} disabled={pool.length < 2}>Another</button>
          <button type="button" className="btn btn-primary" onClick={() => nav('/pause')}>Help me breathe</button>
        </div>
        <button type="button" className="btn btn-quiet btn-block" onClick={() => nav('/')}>That's enough for now</button>
      </div>
    </Shell>
  )
}
