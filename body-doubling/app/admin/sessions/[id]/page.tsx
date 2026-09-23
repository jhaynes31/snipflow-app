"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/convex/rules";
import { AdminGate } from "@/components/AdminGate";
import { SessionForm } from "@/components/SessionForm";
import { BlockStrip, Card, ErrorNote, formatWhen, useRun } from "@/components/ui";

export default function Page() {
  return (
    <AdminGate>
      <Roster />
    </AdminGate>
  );
}

const PAID: Record<string, string> = {
  included: "Included hrs",
  extra: "Extra hrs",
  mixed: "Included + extra",
  dropIn: "Drop-in",
  scholarship: "Comped",
};

function Roster() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id as Id<"sessions">;
  const data = useQuery(api.admin.roster, { sessionId });
  const mark = useMutation(api.admin.markAttendance);
  const remove = useMutation(api.admin.removeBooking);
  const setStatus = useMutation(api.admin.setSessionStatus);
  const cancelSession = useMutation(api.sessions.cancel);
  const update = useMutation(api.sessions.update);
  const { busy, error, run } = useRun();
  const [editing, setEditing] = useState(false);
  const [refunds, setRefunds] = useState<{ name: string; email: string; amountCents: number }[] | null>(null);

  if (data === undefined) return <p className="muted">Loading…</p>;
  if (data === null) return <p>Session not found.</p>;
  const { session, seats, seated, waitlist } = data;

  return (
    <div className="space-y-5">
      <Link href="/admin" className="link text-sm">← Sessions</Link>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{session.title}</h1>
        <p className="muted">
          {formatWhen(session.startsAt)} · {session.hours} hours {session.gameTitle && `· 🎮 ${session.gameTitle}`}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-sm">
          <span className="pill">Members {seats.membersTaken}/{seats.memberSlots}</span>
          <span className="pill">Drop-ins {seats.dropInsTaken}/{seats.dropInSlots}</span>
          {session.status !== "scheduled" && <span className="pill pill-warn">{session.status}</span>}
        </div>
      </div>
      <BlockStrip blocks={session.blocks} />

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Who&apos;s coming · goals &amp; attendance</h2>
        {seated.length === 0 ? (
          <Card className="muted">No one yet.</Card>
        ) : (
          <div className="grid gap-2">
            {seated.map((p) => (
              <Card key={p._id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{p.name}</b>
                  <span className="pill">{p.kind === "member" ? "Member" : "Drop-in"}</span>
                  {p.paymentType && <span className="pill">{PAID[p.paymentType]}</span>}
                  {p.status === "pendingPayment" && <span className="pill pill-warn">Paying now…</span>}
                  {p.noShowCount > 0 && <span className="pill pill-warn">⚑ {p.noShowCount} missed</span>}
                  {p.priorityPaused && <span className="pill pill-warn">Waitlist-last</span>}
                  {p.scholarship && <span className="pill">Sliding scale</span>}
                  {p.blockIndexes && (
                    <span className="pill">Blocks: {p.blockIndexes.map((i) => session.blocks[i]?.category).join(", ")}</span>
                  )}
                </div>
                {p.goals.some((g) => g.goal) ? (
                  <ul className="text-sm">
                    {p.goals.filter((g) => g.goal).map((g) => (
                      <li key={g.blockIndex}>
                        <b>{g.category}:</b> {g.goal}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted text-sm">No goals yet.</p>
                )}
                {p.status === "confirmed" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {(["attended", "noShow", "unmarked"] as const).map((a) => (
                      <button
                        key={a}
                        className={`btn btn-small ${p.attendance === a ? "" : "btn-quiet"}`}
                        disabled={busy}
                        onClick={() => run(() => mark({ bookingId: p._id, attendance: a }))}
                      >
                        {a === "attended" ? "✓ Here" : a === "noShow" ? "Missed" : "Not marked"}
                      </button>
                    ))}
                    <button
                      className="link ml-auto text-sm"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Remove ${p.name} from this session?${p.kind === "member" ? " Their hours go back." : " Refund any payment in Stripe."}`)) {
                          void run(() => remove({ bookingId: p._id }));
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {waitlist.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Waitlist</h2>
          <ol className="card list-decimal space-y-1 pl-10 text-sm">
            {waitlist.map((p) => (
              <li key={p._id}>
                {p.name} {p.priorityPaused && <span className="pill pill-warn">waitlist-last</span>}
              </li>
            ))}
          </ol>
          <p className="muted text-sm">When a member seat opens, the first person with enough hours is seated automatically.</p>
        </section>
      )}

      <CompSeat sessionId={sessionId} />

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Session</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-quiet" onClick={() => setEditing(!editing)}>
            {editing ? "Close editor" : "Edit details"}
          </button>
          {session.status === "scheduled" ? (
            <button className="btn btn-quiet" disabled={busy} onClick={() => run(() => setStatus({ sessionId, status: "completed" }))}>
              Mark as done
            </button>
          ) : session.status === "completed" ? (
            <button className="btn btn-quiet" disabled={busy} onClick={() => run(() => setStatus({ sessionId, status: "scheduled" }))}>
              Reopen
            </button>
          ) : null}
          {session.status === "scheduled" && (
            <button
              className="btn btn-quiet"
              style={{ color: "var(--bad)" }}
              disabled={busy}
              onClick={() => {
                if (window.confirm("Cancel the whole session? Members get their hours back.")) {
                  void run(async () => setRefunds((await cancelSession({ sessionId })).dropInsToRefund));
                }
              }}
            >
              Cancel session
            </button>
          )}
        </div>
        {refunds && refunds.length > 0 && (
          <Card className="text-sm">
            <b>Refund these drop-ins in Stripe:</b>
            <ul>
              {refunds.map((r, i) => (
                <li key={i}>
                  {r.name} ({r.email}) — {formatMoney(r.amountCents)}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {editing && (
          <Card>
            <SessionForm
              initial={session}
              submitLabel="Save changes"
              onSubmit={async (s) => {
                await update({ sessionId, ...s });
                setEditing(false);
              }}
            />
          </Card>
        )}
        <ErrorNote error={error} />
      </section>
    </div>
  );
}

function CompSeat({ sessionId }: { sessionId: Id<"sessions"> }) {
  const members = useQuery(api.admin.members);
  const comp = useMutation(api.admin.compSeat);
  const [memberId, setMemberId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const { busy, error, run } = useRun();
  return (
    <details className="card">
      <summary className="cursor-pointer font-bold">Comp a seat (sliding scale)</summary>
      <p className="muted mt-1 text-sm">Only hosts see this. The seat is free and uses one member seat.</p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const token = await comp(
              memberId ? { sessionId, memberId: memberId as Id<"members"> } : { sessionId, guestName, guestEmail: guestEmail || undefined },
            );
            setLink(token ? `${window.location.origin}/drop-in/${token}` : null);
            setMemberId("");
            setGuestName("");
            setGuestEmail("");
          });
        }}
      >
        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">A guest (not a member)…</option>
          {members?.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name} {m.scholarship ? "· sliding scale" : ""}
            </option>
          ))}
        </select>
        {!memberId && (
          <>
            <input className="input" placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
            <input className="input" placeholder="Guest email (optional)" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
          </>
        )}
        <button className="btn sm:col-span-3" disabled={busy}>
          Seat them
        </button>
      </form>
      {link && (
        <p className="mt-2 text-sm">
          Send the guest their private link: <code className="break-all">{link}</code>
        </p>
      )}
      <ErrorNote error={error} />
    </details>
  );
}
