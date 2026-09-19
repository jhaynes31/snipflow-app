"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { personFromName, type EmbeddedPerson } from "@/core/person";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import { LOVE_AND_RELEASE_MODULE_ID, loveAndReleaseUrl, readLoveAndReleaseSettings } from "../settings";

/**
 * The front door of Re-Centered inside The Shire. Two doors:
 *
 *  - "Everyone, and me": the app (hub/love-and-release, once Love & Release), a
 *    separate app that keeps everything on this device. The Shire never
 *    reads it. It gets one yes-or-no signal on the way in: whether a word
 *    wasn't kept in the last few days, so its front door can point at the
 *    plan. Never the word itself.
 *  - "{partner}, and me": one person's own room, kept in The
 *    Shire's database so Kept Word and Seasons can still reach it. Only the
 *    person who claimed it can open it (modules/re-centered).
 */
export function Open() {
  const { profile, partner } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const room = useQuery(api.reCentered.room.status);
  const now = useQuery(api.reCentered.entries.now, room?.state === "mine" ? {} : "skip");
  const { run, error, busy } = useAction();
  const partnerName = partner?.displayName ?? "your partner";

  const who: EmbeddedPerson | null = readLoveAndReleaseSettings(profile.moduleSettings).who ?? personFromName(profile.displayName);

  async function choose(person: EmbeddedPerson) {
    await run(() => setModuleSettings({ moduleId: LOVE_AND_RELEASE_MODULE_ID, settings: { who: person } }));
  }

  if (!who) {
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title="Re-Centered" subtitle="Who is here? Each person has their own private copy on this device." />
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

  if (!room) return <Spinner />;
  const wordNotKept = now?.wordNotKept ?? null;
  const appHref = loveAndReleaseUrl(who, { plan: Boolean(wordNotKept) });

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Re-Centered" subtitle="Your own ground. Loving people fully, and releasing what is theirs to carry." />

      {wordNotKept && (
        <div className="sh-banner" role="status">
          A word wasn&apos;t kept, {timeAgo(wordNotKept)}. The plan you wrote on a steady day is ready.{" "}
          <Link href="/love-and-release/john" className="sh-link">
            Open it
          </Link>
        </div>
      )}

      <div className="sh-tiles">
        <a href={appHref} className="sh-tile">
          <span className="sh-tile-name">Everyone, and me</span>
          <span className="sh-tile-tagline">
            Comfort, the fawn alarm, taking it personally, loops, circles, threads, truths, boundaries, the release journal.
          </span>
        </a>
        {room.state === "theirs" ? (
          <div className="sh-tile sh-tile-plain" aria-disabled>
            <span className="sh-tile-name">{partnerName}, and me</span>
            <span className="sh-tile-tagline">This room is {room.ownerName}&apos;s.</span>
          </div>
        ) : (
          <Link href="/love-and-release/john" className="sh-tile">
            <span className="sh-tile-name">{partnerName}, and me</span>
            <span className="sh-tile-tagline">
              Whose is this, the pause before rescuing, let it land, where I stand, my own life, my word to me.
              {room.state === "unclaimed" ? " For one person; the first to open it keeps it." : ""}
            </span>
          </Link>
        )}
      </div>

      <Note>
        &ldquo;Everyone, and me&rdquo; stays on this device; The Shire cannot see it. &ldquo;{partnerName}, and me&rdquo; lives in
        The Shire so Kept Word can hand it a &ldquo;didn&apos;t&rdquo; and Seasons can notice patterns, and it is private to whoever
        claimed it. Nothing in either reaches the other person.
      </Note>

      <details className="sh-menu">
        <summary>About this place</summary>
        <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
          <p>
            &ldquo;Everyone, and me&rdquo; was built on its own as Love &amp; Release and moved into The Shire whole;
            &ldquo;{partnerName}, and me&rdquo; was built inside The Shire. They became one place, Re-Centered, on 2026-09-19.
            Opening &ldquo;Everyone, and me&rdquo;
            on a new phone or laptop starts a fresh copy there; a backup from its Settings moves your entries.
          </p>
        </div>
      </details>
    </div>
  );
}
