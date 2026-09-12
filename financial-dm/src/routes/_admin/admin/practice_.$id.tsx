import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { OUTCOMES, difficultyById, outcomeLabel, temperamentById, type Outcome } from "~/lib/practiceConfig";
import { endSession, getDebrief, getSession, pauseHint, sendTurn, type PracticeSession } from "~/server/practice";
import type { Debrief } from "~/lib/practiceDebrief";
import { PracticeBanner } from "./practice";

/**
 * One Objection Practice session (AI practice spec, Section 7.1): the
 * transcript, John's input, Pause for a hint, and End. Hints are marked in
 * the transcript. When it ends, John says how it went; the debrief arrives
 * in Phase 2. Marked PRACTICE throughout (Rule 2.6).
 */
export const Route = createFileRoute("/_admin/admin/practice_/$id")({
  loader: ({ params }) => getSession({ data: { id: Number(params.id) } }),
  component: SessionPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50 ${focus}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string) => ({ to } as any);

function SessionPage() {
  const initial = Route.useLoaderData();
  const [s, setS] = useState<PracticeSession | null>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [s?.transcript.length]);

  if (!s) {
    return (
      <main className="min-h-dvh py-6 px-4" data-practice-session>
        <PracticeBanner />
        <p className="text-[#a0a0a0] font-fantasy mt-4 text-center">That session is gone. <Link {...linkTo("/admin/practice")} className="underline text-[#c08020]">Back to practice</Link></p>
      </main>
    );
  }

  const over = Boolean(s.endedAt);
  const capped = !over && s.turns >= s.maxTurns;
  const t = temperamentById(s.temperament);
  const d = difficultyById(s.difficulty);

  const say = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy("say");
    setError("");
    setDraft("");
    setS((prev) => (prev ? { ...prev, transcript: [...prev.transcript, { role: "john", text, at: new Date().toISOString() }] } : prev));
    try {
      const res = await sendTurn({ data: { id: s.id, text } });
      if (res.session) setS(res.session);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        if (!res.session) setDraft(text);
      }
    } finally {
      setBusy("");
    }
  };
  const hint = async () => {
    setBusy("hint");
    setError("");
    try {
      const res = await pauseHint({ data: { id: s.id } });
      if (res.session) setS(res.session);
      if (!res.ok) setError(res.error ?? "No hint right now.");
    } finally {
      setBusy("");
    }
  };
  const finish = async (outcome: Outcome) => {
    setBusy("end");
    try {
      const res = await endSession({ data: { id: s.id, outcome } });
      if (res.session) setS(res.session);
      setEnding(false);
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="min-h-dvh py-4 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-practice-session data-ended={over ? "true" : "false"}>
      <div className="max-w-3xl mx-auto space-y-3">
        <PracticeBanner />
        <header className={`${card} p-3 flex flex-wrap items-center justify-between gap-2`}>
          <div className="min-w-0">
            <p className="text-[#e0e0e0] font-fantasy" data-session-persona>{s.persona.name}<span className="text-[#a0a0a0] text-sm font-sans">, {s.persona.ageRange}</span></p>
            <p className="text-[11px] text-[#808080]">{s.conversation === "recruiting" ? "Recruiting" : "Coverage"} · {t?.label ?? s.temperament} · Level {d.level}, {d.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#606080] font-fantasy tabular-nums" data-turn-count>{s.turns} / {s.maxTurns}</span>
            <Link {...linkTo("/admin/practice")} className={btnGhost}>← Practice</Link>
          </div>
        </header>

        <section className={`${card} p-3 sm:p-4`} aria-label="Practice transcript">
          <ol className="space-y-2" data-transcript>
            {s.transcript.map((m, i) => (
              <li key={i} className={m.role === "john" ? "flex justify-end" : m.role === "system" ? "flex justify-center" : "flex justify-start"} data-line={m.role} data-kind={m.kind ?? "say"}>
                {m.role === "system" ? (
                  <p className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs ${m.kind === "hint" ? "bg-[#c08020]/15 border border-[#c08020]/40 text-[#e0c080]" : "text-[#606080] italic"}`}>
                    {m.kind === "hint" ? "Hint · " : ""}{m.text}
                  </p>
                ) : (
                  <p className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${m.role === "john" ? "bg-[#c08020]/20 text-[#e0e0e0]" : "bg-[#0d1520]/70 border border-[#406080]/30 text-[#e0e0e0]"}`}>
                    <span className="block text-[10px] uppercase tracking-wider text-[#808080] font-fantasy mb-0.5">{m.role === "john" ? "You" : s.persona.name}</span>
                    {m.text}
                  </p>
                )}
              </li>
            ))}
            {busy === "say" && <li className="flex justify-start" data-line="typing"><p className="rounded-xl px-3 py-2 text-sm text-[#606080] italic">{s.persona.name} is thinking...</p></li>}
          </ol>
          <div ref={bottom} />
        </section>

        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-session-error>{error}</div>}

        {over ? (
          <DebriefView session={s} onDebrief={(d) => setS((prev) => (prev ? { ...prev, debrief: d } : prev))} />
        ) : ending || capped ? (
          <section className={`${card} p-4`} data-outcome-picker>
            <p className="text-[#e0e0e0] font-fantasy text-sm">{capped ? `Cap reached. How did it end?` : "How did it end?"}</p>
            <p className="text-[11px] text-[#606080] mb-2">Your honest read. It is a note for the debrief, not a score.</p>
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <button key={o.id} type="button" onClick={() => finish(o.id)} disabled={busy === "end"} className={btnGhost} data-outcome={o.id}>{o.label}</button>
              ))}
              {!capped && <button type="button" onClick={() => setEnding(false)} className="text-[11px] text-[#606080] hover:text-[#e0e0e0]">Keep going</button>}
            </div>
          </section>
        ) : (
          <section className={`${card} p-3`}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); say(); } }} rows={3} maxLength={2000} placeholder={`Say something to ${s.persona.name}... (Enter to send, Shift+Enter for a new line)`} className={`w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm resize-none ${focus}`} disabled={Boolean(busy)} data-say-input />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button type="button" onClick={say} disabled={!draft.trim() || Boolean(busy)} className={btnPrimary} data-say-send>Say it</button>
              <button type="button" onClick={hint} disabled={Boolean(busy)} className={btnGhost} data-pause-hint>{busy === "hint" ? "Thinking..." : "⏸ Pause for a hint"}</button>
              <span className="flex-1" />
              <button type="button" onClick={() => setEnding(true)} disabled={Boolean(busy)} className={btnGhost} data-end-session>End practice</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}


const MET_LABEL: Record<string, string> = { yes: "Yes", partly: "Partly", no: "Not this time", not_seen: "Not seen" };

/** Section 8: outcome, compliance flags quoting John, the persona's real concern, rubric notes, one thing to try. Never a score. */
function DebriefView({ session: s, onDebrief }: { session: PracticeSession; onDebrief: (d: Debrief) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!s.debrief);
  useEffect(() => {
    if (s.debrief) return;
    let alive = true;
    getDebrief({ data: { id: s.id } })
      .then((r) => {
        if (!alive) return;
        if (r.ok && r.debrief) onDebrief(r.debrief);
        else setError(r.error ?? "Could not build the debrief.");
      })
      .catch((e) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id, Boolean(s.debrief)]);
  const d = s.debrief;
  return (
    <section className={`${card} p-4 space-y-4`} data-session-over data-debrief={d ? "ready" : loading ? "loading" : "error"}>
      <div>
        <p className="text-[#e0e0e0] font-fantasy text-lg">Debrief · {outcomeLabel(s.outcome ?? "ended_early")}</p>
        {d?.summary && <p className="text-sm text-[#c9d3e3] mt-1" data-debrief-summary>{d.summary}</p>}
        {loading && <p className="text-xs text-[#a0a0a0] mt-1">Reading the transcript...</p>}
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
      </div>

      {d && (
        <>
          <div data-debrief-flags>
            <h3 className="font-fantasy text-[#c08020] text-sm">Compliance flags</h3>
            {d.flags.length === 0 ? (
              <p className="text-xs text-[#7fd08a] mt-1">Nothing you said broke a content rule.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {d.flags.map((f, i) => (
                  <li key={i} className="rounded-lg border border-[#c08020]/40 bg-[#c08020]/10 px-3 py-2" data-debrief-flag={f.ruleId}>
                    <p className="text-sm text-[#e0e0e0]">"{f.quote}"</p>
                    <p className="text-[11px] text-[#e0c080] mt-1">{f.ruleId === "dodge" ? `Deferred ${f.matched}` : f.matched.startsWith('"') ? f.matched : `"${f.matched}"`} · {f.rule}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div data-debrief-concern>
            <h3 className="font-fantasy text-[#c08020] text-sm">What {s.persona.name} was actually worried about</h3>
            <p className="text-sm text-[#e0e0e0] mt-1">{d.concern}</p>
            <p className={`text-xs mt-1 ${d.concernAddressed ? "text-[#7fd08a]" : "text-[#e0c080]"}`}>{d.concernAddressed ? "Addressed." : "Not really addressed."} {d.concernNote}</p>
          </div>

          <div data-debrief-rubric>
            <h3 className="font-fantasy text-[#c08020] text-sm">Against your rubric</h3>
            {d.rubric.length === 0 ? (
              <p className="text-xs text-[#a0a0a0] mt-1">No rubric items yet. Add some under Practice, and the next debrief will use them.</p>
            ) : (
              <ul className="mt-1 divide-y divide-[#406080]/15">
                {d.rubric.map((r, i) => (
                  <li key={i} className="py-2 flex items-start justify-between gap-3" data-rubric-note={r.met}>
                    <div className="min-w-0">
                      <p className="text-sm text-[#e0e0e0]">{r.item.replace(/^Example: edit or delete · /, "")}</p>
                      {r.evidence && <p className="text-[11px] text-[#808080] mt-0.5">"{r.evidence}"</p>}
                    </div>
                    <span className={`shrink-0 text-[11px] font-fantasy px-2 py-0.5 rounded ${r.met === "yes" ? "bg-[#7fd08a]/15 text-[#7fd08a]" : r.met === "partly" ? "bg-[#c08020]/15 text-[#e0c080]" : "bg-[#406080]/20 text-[#a0a0a0]"}`}>{MET_LABEL[r.met]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {d.hintsUsed > 0 && <p className="text-[11px] text-[#808080]" data-debrief-hints>You paused for a hint {d.hintsUsed === 1 ? "once" : `${d.hintsUsed} times`}. Fine to do; worth noticing.</p>}

          {d.tryNext && (
            <div className="rounded-lg border border-[#406080]/40 bg-[#0d1520]/60 px-3 py-2" data-debrief-try>
              <p className="text-[11px] uppercase tracking-wider text-[#c08020] font-fantasy">One thing to try</p>
              <p className="text-sm text-[#e0e0e0] mt-0.5">{d.tryNext}</p>
            </div>
          )}
          <p className="text-[11px] text-[#606080]">This is a note, not a score. Nothing here is graded or ranked.</p>
        </>
      )}
      <div className="flex gap-2">
        <Link {...linkTo("/admin/practice")} className={btnPrimary}>Practice again</Link>
      </div>
    </section>
  );
}
