import { useEffect, useState } from "react";
import { daysSince, needsNudge, nextStep, nudgeText, questLogProgress, type QuestLog } from "~/lib/questLog";
import { rotateQuestLogLink, saveQuestLog, setQuestLogStep, startQuestLog } from "~/server/questLog";
import type { Recruit } from "~/server/guild";
import type { RecruitStage } from "~/lib/guildConfig";

/**
 * John's side of a recruit's Quest Log (recruiting spec, Phase 5): start it,
 * tick steps, add or remove steps, write a note the recruit sees, and copy
 * or text the private link. Lives inside the recruit card.
 */

const input = "w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";
const btnGhost = "px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs";

export function questLogUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://thefinancialdm.com";
  return `${origin}/quest-log/${token}`;
}

export function smsTo(phone: string, body: string): string {
  const digits = phone.replace(/\D/g, "");
  const num = digits.length === 10 ? `+1${digits}` : digits ? `+${digits}` : "";
  return `sms:${num}?&body=${encodeURIComponent(body)}`;
}

export default function QuestLogPanel({ r, onSaved }: { r: Recruit; onSaved: (patch: Partial<Recruit>) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState(r.questLog?.message ?? "");
  useEffect(() => setMessage(r.questLog?.message ?? ""), [r.questLog?.message]);
  // Local copy so a tick shows at once; the server's answer replaces it a moment later.
  const [log, setLog] = useState<QuestLog | null>(r.questLog);
  useEffect(() => setLog(r.questLog), [r.questLog]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; log?: QuestLog; token?: string; stage?: RecruitStage }>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else onSaved({ ...(res.log ? { questLog: res.log } : {}), ...(res.token ? { questLogToken: res.token } : {}), ...(res.stage ? { stage: res.stage } : {}) });
    } finally {
      setBusy(false);
    }
  };

  if (!log) {
    return (
      <div className="rounded-lg border border-dashed border-[#406080]/40 p-3" data-quest-log-panel>
        <p className="text-[11px] text-[#a0a0a0] font-fantasy">Once they say yes, give them a Quest Log: a private page with the onboarding steps, your note, and a way to reach you.</p>
        <button type="button" onClick={() => run(() => startQuestLog({ data: { id: r.id } }))} disabled={busy} className="mt-2 px-3 py-1.5 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-xs disabled:opacity-50" data-start-quest-log>
          🗺️ Start their Quest Log
        </button>
        {error && <p className="text-red-300 text-[11px] mt-1">{error}</p>}
      </div>
    );
  }

  const progress = questLogProgress(log);
  const next = nextStep(log);
  const url = questLogUrl(r.questLogToken);
  const stale = needsNudge(log);
  const quiet = daysSince(log.lastProgressAt || log.startedAt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed. Select the link and copy it by hand.");
    }
  };

  const tick = (stepId: string, done: boolean) => {
    setLog((prev) => (prev ? { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, done, doneBy: done ? "john" : "", doneAt: done ? new Date().toISOString() : "" } : s)) } : prev));
    return run(() => setQuestLogStep({ data: { id: r.id, stepId, done } }));
  };
  const structural = (steps: QuestLog["steps"]) => run(() => saveQuestLog({ data: { id: r.id, steps: steps.map((s) => ({ id: s.id, title: s.title, detail: s.detail, stage: s.stage })) } }));
  const remove = (stepId: string) => structural(log.steps.filter((s) => s.id !== stepId));
  const move = (idx: number, dir: -1 | 1) => {
    const steps = [...log.steps];
    const j = idx + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[idx], steps[j]] = [steps[j], steps[idx]];
    return structural(steps);
  };
  const add = () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    return structural([...log.steps, { id: "", title, detail: "", done: false, doneAt: "", doneBy: "" }]);
  };
  const saveMessage = () => {
    if (message === (log.message ?? "")) return;
    return run(() => saveQuestLog({ data: { id: r.id, message } }));
  };

  return (
    <div className="rounded-lg border border-[#c08020]/30 bg-[#0d1520]/40 p-3 space-y-2" data-quest-log-panel>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-fantasy text-[#c08020]">🗺️ Quest Log · {progress.done} of {progress.total}</p>
        <p className="text-[11px] text-[#808080]" data-quest-log-quiet>{progress.done === progress.total ? "Complete" : quiet === 0 ? "Progress today" : `${quiet} day${quiet === 1 ? "" : "s"} since progress`}</p>
      </div>
      <div className="h-1.5 rounded-full bg-[#1a2634] overflow-hidden"><div className="h-full bg-[#c08020]" style={{ width: `${progress.percent}%` }} /></div>

      {stale && (
        <div className="rounded border border-[#c08020]/40 bg-[#c08020]/10 p-2" data-quest-log-nudge>
          <p className="text-[11px] text-[#e0c080] font-fantasy">Quiet for {quiet} days. A short check-in text usually gets things moving.</p>
          {r.phone ? (
            <a href={smsTo(r.phone, nudgeText(r.name, log, url))} className="inline-block mt-1 px-2 py-1 rounded bg-[#c08020] text-[#0d1520] text-[11px] font-bold font-fantasy" data-quest-log-nudge-sms>📱 Text a check-in</a>
          ) : (
            <p className="text-[11px] text-[#808080] mt-1">No phone on file. Suggested text: “{nudgeText(r.name, log, url)}”</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={`${input} py-1 text-[11px] flex-1 min-w-[12rem]`} aria-label="Quest Log link" data-quest-log-link />
        <button type="button" onClick={copy} className={btnGhost} data-quest-log-copy>{copied ? "Copied" : "Copy"}</button>
        {r.phone && <a href={smsTo(r.phone, `Hey ${r.name.split(/\s+/)[0]}, John here. Here's your Quest Log, with every step to get licensed and started: ${url}`)} className={btnGhost} data-quest-log-send>Text it</a>}
        <a href={url} target="_blank" rel="noreferrer" className={btnGhost}>Open ↗</a>
        <button type="button" onClick={() => { if (confirm("Replace the link? The old one stops working right away.")) run(() => rotateQuestLogLink({ data: { id: r.id } })); }} className="text-[11px] text-[#808080] hover:text-red-300 font-fantasy" data-quest-log-rotate>New link</button>
      </div>

      <ol className="space-y-1" data-quest-log-admin-steps>
        {log.steps.map((s, i) => (
          <li key={s.id} className={`flex items-start gap-2 rounded px-1.5 py-1 ${next?.id === s.id ? "bg-[#c08020]/10" : ""}`} data-admin-step={s.id}>
            <input type="checkbox" checked={s.done} onChange={(e) => tick(s.id, e.target.checked)} disabled={busy} className="mt-0.5 accent-[#c08020]" aria-label={`Done: ${s.title}`} data-admin-step-done />
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${s.done ? "text-[#808080] line-through" : "text-[#e0e0e0]"}`}>{s.title}{s.stage ? <span className="ml-1 text-[10px] text-[#c08020]/80 font-fantasy no-underline">→ stage</span> : null}</p>
              {s.done && s.doneBy === "recruit" && <p className="text-[10px] text-[#e0c080] font-fantasy" data-recruit-says-done>Recruit says done. Tick to confirm.</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} className="text-[11px] text-[#606080] hover:text-[#e0e0e0] disabled:opacity-30" aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={busy || i === log.steps.length - 1} className="text-[11px] text-[#606080] hover:text-[#e0e0e0] disabled:opacity-30" aria-label="Move down">↓</button>
              <button type="button" onClick={() => remove(s.id)} disabled={busy} className="text-[11px] text-[#606080] hover:text-red-300" aria-label={`Remove ${s.title}`} data-admin-step-remove>×</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex gap-1.5">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} maxLength={120} placeholder="Add a step for this person" className={`${input} py-1 text-xs`} data-quest-log-new-step />
        <button type="button" onClick={add} disabled={busy || !newTitle.trim()} className={btnGhost} data-quest-log-add-step>Add</button>
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} onBlur={saveMessage} rows={2} maxLength={600} placeholder="A note they see at the top of their page (optional)" className={`${input} resize-none text-xs`} data-quest-log-message-input />
      {error && <p className="text-red-300 text-[11px]">{error}</p>}
    </div>
  );
}
