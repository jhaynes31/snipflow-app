"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, Field, LinkBtn, Note } from "@/core/ui";
import { ToolFrame, useToolUse } from "./ToolFrame";

const QUESTIONS = [
  { key: "facts", label: "What actually happened?", hint: "Just the facts a camera would record." },
  { key: "story", label: "What story am I telling about it?", hint: "The meaning your mind added." },
  { key: "others", label: "What are two or three other explanations that also fit the facts?", hint: "They don't have to feel true yet." },
  { key: "ask", label: "What could I ask directly?", hint: "Short and non-accusing. For example: “When you went quiet earlier, was that about me or just a long day?”" },
] as const;

export function StoryCheck() {
  return (
    <ToolFrame toolKey="storyCheck">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { partner } = useHub();
  const { keep } = useToolUse();
  const kept = useQuery(api.tend.tools.kept, { tool: "storyCheck", limit: 5 });
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const q = QUESTIONS[i];
  const done = !q;

  if (done) {
    const question = answers.ask?.trim();
    const params = new URLSearchParams();
    if (question) params.set("status", question);
    params.set("help", "words");
    params.set("kinds", "rejected");
    return (
      <div className="sh-stack">
        <Card>
          <h2 className="sh-h2">Your Story Check</h2>
          <dl className="sh-suggestions">
            {QUESTIONS.map((x) => (
              <div key={x.key}>
                <dt>{x.label}</dt>
                <dd>{answers[x.key] || <span className="sh-muted">(skipped)</span>}</dd>
              </div>
            ))}
          </dl>
          <div className="sh-choices">
            <Btn disabled={saved} onClick={() => void keep(answers).then(() => setSaved(true))}>
              {saved ? "Saved privately" : "Save privately"}
            </Btn>
            {partner && question && (
              <LinkBtn href={`/heads-up/new?${params.toString()}`} variant="secondary">
                Send the question to {partner.displayName} as a gentle heads-up
              </LinkBtn>
            )}
          </div>
          {saved && <Note>Kept, for you only.</Note>}
        </Card>
        {kept && kept.length > 0 && (
          <Card tone="alt">
            <h2 className="sh-h2">Earlier Story Checks</h2>
            <ul className="sh-list">
              {kept.map((k) => (
                <li key={k._id} className="sh-muted">{String((k.saved as { facts?: string })?.facts ?? "").slice(0, 120)}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card>
      <p className="sh-eyebrow">{i + 1} of {QUESTIONS.length}</p>
      <Field label={q.label} hint={q.hint}>
        <textarea className="sh-input sh-textarea" rows={3} value={answers[q.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} maxLength={800} />
      </Field>
      <div className="sh-choices">
        <Btn onClick={() => setI(i + 1)}>{i === QUESTIONS.length - 1 ? "Finish" : "Next"}</Btn>
        {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
      </div>
    </Card>
  );
}
