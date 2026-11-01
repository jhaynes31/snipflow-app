"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Btn, ErrorNote, useAction } from "@/core/ui";

/**
 * One tap to record that he applied (2026-11-01: John couldn't find where
 * to mark it). The same buttons appear on the job's page, in the Jobs
 * list, and in the Overview's "Did you apply?" card. A different day or a
 * note is on the job's page.
 */
export function QuickApplied({ jobId, onNotYet, compact }: { jobId: Id<"loJobs">; onNotYet?: boolean; compact?: boolean }) {
  const mark = useMutation(api.lookout.data.markApplied);
  const dismiss = useMutation(api.lookout.data.dismissApplyAsk);
  const { busy, error, run } = useAction();
  return (
    <div>
      <div className="sh-row sh-wrap">
        <Btn big={!compact} disabled={busy} onClick={() => void run(() => mark({ jobId, how: "email" }))}>Yes, I applied and got a confirmation</Btn>
        <Btn big={!compact} variant="secondary" disabled={busy} onClick={() => void run(() => mark({ jobId, how: "unsure" }))}>Yes, I applied (no confirmation yet)</Btn>
        {onNotYet && <Btn variant="ghost" disabled={busy} onClick={() => void run(() => dismiss({ jobId }))}>Not yet</Btn>}
      </div>
      <ErrorNote error={error} />
    </div>
  );
}

/** The employer's application page, opened in a new tab, remembered so the Lookout can ask afterwards. */
export function ApplyLink({ jobId, href, label = "Apply on their site", variant = "primary" }: { jobId: Id<"loJobs">; href: string; label?: string; variant?: "primary" | "secondary" }) {
  const opened = useMutation(api.lookout.data.noteApplyOpened);
  return (
    <a className={`sh-btn sh-btn-${variant}`} href={href} target="_blank" rel="noopener noreferrer" onClick={() => void opened({ jobId }).catch(() => undefined)}>
      {label}
    </a>
  );
}
