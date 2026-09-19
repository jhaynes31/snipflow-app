"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";

/** Money worries, said once. Private unless shared. */
export function Worries() {
  const { partner } = useHub();
  const data = useQuery(api.storehouse.money.worries);
  const add = useMutation(api.storehouse.money.addWorry);
  const share = useMutation(api.storehouse.money.shareWorry);
  const remove = useMutation(api.storehouse.money.removeWorry);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [shared, setShared] = useState(false);
  const name = partner?.displayName ?? "your partner";
  if (!data) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Worries" subtitle="A money worry, said once, so it gets out of your head without becoming a fight. Private unless you share it." />
      <Card>
        <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} aria-label="The worry" placeholder="What's sitting on your chest about money." />
        <CrisisNotice texts={[text]} />
        <Toggle checked={shared} onChange={setShared} label={`${name} can see this one`} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await add({ text, share: shared }); setText(""); })}>Said</Btn>
      </Card>
      {data.mine.length > 0 && (
        <Card>
          <h2 className="sh-h2">Mine</h2>
          {data.mine.map((w) => (
            <div key={w._id} className="st-entry">
              <p style={{ whiteSpace: "pre-wrap" }}>{w.text}</p>
              <p className="sh-hint">{timeAgo(w.createdAt)} · {w.visibility === "shared" ? "shared" : "private"} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => share({ id: w._id, share: w.visibility !== "shared" }))}>{w.visibility === "shared" ? "Make private" : "Share"}</button> ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: w._id }))}>Delete</button>
              </p>
            </div>
          ))}
        </Card>
      )}
      {data.theirs.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">{name} shared</h2>
          {data.theirs.map((w) => <p key={w._id} className="st-entry" style={{ whiteSpace: "pre-wrap" }}>{w.text} <span className="sh-hint">· {timeAgo(w.createdAt)}</span></p>)}
        </Card>
      )}
    </div>
  );
}
