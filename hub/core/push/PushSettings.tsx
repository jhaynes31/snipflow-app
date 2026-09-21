"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Btn, ErrorNote, Field, Toggle, useAction } from "@/core/ui";
import { usePush } from "./usePush";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => (h === 0 ? "Midnight" : h === 12 ? "Noon" : h < 12 ? `${h} am` : `${h - 12} pm`);

/** Settings: notifications on this device, quiet hours, and the devices list. */
export function PushSettings() {
  const { profile, partner } = useHub();
  const push = usePush();
  const updateReminders = useMutation(api.profiles.updateReminders);
  const { busy, error, run, setError } = useAction();
  const r = profile.reminders;
  const partnerName = partner?.displayName ?? "your partner";

  async function turnOn() {
    const result = await push.enable();
    if (result === "denied") setError("This browser has notifications blocked for The Shire. Allow them in the browser's site settings, then try again.");
    else if (result === "unsupported") setError("This browser can't show notifications from a website. On an iPhone, add The Shire to the Home Screen first, then turn this on from the installed app.");
    else if (result === "notReady") setError("The server's notification keys aren't in place yet. Try again after the next deploy.");
  }

  return (
    <div className="sh-stack-sm">
      <p className="sh-hint">
        A short notification when {partnerName} does something that involves you: a heads-up, an ask or a word in Kept Word, a repair invite, a season together. Never anything private, never a reminder to do more.
      </p>
      {!push.ready ? (
        <p className="sh-muted">Checking this device…</p>
      ) : push.onThisDevice ? (
        <div className="sh-choices">
          <span>On for this device.</span>
          <Btn variant="ghost" disabled={busy} onClick={() => void run(() => push.disable())}>Turn off here</Btn>
        </div>
      ) : (
        <Btn disabled={busy || !push.supported} onClick={() => void run(turnOn)}>Turn on for this device</Btn>
      )}
      {push.ready && !push.supported && (
        <p className="sh-muted">This browser can&apos;t show notifications from a website. On an iPhone, add The Shire to the Home Screen first, then open it from there.</p>
      )}
      <ErrorNote error={error} />
      {push.devices.length > 0 && (
        <>
          <Toggle
            checked={r.pushEnabled}
            onChange={(v) => void run(() => updateReminders({ pushEnabled: v }))}
            label="Notifications on"
            hint="Off pauses every device without removing them."
          />
          <div className="sh-row" style={{ gap: "0.6rem", flexWrap: "wrap" }}>
            <Field label="Quiet from" hint="Only an urgent heads-up gets through during quiet hours.">
              <select className="sh-input" value={r.quietHoursStart ?? ""} onChange={(e) => void run(() => updateReminders({ quietHoursStart: e.target.value === "" ? null : Number(e.target.value) }))}>
                <option value="">No quiet hours</option>
                {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </Field>
            <Field label="Until">
              <select className="sh-input" value={r.quietHoursEnd ?? ""} onChange={(e) => void run(() => updateReminders({ quietHoursEnd: e.target.value === "" ? null : Number(e.target.value) }))}>
                <option value="">—</option>
                {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </Field>
          </div>
          <ul className="sh-list">
            {push.devices.map((d) => (
              <li key={d._id} className="sh-row">
                <span>{d.label}{d.endpoint === push.endpoint ? " (this device)" : ""}</span>
                <Btn variant="ghost" disabled={busy} onClick={() => void run(() => (d.endpoint === push.endpoint ? push.disable() : push.removeDevice(d.endpoint)))}>Remove</Btn>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
