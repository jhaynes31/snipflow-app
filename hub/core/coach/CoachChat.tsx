"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PATHS } from "@/convex/paths";
import { splitReply, toolByKey, type PathLike, type ReplyPart, type ToolEntry } from "@/convex/toolIndex";
import { FeltButton } from "@/core/felt/FeltButton";
import { KeepLine } from "@/core/mantel/KeepLine";
import { usePath } from "@/core/paths/usePath";
import { CrisisCard, CrisisNotice } from "@/core/safety/CrisisNotice";
import { useTools } from "@/core/tools/useTools";
import { Btn, Card, ErrorNote, timeAgo, useAction } from "@/core/ui";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Rich } from "@/core/text/RichText";

/**
 * A small chat with the shared coach, for any module. The conversation is
 * created on the first send, under the module's name, and belongs to the
 * person alone. `opening` is sent silently as context ahead of the first
 * message (for example the passage text), never shown as their words.
 */
export interface Suggestions {
  /** Pulls addable lines out of a coach reply. */
  extract: (reply: string) => { text: string }[];
  /** What the button says. */
  label: string;
  onAdd: (text: string) => void | Promise<void>;
  /** Already added, so the button reads as done. */
  added: Set<string>;
}

/** Room to write. Raised from 3,000 on 2026-09-29 at Jen's ask; the server allows the same. */
const MESSAGE_MAX = 20000;
/** How long a conversation in one place stays the one you land back in. */
const RESUME_WINDOW = 24 * 60 * 60 * 1000;

export function CoachChat({ module, task, opening, placeholder = "Ask in your own words.", suggestions, initialId = null }: { module: string; task: string; opening?: string; placeholder?: string; suggestions?: Suggestions; initialId?: Id<"coachConversations"> | null }) {
  const start = useMutation(api.coach.conversations.start);
  const remove = useMutation(api.coach.conversations.remove);
  const send = useConvexAction(api.coach.chat.send);
  const [id, setId] = useState<Id<"coachConversations"> | null>(initialId);
  const [fresh, setFresh] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const earlier = useQuery(api.coach.conversations.mine, { module });
  // Coming back to the same place picks up the conversation from the last day
  // (2026-09-29, Jen's ask), unless this chat opens with its own context or
  // they asked for a new one. Nothing is lost either way; the rest are listed below.
  const resumed = !id && !initialId && !opening && !fresh ? earlier?.find((c) => c.count > 0 && openedAt - c.updatedAt < RESUME_WINDOW) ?? null : null;
  const activeId = id ?? resumed?._id ?? null;
  const row = useQuery(api.coach.conversations.get, activeId ? { id: activeId } : "skip");
  const { busy, error, run } = useAction();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const tools = useTools();
  const count = row?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [count, pending]);

  function submit() {
    const question = draft.trim();
    if (!question || busy) return;
    setPending(question);
    setDraft("");
    void run(async () => {
      let convo = activeId;
      if (!convo) {
        convo = await start({ module, task });
        setId(convo);
      }
      const message = opening && count === 0 && !activeId ? `${opening}\n\nMy question: ${question}` : question;
      const out = await send({ id: convo, message, task });
      setCrisis(out.crisis);
      return true;
    }).then((ok) => {
      if (!ok) setDraft(question);
      setPending(null);
    });
  }

  const shown = (row?.messages ?? []).map((m, i) => ({
    ...m,
    // Hide the silent opening context from the person's first message.
    content: i === 0 && m.role === "user" && opening && m.content.startsWith(opening) ? m.content.slice(opening.length).replace(/^\s*My question:\s*/, "") : m.content,
  }));

  return (
    <Card>
      {resumed && row && (
        <p className="sh-hint" style={{ marginTop: 0 }}>
          Picking up where you left off, {timeAgo(resumed.updatedAt)}. The buttons the coach gave you are still here.
        </p>
      )}
      <div className="tend-chat" aria-live="polite">
        {shown.map((m, i) => (
          <div key={i} className={`tend-msg ${m.role === "user" ? "tend-msg-user" : "tend-msg-coach"}`}>
            {m.role === "user" ? <Rich text={m.content} /> : <CoachReply text={m.content} href={tools ? tools.href : null} />}
            {m.role !== "user" && <KeepLine reply={m.content} task={task} />}
            {m.role !== "user" && suggestions && (
              <div className="sh-choices" style={{ marginTop: "0.4rem" }}>
                {suggestions.extract(m.content).map((s) => (
                  <Btn key={s.text} variant="secondary" disabled={suggestions.added.has(s.text)} onClick={() => void suggestions.onAdd(s.text)}>
                    {suggestions.added.has(s.text) ? "Added" : suggestions.label}: {s.text.length > 48 ? `${s.text.slice(0, 46)}…` : s.text}
                  </Btn>
                ))}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <>
            <div className="tend-msg tend-msg-user">{pending}</div>
            <div className="tend-msg tend-msg-coach tend-msg-thinking">Thinking it over…</div>
          </>
        )}
        <div ref={endRef} />
      </div>
      {crisis && <CrisisCard title="I'm glad you said it." />}
      <ErrorNote error={error} />
      <form
        className="sh-stack-sm tend-chat-form mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <RichTextarea className="sh-input sh-textarea sh-chat-box" rows={Math.min(24, Math.max(4, draft.split("\n").length + Math.floor(draft.length / 90)))} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MESSAGE_MAX} placeholder={placeholder} aria-label="Your question" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }} />
        {draft.length > MESSAGE_MAX * 0.75 && <p className="sh-hint">{draft.length.toLocaleString()} of {MESSAGE_MAX.toLocaleString()} characters.</p>}
        <CrisisNotice texts={[draft]} />
        <FeltButton context={module === "hub" ? "coach" : module} label="Start from a feeling" onInsert={(t) => setDraft((d) => (d.trim() ? `${d.trim()} ${t}` : `I feel ${t}`))} />
        <div className="sh-row sh-wrap">
          <Btn type="submit" disabled={busy || !draft.trim()}>{busy ? "Sending…" : "Ask"}</Btn>
          {activeId && (
            <>
              <Btn type="button" variant="ghost" disabled={busy} onClick={() => { setId(null); setFresh(true); setCrisis(false); }}>
                New conversation
              </Btn>
              <Btn type="button" variant="ghost" disabled={busy} onClick={() => void run(async () => { await remove({ id: activeId }); setId(null); setFresh(true); })}>
                Delete this conversation
              </Btn>
            </>
          )}
        </div>
      </form>
      {earlier && earlier.filter((c) => c._id !== activeId && c.count > 0).length > 0 && (
        <details className="sh-menu mt-3">
          <summary>Earlier conversations here ({earlier.filter((c) => c._id !== activeId && c.count > 0).length})</summary>
          <ul className="sh-list" style={{ marginTop: "0.5rem" }}>
            {earlier.filter((c) => c._id !== activeId && c.count > 0).map((c) => (
              <li key={c._id} className="sh-row sh-wrap">
                <button type="button" className="sh-link" style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }} onClick={() => { setId(c._id); setFresh(false); setCrisis(false); }}>
                  {c.firstLine || "Empty conversation"}
                </button>
                <span className="sh-muted">{timeAgo(c.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="sh-hint">
        Saved in The Shire, private to you, and deletable. Every conversation from every place is listed under <Link href="/talk/all" className="sh-link">All my conversations</Link>.
      </p>
    </Card>
  );
}

/**
 * A coach reply, with each [[tool:key]] tag turned into an Open button. When
 * a reply points to two or more tools, tapping any of them starts a path
 * through all of them (that one first), so the rest are waiting in the bar
 * at the top of the page instead of lost in the conversation (2026-09-29,
 * Jen's ask). One button at the end walks them in the coach's order.
 */
export function CoachReply({ text, href }: { text: string; href: ((t: ToolEntry) => string) | null }) {
  const parts = splitReply(text, undefined, PATHS);
  const path = usePath();
  const toolKeys = parts.filter((p): p is Extract<ReplyPart, { kind: "tool" }> => p.kind === "tool").map((p) => p.tool.key);
  const walk = toolKeys.length >= 2 && path.ready;
  const name = "What the coach pointed to";
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <span key={i}><Rich text={p.text} /> </span>
        ) : p.kind === "path" ? (
          <PathStart key={i} path={p.path} />
        ) : walk ? (
          <span key={i} className="tend-tool-open">
            <button type="button" className="sh-btn sh-btn-secondary sh-btn-inline" onClick={() => void path.startSteps(name, toolKeys, p.tool.key)} title={`Opens ${p.tool.name}, then the rest of these one after another`}>
              {p.tool.name} →
            </button>
          </span>
        ) : (
          <span key={i} className="tend-tool-open">
            {href && p.tool.href.includes("/app/") ? (
              <a href={href(p.tool)} className="sh-btn sh-btn-secondary sh-btn-inline">{p.tool.name} →</a>
            ) : (
              <Link href={href ? href(p.tool) : p.tool.href} className="sh-btn sh-btn-secondary sh-btn-inline">{p.tool.name} →</Link>
            )}
          </span>
        ),
      )}
      {walk && (
        <span className="tend-tool-open" style={{ display: "block", marginTop: "0.5rem" }}>
          <button type="button" className="sh-btn sh-btn-primary sh-btn-inline" onClick={() => void path.startSteps(name, toolKeys)}>
            Walk me through all {toolKeys.length}, one after another → {toolKeys.map((k) => toolByKey(k)?.name ?? k).join(", ")}
          </button>
        </span>
      )}
    </>
  );
}

/** A path the coach proposed: one button that starts it, with the steps named. */
function PathStart({ path }: { path: PathLike }) {
  const p = usePath();
  const known = p.paths.find((x) => x.key === path.key);
  if (!known) return <span className="sh-muted">({path.name})</span>;
  return (
    <span className="tend-tool-open">
      <button type="button" className="sh-btn sh-btn-primary sh-btn-inline" onClick={() => void p.start(path.key)}>
        Walk me through {path.name} → {path.steps.map((k) => toolByKey(k)?.name ?? k).join(", ")}
      </button>
    </span>
  );
}
