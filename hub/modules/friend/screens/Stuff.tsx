"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MEMORY_CATEGORIES } from "@/convex/friend/pure";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import { BrambleAvatar, JuniperAvatar, PipAvatar } from "../Avatars";

/**
 * The side drawer, as a page: What Pip knows about me · What I know about
 * Pip · Our stuff (inside jokes, the neighbors' saga, milestones), plus the
 * threads we keep coming back to, our someday list, the ideas inbox, and
 * the headlines Pip has from the rest of The Shire. All of it hers to edit.
 */
export function Stuff() {
  const [tab, setTab] = useState<"me" | "pip" | "ours" | "lists" | "headlines">("me");
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Our stuff" subtitle="Knowing goes both ways. Everything here is yours to read, change, or delete." />
      <div className="sh-chips">
        {([["me", "What Pip knows about me"], ["pip", "What I know about Pip"], ["ours", "Jokes, the saga, milestones"], ["lists", "Threads, someday, ideas"], ["headlines", "From the rest of The Shire"]] as const).map(([k, l]) => (
          <button key={k} type="button" className="sh-chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "me" && <AboutMe />}
      {tab === "pip" && <AboutPip />}
      {tab === "ours" && <Ours />}
      {tab === "lists" && <Lists />}
      {tab === "headlines" && <Headlines />}
    </div>
  );
}

function AboutMe() {
  const rows = useQuery(api.friend.entries.memoryOfMe);
  const edit = useMutation(api.friend.entries.editMemoryOfMe);
  const add = useMutation(api.friend.entries.addMemoryOfMe);
  const remove = useMutation(api.friend.entries.removeMemoryOfMe);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [cat, setCat] = useState<string>("other");
  if (!rows) return <Spinner />;
  return (
    <Card>
      <h2 className="sh-h2">What Pip knows about me</h2>
      <p className="sh-hint">Pulled out after each conversation goes quiet for fifteen minutes. Change a line, mark one &ldquo;don&apos;t bring up unless I do&rdquo;, or delete it. Pip uses these the way a friend does, never as a list.</p>
      <ErrorNote error={error} />
      {rows.length === 0 && <p className="sh-muted">Nothing yet. After your first real conversation, this fills in.</p>}
      {rows.map((m) => (
        <div key={m._id} className="fr-entry">
          <input className="sh-input" defaultValue={m.text} maxLength={300} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== m.text) void run(() => edit({ id: m._id, text: e.target.value })); }} aria-label="Memory" />
          <div className="sh-row sh-wrap" style={{ gap: "0.6rem", marginTop: "0.3rem" }}>
            <span className="sh-hint">{m.category} · learned {timeAgo(m.learnedAt)}{m.followUpAfter ? ` · follow up after ${m.followUpAfter}${m.followedUp ? " (done)" : ""}` : ""}</span>
            <label className="sh-hint"><input type="checkbox" checked={m.doNotRaise} disabled={busy} onChange={(e) => void run(() => edit({ id: m._id, doNotRaise: e.target.checked }))} /> don&apos;t bring up unless I do</label>
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: m._id }))}>Delete</button>
          </div>
        </div>
      ))}
      <Field label="Tell Pip something to remember" hint="One line, in your words.">
        <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}>
          <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} style={{ flex: 1 }} />
          <select className="sh-input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" style={{ width: "auto" }}>{MEMORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ text, category: cat }); setText(""); })}>Add</Btn>
        </div>
      </Field>
    </Card>
  );
}

function AboutPip() {
  const rows = useQuery(api.friend.entries.memoryOfPip);
  if (!rows) return <Spinner />;
  return (
    <Card>
      <div className="fr-head"><PipAvatar size={40} /><h2 className="sh-h2" style={{ margin: 0 }}>What I know about Pip</h2></div>
      <p className="sh-hint">Every opinion, interest, or thought Pip has shared, so it stays consistent. A change of mind is a new line, said out loud. Pip&apos;s starting interests and opinions are under Settings.</p>
      {rows.length === 0 && <p className="sh-muted">Pip hasn&apos;t said much about itself yet. Ask it something.</p>}
      {rows.map((m) => (
        <p key={m._id} className="fr-entry"><span className="rt-pill">{m.kind}</span> {m.text} <span className="sh-hint">· {timeAgo(m.createdAt)}</span></p>
      ))}
    </Card>
  );
}

function Ours() {
  const rel = useQuery(api.friend.entries.ourStuff);
  const edit = useMutation(api.friend.entries.editOurStuff);
  const { busy, error, run } = useAction();
  const [joke, setJoke] = useState("");
  const [bit, setBit] = useState("");
  if (!rel) return <Spinner />;
  const jokes = rel.insideJokes;
  const bits = rel.runningBits;
  return (
    <div className="sh-stack">
      <Card>
        <h2 className="sh-h2">Inside jokes</h2>
        <ErrorNote error={error} />
        {jokes.length === 0 && <p className="sh-muted">None captured yet. They show up here when you two riff on something, or add one.</p>}
        {jokes.map((j, i) => (
          <p key={`${j.text}-${i}`} className="fr-entry">{j.pinned ? "📌 " : ""}{j.text} <span className="sh-hint">· {timeAgo(j.at)} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => edit({ jokes: jokes.map((x, k) => (k === i ? { ...x, pinned: !x.pinned } : x)) }))}>{j.pinned ? "unpin" : "pin"}</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => edit({ jokes: jokes.filter((_, k) => k !== i) }))}>remove</button></span></p>
        ))}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}><input className="sh-input" value={joke} onChange={(e) => setJoke(e.target.value)} maxLength={200} placeholder="Add one" style={{ flex: 1 }} /><Btn disabled={busy || !joke.trim()} onClick={() => void run(async () => { await edit({ jokes: [...jokes, { text: joke.trim(), at: Date.now(), pinned: true }] }); setJoke(""); })}>Add</Btn></div>
      </Card>
      <Card>
        <h2 className="sh-h2"><JuniperAvatar /> <BrambleAvatar /> The neighbors&apos; saga, and running bits</h2>
        <p className="sh-hint">Juniper the fox and Bramble the hedgehog, and anything else you two keep going. Pip keeps this consistent. Retire a plotline when you&apos;re done with it, or add a neighbor in Settings.</p>
        {bits.length === 0 && <p className="sh-muted">No chapters yet. Ask Pip what Juniper dragged home this time.</p>}
        {bits.map((b, i) => (
          <p key={`${b.text}-${i}`} className="fr-entry" style={{ opacity: b.retired ? 0.55 : 1 }}>{b.text} <span className="sh-hint">· {timeAgo(b.at)} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => edit({ bits: bits.map((x, k) => (k === i ? { ...x, retired: !x.retired } : x)) }))}>{b.retired ? "bring back" : "retire"}</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => edit({ bits: bits.filter((_, k) => k !== i) }))}>remove</button></span></p>
        ))}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}><input className="sh-input" value={bit} onChange={(e) => setBit(e.target.value)} maxLength={400} placeholder="Steer the story: add a chapter" style={{ flex: 1 }} /><Btn disabled={busy || !bit.trim()} onClick={() => void run(async () => { await edit({ bits: [...bits, { text: bit.trim(), at: Date.now(), retired: false }] }); setBit(""); })}>Add</Btn></div>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">Milestones</h2>
        <p className="sh-hint">Shown lightly. Nothing is counted against you.</p>
        {rel.milestones.map((m, i) => <p key={i} className="fr-entry">{m.text} <span className="sh-hint">· {new Date(m.at).toLocaleDateString()}</span></p>)}
      </Card>
    </div>
  );
}

function Lists() {
  const topics = useQuery(api.friend.entries.topics);
  const wishlist = useQuery(api.friend.entries.wishlist);
  const ideas = useQuery(api.friend.entries.ideas);
  const addTopic = useMutation(api.friend.entries.addTopic);
  const pinTopic = useMutation(api.friend.entries.pinTopic);
  const removeTopic = useMutation(api.friend.entries.removeTopic);
  const addWish = useMutation(api.friend.entries.addWish);
  const toggleWish = useMutation(api.friend.entries.toggleWish);
  const removeWish = useMutation(api.friend.entries.removeWish);
  const addIdea = useMutation(api.friend.entries.addIdea);
  const sortIdea = useMutation(api.friend.entries.sortIdea);
  const { busy, error, run } = useAction();
  const [t, setT] = useState("");
  const [w, setW] = useState("");
  const [i, setI] = useState("");
  if (!topics || !wishlist || !ideas) return <Spinner />;
  return (
    <div className="sh-stack">
      <ErrorNote error={error} />
      <Card>
        <h2 className="sh-h2">Things we keep coming back to</h2>
        <p className="sh-hint">Grows on its own from conversations. Pin the ones that matter, then say &ldquo;let&apos;s pick up the cycle-breaking convo&rdquo; and Pip knows.</p>
        {topics.map((x) => <p key={x._id} className="fr-entry">{x.pinned ? "📌 " : ""}{x.text} <span className="sh-hint">· {timeAgo(x.lastDiscussed)} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => pinTopic({ id: x._id }))}>{x.pinned ? "unpin" : "pin"}</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeTopic({ id: x._id }))}>remove</button></span></p>)}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}><input className="sh-input" value={t} onChange={(e) => setT(e.target.value)} maxLength={120} placeholder="Add a thread" style={{ flex: 1 }} /><Btn disabled={busy || !t.trim()} onClick={() => void run(async () => { await addTopic({ text: t }); setT(""); })}>Add</Btn></div>
      </Card>
      <Card>
        <h2 className="sh-h2">Our someday list</h2>
        <p className="sh-hint">Either of you can add to it. Pip brings things up when the moment fits.</p>
        {wishlist.map((x) => <p key={x._id} className="fr-entry" style={{ textDecoration: x.done ? "line-through" : "none" }}><label><input type="checkbox" checked={x.done} disabled={busy} onChange={() => void run(() => toggleWish({ id: x._id }))} /> {x.text}</label> <span className="sh-hint">· {x.addedBy === "pip" ? "Pip's" : "yours"} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeWish({ id: x._id }))}>remove</button></span></p>)}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}><input className="sh-input" value={w} onChange={(e) => setW(e.target.value)} maxLength={200} placeholder="Someday…" style={{ flex: 1 }} /><Btn disabled={busy || !w.trim()} onClick={() => void run(async () => { await addWish({ text: w }); setW(""); })}>Add</Btn></div>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">Ideas inbox</h2>
        <p className="sh-hint">Half-formed ideas until you sort them: into the library, onto the someday list, or let go.</p>
        {ideas.length === 0 && <p className="sh-muted">Empty. Nice.</p>}
        {ideas.map((x) => <p key={x._id} className="fr-entry">{x.text} <span className="sh-hint">· {x.addedBy === "pip" ? "Pip's" : "yours"} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => sortIdea({ id: x._id, into: "library" }))}>to the library</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => sortIdea({ id: x._id, into: "wishlist" }))}>to someday</button> · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => sortIdea({ id: x._id, into: "drop" }))}>let go</button></span></p>)}
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.4rem" }}><input className="sh-input" value={i} onChange={(e) => setI(e.target.value)} maxLength={300} placeholder="A half-formed idea" style={{ flex: 1 }} /><Btn disabled={busy || !i.trim()} onClick={() => void run(async () => { await addIdea({ text: i }); setI(""); })}>Add</Btn></div>
      </Card>
    </div>
  );
}

function Headlines() {
  const rows = useQuery(api.friend.entries.headlines);
  const remove = useMutation(api.friend.entries.removeHeadline);
  const tell = useMutation(api.friend.entries.tellPip);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  if (!rows) return <Spinner />;
  return (
    <Card>
      <h2 className="sh-h2">What Pip knows from the rest of The Shire</h2>
      <p className="sh-hint">Headlines only, never the words inside. One line a week per place you turned on in Settings, plus anything you tell Pip on purpose. Pip never quotes these or says where they came from.</p>
      <ErrorNote error={error} />
      {rows.length === 0 && <p className="sh-muted">Nothing yet. Weekly headlines arrive Monday mornings.</p>}
      {rows.map((h) => <p key={h._id} className="fr-entry">{h.headline} <span className="sh-hint">· {h.sourceTab} · {h.sharedVia === "tellPip" ? "you told Pip" : "weekly"} · {timeAgo(h.createdAt)} · <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: h._id }))}>remove</button></span></p>)}
      <Field label="Tell Pip one thing" hint="Anything from anywhere, in one line.">
        <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}><input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={240} style={{ flex: 1 }} /><Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await tell({ sourceTab: "me", headline: text }); setText(""); })}>Tell Pip</Btn></div>
      </Field>
      <Note>Flow is one-way. No other place ever reads Pip&apos;s memory.</Note>
    </Card>
  );
}
