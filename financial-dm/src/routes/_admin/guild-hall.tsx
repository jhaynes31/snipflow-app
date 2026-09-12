import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GUILD_FACT_FIELDS,
  GUILD_FAQ,
  HEARD_ABOUT_OPTIONS,
  NOT_MOVING_REASONS,
  RECRUIT_SOURCES,
  RECRUIT_STAGES,
  factLabel,
  heardAboutLabel,
  reasonLabelRecruit,
  sourceLabel,
  stageLabel,
  type GuildFacts,
  type RecruitStage,
} from "~/lib/guildConfig";
import { deleteRecruit, getGuildFacts, getRecruits, markRecruitsSeen, quickAddRecruit, saveGuildFacts, setRecruitStage, updateRecruit, type Recruit } from "~/server/guild";
import { getQuests, type Quest } from "~/server/quests";
import QuestLogPanel, { questLogUrl, smsTo } from "~/components/guild/QuestLogPanel";
import { QUEST_LOG_STALE_DAYS, daysSince, needsNudge, nextStep, nudgeText, questLogProgress } from "~/lib/questLog";

type View = "recruits" | "facts" | "questlogs";

/**
 * The Guild tab (recruiting spec, Section 5.4): the recruit pipeline with
 * Quick add, and the facts form where John writes and confirms every claim
 * the public Guild Hall is allowed to make.
 */
export const Route = createFileRoute("/_admin/guild-hall")({
  validateSearch: (s: Record<string, unknown>): { view?: View } => ({ view: s.view === "facts" ? "facts" : s.view === "recruits" ? "recruits" : s.view === "questlogs" ? "questlogs" : undefined }),
  component: GuildHallAdmin,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const inputBase = "px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";
const input = `w-full ${inputBase}`;
const btnPrimary = "px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50";
const btnGhost = "px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs";

function GuildHallAdmin() {
  const { view = "recruits" } = Route.useSearch();
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <img src="/logo.png" alt="The Financial DM" className="h-20 sm:h-24 mx-auto drop-shadow-lg" />
        </div>
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>🛡️ The Guild 🛡️</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">People who want to join the team. Separate from client leads.</p>
        </div>
        <nav className="flex gap-2 flex-wrap mb-6" aria-label="Guild sections">
          {(
            [
              ["recruits", "🧭 Recruits"],
              ["questlogs", "🗺️ Quest Logs"],
              ["facts", "📜 Guild facts and FAQ"],
            ] as Array<[View, string]>
          ).map(([id, label]) => (
            <Link key={id} to="/guild-hall" search={{ view: id }} aria-current={view === id ? "page" : undefined} className={`px-4 py-2 rounded-lg border font-fantasy text-sm transition-all ${view === id ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50"}`}>
              {label}
            </Link>
          ))}
          <a href="/guild" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] font-fantasy text-sm">
            👁️ Preview the Guild Hall ↗
          </a>
          <a href="/guild/quiz" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] font-fantasy text-sm" data-preview-fit-quiz>
            🎲 Preview the fit quiz ↗
          </a>
        </nav>
        {view === "recruits" ? <RecruitsSection /> : view === "questlogs" ? <QuestLogsSection /> : <FactsSection />}
      </div>
    </main>
  );
}

// ── Recruits ────────────────────────────────────────────────────────

function RecruitsSection() {
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [questFilter, setQuestFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [pending, setPending] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, q] = await Promise.all([getRecruits(), getQuests().catch(() => [] as Quest[])]);
      setRecruits(r);
      setQuests(q);
      if (r.some((x) => x.isNew)) await markRecruitsSeen();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = recruits.filter((r) => (stageFilter === "all" || r.stage === stageFilter) && (sourceFilter === "all" || r.source === sourceFilter) && (questFilter === "all" || (questFilter === "none" ? r.questId == null : r.questId === Number(questFilter))));
  const byStage = useMemo(() => RECRUIT_STAGES.map((s) => ({ ...s, rows: visible.filter((r) => r.stage === s.id) })), [visible]);

  const changeStage = async (id: number, stage: RecruitStage, reason = "") => {
    setPending(null);
    const res = await setRecruitStage({ data: { id, stage, reason } });
    if (!res.ok) {
      setError(res.error || "Could not change the stage.");
      return;
    }
    setRecruits((prev) => prev.map((r) => (r.id === id ? { ...r, stage, stageHistory: res.history ?? r.stageHistory, notMovingReason: stage === "not_moving_forward" ? reason : "" } : r)));
  };
  const onStagePick = (r: Recruit, stage: RecruitStage) => {
    if (stage === "not_moving_forward") setPending({ id: r.id, name: r.name });
    else void changeStage(r.id, stage);
  };
  const remove = async (id: number) => {
    if (!confirm("Remove this recruit from the records?")) return;
    const res = await deleteRecruit({ data: { id } });
    if (res.ok) setRecruits((prev) => prev.filter((r) => r.id !== id));
    else setError(res.error || "Could not remove the recruit.");
  };

  return (
    <div className="space-y-5" data-recruits>
      <div className="flex flex-wrap items-center gap-2">
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={inputBase} aria-label="Filter by stage" data-filter-stage>
          <option value="all">All stages</option>
          {RECRUIT_STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={inputBase} aria-label="Filter by source" data-filter-source>
          <option value="all">All sources</option>
          {RECRUIT_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select value={questFilter} onChange={(e) => setQuestFilter(e.target.value)} className={inputBase} aria-label="Filter by quest" data-filter-quest>
          <option value="all">All quests</option>
          <option value="none">No quest</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
        <span className="flex-1" />
        <button type="button" onClick={load} disabled={loading} className={btnGhost}>{loading ? "Loading..." : "🔄 Refresh"}</button>
        <button type="button" onClick={() => setShowAdd(true)} className={btnPrimary} data-quick-add>➕ Quick add (they texted)</button>
      </div>
      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}
      {showAdd && <QuickAdd quests={quests} onDone={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />}

      {!loading && recruits.length === 0 ? (
        <section className={`${card} p-8 text-center`}>
          <h2 className="font-fantasy text-[#c08020] text-xl">No recruits yet</h2>
          <p className="text-[#a0a0a0] text-sm font-fantasy mt-2 max-w-md mx-auto">People arrive here from the Guild Hall's form, from the fit quiz later, or from Quick add when someone texts you.</p>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {byStage.map((s) => (
            <section key={s.id} className={`${card} overflow-hidden`} data-stage-column={s.id}>
              <div className="px-3 py-2 border-b border-[#406080]/20 flex items-center justify-between">
                <h2 className="font-fantasy text-[#c08020] text-sm">{s.label}</h2>
                <span className="text-xs text-[#606080] font-fantasy tabular-nums">{s.rows.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[48px]">
                {s.rows.map((r) => (
                  <RecruitCard key={r.id} r={r} quests={quests} onStage={(st) => onStagePick(r, st)} onRemove={() => remove(r.id)} onSaved={(patch) => setRecruits((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)))} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {pending && <ReasonDialog name={pending.name} onCancel={() => setPending(null)} onConfirm={(reason) => changeStage(pending.id, "not_moving_forward", reason)} />}
    </div>
  );
}

// ── Quest Logs ──────────────────────────────────────────────────────

/** Everyone with a Quest Log, quietest first, with a check-in text ready for anyone who has stalled (Phase 5). */
function QuestLogsSection() {
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        setRecruits(await getRecruits());
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const rows = recruits
    .filter((r) => r.questLog && r.stage !== "not_moving_forward")
    .map((r) => {
      const log = r.questLog!;
      const progress = questLogProgress(log);
      return { r, log, progress, complete: progress.total > 0 && progress.done === progress.total, next: nextStep(log), quiet: daysSince(log.lastProgressAt || log.startedAt), nudge: needsNudge(log) };
    })
    .sort((a, b) => Number(b.nudge) - Number(a.nudge) || Number(a.complete) - Number(b.complete) || b.quiet - a.quiet);
  const due = rows.filter((x) => x.nudge).length;
  return (
    <div className="space-y-4" data-quest-logs>
      <section className={`${card} p-4`}>
        <h2 className="font-fantasy text-[#c08020] text-lg">🗺️ Quest Logs</h2>
        <p className="text-xs text-[#a0a0a0] font-fantasy mt-1">
          Everyone who has a Quest Log, quietest first. Start one from a recruit's card once they say yes. After {QUEST_LOG_STALE_DAYS} days with no step ticked they are flagged here with a check-in text ready to send.
          {rows.length > 0 && <span className="text-[#e0c080]" data-nudges-due> {due === 0 ? "Nobody needs a nudge right now." : `${due} need${due === 1 ? "s" : ""} a nudge.`}</span>}
        </p>
      </section>
      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}
      {loading ? (
        <p className="text-[#a0a0a0] text-sm font-fantasy">Loading...</p>
      ) : rows.length === 0 ? (
        <section className={`${card} p-8 text-center`}>
          <h2 className="font-fantasy text-[#c08020] text-xl">No Quest Logs yet</h2>
          <p className="text-[#a0a0a0] text-sm font-fantasy mt-2 max-w-md mx-auto">Open a recruit's card under Recruits, press "more", then "Start their Quest Log". They get a private page with every step to get licensed and started.</p>
        </section>
      ) : (
        <section className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm" data-quest-log-table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#808080] font-fantasy border-b border-[#406080]/20">
                <th className="px-3 py-2">Recruit</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Next step</th>
                <th className="px-3 py-2">Last progress</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, log, progress, complete, next, quiet, nudge }) => {
                const url = questLogUrl(r.questLogToken);
                return (
                  <tr key={r.id} className={`border-b border-[#406080]/10 ${nudge ? "bg-[#c08020]/5" : ""}`} data-quest-log-row={r.id}>
                    <td className="px-3 py-2 align-top">
                      <p className="text-[#e0e0e0] font-fantasy">{nudge && <span className="text-[#c08020]" title="Needs a nudge">⚑ </span>}{r.name}</p>
                      <p className="text-[11px] text-[#808080]">{stageLabel(r.stage)}{r.phone ? ` · ${r.phone}` : ""}</p>
                    </td>
                    <td className="px-3 py-2 align-top text-[#e0e0e0] tabular-nums whitespace-nowrap">
                      {progress.done} of {progress.total}
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-[#1a2634] overflow-hidden"><div className="h-full bg-[#c08020]" style={{ width: `${progress.percent}%` }} /></div>
                    </td>
                    <td className="px-3 py-2 align-top text-[#a0a0a0]">{complete ? <span className="text-[#7fd08a]">Complete</span> : next?.title}</td>
                    <td className="px-3 py-2 align-top text-[#a0a0a0] whitespace-nowrap">{complete ? "—" : quiet === 0 ? "Today" : `${quiet} day${quiet === 1 ? "" : "s"} ago`}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {nudge && r.phone && <a href={smsTo(r.phone, nudgeText(r.name, log, url))} className="px-2 py-1 rounded bg-[#c08020] text-[#0d1520] text-[11px] font-bold font-fantasy" data-quest-log-nudge-sms>📱 Text a check-in</a>}
                        <a href={url} target="_blank" rel="noreferrer" className={btnGhost}>Open ↗</a>
                        <Link to="/guild-hall" search={{ view: "recruits" }} className={btnGhost}>Card</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function RecruitCard({ r, quests, onStage, onRemove, onSaved }: { r: Recruit; quests: Quest[]; onStage: (s: RecruitStage) => void; onRemove: () => void; onSaved: (patch: Partial<Recruit>) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(r.note);
  const saveNote = async () => {
    const res = await updateRecruit({ data: { id: r.id, note } });
    if (res.ok) onSaved({ note });
  };
  const toggleInvest = async (v: boolean) => {
    const res = await updateRecruit({ data: { id: r.id, pursuingInvestment: v } });
    if (res.ok) onSaved({ pursuingInvestment: v });
  };
  const setQuest = async (v: string) => {
    const questId = v ? Number(v) : null;
    const res = await updateRecruit({ data: { id: r.id, questId } });
    if (res.ok) onSaved({ questId, questName: quests.find((q) => q.id === questId)?.name ?? "" });
  };
  return (
    <article className="rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 p-3 space-y-2" data-recruit={r.id}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[#e0e0e0] text-sm font-fantasy truncate">{r.isNew && <span className="text-[#c08020]">● </span>}{r.name}</p>
          <p className="text-[11px] text-[#808080] truncate">{[r.phone, r.email].filter(Boolean).join(" · ") || "No contact details"}</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="text-[11px] text-[#a0a0a0] underline underline-offset-2 shrink-0" data-recruit-detail>{open ? "less" : "more"}</button>
      </div>
      <p className="text-[11px] text-[#606080] font-fantasy">
        {sourceLabel(r.source)}{r.foundVia ? ` · heard: ${heardAboutLabel(r.foundVia)}` : ""}{r.questName ? ` · ${r.questName}` : r.campaignSlug ? ` · /${r.campaignSlug}` : ""} · {fmt(r.createdAt)}
      </p>
      {r.stage === "not_moving_forward" && r.notMovingReason && <p className="text-[11px] text-[#a0a0a0] font-fantasy">Reason: {reasonLabelRecruit(r.notMovingReason)}</p>}
      <select value={r.stage} onChange={(e) => onStage(e.target.value as RecruitStage)} className="w-full text-xs font-fantasy px-2 py-1 rounded border border-[#406080]/40 bg-transparent text-[#e0e0e0]" aria-label="Stage" data-recruit-stage>
        {RECRUIT_STAGES.map((s) => (
          <option key={s.id} value={s.id} className="bg-gray-900">{s.label}</option>
        ))}
      </select>
      {open && (
        <div className="space-y-2 pt-1 border-t border-[#406080]/20">
          {(r.state || r.bestTime) && <p className="text-xs text-[#a0a0a0]">{[r.state && `State: ${r.state}`, r.bestTime && `Best time: ${r.bestTime}`].filter(Boolean).join(" · ")}</p>}
          <p className="text-[11px] text-[#606080]">{r.confirmed18 ? "Confirmed 18+" : "18+ not confirmed on a form"} · {r.emailConsent ? "OK to email updates" : "No email updates"}{r.fitClass ? ` · Fit quiz: ${r.fitClass} (${r.fitLevel})` : ""}</p>
          <label className="block text-[11px] text-[#a0a0a0] font-fantasy">
            Quest
            <select value={r.questId ?? ""} onChange={(e) => setQuest(e.target.value)} className={`${input} mt-1 py-1`}>
              <option value="">None</option>
              {quests.map((q) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-[#a0a0a0] font-fantasy">
            <input type="checkbox" checked={r.pursuingInvestment} onChange={(e) => toggleInvest(e.target.checked)} className="accent-[#c08020]" /> Pursuing investment licensing
          </label>
          <QuestLogPanel r={r} onSaved={onSaved} />
          <div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} rows={2} maxLength={500} placeholder="Your notes (not shown to the recruit)" className={`${input} resize-none text-xs`} />
          </div>
          <details>
            <summary className="text-[11px] text-[#a0a0a0] font-fantasy cursor-pointer">Stage history</summary>
            <ul className="mt-1 space-y-0.5" data-stage-history>
              {r.stageHistory.map((h, i) => (
                <li key={i} className="text-[11px] text-[#808080]">{stageLabel(h.status)}{h.at ? ` · ${fmt(h.at)}` : ""}</li>
              ))}
            </ul>
          </details>
          <button type="button" onClick={onRemove} className="text-red-400/70 hover:text-red-400 text-[11px] font-fantasy">🗑️ Remove</button>
        </div>
      )}
    </article>
  );
}

function QuickAdd({ quests, onDone, onCancel }: { quests: Quest[]; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("text");
  const [questId, setQuestId] = useState("");
  const [foundVia, setFoundVia] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await quickAddRecruit({ data: { name, phone, source, questId: questId ? Number(questId) : null, foundVia } });
      if (res.ok) onDone();
      else setError(res.error || "Could not add them.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className={`${card} p-4 grid gap-3 sm:grid-cols-5 items-end`} data-quick-add-form>
      <label className="text-xs text-[#a0a0a0] font-fantasy sm:col-span-2">Name *<input className={`${input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></label>
      <label className="text-xs text-[#a0a0a0] font-fantasy">Phone<input className={`${input} mt-1`} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} inputMode="tel" /></label>
      <label className="text-xs text-[#a0a0a0] font-fantasy">How they came in
        <select className={`${input} mt-1`} value={source} onChange={(e) => setSource(e.target.value)}>
          {RECRUIT_SOURCES.filter((s) => s.id !== "interest_form" && s.id !== "fit_quiz").map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[#a0a0a0] font-fantasy">Quest, if known
        <select className={`${input} mt-1`} value={questId} onChange={(e) => setQuestId(e.target.value)}>
          <option value="">None</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[#a0a0a0] font-fantasy sm:col-span-2">Where they said they heard about it
        <select className={`${input} mt-1`} value={foundVia} onChange={(e) => setFoundVia(e.target.value)}>
          <option value="">Not asked</option>
          {HEARD_ABOUT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-3 flex gap-2 justify-end">
        {error && <p className="text-red-300 text-xs font-fantasy self-center">{error}</p>}
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        <button type="submit" disabled={busy} className={btnPrimary} data-quick-add-save>{busy ? "Adding..." : "Add recruit"}</button>
      </div>
    </form>
  );
}

function ReasonDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [choice, setChoice] = useState<string>(NOT_MOVING_REASONS[0].id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(8, 14, 22, 0.85)" }} onClick={onCancel}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl border-2 border-[#406080]/50 shadow-2xl p-5 space-y-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 100%)" }} onClick={(e) => e.stopPropagation()} data-reason-dialog>
        <div>
          <h3 className="text-lg font-fantasy text-[#c08020]">Not moving forward: why?</h3>
          <p className="text-xs text-[#a0a0a0] font-fantasy mt-1">{name}. Only the reason is kept, never any details.</p>
        </div>
        <div className="space-y-2">
          {NOT_MOVING_REASONS.map((o) => (
            <label key={o.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm font-fantasy ${choice === o.id ? "border-[#c08020]/60 bg-[#c08020]/10 text-[#e0e0e0]" : "border-[#406080]/30 text-[#a0a0a0]"}`}>
              <input type="radio" name="nmf-reason" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="accent-[#c08020]" />
              {o.label}
            </label>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-[#406080]/50 text-[#a0a0a0] font-fantasy text-sm">Cancel</button>
          <button type="button" onClick={() => onConfirm(choice)} className={`flex-1 ${btnPrimary}`} data-reason-confirm>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Facts ───────────────────────────────────────────────────────────

function FactsSection() {
  const [facts, setFacts] = useState<GuildFacts>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getGuildFacts()
      .then((r) => {
        setFacts(r.facts);
        setMissing(r.missing);
        setLive(r.live);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const get = (k: string) => facts[k] ?? { key: k, value: "", confirmed: false };
  const setVal = (k: string, value: string) => setFacts((f) => ({ ...f, [k]: { key: k, value, confirmed: false } }));
  const setConfirmed = (k: string, confirmed: boolean) => setFacts((f) => ({ ...f, [k]: { key: k, value: f[k]?.value ?? "", confirmed } }));

  const save = async () => {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await saveGuildFacts({ data: { facts: Object.values(facts) } });
      if (!res.ok) setError(res.error || "Could not save.");
      else {
        setMissing(res.missing ?? []);
        setLive(Boolean(res.live));
        setMsg(res.live ? "Saved. Every required fact is confirmed, so the Guild Hall is now public." : `Saved. ${res.missing?.length ?? 0} required item${(res.missing?.length ?? 0) === 1 ? "" : "s"} still to go before the page goes public.`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const requiredTotal = GUILD_FACT_FIELDS.filter((f) => f.tier === "trust" && f.required).length + GUILD_FAQ.length;
  if (loading) return <p className="text-[#a0a0a0] font-fantasy text-sm py-8 text-center">Opening the ledger...</p>;

  return (
    <div className="space-y-6" data-facts>
      <section className={`${card} p-4 ${live ? "border-[#7fd08a]/50" : "border-[#c08020]/40"}`} data-facts-status>
        <p className="font-fantasy text-[#e0e0e0]">
          {live ? "✅ The Guild Hall is public." : `🔒 The Guild Hall is hidden from the public: ${requiredTotal - missing.length} of ${requiredTotal} required answers confirmed.`}
        </p>
        <p className="text-xs text-[#a0a0a0] font-fantasy mt-1">
          Everything the page says about the role comes from the trust facts and FAQ answers below, in John's words. Write each one, tick Confirmed, and press Save. Editing an answer clears its tick until it is confirmed again. No pay figures, no promises, and describe situations rather than people. Presentation notes at the bottom are never published.
        </p>
      </section>
      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}

      <section className={`${card} p-5 space-y-5`} data-trust-facts>
        <h2 className="font-fantasy text-[#c08020] text-lg">Trust facts: public on the Guild Hall</h2>
        <p className="text-xs text-[#a0a0a0] font-fantasy -mt-3">Be specific about legitimacy, general about the opportunity. These answer "what is this, who are you, will I be asked for money". Short and plain; if something needs a paragraph, it belongs in the conversation.</p>
        {GUILD_FACT_FIELDS.filter((f) => f.tier === "trust").map((f) => (
          <FactEditor key={f.key} label={f.label} help={f.help} required={f.required} usedIn={f.usedIn} fact={get(f.key)} multiline={f.multiline} options={f.options} suggestion={f.suggested} onChange={(v) => setVal(f.key, v)} onConfirm={(c) => setConfirmed(f.key, c)} />
        ))}
      </section>

      <section className={`${card} p-5 space-y-5`}>
        <h2 className="font-fantasy text-[#c08020] text-lg">Fair questions, your answers</h2>
        <p className="text-xs text-[#a0a0a0] font-fantasy -mt-3">These five questions are fixed and the answers are yours; none are written for you. Legitimacy questions get a full answer. Only the pay question may end with "the details are what the conversation is for", and even then give a real answer first.</p>
        {GUILD_FAQ.map((q) => (
          <FactEditor key={q.key} label={q.question} help={q.guidance} required usedIn={q.legitimacy ? "FAQ · legitimacy question, answer fully" : "FAQ · may point to the conversation after a real answer"} fact={get(q.key)} multiline onChange={(v) => setVal(q.key, v)} onConfirm={(c) => setConfirmed(q.key, c)} />
        ))}
      </section>

      <section className={`${card} p-5 space-y-5 border-[#406080]/50`} data-presentation-facts>
        <h2 className="font-fantasy text-[#a0a0a0] text-lg">🔒 For your eyes only: presentation notes</h2>
        <p className="text-xs text-[#a0a0a0] font-fantasy -mt-3">Your reference for the interview. Nothing here is ever published on the page or given to any generator. Optional; fill in what helps you.</p>
        {GUILD_FACT_FIELDS.filter((f) => f.tier === "presentation").map((f) => (
          <FactEditor key={f.key} label={f.label} help={f.help} required={false} usedIn={f.usedIn} fact={get(f.key)} multiline={f.multiline} options={f.options} onChange={(v) => setVal(f.key, v)} onConfirm={(c) => setConfirmed(f.key, c)} />
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className={btnPrimary} data-save-facts>{saving ? "Saving..." : "💾 Save answers"}</button>
        {msg && <p className="text-[#7fd08a] text-sm font-fantasy" data-facts-msg>{msg}</p>}
        {missing.length > 0 && !msg && <p className="text-[#606080] text-xs font-fantasy">Still needed: {missing.map(factLabel).slice(0, 4).join(", ")}{missing.length > 4 ? ` and ${missing.length - 4} more` : ""}</p>}
      </div>
    </div>
  );
}

function FactEditor({ label, help, required, usedIn, fact, multiline, options, suggestion, onChange, onConfirm }: { label: string; help: string; required: boolean; usedIn: string; fact: { value: string; confirmed: boolean }; multiline: boolean; options?: Array<{ id: string; label: string }>; suggestion?: string; onChange: (v: string) => void; onConfirm: (c: boolean) => void }) {
  const filled = fact.value.trim().length > 0;
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${fact.confirmed && filled ? "border-[#7fd08a]/40" : required ? "border-[#c08020]/30" : "border-[#406080]/30"}`} data-fact={label}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-sm font-fantasy text-[#e0e0e0]">
          {label} {required ? <span className="text-[#c08020]">*</span> : <span className="text-[#606080] text-xs">(optional)</span>}
        </label>
        <span className="text-[10px] uppercase tracking-wider text-[#606080] font-fantasy">Shown in: {usedIn}</span>
      </div>
      {help && <p className="text-xs text-[#a0a0a0]">{help}</p>}
      {options ? (
        <select value={fact.value} onChange={(e) => onChange(e.target.value)} className={input}>
          <option value="">Pick one</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea value={fact.value} onChange={(e) => onChange(e.target.value)} rows={3} maxLength={4000} className={`${input} resize-y`} />
      ) : (
        <input value={fact.value} onChange={(e) => onChange(e.target.value)} maxLength={400} className={input} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`flex items-center gap-2 text-xs font-fantasy ${filled ? "text-[#e0e0e0]" : "text-[#606080]"}`}>
          <input type="checkbox" checked={fact.confirmed && filled} disabled={!filled} onChange={(e) => onConfirm(e.target.checked)} className="accent-[#c08020]" data-fact-confirm /> Confirmed by John
        </label>
        {suggestion && !filled && (
          <button type="button" onClick={() => onChange(suggestion)} className={btnGhost} data-use-suggested>Use the suggested wording</button>
        )}
      </div>
    </div>
  );
}
