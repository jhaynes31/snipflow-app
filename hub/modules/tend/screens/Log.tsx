"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { dayKey, exportSummary, noticePatterns } from "@/convex/tend/patterns";
import { readTendSettings } from "@/convex/tend/pure";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";
import { LogChart } from "../components/LogChart";
import { toolByKey } from "../tools/registry";

/** My log and chart, sleep, pattern notices, export, and the cycle forecast. All private. */
export function Log() {
  const { profile, partner } = useHub();
  const points = useQuery(api.tend.log.points, { days: 60 });
  const setSleep = useMutation(api.tend.log.setSleep);
  const { busy, error, run } = useAction();
  const [today] = useState(() => dayKey(Date.now(), profile.timeZone));
  const [sleepDay, setSleepDay] = useState(today);
  const [hours, setHours] = useState(7);
  const [saved, setSaved] = useState(false);
  if (!points) return <Spinner />;
  const notices = noticePatterns(points);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My log and chart" subtitle="Private to you. Nothing here is a grade." />
      <ErrorNote error={error} />

      <Card>
        <LogChart points={points} />
      </Card>

      {notices.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Worth noticing</h2>
          <ul className="sh-list">
            {notices.map((n) => (
              <li key={n.key}>
                {n.text}{" "}
                <Link href={`/tend/tools/${n.suggestTool}`} className="sh-link">
                  Try {toolByKey(n.suggestTool)?.name ?? "a slowing tool"}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Sleep</h2>
        <form
          className="sh-row sh-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await setSleep({ day: sleepDay, hours });
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            });
          }}
        >
          <Field label="Night of">
            <input className="sh-input" type="date" value={sleepDay} max={today} onChange={(e) => setSleepDay(e.target.value)} />
          </Field>
          <Field label="Hours">
            <input className="sh-input sh-input-sm" type="number" min={0} max={16} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </Field>
          <Btn type="submit" variant="secondary" disabled={busy}>Save</Btn>
          {saved && <Note>Saved.</Note>}
        </form>
      </Card>

      <Card>
        <h2 className="sh-h2">For appointments</h2>
        <p className="sh-muted">A clean summary of the last 60 days as a text file you can bring or send.</p>
        <Btn
          variant="secondary"
          onClick={() => {
            const blob = new Blob([exportSummary(points, notices)], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tend-log-${today}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export summary
        </Btn>
      </Card>

      <CycleSection partnerName={partner?.displayName ?? "your partner"} today={today} />
    </div>
  );
}

function CycleSection({ partnerName, today }: { partnerName: string; today: string }) {
  const { profile } = useHub();
  const cycle = useQuery(api.tend.log.cycle);
  const rows = useQuery(api.tend.log.cycleStartRows);
  const add = useMutation(api.tend.log.addCycleStart);
  const remove = useMutation(api.tend.log.removeCycleStart);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const settings = readTendSettings(profile.moduleSettings);
  const { busy, error, run } = useAction();
  const [day, setDay] = useState(today);
  if (!cycle || !rows) return null;
  const f = cycle.forecast;
  return (
    <Card className="tend-forecast">
      <h2 className="sh-h2">Cycle forecast</h2>
      <p className="sh-muted">
        Log cycle start dates and Tend learns which days tend to be hardest. {partnerName} never sees the dates. If you turn sharing on, they see only &ldquo;tender week starts on…&rdquo;
      </p>
      <ErrorNote error={error} />
      <form
        className="sh-row sh-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => add({ day }));
        }}
      >
        <Field label="A cycle started on">
          <input className="sh-input" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Btn type="submit" variant="secondary" disabled={busy}>Log it</Btn>
      </form>
      {rows.length > 0 && (
        <ul className="sh-chips mt-3" aria-label="Logged starts">
          {[...rows].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 8).map((r) => (
            <li key={r._id} className="sh-chip">
              {r.day}{" "}
              <button type="button" className="sh-link" aria-label={`Remove ${r.day}`} disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>×</button>
            </li>
          ))}
        </ul>
      )}
      {f ? (
        <p className="mt-3">
          <strong>Next start, roughly:</strong> {f.nextStart} (about every {f.averageLength} days, from {f.basedOn} {f.basedOn === 1 ? "date" : "dates"}).
          <br />
          <strong>Tender week:</strong> {f.tenderStart} to {f.tenderEnd}.
          {cycle.today >= f.tenderStart && cycle.today <= f.tenderEnd && " That's now. Lighter defaults are fair today."}
        </p>
      ) : (
        <p className="sh-hint mt-3">Log one date and a forecast appears. Two or three make it better.</p>
      )}
      <div className="sh-stack-sm mt-3">
        <Toggle
          checked={settings.shareForecast}
          disabled={busy}
          onChange={(v) => void run(() => setModuleSettings({ moduleId: "tend", settings: { ...settings, shareForecast: v } }))}
          label={`Share my tender-week forecast with ${partnerName}`}
          hint="A summary only: the window's dates. Never the underlying dates. You can turn it off any time."
        />
        <div className="sh-row sh-wrap">
          <Field label="Days before">
            <input className="sh-input sh-input-sm" type="number" min={0} max={10} value={settings.tenderBefore} onChange={(e) => void run(() => setModuleSettings({ moduleId: "tend", settings: { ...settings, tenderBefore: Number(e.target.value) } }))} />
          </Field>
          <Field label="Days after">
            <input className="sh-input sh-input-sm" type="number" min={0} max={10} value={settings.tenderAfter} onChange={(e) => void run(() => setModuleSettings({ moduleId: "tend", settings: { ...settings, tenderAfter: Number(e.target.value) } }))} />
          </Field>
        </div>
        <Toggle
          checked={settings.shareToolHelps}
          disabled={busy}
          onChange={(v) => void run(() => setModuleSettings({ moduleId: "tend", settings: { ...settings, shareToolHelps: v } }))}
          label="Include which tools helped me in our monthly view"
          hint="Tool names only. Never counts of anything."
        />
      </div>
    </Card>
  );
}
