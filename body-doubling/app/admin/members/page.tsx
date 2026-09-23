"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminGate } from "@/components/AdminGate";
import { Card, ErrorNote, useRun } from "@/components/ui";

export default function Page() {
  return (
    <AdminGate>
      <Members />
    </AdminGate>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "pill-good" },
  pastDue: { label: "Payment issue", cls: "pill-warn" },
  canceled: { label: "Canceled", cls: "" },
  none: { label: "Not joined", cls: "" },
};

function Members() {
  const members = useQuery(api.admin.members);
  const update = useMutation(api.admin.updateMember);
  const { busy, error, run } = useRun();

  if (members === undefined) return <p className="muted">Loading…</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Members</h1>
      <ErrorNote error={error} />
      {members.length === 0 ? (
        <Card className="muted">No members yet.</Card>
      ) : (
        <div className="card scroll-x p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Membership</th>
                <th>Hours left</th>
                <th>Missed</th>
                <th>Sliding scale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id}>
                  <td>
                    <b>{m.name}</b>
                    <div className="muted text-xs">{m.email}</div>
                  </td>
                  <td>
                    <span className={`pill ${STATUS[m.membership].cls}`}>{STATUS[m.membership].label}</span>
                  </td>
                  <td>
                    {m.includedLeft} included
                    {m.extraHours > 0 && <div className="muted text-xs">+ {m.extraHours} extra</div>}
                  </td>
                  <td>
                    {m.noShowCount === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className="pill pill-warn">
                        {m.noShowCount} {m.priorityPaused && "· waitlist-last"}
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Sliding scale for ${m.name}`}
                      checked={m.scholarship}
                      disabled={busy}
                      onChange={(e) => run(() => update({ memberId: m._id, scholarship: e.target.checked }))}
                    />
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    {m.noShowCount > 0 && (
                      <button className="btn btn-quiet btn-small" disabled={busy} onClick={() => run(() => update({ memberId: m._id, resetNoShows: true }))}>
                        Reset misses
                      </button>
                    )}
                    <button
                      className="btn btn-quiet btn-small"
                      disabled={busy}
                      onClick={() => {
                        const raw = window.prompt(`Give ${m.name} extra hours (use a negative number to take some back):`, "4");
                        const n = Number(raw);
                        if (raw && Number.isFinite(n) && n !== 0) void run(() => update({ memberId: m._id, addExtraHours: n }));
                      }}
                    >
                      ± Hours
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
