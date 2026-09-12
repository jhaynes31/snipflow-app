import { useCallback, useEffect, useState } from "react";
import { getScoreboard, saveQuestRetro } from "~/server/scoreboard";
import type { GroupScore, QuestScore, Scoreboard as ScoreboardData, WrapUpPrompt } from "~/lib/scoreboard";
import { RETRO_STARTERS } from "~/lib/questSuggestions";
import SuggestField from "~/components/quest/SuggestField";

/**
 * The Scoreboard tab (Quest Board spec, Section 9). Quests ranked by
 * bookings, then sales; raw counts always, rates only with enough leads;
 * a side-by-side compare; per-post breakdowns; unattributed leads; series
 * and generator tables; and the quest wrap-up prompt.
 */
export default function Scoreboard({ onOpenQuest }: { onOpenQuest: (questId: number) => void }) {
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<number[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getScoreboard());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggleCompare = (id: number) =>
    setCompare((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]));

  if (error) return <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>;
  if (loading && !data) return <p className="text-[#a0a0a0] font-fantasy text-sm py-8 text-center">Tallying the ledger...</p>;
  if (!data) return null;

  const compared = data.quests.filter((q) => compare.includes(q.questId));

  return (
    <div className="space-y-6" data-scoreboard>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <p className="text-[#a0a0a0] text-sm font-fantasy max-w-2xl">
          Quests ranked by <span className="text-[#e0e0e0]">bookings</span>, then sales. Raw counts are always shown. Conversion rates appear once a quest has {data.minLeadsForRates} leads; before that it says "Too early to tell".
        </p>
        <button type="button" onClick={load} disabled={loading} className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#e0e0e0] hover:bg-[#204060]/20 font-fantasy text-xs disabled:opacity-50">
          {loading ? "Tallying..." : "🔄 Refresh"}
        </button>
      </div>

      {data.wrapUps.map((w) => (
        <WrapUpCard key={w.questId} prompt={w} onSaved={load} />
      ))}

      {data.empty && (
        <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-8 text-center">
          <h2 className="font-fantasy text-[#c08020] text-xl">Nothing to tally yet</h2>
          <p className="text-[#a0a0a0] text-sm font-fantasy mt-2 max-w-md mx-auto">
            Numbers appear here once a quest has posts marked Posted, visits through its link, or leads. Start with a quest and say its link on camera.
          </p>
        </section>
      )}

      {data.quests.length > 0 && (
        <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#406080]/20 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-fantasy text-[#c08020] text-lg">Quests</h2>
            <p className="text-[#606080] text-xs font-fantasy">Tick two or three to compare side by side.</p>
          </div>
          {/* Table for tablets and up */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left" data-quest-table>
              <thead>
                <tr className="text-[#c08020] font-fantasy text-[11px] uppercase tracking-wider" style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Quest</th>
                  <th className="px-3 py-2 text-right">Posts</th>
                  <th className="px-3 py-2 text-right">Visits</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Quiz start → done</th>
                  <th className="px-3 py-2 text-right">Leads</th>
                  <th className="px-3 py-2 text-right">Booked</th>
                  <th className="px-3 py-2 text-right">Showed</th>
                  <th className="px-3 py-2 text-right">Sold</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Not a fit</th>
                  <th className="px-3 py-2 whitespace-nowrap">Visits → leads</th>
                  <th className="px-3 py-2 whitespace-nowrap">Leads → booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#406080]/10">
                {data.quests.map((q, i) => (
                  <QuestRows key={q.questId} q={q} rank={i + 1} compared={compare.includes(q.questId)} onCompare={() => toggleCompare(q.questId)} expanded={open === q.questId} onToggle={() => setOpen(open === q.questId ? null : q.questId)} onOpenQuest={onOpenQuest} />
                ))}
                <tr className="bg-[#0d1520]/50" data-unattributed>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-[#606080] font-fantasy">—</td>
                  <td className="px-3 py-2 text-[#a0a0a0] font-fantasy">
                    Unattributed
                    {data.unattributed.length > 0 && (
                      <span className="block text-[11px] text-[#606080]">{data.unattributed.map((u) => `${u.label}: ${u.leads}${u.booked ? ` (${u.booked} booked)` : ""}`).join(" · ")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right text-[#e0e0e0] tabular-nums">{data.unattributedTotal}</td>
                  <td className="px-3 py-2 text-right text-[#e0e0e0] tabular-nums">{data.unattributed.reduce((a, u) => a + u.booked, 0)}</td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right text-[#e0e0e0] tabular-nums">{data.unattributed.reduce((a, u) => a + u.sold, 0)}</td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-[#606080]" colSpan={2}>Leads with no campaign link, by where they said they found John.</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Cards on phones */}
          <div className="sm:hidden divide-y divide-[#406080]/10">
            {data.quests.map((q, i) => (
              <div key={q.questId} className="p-4 space-y-2" data-quest-card>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => onOpenQuest(q.questId)} className="text-left">
                    <span className="text-[#606080] font-fantasy text-xs">#{i + 1} · {statusLabel(q.status)}</span>
                    <span className="block text-[#e0e0e0] font-fantasy">{q.name}</span>
                  </button>
                  <label className="flex items-center gap-1 text-[11px] text-[#a0a0a0] font-fantasy">
                    <input type="checkbox" checked={compare.includes(q.questId)} onChange={() => toggleCompare(q.questId)} className="accent-[#c08020]" /> Compare
                  </label>
                </div>
                <dl className="grid grid-cols-4 gap-2 text-center">
                  <Stat label="Leads" value={q.leads} />
                  <Stat label="Booked" value={q.booked} strong />
                  <Stat label="Sold" value={q.sold} />
                  <Stat label="Visits" value={q.visits} />
                </dl>
                <p className="text-[11px] text-[#606080] font-fantasy">
                  {q.posts} posted · quiz {q.quizStarts} → {q.quizCompletes} · not a fit {q.notAFit}
                  {q.reasons.length ? ` (${q.reasons.map((r) => `${r.label} ${r.count}`).join(", ")})` : ""} · {q.rates.tooEarly ? "Too early to tell" : `visits → leads ${q.rates.visitsToLeads}, leads → booked ${q.rates.leadsToBooked}`}
                </p>
              </div>
            ))}
            <p className="p-4 text-xs text-[#a0a0a0] font-fantasy">
              Unattributed: {data.unattributedTotal} lead{data.unattributedTotal === 1 ? "" : "s"}
              {data.unattributed.length ? ` · ${data.unattributed.map((u) => `${u.label} ${u.leads}`).join(", ")}` : ""}
            </p>
          </div>
        </section>
      )}


      {(data.recruitQuests.length > 0 || data.unattributedRecruitsTotal > 0) && (
        <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden" data-recruit-scoreboard>
          <div className="px-4 py-3 border-b border-[#406080]/20 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-fantasy text-[#c08020] text-lg">🛡️ Recruiting quests</h2>
            <p className="text-[#606080] text-xs font-fantasy">Ranked by recruits who reached your win stage: <span className="text-[#a0a0a0]">{data.recruitQuests[0]?.winLabel ?? (data.winStage === "first_sale" ? "First sale" : "Contracted")}</span>. Kept apart from client quests.</p>
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left" data-recruit-table>
              <thead>
                <tr className="text-[#c08020] font-fantasy text-[11px] uppercase tracking-wider" style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Quest</th>
                  <th className="px-3 py-2 text-right">Posts</th>
                  <th className="px-3 py-2 text-right">Visits</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Fit quiz done</th>
                  <th className="px-3 py-2 text-right">Recruits</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Interview booked</th>
                  <th className="px-3 py-2 text-right">Interviewed</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Getting licensed</th>
                  <th className="px-3 py-2 text-right">Licensed</th>
                  <th className="px-3 py-2 text-right">Contracted</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">First sale</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Not moving</th>
                  <th className="px-3 py-2 text-right">Wins</th>
                  <th className="px-3 py-2 whitespace-nowrap">Visits → recruits</th>
                  <th className="px-3 py-2 whitespace-nowrap">Recruits → wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#406080]/10">
                {data.recruitQuests.map((q, i) => (
                  <tr key={q.questId} className="hover:bg-[#204060]/10" data-recruit-quest={q.questId}>
                    <td className="px-3 py-2 text-[#c08020] font-fantasy tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => onOpenQuest(q.questId)} className="text-left text-[#e0e0e0] font-fantasy hover:text-[#c08020]">{q.name}</button>
                      <span className="block text-[11px] text-[#606080] font-fantasy">{statusLabel(q.status)}{q.slug ? ` · /${q.slug}` : ""}{q.profileName ? ` · ${q.profileName}` : ""}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{q.posts}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{q.visits}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{q.fitQuizCompletes}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]" data-recruit-count>{q.recruits}<span className="block text-[10px] text-[#606080]">{q.forms} form · {q.texts} text{q.fitQuiz ? ` · ${q.fitQuiz} quiz` : ""}</span></td>
                    {q.reached.map((r) => (
                      <td key={r.stage} className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{r.count}</td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{q.notMoving}{q.reasons.length ? <span className="block text-[10px] text-[#606080]">{q.reasons.map((r) => `${r.label} ${r.count}`).join(", ")}</span> : null}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#c08020] font-bold" data-recruit-wins>{q.wins}{data.winStage === "contracted" && q.firstSales ? <span className="block text-[10px] text-[#606080]">{q.firstSales} first sale</span> : null}</td>
                    <td className="px-3 py-2 text-xs text-[#a0a0a0] font-fantasy whitespace-nowrap">{q.rates.visitsToRecruits}</td>
                    <td className="px-3 py-2 text-xs text-[#a0a0a0] font-fantasy whitespace-nowrap">{q.rates.recruitsToWins}</td>
                  </tr>
                ))}
                <tr className="bg-[#0d1520]/50" data-unattributed-recruits>
                  <td className="px-3 py-2 text-[#606080] font-fantasy">—</td>
                  <td className="px-3 py-2 text-[#a0a0a0] font-fantasy">
                    Unattributed
                    {data.unattributedRecruits.length > 0 && <span className="block text-[11px] text-[#606080]">{data.unattributedRecruits.map((u) => `${u.label}: ${u.recruits}${u.wins ? ` (${u.wins} won)` : ""}`).join(" · ")}</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right text-[#606080]">—</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{data.unattributedRecruitsTotal}</td>
                  <td className="px-3 py-2 text-[#606080]" colSpan={10}>Recruits with no campaign link, by where they said they heard about the role.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="sm:hidden divide-y divide-[#406080]/10">
            {data.recruitQuests.map((q, i) => (
              <div key={q.questId} className="p-4 space-y-2" data-recruit-quest-card>
                <button type="button" onClick={() => onOpenQuest(q.questId)} className="text-left">
                  <span className="text-[#606080] font-fantasy text-xs">#{i + 1} · {statusLabel(q.status)}</span>
                  <span className="block text-[#e0e0e0] font-fantasy">{q.name}</span>
                </button>
                <dl className="grid grid-cols-4 gap-2 text-center">
                  <Stat label="Recruits" value={q.recruits} />
                  <Stat label={q.winLabel} value={q.wins} strong />
                  <Stat label="Visits" value={q.visits} />
                  <Stat label="Not moving" value={q.notMoving} />
                </dl>
                <p className="text-[11px] text-[#606080] font-fantasy">{q.reached.map((r) => `${r.label} ${r.count}`).join(" · ")} · {q.rates.tooEarly ? "Too early to tell" : `visits → recruits ${q.rates.visitsToRecruits}`}</p>
              </div>
            ))}
            <p className="p-4 text-xs text-[#a0a0a0] font-fantasy">Unattributed recruits: {data.unattributedRecruitsTotal}</p>
          </div>
        </section>
      )}

      {compared.length >= 2 && (
        <section className="rounded-xl border border-[#c08020]/40 bg-[#111a28] p-4" data-compare>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-fantasy text-[#c08020] text-lg">Side by side</h2>
            <button type="button" onClick={() => setCompare([])} className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#e0e0e0] underline underline-offset-4">Clear</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2 text-[#606080] font-fantasy text-[11px] uppercase tracking-wider">Metric</th>
                  {compared.map((q) => (
                    <th key={q.questId} className="px-3 py-2 text-[#e0e0e0] font-fantasy">{q.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#406080]/10">
                {(
                  [
                    ["Posts published", (q: QuestScore) => q.posts],
                    ["Views", (q: QuestScore) => (q.hasStats ? q.views : "—")],
                    ["Engagement", (q: QuestScore) => (q.hasStats ? q.engagement : "—")],
                    ["Link visits", (q: QuestScore) => q.visits],
                    ["Quiz starts", (q: QuestScore) => q.quizStarts],
                    ["Quiz completions", (q: QuestScore) => q.quizCompletes],
                    ["Leads", (q: QuestScore) => q.leads],
                    ["Booked", (q: QuestScore) => q.booked],
                    ["Showed", (q: QuestScore) => q.showed],
                    ["Sold", (q: QuestScore) => q.sold],
                    ["Not a fit", (q: QuestScore) => (q.reasons.length ? `${q.notAFit} (${q.reasons.map((r) => `${r.label} ${r.count}`).join(", ")})` : q.notAFit)],
                    ["Visits → leads", (q: QuestScore) => q.rates.visitsToLeads],
                    ["Leads → booked", (q: QuestScore) => q.rates.leadsToBooked],
                  ] as Array<[string, (q: QuestScore) => string | number]>
                ).map(([label, pick]) => (
                  <tr key={label}>
                    <td className="px-3 py-1.5 text-[#a0a0a0] font-fantasy text-xs">{label}</td>
                    {compared.map((q) => (
                      <td key={q.questId} className={`px-3 py-1.5 tabular-nums ${label === "Booked" ? "text-[#c08020] font-bold" : "text-[#e0e0e0]"}`}>{pick(q)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(data.series.length > 0 || data.generators.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <GroupTable title="By series and show" rows={data.series} empty="No series or shows have posts yet." testId="series" />
          <GroupTable title="By generator" rows={data.generators} empty="No posts yet." testId="generators" />
        </div>
      )}
    </div>
  );
}

function statusLabel(s: QuestScore["status"]): string {
  return s === "active" ? "Active" : s === "complete" ? "Complete" : "Planning";
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-[#606080] font-fantasy">{label}</dt>
      <dd className={`tabular-nums font-fantasy ${strong ? "text-[#c08020] text-lg" : "text-[#e0e0e0]"}`}>{value}</dd>
    </div>
  );
}

function QuestRows({ q, rank, compared, onCompare, expanded, onToggle, onOpenQuest }: { q: QuestScore; rank: number; compared: boolean; onCompare: () => void; expanded: boolean; onToggle: () => void; onOpenQuest: (id: number) => void }) {
  const num = "px-3 py-2 text-right tabular-nums text-[#e0e0e0]";
  const hasDetail = q.reasons.length > 0 || q.perPost.length > 0;
  return (
    <>
      <tr className="hover:bg-[#204060]/10" data-quest-score={q.questId}>
        <td className="px-3 py-2">
          <input type="checkbox" checked={compared} onChange={onCompare} aria-label={`Compare ${q.name}`} className="accent-[#c08020]" data-compare-box />
        </td>
        <td className="px-3 py-2 text-[#c08020] font-fantasy tabular-nums">{rank}</td>
        <td className="px-3 py-2">
          <button type="button" onClick={() => onOpenQuest(q.questId)} className="text-left text-[#e0e0e0] font-fantasy hover:text-[#c08020]">{q.name}</button>
          <span className="block text-[11px] text-[#606080] font-fantasy">
            {statusLabel(q.status)}{q.slug ? ` · /${q.slug}` : ""}{q.profileName ? ` · ${q.profileName}` : ""}
            {hasDetail && (
              <button type="button" onClick={onToggle} className="ml-2 underline underline-offset-2 text-[#a0a0a0] hover:text-[#e0e0e0]" data-toggle-detail>
                {expanded ? "hide detail" : "detail"}
              </button>
            )}
          </span>
        </td>
        <td className={num}>{q.posts}{q.hasStats ? <span className="block text-[10px] text-[#606080]">{q.views} views · {q.engagement} eng.</span> : null}</td>
        <td className={num}>{q.visits}</td>
        <td className={num}>{q.quizStarts} → {q.quizCompletes}</td>
        <td className={num}>{q.leads}</td>
        <td className={`${num} text-[#c08020] font-bold`} data-booked>{q.booked}</td>
        <td className={num}>{q.showed}</td>
        <td className={num}>{q.sold}</td>
        <td className={num}>{q.notAFit}</td>
        <td className="px-3 py-2 text-xs text-[#a0a0a0] font-fantasy whitespace-nowrap" data-rate>{q.rates.visitsToLeads}</td>
        <td className="px-3 py-2 text-xs text-[#a0a0a0] font-fantasy whitespace-nowrap">{q.rates.leadsToBooked}</td>
      </tr>
      {expanded && (
        <tr className="bg-[#0d1520]/40" data-quest-detail-row>
          <td colSpan={13} className="px-4 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[#606080] text-[11px] uppercase tracking-wider font-fantasy mb-1">Not a fit, by reason</p>
                {q.reasons.length === 0 ? (
                  <p className="text-[#606080] text-xs font-fantasy">None yet.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {q.reasons.map((r) => (
                      <li key={r.reason} className="text-xs text-[#e0e0e0] flex justify-between max-w-xs">
                        <span>{r.label}</span>
                        <span className="tabular-nums text-[#a0a0a0]">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[#606080] text-[11px] uppercase tracking-wider font-fantasy mb-1">Per post (posts with their own link)</p>
                {q.perPost.length === 0 ? (
                  <p className="text-[#606080] text-xs font-fantasy">No post links used in this quest. Add a "Post link" word to a slot to compare posts.</p>
                ) : (
                  <table className="text-xs w-full" data-per-post>
                    <thead>
                      <tr className="text-[#606080] font-fantasy text-left">
                        <th className="pr-2 py-1 font-normal">Post</th>
                        <th className="px-2 py-1 font-normal text-right">Visits</th>
                        <th className="px-2 py-1 font-normal text-right">Leads</th>
                        <th className="px-2 py-1 font-normal text-right">Booked</th>
                        <th className="px-2 py-1 font-normal text-right">Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.perPost.map((p) => (
                        <tr key={p.slotId} className="text-[#e0e0e0]">
                          <td className="pr-2 py-1">/{p.postSlug} <span className="text-[#606080]">· {p.date} · {p.topic || p.generator}</span></td>
                          <td className="px-2 py-1 text-right tabular-nums">{p.visits}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{p.leads}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-[#c08020]">{p.booked}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{p.sold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GroupTable({ title, rows, empty, testId }: { title: string; rows: GroupScore[]; empty: string; testId: string }) {
  const anyUntracked = rows.some((r) => !r.tracked);
  return (
    <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden" data-group-table={testId}>
      <div className="px-4 py-3 border-b border-[#406080]/20">
        <h2 className="font-fantasy text-[#c08020] text-lg">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-[#606080] text-sm font-fantasy">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[#c08020] font-fantasy text-[11px] uppercase tracking-wider" style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-right">Posts</th>
                <th className="px-3 py-2 text-right">Views</th>
                <th className="px-3 py-2 text-right">Eng.</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">Booked</th>
                <th className="px-3 py-2 text-right">Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#406080]/10">
              {rows.map((r) => (
                <tr key={r.id} data-group-row={r.id}>
                  <td className="px-3 py-2 text-[#e0e0e0] font-fantasy">
                    {r.name}
                    {!r.tracked && <span className="block text-[10px] text-[#606080]">{r.note}</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{r.posts}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{r.hasStats ? r.views : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{r.hasStats ? r.engagement : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{r.tracked ? r.leads : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.tracked ? "text-[#c08020] font-bold" : "text-[#606080]"}`}>{r.tracked ? r.booked : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#e0e0e0]">{r.tracked ? r.sold : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {anyUntracked && rows.length > 0 && <p className="px-4 py-2 text-[11px] text-[#606080] font-fantasy border-t border-[#406080]/10">Rows with "—" show engagement only. Ranked by bookings wherever booking data exists.</p>}
    </section>
  );
}

function WrapUpCard({ prompt, onSaved }: { prompt: WrapUpPrompt; onSaved: () => void }) {
  const [retro, setRetro] = useState("");
  const [complete, setComplete] = useState(prompt.status !== "complete");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!retro.trim()) {
      setError("Write a line or two first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await saveQuestRetro({ data: { questId: prompt.questId, retro, markComplete: complete } });
      if (!res.ok) setError(res.error || "Could not save the retro.");
      else onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="rounded-xl border border-[#c08020]/40 bg-[#c08020]/5 p-4 space-y-3" data-wrapup={prompt.questId}>
      <div>
        <h2 className="font-fantasy text-[#c08020] text-lg">📜 {prompt.name} has ended. What did we learn?</h2>
        <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">It ended {prompt.endDate}. Two or three honest sentences are enough. The retro is stored on the quest and feeds the coach later.</p>
      </div>
      <SuggestField name="retro" label="Retro" value={retro} onChange={setRetro} suggestions={RETRO_STARTERS} placeholder="The hooks about work coverage booked calls; the meme days brought views but no leads." textarea rows={3} append maxLength={2000} />
      <div className="flex flex-wrap items-center gap-3">
        {prompt.status !== "complete" && (
          <label className="flex items-center gap-2 text-xs text-[#a0a0a0] font-fantasy">
            <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} className="accent-[#c08020]" /> Mark the quest Complete
          </label>
        )}
        <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50" data-save-retro>
          {saving ? "Saving..." : "Save retro"}
        </button>
        {error && <p className="text-red-300 text-xs font-fantasy">{error}</p>}
      </div>
    </section>
  );
}
