"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { Visibility } from "@/convex/privacy";
import { VISIBILITY_LABEL } from "@/convex/privacy";
import { COPY } from "@/core/copy/strings";
import { MANUAL_SECTIONS, type ManualKey, type ManualSectionMeta } from "@/core/manual/sections";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, VisibilityMark, useAction } from "@/core/ui";

export default function ProfilePage() {
  const { profile, partner } = useHub();
  const manual = useQuery(api.manual.mine);
  const update = useMutation(api.profiles.update);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? "");
  const [timeZone, setTimeZone] = useState(profile.timeZone);
  const { busy, error, run } = useAction();
  const [saved, setSaved] = useState(false);

  if (!manual) return <Spinner />;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My profile and manual" subtitle="Everything here is yours. Each manual section has its own privacy setting." />

      <Card>
        <h2 className="sh-h2">About me</h2>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await update({ displayName, photoUrl, timeZone });
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            });
          }}
        >
          <Field label="Display name">
            <input className="sh-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
          </Field>
          <Field label="Photo link" hint="Optional. A web address of a picture.">
            <input className="sh-input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} maxLength={500} />
          </Field>
          <Field label="Time zone">
            <input className="sh-input" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} maxLength={64} required />
          </Field>
          <ErrorNote error={error} />
          <div className="sh-row">
            <Btn type="submit" disabled={busy}>
              Save
            </Btn>
            {saved && <Note>{COPY.saved}</Note>}
          </div>
        </form>
      </Card>

      <h2 className="sh-h2 mt-8">My user manual</h2>
      <p className="sh-muted">
        Plain language, your words. Every section starts private. Sharing is a separate step that shows you exactly what{" "}
        {partner?.displayName ?? "your partner"} will see.
      </p>
      <div className="sh-stack mt-4">
        {MANUAL_SECTIONS.map((meta) => (
          <SectionEditor key={meta.key} meta={meta} section={manual.find((s) => s.key === meta.key)} partnerName={partner?.displayName ?? "your partner"} />
        ))}
      </div>
    </div>
  );
}

function SectionEditor({
  meta,
  section,
  partnerName,
}: {
  meta: ManualSectionMeta;
  section: Doc<"userManualSections"> | undefined;
  partnerName: string;
}) {
  const save = useMutation(api.manual.save);
  const setVisibility = useMutation(api.manual.setVisibility);
  const remove = useMutation(api.manual.remove);
  const markSetup = useMutation(api.profiles.update);
  const [body, setBody] = useState(section?.body ?? "");
  const [summary, setSummary] = useState(section?.summary ?? "");
  const [coach, setCoach] = useState(section?.coachAllowed ?? false);
  const [sharing, setSharing] = useState<Visibility | null>(null);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();

  // Keep local fields in step when the row changes underneath (another tab, a delete).
  const [seen, setSeen] = useState(section);
  if (seen !== section) {
    setSeen(section);
    if ((seen?.body ?? "") !== (section?.body ?? "")) setBody(section?.body ?? "");
    if ((seen?.summary ?? "") !== (section?.summary ?? "")) setSummary(section?.summary ?? "");
    if ((seen?.coachAllowed ?? false) !== (section?.coachAllowed ?? false)) setCoach(section?.coachAllowed ?? false);
  }

  const visibility = section?.visibility ?? "private";
  const dirty = body !== (section?.body ?? "") || coach !== (section?.coachAllowed ?? false);

  return (
    <Card>
      <div className="sh-row">
        <h3 className="sh-h3">{meta.title}</h3>
        <VisibilityMark visibility={visibility} />
      </div>
      <p className="sh-hint">{meta.prompt}</p>
      <textarea
        className="sh-input sh-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={4000}
        aria-label={meta.title}
      />
      <Toggle checked={coach} onChange={setCoach} label="The AI coach may read this section" hint="The coach arrives in a later phase. Off means it never sees this." />
      <ErrorNote error={error} />
      <div className="sh-row sh-wrap">
        <Btn
          disabled={busy || !dirty}
          onClick={() =>
            void run(async () => {
              await save({ key: meta.key as ManualKey, body, coachAllowed: coach });
              await markSetup({ setupDone: true });
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            })
          }
        >
          Save
        </Btn>
        {saved && <Note>{COPY.saved}</Note>}
        {section && visibility === "private" && (
          <>
            <Btn variant="secondary" disabled={busy} onClick={() => setSharing("shared")}>
              Share with {partnerName}
            </Btn>
            <Btn variant="secondary" disabled={busy} onClick={() => setSharing("sharedSummary")}>
              Share a summary only
            </Btn>
          </>
        )}
        {section && visibility !== "private" && (
          <Btn variant="secondary" disabled={busy} onClick={() => void run(() => setVisibility({ id: section._id, visibility: "private" }))}>
            Stop sharing
          </Btn>
        )}
        {section && (
          <Btn
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Delete "${meta.title}"? It's gone for good, not hidden.`)) return;
              void run(() => remove({ id: section._id }));
            }}
          >
            Delete
          </Btn>
        )}
      </div>

      {sharing && section && (
        <div className="sh-preview mt-4" role="dialog" aria-label="Sharing preview">
          <p className="sh-eyebrow">Preview. {partnerName} will see exactly this:</p>
          {sharing === "shared" ? (
            <p className="sh-quote">{section.body || "(empty)"}</p>
          ) : (
            <Field label="One-line summary" hint="Only this line is shared. The full section stays private.">
              <input className="sh-input" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} />
            </Field>
          )}
          <p className="sh-hint">{VISIBILITY_LABEL[sharing]}</p>
          <div className="sh-choices">
            <Btn
              disabled={busy || (sharing === "sharedSummary" && !summary.trim())}
              onClick={() =>
                void run(async () => {
                  await setVisibility({ id: section._id, visibility: sharing, summary: sharing === "sharedSummary" ? summary : undefined });
                  setSharing(null);
                })
              }
            >
              Yes, share this
            </Btn>
            <Btn variant="ghost" onClick={() => setSharing(null)}>
              Keep it private
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
