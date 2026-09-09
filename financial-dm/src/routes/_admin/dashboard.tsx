import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { getLeads, updateLeadStatus, deleteLead, initLeadsTable, quizTypeLabel, type Lead } from "~/server/leads";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

const STATUS_OPTIONS = ["New", "Contacted", "Booked"];
const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  Contacted: "bg-[#c08020]/20 text-[#c08020] border-[#c08020]/40",
  Booked: "bg-green-900/40 text-green-300 border-green-700/40",
};

function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const result = await updateLeadStatus({ data: { id, status } });
      if (result.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l)),
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Banish this adventurer from the records?")) return;
    setUpdatingId(id);
    try {
      const result = await deleteLead({ data: { id } });
      if (result.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      // ignore
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

  const utmDisplay = (lead: Lead) => {
    const parts = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "Direct";
  };

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
              The Financial DM: {leads.length} adventurers found
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href="/generator"
              className="px-4 py-2 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/10 transition-all font-fantasy text-sm"
            >
              🧙 Content Forge
            </a>
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#e0e0e0] hover:bg-[#204060]/20 transition-all font-fantasy text-sm disabled:opacity-50"
            >
              {loading ? "Scrying..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

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

        {/* Table */}
        {!error && (
          <div className="overflow-x-auto rounded-xl border border-[#406080]/30">
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
                  <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">Source</th>
                  <th className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#406080]/10">
                {leads.length === 0 && !loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-[#606080] font-fantasy">
                      No adventurers have completed the quest yet.
                    </td>
                  </tr>
                )}
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-[#204060]/10 transition-colors"
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
                    <td className="px-4 py-3 text-[#808080] hidden md:table-cell whitespace-nowrap text-xs">
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
                        className={`text-xs font-fantasy px-2 py-1 rounded border cursor-pointer transition-all ${
                          STATUS_COLORS[lead.status] || STATUS_COLORS["New"]
                        } ${updatingId === lead.id ? "opacity-50" : ""}`}
                        style={{ background: "transparent" }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-gray-900 text-[#e0e0e0]">
                            {s}
                          </option>
                        ))}
                      </select>
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
        {leads.length > 0 && (
          <div className="mt-6 sm:hidden space-y-3">
            {leads.map((lead) => (
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
                  <p className="text-[#606080]">{formatDate(lead.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
