"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { CoachChat } from "@/core/coach/CoachChat";
import { KIND_LABEL, LETTER_PROMPTS, LITTLE_ROOMS, type LetterKind, type LittleWho } from "@/core/hearth/little";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * The girl (5 to 7) and the teenager (12 to 16). Trauma-informed: every
 * prompt is an invitation, nothing asks her to remember, the crisis notice
 * watches what she writes, and the parents' voices can speak to her directly.
 */
export function Little({ who }: { who: LittleWho }) {
  const room = LITTLE_ROOMS[who];
  const rows = useQuery(api.hearth.entries.letters, { who });
  const add = useMutation(api.hearth.entries.addLetter);
  const remove = useMutation(api.hearth.entries.removeLetter);
  const { run, error, busy } = useAction();
  const [kind, setKind] = useState<LetterKind | null>(null);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<"father" | "mother">("mother");
  const prompts = LETTER_PROMPTS.filter((p) => p.who.includes(who));
  const prompt = prompts.find((p) => p.kind === kind);

  async function save() {
    if (!kind) return;
    await run(() => add({ who, kind, text }));
    setText(""); setKind(null);
  }

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title={room.name} subtitle={`${room.ages[0].toUpperCase()}${room.ages.slice(1)}.`} />
      <Note>{room.intro}</Note>
      <Card>
        <p className="sh-label">If you want to write something</p>
        <div className="sh-chips">
          {prompts.map((p) => (
            <button key={p.kind} type="button" className={`sh-chip ${kind === p.kind ? "" : "sh-chip-quiet"}`} aria-pressed={kind === p.kind} onClick={() => setKind(p.kind)}>{p.title}</button>
          ))}
        </div>
        {prompt && (
          <>
            <p className="sh-hint mt-2">{prompt.prompt}</p>
            <textarea className="sh-input sh-textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} />
            <CrisisNotice texts={[text]} />
            <ErrorNote error={error} />
            <div className="sh-row mt-2">
              <Btn big disabled={busy || !text.trim()} onClick={() => void save()}>Keep it</Btn>
              <Btn variant="ghost" onClick={() => { setKind(null); setText(""); }}>Not now</Btn>
            </div>
          </>
        )}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h3">Let a parent speak to her</h2>
        <p className="sh-muted">Pick who. Then tell them what she needs to hear, or just say &ldquo;talk to her.&rdquo; They&apos;ll speak to her at her age, not to you.</p>
        <div className="sh-choices">
          <Btn variant={voice === "mother" ? "primary" : "secondary"} onClick={() => setVoice("mother")}>Mom</Btn>
          <Btn variant={voice === "father" ? "primary" : "secondary"} onClick={() => setVoice("father")}>Dad</Btn>
        </div>
        <CoachChat key={voice} module="hearth" task={who === "girl" ? "hearth.girl" : "hearth.teen"} opening={voice === "father" ? "Please speak as the father, not the mother, for this one." : "Please speak as the mother for this one."} placeholder={who === "girl" ? "Talk to her. She's scared of…" : "Talk to her. She's furious about…"} />
      </Card>
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card>
          <h2 className="sh-h3">Kept</h2>
          {rows.map((r) => (
            <div key={r._id} className="hh-entry">
              <p className="sh-eyebrow">{KIND_LABEL[r.kind as LetterKind] ?? r.kind} · {timeAgo(r.createdAt)}</p>
              <p className="hh-line">{r.text}</p>
              <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Delete this one?")) void run(() => remove({ id: r._id })); }}>Delete</Btn>
            </div>
          ))}
        </Card>
      )}
      <p className="sh-muted">
        If this brings up more than you want to carry alone: <Link href="/help-now" className="sh-link">Need help now</Link>, or <Link href="/talk?place=hearth" className="sh-link">Talk it through</Link>. Nothing here has to be finished.
      </p>
    </div>
  );
}
