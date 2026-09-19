"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, PageTitle, useAction } from "@/core/ui";

/** My pages: everything in the room as plain text, for him to keep or hand to a therapist. */
export function Export() {
  const text = useQuery(api.metamorphosis.entries.exportMine);
  const release = useMutation(api.rooms.release);
  const { busy, error, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My pages" subtitle="Everything in this room, as plain text. Yours to keep anywhere, or to hand to a therapist. A share link with an expiry is coming in a later build." />
      <Card>
        <Btn
          disabled={!text}
          onClick={() => {
            if (!text) return;
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "metamorphosis.txt";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download my pages
        </Btn>
        {text && <pre className="sh-muted mt-3" style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{text.slice(0, 1500)}{text.length > 1500 ? "\n…" : ""}</pre>}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">Give the room back</h2>
        <p className="sh-muted">Removes your claim and deletes everything you wrote in here, so whoever claims it next starts clean. Download your pages first if you want to keep them. This cannot be undone.</p>
        <ErrorNote error={error} />
        {!confirming ? (
          <Btn variant="ghost" onClick={() => setConfirming(true)}>Release this room</Btn>
        ) : (
          <div className="sh-choices">
            <Btn variant="accent" disabled={busy} onClick={() => void run(async () => { await release({ moduleId: "metamorphosis", confirm: "release" }); window.location.assign("/"); })}>Yes, release it and delete my entries</Btn>
            <Btn variant="ghost" onClick={() => setConfirming(false)}>Keep it</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
