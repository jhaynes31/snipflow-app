"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CrisisCard, CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, useAction } from "@/core/ui";

/**
 * A small chat with the shared coach, for any module. The conversation is
 * created on the first send, under the module's name, and belongs to the
 * person alone. `opening` is sent silently as context ahead of the first
 * message (for example the passage text), never shown as their words.
 */
export function CoachChat({ module, task, opening, placeholder = "Ask in your own words." }: { module: string; task: string; opening?: string; placeholder?: string }) {
  const start = useMutation(api.coach.conversations.start);
  const remove = useMutation(api.coach.conversations.remove);
  const send = useConvexAction(api.coach.chat.send);
  const [id, setId] = useState<Id<"coachConversations"> | null>(null);
  const row = useQuery(api.coach.conversations.get, id ? { id } : "skip");
  const { busy, error, run } = useAction();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
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
      let convo = id;
      if (!convo) {
        convo = await start({ module });
        setId(convo);
      }
      const message = opening && count === 0 && !id ? `${opening}\n\nMy question: ${question}` : question;
      const out = await send({ id: convo, message, task });
      setCrisis(out.crisis);
    }).finally(() => setPending(null));
  }

  const shown = (row?.messages ?? []).map((m, i) => ({
    ...m,
    // Hide the silent opening context from the person's first message.
    content: i === 0 && m.role === "user" && opening && m.content.startsWith(opening) ? m.content.slice(opening.length).replace(/^\s*My question:\s*/, "") : m.content,
  }));

  return (
    <Card>
      <div className="tend-chat" aria-live="polite">
        {shown.map((m, i) => (
          <div key={i} className={`tend-msg ${m.role === "user" ? "tend-msg-user" : "tend-msg-coach"}`}>
            {m.content}
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
        <textarea className="sh-input sh-textarea" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={3000} placeholder={placeholder} aria-label="Your question" />
        <CrisisNotice texts={[draft]} />
        <div className="sh-row sh-wrap">
          <Btn type="submit" disabled={busy || !draft.trim()}>{busy ? "Sending…" : "Ask"}</Btn>
          {id && (
            <Btn type="button" variant="ghost" disabled={busy} onClick={() => void run(async () => { await remove({ id }); setId(null); })}>
              Delete this conversation
            </Btn>
          )}
        </div>
      </form>
      <p className="sh-hint">
        The coach quotes only the text in front of it, and says when Christians read something differently. Private to you. Also in <Link href="/tend/tools/talkItOut" className="sh-link">Talk It Out</Link>.
      </p>
    </Card>
  );
}
