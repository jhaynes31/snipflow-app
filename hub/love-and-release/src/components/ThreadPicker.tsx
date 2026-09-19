import { useState } from 'react'
import { createThread, getCurrentThread, setCurrentThread, touchThread, useThreads } from '@/lib/threads'

interface Props {
  onPick: (threadId: string | null) => void
  personId?: string
  suggestedTitle?: string
}

/** "Does this belong to a thread?" Offered at the end of a path, never required. */
export function ThreadPicker({ onPick, personId, suggestedTitle }: Props) {
  const threads = useThreads().filter((t) => t.status !== 'released')
  const current = getCurrentThread()
  const [title, setTitle] = useState(suggestedTitle ?? '')
  const [adding, setAdding] = useState(false)
  const pick = async (id: string | null) => { if (id) await touchThread(id); setCurrentThread(id); onPick(id) }
  const create = async () => { if (!title.trim()) return; const t = await createThread(title, personId); await pick(t.id) }
  return (
    <div className="card-soft stack">
      <div className="label">Is this part of a bigger story?</div>
      <div className="chips">
        {threads.map((t) => <button key={t.id} type="button" className="chip" aria-pressed={current === t.id} onClick={() => pick(t.id)}>{t.title}</button>)}
        {!adding && <button type="button" className="chip" onClick={() => setAdding(true)}>+ New thread</button>}
      </div>
      {adding && (
        <div className="row">
          <input className="input grow" autoFocus value={title} placeholder='e.g. "The thing with my sister"' onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} aria-label="Thread title" />
          <button type="button" className="btn btn-sm btn-primary" onClick={create} disabled={!title.trim()}>Start it</button>
        </div>
      )}
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => pick(null)}>No, this stands on its own</button>
    </div>
  )
}
