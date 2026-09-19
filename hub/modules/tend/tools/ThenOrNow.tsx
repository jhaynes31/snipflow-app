"use client";

import { useState } from "react";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, Field, LinkBtn, Note } from "@/core/ui";
import { ToolFrame, useToolUse } from "./ToolFrame";

const QUESTIONS = [
  { key: "feeling", label: "What am I feeling?", hint: "A word or two is enough." },
  { key: "age", label: "How old does this feeling seem?", hint: "Not how old you are. How old the feeling feels." },
  { key: "trueNow", label: "What is actually true right now?", hint: "Where you are, who is here, what is not happening." },
  { key: "need", label: "What do I need right now?", hint: "Small and present-tense." },
] as const;

/** Then or Now: separating past danger from present safety. */
export function ThenOrNow() {
  return (
    <ToolFrame toolKey="thenOrNow">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { partner } = useHub();
  const { keep } = useToolUse();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const q = QUESTIONS[i];
  if (!q) {
    return (
      <div className="sh-stack">
        <Card>
          <h2 className="sh-h2">Grounding step</h2>
          <p>Feet on the floor. Name the year, the room, and one thing that is different now from then. Say it out loud if you can.</p>
          <div className="sh-choices">
            <Btn disabled={saved} onClick={() => void keep(answers).then(() => setSaved(true))}>{saved ? "Saved privately" : "Save privately"}</Btn>
            {partner && (
              <LinkBtn href={`/heads-up/new?status=${encodeURIComponent("Old pain showing up. I'm safe, I just need you near.")}&help=quietPresence&kinds=oldPain`} variant="secondary">
                Ask {partner.displayName} for quiet presence
              </LinkBtn>
            )}
          </div>
          {saved && <Note>Kept, for you only.</Note>}
        </Card>
      </div>
    );
  }
  return (
    <Card>
      <p className="sh-eyebrow">{i + 1} of {QUESTIONS.length}</p>
      <Field label={q.label} hint={q.hint}>
        <textarea className="sh-input sh-textarea" rows={2} value={answers[q.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} maxLength={500} />
      </Field>
      <div className="sh-choices">
        <Btn onClick={() => setI(i + 1)}>{i === QUESTIONS.length - 1 ? "Ground" : "Next"}</Btn>
        {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
      </div>
    </Card>
  );
}
