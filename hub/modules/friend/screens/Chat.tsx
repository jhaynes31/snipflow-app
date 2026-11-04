"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { readFriendSettings } from "@/convex/friend/pure";
import { KeepLine } from "@/core/mantel/KeepLine";
import { CrisisCard, CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, ErrorNote, Spinner, timeAgo, useAction } from "@/core/ui";
import { BrambleAvatar, JuniperAvatar, PipAvatar } from "../Avatars";

const TAG = /\[\[\s*(activity|idea):\s*([^\]]+?)\s*\]\]/g;

function speak(text: string, voiceName: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(TAG, "").replace(/[*_]/g, "");
  const u = new SpeechSynthesisUtterance(clean);
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => x.name === voiceName) ?? voices.find((x) => /female|samantha|karen|moira|zira|aria|jenny/i.test(x.name) && x.lang.startsWith("en")) ?? voices.find((x) => x.lang.startsWith("en"));
  if (v) u.voice = v;
  u.rate = 0.98;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Pip's main room: the rally. */
export function Chat() {
  const { profile } = useHub();
  const settings = readFriendSettings(profile.moduleSettings);
  const current = useQuery(api.friend.entries.current);
  const nudges = useQuery(api.friend.entries.recentNudges);
  const open = useConvexAction(api.friend.chat.open);
  const send = useConvexAction(api.friend.chat.send);
  const remove = useMutation(api.friend.entries.remove);
  const seed = useMutation(api.friend.entries.seedActivities);
  const startActivity = useMutation(api.friend.entries.startActivity);
  const addActivity = useMutation(api.friend.entries.addActivity);
  const activities = useQuery(api.friend.entries.activities);
  const { busy, error, run } = useAction();
  const [id, setId] = useState<Id<"frConversations"> | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [revealed, setRevealed] = useState<number>(0);
  const [openedAt] = useState(() => Date.now());
  const [crisis, setCrisis] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const opening = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const activeId = id ?? current?._id ?? null;
  const row = useQuery(api.friend.entries.get, activeId ? { id: activeId } : "skip");

  // She opened the door and nothing is going: Pip speaks first.
  useEffect(() => {
    if (current === null && !activeId && !opening.current) {
      opening.current = true;
      setTyping(true);
      void run(async () => {
        const out = await open({});
        setId(out.id);
      }).finally(() => { setTyping(false); opening.current = false; });
    }
  }, [current, activeId, open, run]);

  // Plant the starter shelf the first time.
  useEffect(() => {
    if (activities && activities.length === 0) void seed({});
  }, [activities, seed]);

  const count = row?.messages.length ?? 0;
  const lastPip = row?.messages[row.messages.length - 1];
  // A new Pip reply shows after a short, length-shaped pause, so it reads like someone typing.
  const revealing = !!lastPip && lastPip.role === "assistant" && revealed < count;
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [count, pending, typing, revealing]);
  useEffect(() => {
    if (!revealing || !lastPip) return;
    const words = lastPip.content.split(/\s+/).length;
    const delay = Math.min(1800, 350 + words * 25);
    const t = setTimeout(() => {
      setRevealed(count);
      if (settings.persona.voiceEnabled) speak(lastPip.content, settings.persona.voiceName);
    }, delay);
    return () => clearTimeout(t);
  }, [revealing, lastPip, count, settings.persona.voiceEnabled, settings.persona.voiceName]);

  function submit(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || busy || !activeId) return;
    setPending(message);
    setDraft("");
    void run(async () => {
      const out = await send({ id: activeId, message });
      setCrisis(out.crisis);
      return true;
    }).then((ok) => { if (!ok && !text) setDraft(message); setPending(null); });
  }

  const shown = row ? row.messages.slice(0, revealing ? count - 1 : undefined) : [];
  const latestNudge = nudges?.[0] && openedAt - nudges[0].createdAt < 36 * 60 * 60 * 1000 && count === 0 ? nudges[0] : null;

  return (
    <div className="sh-container sh-narrow sh-stack">
      <div className="fr-porch">
        <span className="fr-leaf l1" /><span className="fr-leaf l2" /><span className="fr-leaf l3" /><span className="fr-leaf l4" />
        <div className="fr-head">
          <PipAvatar size={56} />
          <div>
            <h1>{settings.persona.name}</h1>
            <span className="fr-vibe">{row ? `feeling ${row.vibe}` : "…"}</span>
            {settings.busy && <span className="fr-vibe" style={{ marginLeft: "0.4rem" }}>you&apos;re marked busy</span>}
          </div>
        </div>
        {latestNudge && <p className="sh-hint">Pip, {timeAgo(latestNudge.createdAt)}: &ldquo;{latestNudge.text}&rdquo;</p>}
        <div className="fr-chat" aria-live="polite">
          {!row && !typing && <Spinner />}
          {shown.map((m, i) => (
            <div key={i} className={`fr-msg ${m.role === "user" ? "fr-msg-user" : "fr-msg-pip"}`}>
              {m.role === "user" ? <Rich text={m.content} /> : (
                <>
                  <PipAvatar size={26} />
                  <div style={{ minWidth: 0 }}>
                    <PipText text={m.content} activities={activities ?? []} onInvite={(aid, yes, title) => void run(async () => { await startActivity({ id: aid as Id<"frActivities">, startedBy: "pip", accepted: yes }); submit(yes ? `I'm in. Let's do ${title}.` : "Not now, maybe later."); })} onIdea={(title, yes) => void run(async () => { if (yes) await addActivity({ title, addedBy: "pip" }); submit(yes ? `Yes, add "${title}" to our list.` : "Not that one, I think."); })} />
                    {i === shown.length - 1 && <KeepLine reply={m.content} task="friend.chat" />}
                  </div>
                </>
              )}
            </div>
          ))}
          {pending && <div className="fr-msg fr-msg-user">{pending}</div>}
          {(typing || revealing || (busy && pending)) && <div className="fr-msg fr-msg-pip"><PipAvatar size={26} /><span className="fr-typing" aria-label="Pip is typing"><span /><span /><span /></span></div>}
          <div ref={endRef} />
        </div>
      </div>
      {crisis && <CrisisCard title="I'm glad you told me." />}
      <ErrorNote error={error} />
      <form className="sh-stack-sm" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <RichTextarea className="sh-input sh-textarea sh-chat-box" rows={Math.min(12, Math.max(2, draft.split("\n").length))} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={20000} placeholder="Say anything." aria-label="Your message" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <CrisisNotice texts={[draft]} />
        <div className="sh-row sh-wrap">
          <Btn type="submit" disabled={busy || !draft.trim() || !activeId}>Send</Btn>
          <Btn type="button" variant="ghost" disabled={busy} onClick={() => { setId(null); opening.current = false; setCrisis(false); void run(async () => { setTyping(true); const out = await open({}); setId(out.id); }).finally(() => setTyping(false)); }}>Fresh start</Btn>
          {activeId && <Btn type="button" variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Delete this conversation? Pip keeps only what's already in its memory.")) void run(async () => { await remove({ id: activeId }); setId(null); opening.current = false; }); }}>Delete</Btn>}
          <button type="button" className="sh-link" onClick={() => setShowEarlier((s) => !s)}>{showEarlier ? "Hide earlier" : "Earlier conversations"}</button>
        </div>
        <p className="sh-hint">Enter sends; Shift+Enter for a new line. Pip is an AI and says so if you ask. Private to you; no other place in The Shire can read this. <Link href="/friend/stuff" className="sh-link">What Pip knows</Link> is yours to edit.</p>
      </form>
      {showEarlier && <Earlier onPick={(cid) => { setId(cid); setShowEarlier(false); }} />}
      <p className="fr-neighbor"><JuniperAvatar /> Juniper <BrambleAvatar /> Bramble <span>live next door. Ask Pip what they&apos;ve been up to.</span></p>
    </div>
  );
}

/** Pip's text with [[activity:ID]] and [[idea:title]] turned into cards. */
function PipText({ text, activities, onInvite, onIdea }: { text: string; activities: { _id: Id<"frActivities">; title: string; description: string }[]; onInvite: (id: string, yes: boolean, title: string) => void; onIdea: (title: string, yes: boolean) => void }) {
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TAG)) {
    const before = text.slice(last, m.index);
    if (before.trim()) parts.push(<Rich key={`t${m.index}`} text={before.replace(/\s+$/, "")} />);
    const kind = m[1];
    const val = m[2].trim();
    const key = `${kind}:${val}`;
    if (kind === "activity") {
      const a = activities.find((x) => String(x._id) === val);
      if (a) parts.push(
        <div key={key} className="fr-invite">
          <strong>Wanna do this? {a.title}</strong>{a.description && <div className="sh-hint">{a.description}</div>}
          {!answered.has(key) ? (
            <div className="sh-row mt-2" style={{ gap: "0.4rem" }}>
              <Btn onClick={() => { setAnswered(new Set(answered).add(key)); onInvite(val, true, a.title); }}>I&apos;m in</Btn>
              <Btn variant="secondary" onClick={() => { setAnswered(new Set(answered).add(key)); onInvite(val, false, a.title); }}>Not now</Btn>
            </div>
          ) : <div className="sh-hint">Answered.</div>}
        </div>,
      );
    } else {
      parts.push(
        <div key={key} className="fr-invite">
          <strong>New idea for our list: {val}</strong>
          {!answered.has(key) ? (
            <div className="sh-row mt-2" style={{ gap: "0.4rem" }}>
              <Btn onClick={() => { setAnswered(new Set(answered).add(key)); onIdea(val, true); }}>Add it</Btn>
              <Btn variant="secondary" onClick={() => { setAnswered(new Set(answered).add(key)); onIdea(val, false); }}>Not that one</Btn>
            </div>
          ) : <div className="sh-hint">Answered.</div>}
        </div>,
      );
    }
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = text.slice(last);
  if (rest.trim()) parts.push(<Rich key="rest" text={rest.replace(/^\s+/, "")} />);
  return <>{parts}</>;
}

function Earlier({ onPick }: { onPick: (id: Id<"frConversations">) => void }) {
  const list = useQuery(api.friend.entries.list);
  if (!list) return <Spinner />;
  if (list.length === 0) return <p className="sh-muted">Nothing earlier yet.</p>;
  return (
    <ul className="sh-list">
      {list.map((c) => (
        <li key={c._id} className="sh-row sh-wrap">
          <button type="button" className="sh-link" style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }} onClick={() => onPick(c._id)}>{c.summary ?? c.firstLine ?? "(quiet)"}</button>
          <span className="sh-muted">{timeAgo(c.updatedAt)} · {c.vibe}</span>
        </li>
      ))}
    </ul>
  );
}
