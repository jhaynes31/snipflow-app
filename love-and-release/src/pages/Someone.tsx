import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shell } from '@/components/Shell'
import { Speak } from '@/components/Speak'
import { JesusLine } from '@/components/JesusLine'
import { Avatar } from '@/pages/Circles'
import { db } from '@/db/db'
import { placementName, usePersonSignals, useRings } from '@/lib/circles'
import { setCurrentThread, useThreads } from '@/lib/threads'

/** "I'm confused about someone": look at what's actually there before deciding anything. */
export function Someone() {
  const nav = useNavigate()
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) ?? []
  const [id, setId] = useState<string | undefined>()
  const person = people.find((p) => p.id === id)
  const sig = usePersonSignals(id)
  const rings = useRings()
  const threads = useThreads().filter((t) => t.personId === id && t.status !== 'released')

  if (!person) return (
    <Shell back="/" hideNav>
      <div className="stack-lg">
        <Speak><p>Let's look at what's actually there, not what the fear says. Who is it?</p></Speak>
        <div className="list">{people.map((p) => <button key={p.id} type="button" className="item card-link row" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => setId(p.id)}><Avatar person={p} size={36} /><span><span className="item-title">{p.name}</span><span className="item-meta" style={{ display: 'block' }}>{p.role}</span></span></button>)}</div>
        <Link to="/circles/add" className="btn btn-ghost">Someone new</Link>
      </div>
    </Shell>
  )

  const r = sig?.reciprocity
  const signals = sig?.signals.length ?? 0, open = sig?.openFlags.length ?? 0, resolved = (sig?.flags.length ?? 0) - open
  const evidence = r ? `In the last 90 days: they reached out or showed up ${r.them} time${r.them === 1 ? '' : 's'}, you ${r.me}, and ${r.dropped} thing${r.dropped === 1 ? '' : 's'} got dropped.` : ''
  const read = signals + open + resolved + (r?.total ?? 0) === 0
    ? `I don't have much logged about ${person.name} yet, which means the confusion is running on feeling alone right now. That's okay. It just means we should be slow.`
    : `${evidence} ${signals} green flag${signals === 1 ? '' : 's'}${open ? `, ${open} open watch note${open === 1 ? '' : 's'}` : ''}${resolved ? `, ${resolved} resolved` : ''}. ${r?.oneSided ? 'It has been one-sided lately. That\'s a pattern, not a verdict.' : open ? 'There\'s something open to keep an eye on, and there\'s also what they\'ve shown.' : 'Nothing logged says danger. The fear might be the loop, or an old wound, more than this person.'}`

  return (
    <Shell back="/" hideNav>
      <div className="stack-lg">
        <div className="row"><Avatar person={person} size={48} /><div><h1 style={{ marginBottom: 0 }}>{person.name}</h1><div className="muted">{person.role} · {placementName(person.ringId, rings)}</div></div></div>
        <Speak>{read}</Speak>
        <Speak tone="sage">Repeated doubt about how someone feels can be the loop talking. What they've done is the evidence. What you're afraid of is the story.</Speak>
        <JesusLine tags={['Words and actions not matching', 'Unreciprocated effort', 'Naming poor behavior']} />
        <div className="doors">
          <button type="button" className="door" onClick={() => nav(`/people/${person.id}`)}>See everything I've logged<span>Green flags, watch notes, reciprocity, moves</span></button>
          <button type="button" className="door" onClick={() => { setCurrentThread(null); nav('/check-in') }}>Untangle the specific thing<span>Fact vs. Story, linked to {person.name}</span></button>
          <button type="button" className="door" onClick={() => { setCurrentThread(null); nav('/personal') }}>Am I taking something personally?<span>Their side, my slice</span></button>
          <button type="button" className="door" onClick={() => nav(`/pace/${person.id}?mode=halo`)}>I think they're amazing<span>A halo check, five questions</span></button>
          <button type="button" className="door" onClick={() => nav(`/pace/${person.id}?mode=used`)}>Am I being used?<span>Six honest questions</span></button>
          <button type="button" className="door" onClick={() => nav('/unhooked/loop')}>It might be the loop<span>Step out first, decide later</span></button>
          <button type="button" className="door" onClick={() => nav(`/circles/move/${person.id}`)}>Something needs to change<span>A move review, closer or further</span></button>
          {threads.length ? <button type="button" className="door door-sage" onClick={() => nav(`/threads/${threads[0].id}`)}>Open the thread: {threads[0].title}<span>The whole arc, in one place</span></button> : <button type="button" className="door door-sage" onClick={() => nav('/threads/new')}>Start a thread about this<span>So the story stays in one place</span></button>}
        </div>
      </div>
    </Shell>
  )
}
