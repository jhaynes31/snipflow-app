"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AFTER_DAYS_CHOICES } from "@/convex/everyBox/remindersPure";
import { useHub } from "@/core/shell/HubContext";
import { ErrorNote, useAction } from "./ui";

export const HOURS = Array.from({ length: 24 }, (_, h) => h);
export function hourLabel(h: number): string {
  const d = new Date(2000, 0, 1, h);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

type Reminder = Doc<"ebReminders">;
type Channels = Reminder["channels"];

/**
 * The controls for one box's reminder: on or off, after how many days,
 * at what hour, by which ways, once or every day. Used on the box page and
 * in the reminders list. Saves on every change.
 */
export function ReminderControls({ categoryId, cadenceDays, reminder, busy, onChange }: { categoryId: Id<"ebCategories">; cadenceDays: number; reminder: Reminder | undefined; busy: boolean; onChange: (args: { categoryId: Id<"ebCategories">; enabled: boolean; afterDays?: number; hour?: number; everyDay?: boolean; channels?: Channels }) => void }) {
  const { profile } = useHub();
  const status = useQuery(api.push.channelStatus.status);
  const on = !!reminder;
  const ch: Channels = reminder?.channels ?? { push: true, email: false, text: false };
  const afterDays = reminder?.afterDays ?? Math.max(1, cadenceDays);
  const hour = reminder?.hour ?? 9;
  const everyDay = reminder?.everyDay ?? true;
  const setCh = (patch: Partial<Channels>) => onChange({ categoryId, enabled: true, channels: { ...ch, ...patch } });
  const pushOff = ch.push && !profile.reminders.pushEnabled;
  return (
    <div className="eb-remind">
      <label className="eb-remind-row">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => onChange({ categoryId, enabled: e.target.checked })} />
        <span>Remind me when this hasn&apos;t been done in</span>
        <select value={AFTER_DAYS_CHOICES.includes(afterDays) ? afterDays : "custom"} disabled={busy || !on} onChange={(e) => e.target.value !== "custom" && onChange({ categoryId, enabled: true, afterDays: Number(e.target.value) })} aria-label="Days before a reminder">
          {AFTER_DAYS_CHOICES.map((d) => <option key={d} value={d}>{d} day{d === 1 ? "" : "s"}</option>)}
          {!AFTER_DAYS_CHOICES.includes(afterDays) && <option value="custom">{afterDays} days</option>}
        </select>
        <span>at</span>
        <select value={hour} disabled={busy || !on} onChange={(e) => onChange({ categoryId, enabled: true, hour: Number(e.target.value) })} aria-label="Hour of the reminder">
          {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
      </label>
      {on && (
        <>
          <div className="eb-remind-row">
            <span className="text-sm eb-muted">Send it by:</span>
            <label><input type="checkbox" checked={ch.push} disabled={busy} onChange={(e) => setCh({ push: e.target.checked })} /> Phone or computer notification</label>
            <label><input type="checkbox" checked={ch.email} disabled={busy} onChange={(e) => setCh({ email: e.target.checked })} /> Email</label>
            <label><input type="checkbox" checked={ch.text} disabled={busy} onChange={(e) => setCh({ text: e.target.checked })} /> Text</label>
          </div>
          <div className="eb-remind-row">
            <label><input type="radio" name={`every-${categoryId}`} checked={everyDay} disabled={busy} onChange={() => onChange({ categoryId, enabled: true, everyDay: true })} /> Every day until it&apos;s done</label>
            <label><input type="radio" name={`every-${categoryId}`} checked={!everyDay} disabled={busy} onChange={() => onChange({ categoryId, enabled: true, everyDay: false })} /> Once, then let it be</label>
          </div>
          {pushOff && <p className="text-xs eb-muted">Notifications are off for your devices. Turn them on under <Link href="/settings" className="underline">Settings, Reaching you</Link> or the notification won&apos;t arrive.</p>}
          {ch.email && status && !status.email && <p className="text-xs eb-muted">Email isn&apos;t connected yet. <Link href="/notifications" className="underline">How to connect it</Link>.</p>}
          {ch.text && (!profile.reminders.phone || (status && !status.text)) && <p className="text-xs eb-muted">{!profile.reminders.phone ? "Add your phone number under " : "Texting isn't connected yet. See "}<Link href="/notifications" className="underline">Notifications</Link>.</p>}
          {!ch.push && !ch.email && !ch.text && <p className="text-xs eb-muted">Pick at least one way, or nothing will arrive.</p>}
        </>
      )}
    </div>
  );
}

/** The box page's own "Remind me" card. */
export function RemindMe({ categoryId, cadenceDays }: { categoryId: Id<"ebCategories">; cadenceDays: number }) {
  const mine = useQuery(api.everyBox.reminders.mine);
  const set = useMutation(api.everyBox.reminders.set);
  const { busy, error, run } = useAction();
  if (!mine) return null;
  const reminder = mine.find((r) => r.categoryId === categoryId);
  return (
    <section className="eb-card mt-4">
      <h2 className="font-semibold">Remind me</h2>
      <p className="mb-2 text-xs eb-muted">Yours alone. Your partner chooses their own reminders.</p>
      <ReminderControls categoryId={categoryId} cadenceDays={cadenceDays} reminder={reminder} busy={busy} onChange={(args) => void run(() => set(args))} />
      <ErrorNote error={error} />
      <p className="mt-2 text-xs eb-muted"><Link href="/every-box/reminders" className="underline">All my box reminders</Link></p>
    </section>
  );
}
