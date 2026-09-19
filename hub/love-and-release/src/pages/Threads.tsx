import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { Confirm } from '@/components/Confirm'
import { JesusLine } from '@/components/JesusLine'
import { PlusIcon } from '@/components/Icons'
import { db } from '@/db/db'
import { daysSince, fmtDate, fmtDateTime } from '@/lib/dates'
import { createThread, setCurrentThread, useThreadTimeline, useThreads } from '@/lib/threads'

export function ThreadsList() {
  const threads = useThreads()
  const people = useLiveQuery(() => db.people.toArray(), []) ?? []
  const open = threads.filter((t) => t.status === 'open'), resting = threads.filter((t) => t.status === 'resting'), released = threads.filter((t) => t.status === 'released')
  const name = (id?: string) => people.find((p) => p.id === id)?.name
  const Row = ({ t }: { t: (typeof threads)[number] }) => <Link to={`/threads/${t.id}`} className="item card-link"><div className="item-title">{t.title}</div><div className="item-meta">{name(t.personId) ? `${name(t.personId)} · ` : ''}{daysSince(t.createdAt) === 0 ? 'started today' : `${daysSince(t.createdAt)} days`} · last {fmtDate(t.updatedAt)}</div></Link>
  return (
    <Shell title="Threads" subtitle="One story per situation, so the arc shows. Not six scattered entries." action={<Link to="/threads/new" className="btn btn-icon btn-primary" aria-label="New thread"><PlusIcon /></Link>}>
      <div className="stack-lg">
        {threads.length === 0 && <Speak>Nothing here yet. When something hurts and you know it'll come back, give it a name. I'll gather everything about it in one place, and tell the story back to you.</Speak>}
        {open.length > 0 && <section><h3>Open</h3><div className="list">{open.map((t) => <Row key={t.id} t={t} />)}</div></section>}
        {resting.length > 0 && <section><h3>Resting</h3><div className="list">{resting.map((t) => <Row key={t.id} t={t} />)}</div></section>}
        {released.length > 0 && <section><h3>Released</h3><div className="list">{released.map((t) => <Row key={t.id} t={t} />)}</div></section>}
      </div>
    </Shell>
  )
}

export function NewThread() {
  const nav = useNavigate()
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const [title, setTitle] = useState('')
  const [personId, setPersonId] = useState('')
  const create = async () => { if (!title.trim()) return; const t = await createThread(title, personId || undefined); setCurrentThread(t.id); nav(`/threads/${t.id}`, { replace: true }) }
  return (
    <Shell back="/threads" hideNav title="Name the story">
      <div className="stack">
        <Speak>Give it the name you'd use in your head. "The thing with my sister." "Church, lately." "Whether to keep trying with Ben."</Speak>
        <input className="input" autoFocus value={title} placeholder="What I'd call it" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} aria-label="Thread title" />
        {people.length > 0 && <select className="select" value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="About someone in particular?"><option value="">Not about one person</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <p className="help">If it's about a person, everything logged about them joins the thread automatically.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={create} disabled={!title.trim()}>Start the thread</button>
      </div>
    </Shell>
  )
}

const DOT: Record<string, string> = { win: 'tl-dot-win', release: 'tl-dot-release', flag: 'tl-dot-flag', comfort: 'tl-dot-comfort' }

export function ThreadPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const thread = useLiveQuery(() => (id ? db.threads.get(id) : undefined), [id])
  const person = useLiveQuery(() => (thread?.personId ? db.people.get(thread.personId) : undefined), [thread?.personId])
  const items = useThreadTimeline(thread)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (!thread) return <Shell back="/threads"><p className="faint">Loading…</p></Shell>
  const start = () => { setCurrentThread(thread.id) }
  const arc = tellTheArc(thread.title, thread.createdAt, items, person?.name)
  const kinds = new Set(items.map((i) => i.kind))
  const tags = kinds.has('fawn') ? ['Setting a boundary' as const] : kinds.has('release') ? ['Letting someone walk away' as const, 'Grief over someone\'s choices' as const] : kinds.has('flag') ? ['Naming poor behavior' as const] : ['Unreciprocated effort' as const, 'Rejection' as const]

  return (
    <Shell back="/threads" action={<button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button>}>
      <div className="stack-lg">
        <div>
          {editing ? <input className="input" value={thread.title} onChange={(e) => db.threads.update(thread.id, { title: e.target.value })} aria-label="Thread title" /> : <h1>{thread.title}</h1>}
          <div className="muted">{person && <Link to={`/people/${person.id}`}>{person.name}</Link>}{person ? ' · ' : ''}{thread.status === 'open' ? 'open' : thread.status}{' · '}started {fmtDate(thread.createdAt)}</div>
        </div>
        {editing && (
          <div className="card stack">
            <div className="label">Where is this story now?</div>
            <div className="chips">{(['open', 'resting', 'released'] as const).map((s) => <button key={s} type="button" className="chip" aria-pressed={thread.status === s} onClick={() => db.threads.update(thread.id, { status: s })}>{s === 'open' ? 'Still open' : s === 'resting' ? 'Resting for now' : 'Released'}</button>)}</div>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirm(true)}>Delete this thread (entries stay)</button>
          </div>
        )}
        <Speak>{arc}</Speak>
        <JesusLine tags={tags} />
        <div className="chips">
          <button type="button" className="chip" onClick={() => { start(); nav('/comfort') }}>Comfort</button>
          <button type="button" className="chip" onClick={() => { start(); nav('/check-in') }}>Untangle</button>
          <button type="button" className="chip" onClick={() => { start(); nav('/fawn') }}>Fawn alarm</button>
          <button type="button" className="chip" onClick={() => { start(); nav('/boundaries/new') }}>Say something</button>
          <button type="button" className="chip" onClick={() => { start(); nav('/release/new') }}>Release</button>
          <button type="button" className="chip" onClick={() => { start(); nav('/wins') }}>Log a win</button>
        </div>
        <section>
          <h3>The arc so far</h3>
          {items.length === 0 ? <p className="faint">Nothing linked yet. Start any path from the buttons above and it lands here.</p> : (
            <div className="timeline">
              {items.map((it, i) => (
                <div key={`${it.kind}-${it.id}`} className="tl-item">
                  <div className="tl-rail"><span className={`tl-dot ${DOT[it.kind] ?? ''}`} />{i < items.length - 1 && <span className="tl-line" />}</div>
                  <div className="tl-body">
                    <div className="tl-label">{it.label} · {fmtDateTime(it.at)}</div>
                    <div style={{ fontWeight: 700 }}>{it.link ? <Link to={it.link} style={{ color: 'inherit' }}>{it.title}</Link> : it.title}</div>
                    {it.body && <div className="small muted">{it.body}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <Confirm open={confirm} title="Delete this thread?" body="The entries in it stay in the app. Only the thread goes." confirmLabel="Delete" onCancel={() => setConfirm(false)} onConfirm={async () => { await db.threads.delete(thread.id); nav('/threads') }} />
    </Shell>
  )
}

/** Warm prose about the arc, from the data. */
function tellTheArc(title: string, createdAt: string, items: { kind: string; at: string; title: string; label: string }[], personName?: string): string {
  const days = daysSince(createdAt)
  const n = (k: string) => items.filter((i) => i.kind === k).length
  const parts: string[] = []
  parts.push(days === 0 ? `You named "${title}" today.` : `"${title}" started ${days === 1 ? 'yesterday' : `${days} days ago`}.`)
  if (items.length === 0) return parts[0] + ' Nothing\'s attached yet. Whatever comes next, I\'ll keep it here.'
  const visits = n('check-in') + n('comfort') + n('loop') + n('pause')
  if (visits >= 2) parts.push(`You've come back to it ${visits} times${n('comfort') ? `, ${n('comfort')} of them just needing comfort` : ''}.`)
  if (n('check-in')) parts.push(`${n('check-in') === 1 ? 'Once' : `${n('check-in')} times`} you separated what happened from the story.`)
  if (n('fawn')) parts.push(`You caught the fawn ${n('fawn') === 1 ? 'once' : `${n('fawn')} times`}.`)
  if (n('boundary')) parts.push(`You found words for it${items.some((i) => i.label === 'Said it') ? ', and you said them' : ''}.`)
  if (n('release')) parts.push(`${n('release') === 1 ? 'Once' : `${n('release')} times`} you brought it to God and set something down.`)
  if (n('win')) parts.push(`And ${n('win') === 1 ? 'once' : `${n('win')} times`} along the way, you honored yourself.`)
  if (personName && (n('flag') || n('signal'))) parts.push(`About ${personName}: ${n('signal')} green flag${n('signal') === 1 ? '' : 's'}, ${n('flag')} watch note${n('flag') === 1 ? '' : 's'}. The log knows things the fear doesn't.`)
  parts.push(days > 21 && visits >= 3 ? 'This one\'s been heavy for a while. That\'s not failure. Some stories take a season.' : 'That\'s the shape so far. Love and release can exist together.')
  return parts.join(' ')
}
