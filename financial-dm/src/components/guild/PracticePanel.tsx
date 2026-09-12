import { useEffect, useState } from "react";
import { outcomeLabel } from "~/lib/practiceConfig";
import { grantPracticeAccess, recruitPracticeStats, revokePracticeAccess, type RecruitPracticeStats } from "~/server/practiceRecruit";
import type { Recruit } from "~/server/guild";
import { smsTo } from "./QuestLogPanel";

/**
 * John's side of a recruit's Sparring Dummy access (AI practice spec,
 * Section 9): give them the link, copy or text it, replace it, or take it
 * back. Shows how much they have practiced and how sessions ended, and
 * links only to the sessions they chose to share. Lives inside the recruit card.
 */

const input = "w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";
const btnGhost = "px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50";

export function practiceUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://thefinancialdm.com";
  return `${origin}/practice/${token}`;
}

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "");

export default function PracticePanel({ r, onSaved }: { r: Recruit; onSaved: (patch: Partial<Recruit>) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<RecruitPracticeStats | null>(null);
  useEffect(() => {
    let live = true;
    recruitPracticeStats({ data: { id: r.id } }).then((s) => live && setStats(s)).catch(() => live && setStats(null));
    return () => {
      live = false;
    };
  }, [r.id, r.practiceToken]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; token?: string; grantedAt?: string }>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else onSaved({ practiceToken: res.token ?? "", practiceGrantedAt: res.grantedAt ?? "" });
    } finally {
      setBusy(false);
    }
  };
  const url = practiceUrl(r.practiceToken);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy. Select the link and copy it by hand.");
    }
  };
  const first = r.name.split(/\s+/)[0] || "there";
  const outcomes = stats ? Object.entries(stats.outcomes).map(([k, n]) => `${n} ${outcomeLabel(k).toLowerCase()}`).join(", ") : "";

  if (!r.practiceToken) {
    return (
      <div className="rounded-lg border border-dashed border-[#406080]/40 p-3" data-practice-panel>
        <p className="text-[11px] text-[#a0a0a0] font-fantasy">Give them the Sparring Dummy: a private link where they can rehearse with a fictional person and read their own debriefs. Their transcripts stay private unless they share one with you.</p>
        {stats && stats.sessions > 0 && <p className="text-[11px] text-[#808080] mt-1" data-practice-stats>Practiced {stats.sessions} time{stats.sessions === 1 ? "" : "s"} before the link was taken back.</p>}
        <button type="button" onClick={() => run(() => grantPracticeAccess({ data: { id: r.id } }))} disabled={busy} className="mt-2 px-3 py-1.5 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-xs disabled:opacity-50" data-practice-grant>
          🥊 Give them practice access
        </button>
        {error && <p className="text-red-300 text-[11px] mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#c08020]/30 bg-[#0d1520]/40 p-3 space-y-2" data-practice-panel>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-fantasy text-[#c08020]">🥊 Sparring Dummy access{r.practiceGrantedAt ? <span className="text-[#808080] font-sans"> · since {fmt(r.practiceGrantedAt)}</span> : null}</p>
        {stats && <p className="text-[11px] text-[#808080]" data-practice-stats>{stats.sessions === 0 ? "No sessions yet" : `${stats.sessions} session${stats.sessions === 1 ? "" : "s"} · last ${fmt(stats.lastAt)}`}</p>}
      </div>
      {stats && stats.sessions > 0 && <p className="text-[11px] text-[#a0a0a0]" data-practice-outcomes>How they ended: {outcomes || "none finished yet"}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={`${input} py-1 text-[11px] flex-1 min-w-[12rem]`} aria-label="Practice link" data-practice-link />
        <button type="button" onClick={copy} className={btnGhost} data-practice-copy>{copied ? "Copied" : "Copy"}</button>
        {r.phone && <a href={smsTo(r.phone, `Hey ${first}, John here. Here's a private practice link: rehearse with a fictional person before the real conversation, as many times as you like. ${url}`)} className={btnGhost} data-practice-send>Text it</a>}
        <button type="button" onClick={() => { if (confirm("Replace the link? The old one stops working right away.")) run(() => grantPracticeAccess({ data: { id: r.id, rotate: true } })); }} disabled={busy} className="text-[11px] text-[#808080] hover:text-[#e0e0e0] font-fantasy" data-practice-rotate>New link</button>
        <button type="button" onClick={() => { if (confirm("Take practice access back? Their link stops working right away. Their past sessions stay counted.")) run(() => revokePracticeAccess({ data: { id: r.id } })); }} disabled={busy} className="text-[11px] text-[#808080] hover:text-red-300 font-fantasy" data-practice-revoke>Take it back</button>
      </div>
      {stats && stats.shared.length > 0 && (
        <div>
          <p className="text-[11px] text-[#a0a0a0] font-fantasy">Shared with you:</p>
          <ul className="mt-1 space-y-0.5" data-practice-shared-list>
            {stats.shared.map((s) => (
              <li key={s.id}>
                <a href={`/admin/practice/${s.id}`} className="text-[11px] text-[#c08020] underline underline-offset-2" data-practice-shared={s.id}>{fmt(s.createdAt)} · {s.personaName} · {s.conversation === "recruiting" ? "recruiting" : "coverage"} · {s.endedAt ? outcomeLabel(s.outcome ?? "ended_early") : "in progress"}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[10px] text-[#606080]">You see counts and outcomes. Transcripts only when they share one. Practice should feel safe to be bad at.</p>
      {error && <p className="text-red-300 text-[11px]">{error}</p>}
    </div>
  );
}
