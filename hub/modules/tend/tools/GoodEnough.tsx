"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, Field, Note } from "@/core/ui";
import { ToolFrame, useToolUse } from "./ToolFrame";

export function GoodEnough() {
  return (
    <ToolFrame toolKey="goodEnough">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { keep } = useToolUse();
  const kept = useQuery(api.tend.tools.kept, { tool: "goodEnough", limit: 10 });
  const [task, setTask] = useState("");
  const [finish, setFinish] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="sh-stack">
      <Card>
        <Field label="The task">
          <input className="sh-input" value={task} onChange={(e) => setTask(e.target.value)} maxLength={200} />
        </Field>
        <Field label="What does &ldquo;good enough to be done&rdquo; look like?" hint="Not perfect. Done. One or two lines.">
          <textarea className="sh-input sh-textarea" rows={2} value={finish} onChange={(e) => setFinish(e.target.value)} maxLength={400} />
        </Field>
        <div className="sh-row mt-3">
          <Btn disabled={!task.trim() || !finish.trim()} onClick={() => void keep({ task: task.trim(), finishLine: finish.trim() }).then(() => setSaved(true))}>
            Save as the finish line
          </Btn>
          {saved && <Note>Saved. That&apos;s the line. Cross it and it&apos;s done.</Note>}
        </div>
      </Card>
      {kept && kept.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Finish lines you&apos;ve set</h2>
          <ul className="sh-list">
            {kept.map((k) => {
              const s = k.saved as { task?: string; finishLine?: string };
              return (
                <li key={k._id}>
                  <strong>{s.task}</strong>: {s.finishLine}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
