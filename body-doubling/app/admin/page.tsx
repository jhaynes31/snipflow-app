"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminGate } from "@/components/AdminGate";
import { SessionForm } from "@/components/SessionForm";
import { Card, formatWhen } from "@/components/ui";

export default function AdminPage() {
  return (
    <AdminGate>
      <Sessions />
    </AdminGate>
  );
}

function Sessions() {
  const [showPast, setShowPast] = useState(false);
  const [creating, setCreating] = useState(false);
  const sessions = useQuery(api.admin.sessions, { includePast: showPast });
  const create = useMutation(api.sessions.create);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <button className="btn" onClick={() => setCreating(!creating)}>
          {creating ? "Close" : "+ New session"}
        </button>
      </div>

      {creating && (
        <Card>
          <SessionForm
            submitLabel="Publish session"
            onSubmit={async (s) => {
              await create(s);
              setCreating(false);
            }}
          />
        </Card>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show the last 30 days too
      </label>

      {sessions === undefined ? (
        <p className="muted">Loading…</p>
      ) : sessions.length === 0 ? (
        <Card className="muted">No sessions yet. Make the first one!</Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <Link key={s._id} href={`/admin/sessions/${s._id}`} className="card block space-y-2 hover:shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-lg">{s.title}</b>
                <span className="muted text-sm">{formatWhen(s.startsAt)}</span>
                {s.status !== "scheduled" && <span className="pill">{s.status === "completed" ? "Done" : "Canceled"}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="pill">
                  👥 {s.headcount}/{s.capacity} seated
                </span>
                <span className="pill">
                  Members {s.seats.membersTaken}/{s.seats.memberSlots}
                </span>
                <span className="pill">
                  Drop-ins {s.seats.dropInsTaken}/{s.seats.dropInSlots}
                </span>
                {s.seats.waitlisted > 0 && <span className="pill pill-warn">⏳ {s.seats.waitlisted} waiting</span>}
                {s.noShowFlags > 0 && <span className="pill pill-warn">⚑ {s.noShowFlags} with past misses</span>}
                <span className={`pill ${s.goalsIn === s.headcount && s.headcount > 0 ? "pill-good" : ""}`}>
                  ✍️ Goals {s.goalsIn}/{s.headcount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
