"use client";

import { useEffect, useState } from "react";
import { Btn, Card, Field, Note } from "@/core/ui";
import { ToolFrame, useToolUse } from "./ToolFrame";

export function SmallestStep() {
  return (
    <ToolFrame toolKey="smallestStep">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { keep } = useToolUse();
  const [task, setTask] = useState("");
  const [step, setStep] = useState("");
  const [seconds, setSeconds] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (seconds === null || seconds <= 0) return;
    const t = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const mm = seconds === null ? "" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="sh-stack">
      <Card>
        <Field label="The thing you can't start">
          <input className="sh-input" value={task} onChange={(e) => setTask(e.target.value)} maxLength={200} />
        </Field>
        <Field label="A first action that takes 2 minutes" hint="Open the file. Put the shoes by the door. Write the subject line. Smaller than feels sensible.">
          <input className="sh-input" value={step} onChange={(e) => setStep(e.target.value)} maxLength={200} />
        </Field>
        <div className="sh-choices">
          <Btn
            big
            disabled={!step.trim() || (seconds !== null && seconds > 0)}
            onClick={() => {
              setSeconds(120);
              void keep({ task: task.trim() || undefined, firstAction: step.trim() }).then(() => setSaved(true));
            }}
          >
            Start the 2-minute timer
          </Btn>
        </div>
        {seconds !== null && (
          <p className="tend-timer" aria-live="polite">
            {seconds > 0 ? mm : "Time's up. You started. That was the hard part."}
          </p>
        )}
        {saved && <Note>Kept.</Note>}
      </Card>
    </div>
  );
}
