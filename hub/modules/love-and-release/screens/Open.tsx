"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { personFromName, type EmbeddedPerson } from "@/core/person";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, useAction } from "@/core/ui";
import { LOVE_AND_RELEASE_MODULE_ID, loveAndReleaseUrl, readLoveAndReleaseSettings } from "../settings";

/**
 * The Love & Release page inside The Shire: one button that opens the app
 * as the signed-in person. The app itself is separate (hub/love-and-release)
 * and keeps everything on this device: people and circles, threads, truths,
 * release entries, all of it. The Shire never reads any of it, and nothing
 * from here reaches the partner, Seasons, or the coach.
 */
export function Open() {
  const { profile } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { run, error, busy } = useAction();

  const who: EmbeddedPerson | null = readLoveAndReleaseSettings(profile.moduleSettings).who ?? personFromName(profile.displayName);

  async function choose(person: EmbeddedPerson) {
    await run(() => setModuleSettings({ moduleId: LOVE_AND_RELEASE_MODULE_ID, settings: { who: person } }));
  }

  if (!who) {
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title="Love & Release" subtitle="Who is here? Each person has their own private copy on this device." />
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
          <p className="sh-muted">Asked once.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Love & Release" subtitle="A quiet place to set things down." />

      <Card>
        <p>
          Loving people fully and releasing what is theirs to carry. Circles, threads, the fawn alarm, taking it
          personally, Unhooked, truths, boundaries, the release journal, and a sixty-second morning and evening.
        </p>
        <div style={{ marginTop: "0.8rem" }}>
          <a href={loveAndReleaseUrl(who)} className="sh-btn sh-btn-primary sh-btn-big">
            Open Love &amp; Release
          </a>
        </div>
      </Card>

      <Note>
        Everything you write there stays on this device. The Shire cannot see it, and neither can anyone else. It works
        offline once it has opened once, and its Settings has a passcode lock, export and import.
      </Note>

      <details className="sh-menu">
        <summary>About this page</summary>
        <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
          <p>
            Love &amp; Release was built on its own and moved into The Shire whole. This page only opens it as{" "}
            {who === "john" ? "John" : "you"}. Opening it on a new phone or laptop starts a fresh copy there; a backup
            from its Settings moves your entries if you ever want them on another device.
          </p>
        </div>
      </details>
    </div>
  );
}
