"use client";

import { useEffect, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { KIND_LABEL, SHELF } from "@/core/metamorphosis/fieldGuide";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * The Field Guide: outside voices for the road. A starting shelf chosen by
 * Jen, new pieces pulled daily from Art of Manliness and ADDitude, his own
 * finds, and a way to pin any of them beside a quest. Everything links out;
 * nothing is copied in. Every row here is his and private.
 */
export function FieldGuide() {
  const fresh = useQuery(api.metamorphosis.resources.fresh);
  const mine = useQuery(api.metamorphosis.resources.mine);
  const quests = useQuery(api.metamorphosis.tools.quests);
  const add = useMutation(api.metamorphosis.resources.add);
  const pin = useMutation(api.metamorphosis.resources.pin);
  const remove = useMutation(api.metamorphosis.resources.remove);
  const refresh = useConvexAction(api.metamorphosis.feeds.refresh);
  const { busy, error, run } = useAction();
  // Opening the page asks for today's headlines; the server only fetches when its list is a day old.
  // Starts as "busy" because the ask goes out as the page mounts.
  const [refreshing, setRefreshing] = useState<"busy" | "done">("busy");
  useEffect(() => {
    let live = true;
    refresh({}).catch(() => undefined).finally(() => { if (live) setRefreshing("done"); });
    return () => { live = false; };
  }, [refresh]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  if (!fresh || !mine || !quests) return <Spinner />;

  const kept = new Set(mine.map((r) => r.url));
  const active = quests.filter((q) => q.status === "active");
  const questName = (id: Doc<"mmResources">["questId"]) => active.find((q) => q._id === id)?.title ?? null;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Field Guide" subtitle="Outside voices for the road: men who have walked it, and people who understand a brain like yours. Everything here opens on their own site." />

      <Card>
        <h2 className="sh-h2">New this week</h2>
        {fresh.length === 0 && <p className="sh-muted">{refreshing === "busy" ? "Looking for new pieces…" : "Nothing pulled in yet. The feeds are checked once a day; the shelf below is always here."}</p>}
        {fresh.map((item) => (
          <div key={item._id} className="mm-entry">
            <p>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="sh-link"><strong>{item.title}</strong></a>
              <span className="sh-muted"> · {item.feedName}{item.publishedAt ? `, ${timeAgo(item.publishedAt)}` : ""}</span>
            </p>
            {item.teaser && <p className="sh-muted">{item.teaser}</p>}
            {kept.has(item.url) ? (
              <p className="sh-muted">On your shelf.</p>
            ) : (
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => add({ title: item.title, url: item.url, source: "feed" }))}>Keep this</Btn>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="sh-h2">My shelf</h2>
        {mine.length === 0 && <p className="sh-muted">Nothing kept yet. &ldquo;Keep this&rdquo; above, or add your own below.</p>}
        {mine.map((r) => (
          <div key={r._id} className="mm-entry">
            <p>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="sh-link"><strong>{r.title}</strong></a>
              {r.note ? <span className="sh-muted"> · {r.note}</span> : null}
              {r.questId && questName(r.questId) ? <span className="sh-muted"> · beside &ldquo;{questName(r.questId)}&rdquo;</span> : null}
            </p>
            <div className="sh-choices">
              {active.length > 0 && (
                <select className="sh-input" value={r.questId ?? ""} onChange={(e) => void run(() => pin({ id: r._id, questId: e.target.value ? (e.target.value as Doc<"mmQuests">["_id"]) : undefined }))} aria-label="Pin beside a quest">
                  <option value="">Not pinned to a quest</option>
                  {active.map((q) => <option key={q._id} value={q._id}>Beside: {q.title}</option>)}
                </select>
              )}
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Take it off</Btn>
            </div>
          </div>
        ))}
        <ErrorNote error={error} />
      </Card>

      <Card>
        <h2 className="sh-h2">Add your own</h2>
        <Field label="Title"><input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
        <Field label="Web address" hint="Paste the link. It opens on their site; nothing is copied here.">
          <input className="sh-input" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} inputMode="url" />
        </Field>
        <Field label="Why it's here (optional)"><input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
        <Btn disabled={busy || !title.trim() || !url.trim()} onClick={() => void run(async () => { await add({ title, url, note: note || undefined, source: "own" }); setTitle(""); setUrl(""); setNote(""); })}>Put it on the shelf</Btn>
      </Card>

      <Card tone="alt">
        <h2 className="sh-h2">The starting shelf</h2>
        <p className="sh-muted">Chosen for you before you got here. Take what helps, leave the rest.</p>
        {SHELF.map((s) => (
          <div key={s.url} className="mm-entry">
            <p>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="sh-link"><strong>{s.title}</strong></a>
              <span className="sh-muted"> · {KIND_LABEL[s.kind]}</span>
            </p>
            <p>{s.why}</p>
            <p className="sh-muted">Helps with: {s.helps}.</p>
            {!kept.has(s.url) && (
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => add({ title: s.title, url: s.url, note: s.helps, source: "own" }))}>Keep this</Btn>
            )}
          </div>
        ))}
      </Card>

      <Note>
        The feeds bring in titles, links and a line or two, once a day, from Art of Manliness and ADDitude. No article is stored
        here; each opens where it was written. What you keep is yours and private, like everything else in this room. The
        mentor can see the titles on your shelf, so it can point to one by name instead of making one up.
      </Note>
    </div>
  );
}
