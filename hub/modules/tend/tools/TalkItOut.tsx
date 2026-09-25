"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CoachReply } from "@/core/coach/CoachChat";
import { KeepLine } from "@/core/mantel/KeepLine";
import { useHub } from "@/core/shell/HubContext";
import { useTools } from "@/core/tools/useTools";
import { CrisisCard, CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, LinkBtn, Spinner, timeAgo, useAction } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

/**
 * Talk It Out: a private chat with the shared coach, grounded in the
 * person's own manual. Every conversation is theirs alone and can be
 * deleted. Crisis wording stops the coach's normal flow and shows the
 * numbers instead.
 */
export function TalkItOut({ conversationId }: { conversationId?: string }) {
  return (
    <ToolFrame toolKey="talkItOut">
      {conversationId ? <Conversation id={conversationId as Id<"coachConversations">} /> : <ConversationList />}
    </ToolFrame>
  );
}

function ConversationList() {
  const { partner } = useHub();
  const list = useQuery(api.coach.conversations.mine, { module: "tend" });
  const start = useMutation(api.coach.conversations.start);
  const remove = useMutation(api.coach.conversations.remove);
  const removeAll = useMutation(api.coach.conversations.removeAll);
  const { busy, error, run } = useAction();
  if (!list) return <Spinner />;
  return (
    <div className="sh-stack">
      <Card>
        <p>
          A private place to put what&apos;s happening into words and find one small next step. The coach reads the manual sections you allowed and nothing else of yours.
          {partner ? ` ${partner.displayName} never sees these.` : ""}
        </p>
        <p className="sh-hint">The coach is a support tool, not a therapist or doctor. It never diagnoses and never changes medication advice.</p>
        <ErrorNote error={error} />
        <Btn
          big
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const id = await start({ module: "tend" });
              window.location.assign(`/tend/tools/talkItOut/${id}`);
            })
          }
        >
          Start a new conversation
        </Btn>
      </Card>
      {list.length > 0 && (
        <Card>
          <h2 className="sh-h2">Earlier conversations</h2>
          <ul className="sh-list">
            {list.map((c) => (
              <li key={c._id} className="sh-row sh-wrap">
                <Link href={`/tend/tools/talkItOut/${c._id}`} className="sh-link">
                  {c.firstLine || "Empty conversation"}
                </Link>
                <span className="sh-muted">{timeAgo(c.updatedAt)}</span>
                <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: c._id }))}>
                  Delete
                </Btn>
              </li>
            ))}
          </ul>
          <Btn variant="ghost" disabled={busy} onClick={() => void run(() => removeAll({}))}>
            Delete all of my conversations
          </Btn>
        </Card>
      )}
    </div>
  );
}

function Conversation({ id }: { id: Id<"coachConversations"> }) {
  const { partner } = useHub();
  const row = useQuery(api.coach.conversations.get, { id });
  const send = useConvexAction(api.coach.chat.send);
  const tools = useTools();
  const remove = useMutation(api.coach.conversations.remove);
  const { busy, error, run } = useAction();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [loop, setLoop] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const count = row?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [count, pending]);

  if (row === undefined) return <Spinner />;
  if (row === null) {
    return (
      <Card>
        <p>That conversation isn&apos;t here any more.</p>
        <LinkBtn href="/tend/tools/talkItOut" variant="secondary">All conversations</LinkBtn>
      </Card>
    );
  }

  function submit() {
    const message = draft.trim();
    if (!message || busy) return;
    setPending(message);
    setDraft("");
    void run(async () => {
      const out = await send({ id, message, task: "tend.talkItOut" });
      setCrisis(out.crisis);
      setLoop(out.loop);
      return true;
    }).then((ok) => {
      // A failed send puts the words back so nothing is lost.
      if (!ok) setDraft(message);
      setPending(null);
    });
  }

  return (
    <div className="sh-stack">
      <p className="sh-muted">
        <Link href="/tend/tools/talkItOut" className="sh-link">All conversations</Link>
        {partner ? ` · Private. ${partner.displayName} never sees this.` : " · Private."}
      </p>
      <Card>
        <div className="tend-chat" aria-live="polite">
          {row.messages.length === 0 && !pending && (
            <p className="sh-muted">Start anywhere. What&apos;s going on, in your own words? Short is fine.</p>
          )}
          {row.messages.map((m, i) => (
            <div key={i} className={`tend-msg ${m.role === "user" ? "tend-msg-user" : "tend-msg-coach"}`}>
              {m.role === "user" ? m.content : <CoachReply text={m.content} href={tools ? tools.href : null} />}
              {m.role !== "user" && <KeepLine reply={m.content} task="tend.talkItOut" />}
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
        {loop && !crisis && (
          <div className="sh-banner" role="status">
            The same worry seems to be asking again. Answering it again usually feeds it.{" "}
            <Link href="/tend/tools/sitWithIt" className="sh-link">Sit With It</Link> or{" "}
            <Link href="/tend/tools/groundMe" className="sh-link">Ground Me</Link> might help more.
          </div>
        )}
        <ErrorNote error={error} />
        <form
          className="sh-stack-sm tend-chat-form mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            className="sh-input sh-textarea"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={4000}
            placeholder="Say it however it comes out."
            aria-label="Your message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <CrisisNotice texts={[draft]} />
          <div className="sh-row sh-wrap">
            <Btn type="submit" big disabled={busy || !draft.trim()}>
              {busy ? "Sending…" : "Send"}
            </Btn>
            <Btn
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await remove({ id });
                  window.location.assign("/tend/tools/talkItOut");
                })
              }
            >
              Delete this conversation
            </Btn>
          </div>
        </form>
      </Card>
      <p className="sh-hint">The coach is a support tool, not a therapist or doctor. If things feel unsafe, <Link href="/help-now" className="sh-link">Need help now</Link> is one tap away.</p>
    </div>
  );
}
