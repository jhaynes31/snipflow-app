"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, useAction } from "@/core/ui";
import { sessionName, useHeartwoodToday } from "../heartwoodData";
import { FITNESS_MODULE_ID, heartwoodUrl, personFromName, readFitnessSettings, type HeartwoodPerson } from "../settings";

/**
 * The Heartwood Fitness page inside The Shire: one big button that opens
 * Heartwood as the signed-in person, with the day's signals from Tend, plus
 * what Heartwood has planned for today. Heartwood itself is a separate app
 * at /fitness/app/ and keeps its data on this device (see
 * docs/heartwood-migration-plan.md).
 */
export function Open() {
  const { profile, gentle } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const cycle = useQuery(api.tend.log.cycle);
  const recent = useQuery(api.checkIns.recent, { limit: 1 });
  const { run, error, busy } = useAction();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const chosen = readFitnessSettings(profile.moduleSettings).who;
  const who: HeartwoodPerson | null = chosen ?? personFromName(profile.displayName);
  const hw = useHeartwoodToday(who);

  const tender = Boolean(cycle?.forecast && cycle.today >= cycle.forecast.tenderStart && cycle.today <= cycle.forecast.tenderEnd);
  const last = recent?.[0];
  const weather = last && last.createdAt >= Date.parse(today) ? (last.weather ?? null) : null;
  const easy = gentle || tender;

  async function choose(person: HeartwoodPerson) {
    await run(() => setModuleSettings({ moduleId: FITNESS_MODULE_ID, settings: { who: person } }));
  }

  if (!who) {
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title="Heartwood Fitness" subtitle="Which Heartwood is yours? Each person has their own plan, tree and sticker book on this device." />
        <Card>
          <div className="sh-row" style={{ gap: "0.6rem", flexWrap: "wrap" }}>
            <Btn big onClick={() => choose("her")} disabled={busy}>
              I&apos;m Jen
            </Btn>
            <Btn big variant="secondary" onClick={() => choose("john")} disabled={busy}>
              I&apos;m John
            </Btn>
          </div>
          <ErrorNote error={error} />
          <p className="sh-muted">Asked once. You can change it in Heartwood&apos;s Settings with &ldquo;Switch person.&rdquo;</p>
        </Card>
      </div>
    );
  }

  const href = heartwoodUrl(who, { gentle, tender, weather });

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Heartwood Fitness" subtitle="Open the app, press Start, follow along." />

      <Card>
        <TodayLine hw={hw} />
        <div style={{ marginTop: "0.8rem" }}>
          <a href={href} className="sh-btn sh-btn-primary sh-btn-big">
            Open Heartwood
          </a>
        </div>
        {easy && (
          <p className="sh-muted" style={{ marginTop: "0.6rem" }}>
            {gentle ? "Gentle day is on" : "It's a tender week"}, so Heartwood will offer the 5-minute version first. Start whichever you like.
          </p>
        )}
      </Card>

      <Note>
        Heartwood keeps its plan, logs and tree on this device, not in The Shire. Nothing here is shared with anyone. It works
        offline once it has opened once.
      </Note>

      <details className="sh-menu">
        <summary>About this page</summary>
        <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
          <p>
            Heartwood is your personal trainer and physical therapist: a program built around your body, a movement screen,
            comeback mode after gaps, a Sabbath each week, and a tree that grows with every session. The Shire opens it as{" "}
            {who === "john" ? "John" : "you"} and passes along only today&apos;s signals: gentle day, tender week, and the
            weather from your check-in.
          </p>
          <p className="sh-muted">
            Opening it on a new phone or laptop starts a fresh Heartwood there. Its Settings can export and import a backup if
            you ever move.
          </p>
        </div>
      </details>
    </div>
  );
}

function TodayLine({ hw }: { hw: ReturnType<typeof useHeartwoodToday> }) {
  if (!hw) return <p className="sh-muted">Looking at today&apos;s plan…</p>;
  if (!hw.started) return <p>First time here. Heartwood will ask a few questions about your body and build your program.</p>;
  if (!hw.next) return <p>Your program is complete. Heartwood&apos;s Settings can start a new block.</p>;
  return (
    <p>
      <strong>Today:</strong> {sessionName(hw.next.templateId)}
      {hw.next.inProgress ? ", in progress. Pick up where you left off." : hw.next.fiveMinute ? ", the 5-minute version." : "."}
    </p>
  );
}
