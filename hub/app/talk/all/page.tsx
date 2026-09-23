"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CoachChat } from "@/core/coach/CoachChat";
import { MODULE_NAMES } from "@/core/modules/names";
import { Btn, Card, ErrorNote, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * All my conversations (2026-09-23, after Jen couldn't find a Re-Centered
 * chat): every coach conversation this person has had, from every place,
 * grouped by where it happened. Open one to keep talking in the same voice;
 * delete one or all. They live in The Shire's database, private to the
 * person, and never reach the partner.
 */
const DEFAULT_TASK: Record<string, string> = {
  hub: "hub.talk",
  tend: "tend.talkItOut",
  "re-centered": "reCentered.talk",
  apothecary: "apothecary.ask",
  orchard: "orchard.compass",
  metamorphosis: "metamorphosis.mentor",
  hearth: "hearth.mother",
  "the-well": "well.passage",
  "renewed-mind": "renewedMind.steps",
  crossroads: "crossroads.guide",
};

const PLACE_NAME: Record<string, string> = { ...MODULE_NAMES, hub: "Talk it through", "re-centered": "Re-Centered" };

export default function AllConversationsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <All />
    </Suspense>
  );
}

function All() {
  const params = useSearchParams();
  const open = params.get("open") as Id<"coachConversations"> | null;
  const list = useQuery(api.coach.conversations.mine, {});
  const remove = useMutation(api.coach.conversations.remove);
  const removeAll = useMutation(api.coach.conversations.removeAll);
  const { busy, error, run } = useAction();
  if (!list) return <Spinner />;

  if (open) {
    const row = list.find((c) => c._id === open);
    const moduleId = row?.module ?? "hub";
    const task = row?.task ?? DEFAULT_TASK[moduleId] ?? "hub.talk";
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title={PLACE_NAME[moduleId] ?? moduleId} subtitle={row ? `Started ${timeAgo(row.createdAt)}. Keep going, or start fresh below.` : "That conversation isn't here any more."} action={<Link href="/talk/all" className="sh-btn sh-btn-secondary">All conversations</Link>} />
        <CoachChat key={open} module={moduleId} task={task} initialId={row ? open : null} />
      </div>
    );
  }

  const rows = list.filter((c) => c.count > 0);
  const groups = new Map<string, typeof rows>();
  for (const c of rows) groups.set(c.module, [...(groups.get(c.module) ?? []), c]);

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="All my conversations" subtitle="Every chat with the coach, from every place in The Shire. Saved here, private to you, never shown to your partner." />
      <ErrorNote error={error} />
      {rows.length === 0 ? (
        <Card><p className="sh-muted">Nothing yet. Every conversation you have with the coach, anywhere, will show up here.</p></Card>
      ) : (
        [...groups.entries()].map(([moduleId, items]) => (
          <Card key={moduleId}>
            <h2 className="sh-h3">{PLACE_NAME[moduleId] ?? moduleId}</h2>
            <ul className="sh-list">
              {items.map((c) => (
                <li key={c._id} className="sh-row sh-wrap">
                  <Link href={`/talk/all?open=${c._id}`} className="sh-link">{c.firstLine || "Empty conversation"}</Link>
                  <span className="sh-muted">{timeAgo(c.updatedAt)} · {Math.ceil(c.count / 2)} {c.count > 2 ? "exchanges" : "exchange"}</span>
                  <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Delete this conversation? It can't be brought back.")) void run(() => remove({ id: c._id })); }}>Delete</Btn>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
      {rows.length > 0 && (
        <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Delete every conversation you've had with the coach? Nothing is kept.")) void run(() => removeAll({})); }}>
          Delete all of my conversations
        </Btn>
      )}
      <p className="sh-muted">Where they live: in The Shire&apos;s own database, under your account only. Opening one here continues it in the same voice it started in.</p>
    </div>
  );
}
