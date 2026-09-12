import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { getLeads, updateLeadStatus, deleteLead, initLeadsTable, quizTypeLabel, addLeadManually, MANUAL_LEAD_SOURCES, type Lead } from "~/server/leads";
import { LEAD_STATUSES, NOT_A_FIT_REASONS, PRODUCT_TYPES, productLabel, reasonLabel, sourceSummary } from "~/lib/attribution";

export const Route = createFileRoute("/_admin/admin/leads")({
  validateSearch: (s: Record<string, unknown>): { lead?: number; add?: number } => ({ lead: Number(s.lead) > 0 ? Number(s.lead) : undefined, add: Number(s.add) === 1 ? 1 : undefined }),
  component: DashboardPage,
});

// Lead outcomes (Quest Board spec, Section 8.4): the original three plus
// Showed, Sold, and Not a fit. Each change is timestamped on the server.
const STATUS_OPTIONS: readonly string[] = LEAD_STATUSES;
const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  Contacted: "bg-[#c08020]/20 text-[#c08020] border-[#c08020]/40",
  Booked: "bg-green-900/40 text-green-300 border-green-700/40",
  Showed: "bg-teal-900/40 text-teal-300 border-teal-700/40",
  Sold: "bg-[#7fd08a]/20 text-[#7fd08a] border-[#7fd08a]/50",
  "Not a fit": "bg-gray-800/60 text-gray-400 border-gray-600/40",
};

/** Filter values: every lead, leads with no campaign tag, or one quest by id. */
type QuestFilter = "all" | "none" | `q:${number}`;

function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  // A Home card can point at one lead: scroll to it and light it up for a moment.
  const { lead: focusLead, add } = Route.useSearch();
  const [showAdd, setShowAdd] = useState(add === 1);
  useEffect(() => {
    if (!focusLead || !leads.length) return;
    const row = document.querySelector<HTMLElement>(`[data-lead-row='${focusLead}']`);
    if (!row) return;
    row.scrollIntoView({ block: "center" });
    row.classList.add("ring-2", "ring-[#c08020]");
    const t = setTimeout(() => row.classList.remove("ring-2", "ring-[#c08020]"), 4000);
    return () => clearTimeout(t);
  }, [focusLead, leads]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [questFilter, setQuestFilter] = useState<QuestFilter>("all");
  // "Not a fit" asks for a reason and "Sold" for a product type before saving.
  const [pending, setPending] = useState<{ id: number; status: string; name: string } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Initialize table first, then fetch
      await initLeadsTable();
      const data = await getLeads();
      setLeads(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = (id: number, status: string) => {
    if (status === "Not a fit" || status === "Sold") {
      const lead = leads.find((l) => l.id === id);
      setPending({ id, status, name: lead?.name ?? "" });
      return;
    }
    void commitStatus(id, status);
  };

  const commitStatus = async (id: number, status: string, reason = "", productType = "") => {
    setPending(null);
    setUpdatingId(id);
    setActionError("");
    try {
      const result = await updateLeadStatus({ data: { id, status, reason, productType } });
      if (result.ok) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status,
                  status_history: result.history ?? l.status_history,
                  not_a_fit_reason: status === "Not a fit" ? reason : "",
                  product_type: status === "Sold" ? productType : "",
                }
              : l,
          ),
        );
      } else {
        setActionError(result.error || "Could not update that lead's status.");
      }
    } catch (e) {
      setActionError(`Could not update that lead's status: ${String(e)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Banish this adventurer from the records?")) return;
    setUpdatingId(id);
    setActionError("");
    try {
      const result = await deleteLead({ data: { id } });
      if (result.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      } else {
        setActionError(result.error || "Could not delete that lead.");
      }
    } catch (e) {
      setActionError(`Could not delete that lead: ${String(e)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const resultDisplay = (lead: Lead) => {
    if (!lead.quiz_result) return "—";
    const base = lead.quiz_score === null || lead.quiz_score === undefined ? lead.quiz_result : `${lead.quiz_result} (${lead.quiz_score}/100)`;
    // The other quiz's tier, copied over when the same person did both.
    const other = lead.quiz_type === "financial-health" ? lead.armor_tier && `AC: ${lead.armor_tier}` : lead.character_tier && `Sheet: ${lead.character_tier}`;
    return other ? `${base} · ${other}` : base;
  };

  const utmDisplay = (lead: Lead) => sourceSummary(lead);

  /** The extra line under a status: why not a fit, or what was sold. */
  const outcomeNote = (lead: Lead) =>
    lead.status === "Not a fit" && lead.not_a_fit_reason ? reasonLabel(lead.not_a_fit_reason) : lead.status === "Sold" && lead.product_type ? productLabel(lead.product_type) : "";

  const historyTitle = (lead: Lead) =>
    lead.status_history.length ? lead.status_history.map((h) => `${h.status}${h.at ? ` · ${formatDate(h.at)}` : ""}`).join("\n") : undefined;

  // Quest column and filter (Section 8.4). The quests come from the leads
  // themselves, so the list only ever shows quests that have brought someone in.
  const questsSeen = Array.from(new Map(leads.filter((l) => l.quest_id != null).map((l) => [l.quest_id as number, l.quest_name || `Quest ${l.quest_id}`])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const visible = leads.filter((l) => (questFilter === "all" ? true : questFilter === "none" ? l.quest_id == null : l.quest_id === Number(questFilter.slice(2))));
  const questDisplay = (lead: Lead) => (lead.quest_id != null ? lead.quest_name || `Quest ${lead.quest_id}` : lead.campaign_slug ? `/${lead.campaign_slug}` : "—");

  return (
    <main
      className="min-h-dvh py-6 px-4"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-4">
          <img src="/logo.png" alt="The Financial DM" className="h-20 sm:h-24 mx-auto drop-shadow-lg" />
        </div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]"
              style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
            >
              ⚔️ Lead Dashboard ⚔️
            </h1>
            <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
              The Financial DM: {leads.length} adventurers found{questFilter !== "all" ? ` · showing ${visible.length}` : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {(questsSeen.length > 0 || questFilter !== "all") && (
              <label className="flex items-center gap-2 text-xs font-fantasy text-[#a0a0a0]">
                Quest
                <select
                  value={questFilter}
                  onChange={(e) => setQuestFilter(e.target.value as QuestFilter)}
                  className="px-2 py-2 rounded-lg border border-[#406080]/40 bg-transparent text-[#e0e0e0] text-xs font-fantasy"
                  data-quest-filter
                >
                  <option value="all" className="bg-gray-900">All quests</option>
                  <option value="none" className="bg-gray-900">Unattributed</option>
                  {questsSeen.map(([id, name]) => (
                    <option key={id} value={`q:${id}`} className="bg-gray-900">
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#e0e0e0] hover:bg-[#204060]/20 transition-all font-fantasy text-sm disabled:opacity-50"
            >
              {loading ? "Scrying..." : "🔄 Refresh"}
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm" data-add-lead>
              ➕ Add a lead
            </button>
          </div>
        </div>
        {showAdd && <AddLeadForm onDone={() => { setShowAdd(false); fetchLeads(); }} onCancel={() => setShowAdd(false)} />}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm">
            <p className="font-bold">Error loading leads:</p>
            <p className="text-xs mt-1 opacity-70">{error}</p>
            <p className="text-xs mt-2 opacity-50">
              Make sure DATABASE_URL is configured and the leads table exists.
            </p>
          </div>
        )}

        {actionError && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {actionError}
          </div>
        )}

        {/* Table (desktop). Phones get the card list below instead. */}
        {!error && (
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#406080]/30">
            <table className="w-full text-sm text-left">
              <thead>
                <tr
                  className="text-[#c08020] font-fantasy text-xs uppercase tracking-wider"
                  style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}
                >
                  <th className="px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">Email</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">Age</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">Deps</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">Concern</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden xl:table-cell">Timeline</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">Quest</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">Result</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">Source</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#406080]/10">
                {visible.length === 0 && !loading && (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-[#606080] font-fantasy">
                      {leads.length === 0 ? "No adventurers have completed the quest yet." : "No adventurers match that quest."}
                    </td>
                  </tr>
                )}
                {visible.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-[#204060]/10 transition-colors"
                    data-lead-row={lead.id}
                  >
                    <td className="px-4 py-3 text-[#e0e0e0] font-medium whitespace-nowrap">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 text-[#a0a0a0] hidden sm:table-cell whitespace-nowrap text-xs">
                      {lead.email}
                    </td>
                    <td className="px-4 py-3 text-[#a0a0a0] hidden md:table-cell whitespace-nowrap text-xs">
                      {lead.phone}
                    </td>
                    <td className="px-4 py-3 text-[#808080] hidden lg:table-cell whitespace-nowrap text-xs">
                      {lead.age_range}
                    </td>
                    <td className="px-4 py-3 text-[#808080] hidden lg:table-cell whitespace-nowrap text-xs">
                      {lead.dependents}
                    </td>
                    <td className="px-4 py-3 text-[#808080] hidden lg:table-cell whitespace-nowrap text-xs">
                      {lead.biggest_concern}
                    </td>
                    <td className="px-4 py-3 text-[#808080] hidden xl:table-cell whitespace-nowrap text-xs">
                      {lead.timeline}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-fantasy border ${
                          lead.quiz_type === "financial-health"
                            ? "bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40"
                            : "bg-[#204060]/30 text-[#a0c8e0] border-[#406080]/40"
                        }`}
                      >
                        {quizTypeLabel(lead.quiz_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#a0a0a0] hidden md:table-cell whitespace-nowrap text-xs" data-lead-quest>
                      {questDisplay(lead)}
                    </td>
                    <td className="px-4 py-3 text-[#a0a0a0] hidden md:table-cell whitespace-nowrap text-xs">
                      {resultDisplay(lead)}
                    </td>
                    <td className="px-4 py-3 text-[#808080] hidden md:table-cell whitespace-nowrap text-xs" data-lead-source>
                      {utmDisplay(lead)}
                    </td>
                    <td className="px-4 py-3 text-[#808080] hidden sm:table-cell whitespace-nowrap text-xs">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        disabled={updatingId === lead.id}
                        title={historyTitle(lead)}
                        className={`text-xs font-fantasy px-2 py-1 rounded border cursor-pointer transition-all ${
                          STATUS_COLORS[lead.status] || STATUS_COLORS["New"]
                        } ${updatingId === lead.id ? "opacity-50" : ""}`}
                        style={{ background: "transparent" }}
                        data-lead-status
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-gray-900 text-[#e0e0e0]">
                            {s}
                          </option>
                        ))}
                      </select>
                      {outcomeNote(lead) && <p className="text-[10px] text-[#808080] font-fantasy mt-1 whitespace-nowrap" data-outcome-note>{outcomeNote(lead)}</p>}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={updatingId === lead.id}
                        className="text-red-400/60 hover:text-red-400 text-sm font-fantasy transition-colors disabled:opacity-30"
                        title="Delete lead"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading spinner for empty state */}
        {loading && leads.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-10 h-10 border-3 border-[#c08020] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#a0a0a0] font-fantasy text-sm">Scrying for adventurers...</p>
          </div>
        )}

        {/* Mobile card view (visible only on small screens) */}
        {!error && !loading && leads.length === 0 && (
          <p className="sm:hidden text-center text-[#606080] font-fantasy py-8">
            No adventurers have completed the quest yet.
          </p>
        )}
        {visible.length > 0 && (
          <div className="mt-6 sm:hidden space-y-3">
            {visible.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl border border-[#406080]/30 bg-[#204060]/5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#e0e0e0] font-bold text-sm">{lead.name}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      disabled={updatingId === lead.id}
                      className={`text-xs font-fantasy px-2 py-1 rounded border cursor-pointer ${
                        STATUS_COLORS[lead.status] || STATUS_COLORS["New"]
                      }`}
                      style={{ background: "transparent" }}
                      title={historyTitle(lead)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-gray-900 text-[#e0e0e0]">
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDelete(lead.id)}
                      disabled={updatingId === lead.id}
                      className="text-red-400/60 hover:text-red-400 text-sm transition-colors disabled:opacity-30"
                      title="Delete lead"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="text-xs text-[#a0a0a0] space-y-0.5">
                  <p>{lead.email}</p>
                  <p>{lead.phone}</p>
                  <p>Age: {lead.age_range} · Deps: {lead.dependents} · Concern: {lead.biggest_concern}</p>
                  <p>Timeline: {lead.timeline} · Type: {quizTypeLabel(lead.quiz_type)} · Source: {utmDisplay(lead)}</p>
                  <p>Quest: {questDisplay(lead)}{outcomeNote(lead) ? ` · ${outcomeNote(lead)}` : ""}</p>
                  <p>Result: {resultDisplay(lead)}</p>
                  <p className="text-[#606080]">{formatDate(lead.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {pending && (
        <OutcomeDialog
          status={pending.status}
          name={pending.name}
          onCancel={() => setPending(null)}
          onConfirm={(choice) => commitStatus(pending.id, pending.status, pending.status === "Not a fit" ? choice : "", pending.status === "Sold" ? choice : "")}
        />
      )}
    </main>
  );
}

/**
 * One quick question before an outcome is saved: the reason for "Not a fit"
 * (which shows whether a campaign attracts the right people) or the product
 * type for "Sold". No dollar amounts, ever.
 */
function OutcomeDialog({ status, name, onCancel, onConfirm }: { status: string; name: string; onCancel: () => void; onConfirm: (choice: string) => void }) {
  const notAFit = status === "Not a fit";
  const options = notAFit ? NOT_A_FIT_REASONS : PRODUCT_TYPES;
  const [choice, setChoice] = useState<string>(options[0].id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(8, 14, 22, 0.85)" }} onClick={onCancel}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl border-2 border-[#406080]/50 shadow-2xl p-5 space-y-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 100%)" }} onClick={(e) => e.stopPropagation()} data-outcome-dialog>
        <div>
          <h3 className="text-lg font-fantasy text-[#c08020]">{notAFit ? "Why not a fit?" : "What did they buy?"}</h3>
          <p className="text-xs text-[#a0a0a0] font-fantasy mt-1">{name ? `${name} · ` : ""}{notAFit ? "This shows whether a quest is bringing in the right people." : "Product type only. No amounts are stored."}</p>
        </div>
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm font-fantasy ${choice === o.id ? "border-[#c08020]/60 bg-[#c08020]/10 text-[#e0e0e0]" : "border-[#406080]/30 text-[#a0a0a0] hover:border-[#406080]/60"}`}>
              <input type="radio" name="outcome-choice" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="accent-[#c08020]" />
              {o.label}
            </label>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-[#406080]/50 text-[#a0a0a0] hover:text-[#e0e0e0] font-fantasy text-sm">Cancel</button>
          <button type="button" onClick={() => onConfirm(choice)} className="flex-1 px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm" data-outcome-confirm>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}


/** Someone who called, texted, or was referred: John types them in and they land at New like any quiz lead. */
function AddLeadForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<string>(MANUAL_LEAD_SOURCES[0].id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = "w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await addLeadManually({ data: { name, phone, email, source, note } });
      if (res.ok) onDone();
      else setError(res.error ?? "Could not add the lead.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-[#c08020]/40 bg-[#111a28] p-4 space-y-3" data-add-lead-form>
      <h2 className="font-fantasy text-[#c08020]">Add a lead</h2>
      <p className="text-[11px] text-[#a0a0a0] font-fantasy">For someone who called, texted, or was sent your way. They start at New, same as a quiz lead. No email goes out for leads you add yourself.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={120} className={input} required autoFocus data-add-lead-name />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={input} aria-label="How they found you" data-add-lead-source>
          {MANUAL_LEAD_SOURCES.map((s) => (
            <option key={s.id} value={s.id} className="bg-gray-900">{s.label}</option>
          ))}
        </select>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" type="tel" maxLength={40} className={input} data-add-lead-phone />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" maxLength={200} className={input} data-add-lead-email />
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="A note for yourself (optional)" className={`${input} resize-none`} data-add-lead-note />
      {error && <p className="text-red-300 text-xs" data-add-lead-error>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50" data-add-lead-submit>{busy ? "Adding..." : "Add lead"}</button>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] font-fantasy text-sm">Cancel</button>
      </div>
    </form>
  );
}
