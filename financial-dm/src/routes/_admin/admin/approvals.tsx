import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getApprovals, type ApprovalsSummary } from "~/server/approvals";

/**
 * The Approvals queue (Tavern Keeper's Morning spec, Section 6.3): one list
 * of everything waiting on John from every tool, grouped by type, blocking
 * items first. Every row links to the screen where the approval actually
 * happens. Nothing is approved here (Rule 2.3).
 */
export const Route = createFileRoute("/_admin/admin/approvals")({
  component: ApprovalsPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";

function ApprovalsPage() {
  const [data, setData] = useState<ApprovalsSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getApprovals().then(setData).catch((e) => setError(String(e)));
  }, []);
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-approvals-page>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>✅ Waiting on your approval</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Everything from every tool, in one list. Approving happens on each tool's own screen; this page just gets you there.</p>
        </div>
        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}
        {!data && !error && <p className="text-[#a0a0a0] text-sm font-fantasy">Checking every tool...</p>}
        {data && data.groups.length === 0 && (
          <section className={`${card} p-8 text-center`} data-approvals-empty>
            <h2 className="font-fantasy text-[#c08020] text-xl">Nothing waiting on you</h2>
            <p className="text-[#a0a0a0] text-sm font-fantasy mt-2">Drafted posts, Guild pieces, unconfirmed facts, and config reviews will show up here.</p>
          </section>
        )}
        {data && data.groups.length > 0 && (
          <p className="text-sm text-[#a0a0a0] font-fantasy" data-approvals-total>
            {data.total} item{data.total === 1 ? "" : "s"} across {data.groups.length} group{data.groups.length === 1 ? "" : "s"}{data.blocking ? `, ${data.blocking} blocking` : ""}.
          </p>
        )}
        {data?.groups.map((g) => (
          <section key={g.id} className={`${card} overflow-hidden ${g.blocking ? "border-[#c08020]/50" : ""}`} data-approval-group={g.id} data-blocking={g.blocking ? "true" : "false"}>
            <div className="px-4 py-3 border-b border-[#406080]/20 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-fantasy text-[#e0e0e0]">
                {g.blocking && <span className="mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-[#c08020] text-[#0d1520] font-bold" data-blocking-tag>Blocking</span>}
                {g.count} {g.type} <span className="text-[#606080] text-sm">· {g.tool}</span>
              </h2>
              <a href={g.href} className={`text-xs font-fantasy text-[#c08020] hover:underline underline-offset-2 rounded ${focus}`}>Open {g.tool} →</a>
            </div>
            <ul className="divide-y divide-[#406080]/10">
              {g.items.map((it, i) => (
                <li key={i}>
                  <a href={it.href} className={`flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-[#204060]/20 ${focus}`} data-approval-row>
                    <span className="min-w-0">
                      <span className="block text-[#e0e0e0] text-sm truncate">{it.label}</span>
                      {it.detail && <span className="block text-[#808080] text-xs truncate">{it.detail}</span>}
                    </span>
                    <span className="text-[#606080] text-xs shrink-0">Open →</span>
                  </a>
                </li>
              ))}
              {g.count > g.items.length && <li className="px-4 py-2 text-[11px] text-[#606080]">and {g.count - g.items.length} more on the {g.tool} screen</li>}
            </ul>
          </section>
        ))}
        {data && data.errors.length > 0 && (
          <p className="text-xs text-red-300 font-fantasy" data-approvals-errors>Could not check: {data.errors.join(", ")}. The rest of the list is complete.</p>
        )}
      </div>
    </main>
  );
}
