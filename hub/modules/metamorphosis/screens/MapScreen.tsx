"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MAP_LEVELS } from "@/core/metamorphosis/map";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** The Map: from the one thing to the whole story, one level at a time. */
export function MapScreen() {
  const maps = useQuery(api.metamorphosis.entries.maps);
  const add = useMutation(api.metamorphosis.entries.addMap);
  const remove = useMutation(api.metamorphosis.entries.removeMap);
  const { busy, error, run } = useAction();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [asking, setAsking] = useState(false);
  const level = MAP_LEVELS[i];
  const done = i >= MAP_LEVELS.length;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Map" subtitle="Your brain zooms in until the one thing is the only thing. It's real. It isn't the only thing. Widen the frame, one level at a time." />
      {!saved && !done && (
        <Card>
          <p className="sh-eyebrow">{i + 1} of {MAP_LEVELS.length} · {level.label}</p>
          <Field label={level.prompt}>
            <textarea className="sh-input sh-textarea" rows={3} value={answers[level.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [level.key]: e.target.value })} maxLength={600} />
          </Field>
          <CrisisNotice texts={Object.values(answers)} />
          <div className="sh-choices">
            {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
            <Btn onClick={() => setI(i + 1)} disabled={i === 0 && !(answers.stuck ?? "").trim()}>{i === MAP_LEVELS.length - 1 ? "That's the map" : "Zoom out"}</Btn>
          </div>
        </Card>
      )}
      {!saved && done && (
        <Card>
          <p className="sh-eyebrow">Zoomed out</p>
          {MAP_LEVELS.filter((l) => (answers[l.key] ?? "").trim()).map((l) => (
            <p key={l.key}><strong>{l.label}:</strong> {answers[l.key]}</p>
          ))}
          <ErrorNote error={error} />
          <div className="sh-choices mt-3">
            <Btn disabled={busy} onClick={() => void run(async () => { await add({ levels: MAP_LEVELS.map((l) => ({ key: l.key, text: answers[l.key] ?? "" })) }); setSaved(true); })}>Keep this map</Btn>
            <Btn variant="ghost" onClick={() => setI(0)}>Edit</Btn>
          </div>
        </Card>
      )}
      {saved && (
        <Card>
          <Note>Kept. The one thing is still real. Now it has a map around it.</Note>
          <div className="sh-choices mt-3">
            <Btn variant="secondary" onClick={() => { setSaved(false); setI(0); setAnswers({}); }}>Another</Btn>
            <LinkBtn href="/tend/tools/loopBreaker" variant="ghost">If it&apos;s a loop: Loop Breaker</LinkBtn>
          </div>
        </Card>
      )}
      <Btn variant={asking ? "ghost" : "secondary"} onClick={() => setAsking(!asking)}>{asking ? "Close the mentor" : "Zoom out with the mentor"}</Btn>
      {asking && <CoachChat module="metamorphosis" task="metamorphosis.map" opening={answers.stuck ? `The one thing I'm zoomed in on: ${answers.stuck}` : undefined} placeholder="Here's the one thing…" />}
      {!maps ? (
        <Spinner />
      ) : maps.length > 0 ? (
        <Card tone="alt">
          <h2 className="sh-h2">Earlier maps</h2>
          {maps.map((m) => (
            <div key={m._id} className="mm-entry">
              <p><strong>{m.levels[0]?.text}</strong></p>
              {m.levels.slice(1).map((l) => (
                <p key={l.key} className="sh-muted">{MAP_LEVELS.find((x) => x.key === l.key)?.label}: {l.text}</p>
              ))}
              <p className="sh-hint">
                {timeAgo(m.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: m._id }))}>Delete</button>
              </p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
