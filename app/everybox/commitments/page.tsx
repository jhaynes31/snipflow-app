"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CommitmentCard } from "@/components/everybox/CommitmentCard";
import { partnerName, useEveryBox } from "@/components/everybox/context";
import { Btn, ErrorNote, Field, PageTitle, Spinner, useAction } from "@/components/everybox/ui";
import { useNow } from "@/components/everybox/useNow";

export default function CommitmentsPage() {
  const { partner, partners, other } = useEveryBox();
  const now = useNow();
  const data = useQuery(api.everybox.commitments.list);
  const propose = useMutation(api.everybox.commitments.propose);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<Id<"ebPartners">>(partner._id);
  const [window, setWindow] = useState<string>("");
  const { busy, error, run } = useAction();

  if (!data) return <Spinner />;

  const forMe = data.open.filter((c) => c.status === "proposed" && c.assignedTo === partner._id);
  const forOther = data.open.filter((c) => c.status === "proposed" && c.assignedTo !== partner._id);
  const active = data.open.filter((c) => c.status === "active" || c.status === "agreed");

  return (
    <div className="eb-container max-w-2xl">
      <PageTitle
        title="Commitments"
        subtitle="Finishable things, unlike the recurring boxes. Either of you can propose one; it only starts once the person it's for agrees."
        action={!open && <Btn onClick={() => setOpen(true)}>Propose one</Btn>}
      />

      {open && (
        <form
          className="eb-card mb-6 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await propose({
                title,
                assignedTo,
                targetWindowDays: window ? Number(window) : undefined,
              });
              setTitle("");
              setWindow("");
              setOpen(false);
            });
          }}
        >
          <Field label="What is it?">
            <input
              className="eb-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book the dentist, fix the gate, plan the trip…"
              required
              maxLength={120}
              autoFocus
            />
          </Field>
          <Field label="Who's it for?" hint={other ? undefined : "Once your partner joins, you'll be able to propose things for them too."}>
            <div className="flex flex-wrap gap-2">
              {partners.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="eb-chip"
                  style={assignedTo === p._id ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
                  onClick={() => setAssignedTo(p._id)}
                  aria-pressed={assignedTo === p._id}
                >
                  {p._id === partner._id ? `${p.displayName} (me)` : p.displayName}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Rough target window" hint="Optional. It sets how quickly the item starts to wilt without a check-in. Not a deadline.">
            <select className="eb-select w-auto" value={window} onChange={(e) => setWindow(e.target.value)}>
              <option value="">No particular window</option>
              <option value="3">A few days</option>
              <option value="7">About a week</option>
              <option value="14">A couple of weeks</option>
              <option value="30">About a month</option>
            </select>
          </Field>
          <ErrorNote error={error} />
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={busy || !title.trim()}>
              {assignedTo === partner._id ? "Commit" : `Propose to ${partnerName(partners, assignedTo)}`}
            </Btn>
          </div>
        </form>
      )}

      {forMe.length > 0 && (
        <Section title="Waiting for you to agree">
          {forMe.map((c) => (
            <CommitmentCard key={c._id} commitment={c} now={now} />
          ))}
        </Section>
      )}
      {forOther.length > 0 && (
        <Section title={`Waiting for ${other?.displayName ?? "your partner"}`}>
          {forOther.map((c) => (
            <CommitmentCard key={c._id} commitment={c} now={now} />
          ))}
        </Section>
      )}
      <Section title="In progress">
        {active.length === 0 ? (
          <p className="text-sm eb-muted">Nothing in progress. That&apos;s allowed.</p>
        ) : (
          active.map((c) => <CommitmentCard key={c._id} commitment={c} now={now} />)
        )}
      </Section>

      {data.done.length > 0 && (
        <details className="eb-archive mt-8">
          <summary>Completed ({data.done.length}) — kept for memory, not for keeping score</summary>
          <ul className="mt-3 grid gap-2">
            {data.done.map((c) => (
              <li key={c._id} className="eb-card-alt flex items-center gap-3 text-sm">
                <span aria-hidden>✓</span>
                <span className="flex-1">{c.title}</span>
                <span className="eb-muted">
                  {c.doneAt ? new Date(c.doneAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}
