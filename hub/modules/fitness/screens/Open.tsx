"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EmbeddedApp } from "@/core/embed/EmbeddedApp";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, PageTitle, Spinner, useAction } from "@/core/ui";
import { FITNESS_MODULE_ID, HEARTWOOD_APP_PATH, personFromName, readFitnessSettings, type HeartwoodPerson } from "../settings";

/**
 * Heartwood Fitness inside The Shire. Heartwood itself is a separate app
 * at /fitness/app/ that keeps its data on this device (see
 * docs/heartwood-migration-plan.md). Since 2026-11-18 (Jen: every app keeps
 * the toolbar) it opens here, framed under the top bar, as the signed-in
 * person with the day's signals from Tend. The one-time "who is this"
 * question stays on this page.
 */
export function Open({ path }: { path: string[] }) {
  const { profile, gentle } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const cycle = useQuery(api.tend.log.cycle);
  const recent = useQuery(api.checkIns.recent, { limit: 1 });
  const { run, error, busy } = useAction();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const chosen = readFitnessSettings(profile.moduleSettings).who;
  const who: HeartwoodPerson | null = chosen ?? personFromName(profile.displayName);

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

  if (cycle === undefined || recent === undefined) return <Spinner />;
  const tender = Boolean(cycle?.forecast && cycle.today >= cycle.forecast.tenderStart && cycle.today <= cycle.forecast.tenderEnd);
  const last = recent[0];
  const weather = last && last.createdAt >= Date.parse(today) ? (last.weather ?? null) : null;
  const params: Record<string, string> = { who };
  if (gentle) params.gentle = "1";
  if (tender) params.tender = "1";
  if (weather) params.weather = weather;
  return <EmbeddedApp app="heartwood" appPath={HEARTWOOD_APP_PATH} outerPath="/fitness" inner={path} params={params} title="Heartwood Fitness" />;
}
