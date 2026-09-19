"use client";

import { useEffect, useState } from "react";
import { Btn, Card, Field, Note } from "@/core/ui";
import { ToolFrame, useToolUse } from "./ToolFrame";

/** Sit With It: name the urge, rate it, set a short timer, watch it rise and fall without answering it. */
export function SitWithIt() {
  return (
    <ToolFrame toolKey="sitWithIt">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { keep } = useToolUse();
  const [urge, setUrge] = useState("");
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (seconds === null || seconds <= 0) return;
    const t = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const running = seconds !== null && seconds > 0;
  const finished = seconds === 0;

  return (
    <div className="sh-stack">
      <Card>
        <Field label="The urge, in a few words" hint="For example: ask again if we're okay. Check the message. Reread the email.">
          <input className="sh-input" value={urge} onChange={(e) => setUrge(e.target.value)} maxLength={200} disabled={running || finished} />
        </Field>
        <Field label={`How strong is it right now? ${before}/10`}>
          <input type="range" min={1} max={10} value={before} onChange={(e) => setBefore(Number(e.target.value))} disabled={running || finished} className="tend-range" />
        </Field>
        {!running && !finished && (
          <div className="sh-row sh-wrap">
            <Field label="Minutes">
              <input className="sh-input sh-input-sm" type="number" min={1} max={30} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </Field>
            <Btn big disabled={!urge.trim()} onClick={() => setSeconds(minutes * 60)}>Sit with it</Btn>
          </div>
        )}
        {running && (
          <>
            <p className="tend-timer" aria-live="polite">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
            <p className="sh-muted">Don&apos;t answer it. Notice it rising and falling. It will fall.</p>
          </>
        )}
        {finished && (
          <>
            <Field label={`And now? ${after ?? before}/10`}>
              <input type="range" min={1} max={10} value={after ?? before} onChange={(e) => setAfter(Number(e.target.value))} className="tend-range" />
            </Field>
            <div className="sh-row">
              <Btn disabled={saved} onClick={() => void keep({ urge, before, after: after ?? before, minutes }).then(() => setSaved(true))}>{saved ? "Saved" : "Save"}</Btn>
              {saved && <Note>Kept. You sat with it.</Note>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
