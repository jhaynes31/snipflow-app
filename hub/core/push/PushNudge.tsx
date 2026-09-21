"use client";

import Link from "next/link";
import { useState } from "react";
import { useHub } from "@/core/shell/HubContext";
import { Btn, ErrorNote, useAction } from "@/core/ui";
import { usePush } from "./usePush";

const KEY = "shire:pushNudge";

/**
 * One quiet line on the home screen until notifications are on for this
 * device, or dismissed. Shown once per device; never nags.
 */
export function PushNudge() {
  const { partner } = useHub();
  const push = usePush();
  const { busy, error, run, setError } = useAction();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return true;
    }
  });
  if (dismissed || !push.ready || !push.supported || !push.serverReady || push.onThisDevice || push.permission === "denied") return null;
  const partnerName = partner?.displayName ?? "your partner";

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="sh-card sh-nudge" role="status">
      <span>Get a notification here when {partnerName} does something that involves you?</span>
      <span className="sh-choices">
        <Btn disabled={busy} onClick={() => void run(async () => { const r = await push.enable(); if (r === "denied") setError("Notifications are blocked in this browser."); else if (r === "on") dismiss(); })}>Turn on</Btn>
        <Btn variant="ghost" onClick={dismiss}>Not now</Btn>
      </span>
      <ErrorNote error={error} />
      <span className="sh-muted" style={{ fontSize: "0.85rem" }}>You can change this any time in <Link href="/settings" className="sh-link">Settings</Link>.</span>
    </div>
  );
}
