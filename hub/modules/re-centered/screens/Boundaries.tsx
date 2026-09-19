"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readReCenteredSettings } from "@/convex/reCentered/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * My word to me: what I will and won't do, my if-then plan for a broken word,
 * and the log of times I kept my word to myself. Written on a steady day,
 * read on a hard one. Never sent to anyone from here.
 */
export function Boundaries() {
  const { profile } = useHub();
  const settings = readReCenteredSettings(profile.moduleSettings);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const kept = useQuery(api.reCentered.entries.keptByMe, { limit: 100 });
  const addKept = useMutation(api.reCentered.entries.addKeptByMe);
  const removeKept = useMutation(api.reCentered.entries.removeKeptByMe);
  const exportText = useQuery(api.reCentered.entries.exportMine);
  const { busy, error, run } = useAction();
  const [boundaries, setBoundaries] = useState(settings.boundaries);
  const [ifThen, setIfThen] = useState(settings.ifThen);
  const [keptText, setKeptText] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = boundaries !== settings.boundaries || ifThen !== settings.ifThen;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My word to me" subtitle="Written on a steady day, in your words. Read back on a hard one. Nothing here is sent to anyone." />
      <Card>
        <Field label="What I will and won't do" hint="For example: I won't remind him about his appointments. I will go to the thing I planned even if he doesn't come.">
          <textarea className="sh-input sh-textarea" rows={5} value={boundaries} onChange={(e) => setBoundaries(e.target.value)} maxLength={2000} />
        </Field>
        <Field label="If a word isn't kept, then I will…" hint="Your own plan, decided now, so you don't have to decide it while hurt. Re-Centered shows this back to you when a word is marked as not kept.">
          <textarea className="sh-input sh-textarea" rows={4} value={ifThen} onChange={(e) => setIfThen(e.target.value)} maxLength={2000} />
        </Field>
        <CrisisNotice texts={[boundaries, ifThen]} />
        <ErrorNote error={error} />
        <div className="sh-row">
          <Btn
            disabled={busy || !dirty}
            onClick={() =>
              void run(async () => {
                await setModuleSettings({ moduleId: "reCentered", settings: { ...settings, boundaries: boundaries.trim(), ifThen: ifThen.trim() } });
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              })
            }
          >
            Save
          </Btn>
          {saved && <Note>Saved.</Note>}
        </div>
      </Card>
      <Card>
        <h2 className="sh-h2">Kept, by me</h2>
        <p className="sh-muted">A time you did what you said you&apos;d do for yourself. The only follow-through you control, on record.</p>
        <Field label="What I did">
          <input className="sh-input" value={keptText} onChange={(e) => setKeptText(e.target.value)} maxLength={500} />
        </Field>
        <Btn
          disabled={busy || !keptText.trim()}
          onClick={() =>
            void run(async () => {
              await addKept({ text: keptText });
              setKeptText("");
            })
          }
        >
          I kept it
        </Btn>
        {!kept ? (
          <Spinner />
        ) : (
          kept.map((k) => (
            <div key={k._id} className="rc-entry">
              <p>{k.text}</p>
              <p className="sh-hint">
                {timeAgo(k.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeKept({ id: k._id }))}>
                  Delete
                </button>
              </p>
            </div>
          ))
        )}
      </Card>
      <Card tone="alt">
        <p className="sh-muted">Everything in this room, as plain text, for you to keep anywhere you like.</p>
        <Btn
          variant="secondary"
          disabled={!exportText}
          onClick={() => {
            if (!exportText) return;
            const blob = new Blob([exportText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "re-centered.txt";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download my room
        </Btn>
      </Card>
    </div>
  );
}
