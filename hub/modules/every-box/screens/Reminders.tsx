"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AFTER_DAYS_CHOICES } from "@/convex/everyBox/remindersPure";
import { useHub } from "@/core/shell/HubContext";
import { HOURS, hourLabel, ReminderControls } from "@/modules/every-box/components/RemindMe";
import { useEveryBox } from "@/modules/every-box/components/context";
import { Btn, ErrorNote, PageTitle, Spinner, useAction } from "@/modules/every-box/components/ui";

/**
 * Every box, each with its own reminder switch (2026-10-03, John's ask: "spam
 * me on my phone, computer, and email for every box"). One row per box, a
 * quick "all of them" at the top, and the time and ways for each. Yours
 * alone; the partner never sees them, and nothing is counted.
 */
export function Reminders() {
  const { theme } = useEveryBox();
  const { profile } = useHub();
  const categories = useQuery(api.everyBox.categories.list);
  const mine = useQuery(api.everyBox.reminders.mine);
  const set = useMutation(api.everyBox.reminders.set);
  const setAll = useMutation(api.everyBox.reminders.setAll);
  const status = useQuery(api.push.channelStatus.status);
  const { busy, error, run } = useAction();
  const [allDays, setAllDays] = useState<number | "cadence">("cadence");
  const [allHour, setAllHour] = useState(9);
  const [allPush, setAllPush] = useState(true);
  const [allEmail, setAllEmail] = useState(false);
  const [allText, setAllText] = useState(false);

  if (!categories || !mine) return <Spinner />;
  const onCount = mine.length;

  return (
    <div className="eb-container max-w-3xl">
      <PageTitle title="My box reminders" subtitle={`A nudge when a ${theme.noun} hasn't been done in a while, by the ways you pick. Yours alone; your partner picks their own.`} action={<Link href="/every-box/boxes" className="eb-btn eb-btn-secondary">Back to {theme.nounPlural}</Link>} />
      <ErrorNote error={error} />

      <section className="eb-card mb-5">
        <h2 className="font-semibold">All of them at once</h2>
        <p className="mb-2 text-xs eb-muted">Turns a reminder on for every {theme.noun}. You can still change any single one below.</p>
        <div className="eb-remind">
          <div className="eb-remind-row">
            <span>When it hasn&apos;t been done in</span>
            <select value={allDays} onChange={(e) => setAllDays(e.target.value === "cadence" ? "cadence" : Number(e.target.value))} aria-label="Days before a reminder, for every box">
              <option value="cadence">each {theme.noun}&apos;s own rhythm</option>
              {AFTER_DAYS_CHOICES.map((d) => <option key={d} value={d}>{d} day{d === 1 ? "" : "s"}</option>)}
            </select>
            <span>at</span>
            <select value={allHour} onChange={(e) => setAllHour(Number(e.target.value))} aria-label="Hour, for every box">
              {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </div>
          <div className="eb-remind-row">
            <span className="text-sm eb-muted">By:</span>
            <label><input type="checkbox" checked={allPush} onChange={(e) => setAllPush(e.target.checked)} /> Phone or computer notification</label>
            <label><input type="checkbox" checked={allEmail} onChange={(e) => setAllEmail(e.target.checked)} /> Email</label>
            <label><input type="checkbox" checked={allText} onChange={(e) => setAllText(e.target.checked)} /> Text</label>
          </div>
          <div className="eb-remind-row">
            <Btn disabled={busy || (!allPush && !allEmail && !allText)} onClick={() => void run(() => setAll({ enabled: true, afterDays: allDays === "cadence" ? undefined : allDays, hour: allHour, everyDay: true, channels: { push: allPush, email: allEmail, text: allText } }))}>
              Remind me about every {theme.noun}
            </Btn>
            {onCount > 0 && (
              <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Turn off every box reminder?")) void run(() => setAll({ enabled: false })); }}>
                Turn all off
              </Btn>
            )}
          </div>
        </div>
        {!profile.reminders.pushEnabled && <p className="mt-2 text-xs eb-muted">Phone and computer notifications are off for your devices right now. <Link href="/settings" className="underline">Turn them on in Settings</Link> so they arrive.</p>}
        {status && (!status.email || !status.text) && (
          <p className="mt-1 text-xs eb-muted">
            {!status.email && !status.text ? "Email and text aren't connected yet" : !status.email ? "Email isn't connected yet" : "Text isn't connected yet"}; a notification still works. <Link href="/notifications" className="underline">How to connect them</Link>.
          </p>
        )}
      </section>

      <ul className="grid gap-3">
        {categories.map((c) => (
          <li key={c._id} className="eb-card">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl" aria-hidden>{c.icon}</span>
              <Link href={`/every-box/box/${c._id}`} className="font-semibold">{c.name}</Link>
              {mine.some((r) => r.categoryId === c._id) && <span className="eb-chip">On</span>}
            </div>
            <ReminderControls categoryId={c._id} cadenceDays={c.idealCadenceDays} reminder={mine.find((r) => r.categoryId === c._id)} busy={busy} onChange={(args) => void run(() => set(args))} />
          </li>
        ))}
      </ul>
      {categories.length === 0 && <p className="eb-card-alt text-sm eb-muted">No {theme.nounPlural} yet. Add some first.</p>}
    </div>
  );
}
