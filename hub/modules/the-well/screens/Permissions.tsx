"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_PERMISSIONS } from "@/core/well/permissions";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, useAction } from "@/core/ui";

function readPermissions(moduleSettings: Record<string, unknown> | undefined): string[] {
  const raw = (moduleSettings?.well as { permissions?: unknown } | undefined)?.permissions;
  return Array.isArray(raw) && raw.every((x) => typeof x === "string") ? (raw as string[]) : DEFAULT_PERMISSIONS;
}

/** Permissions: a page for hard days, in your own words. Each person edits their own. */
export function Permissions() {
  const { profile } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const saved = readPermissions(profile.moduleSettings);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(saved.join("\n"));
  const [done, setDone] = useState(false);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Permissions" subtitle="For the day you need to be told. Rewrite them in your own words whenever you like." />
      {!editing ? (
        <Card>
          <ul className="sh-list">
            {saved.map((p, i) => (
              <li key={i} className="well-did" style={{ padding: "0.4rem 0" }}>{p}</li>
            ))}
          </ul>
          <div className="sh-row mt-3">
            <Btn variant="secondary" onClick={() => { setText(saved.join("\n")); setEditing(true); }}>Edit in my words</Btn>
            {done && <Note>Saved.</Note>}
          </div>
        </Card>
      ) : (
        <Card>
          <textarea className="sh-input sh-textarea" rows={12} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} aria-label="Permissions, one per line" />
          <p className="sh-hint">One per line.</p>
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
                  const well = (profile.moduleSettings?.well as Record<string, unknown> | undefined) ?? {};
                  await setModuleSettings({ moduleId: "well", settings: { ...well, permissions: lines } });
                  setEditing(false);
                  setDone(true);
                  setTimeout(() => setDone(false), 1800);
                })
              }
            >
              Save
            </Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn variant="ghost" onClick={() => setText(DEFAULT_PERMISSIONS.join("\n"))}>Start over from the defaults</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
