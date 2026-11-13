"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TEMPLATES } from "@/core/loops/content";
import { Btn, Card, ErrorNote, Field, PageTitle, useAction } from "@/core/ui";
import { THEMES, type LoopTheme } from "../theme";

/** One question per screen, cozy pace: name it, pick a template, describe each stage. */
export function Builder({ theme }: { theme: LoopTheme }) {
  const t = THEMES[theme];
  const router = useRouter();
  const create = useMutation(api.loops.entries.create);
  const { busy, error, run } = useAction();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0].key);
  const [stages, setStages] = useState(TEMPLATES[0].stages.map((s) => ({ ...s, description: "" })));
  const pick = (key: string) => { setTemplate(key); setStages((TEMPLATES.find((x) => x.key === key) ?? TEMPLATES[0]).stages.map((s) => ({ ...s, description: "" }))); };
  const total = 2 + stages.length;
  const stageIdx = step - 2;

  return (
    <>
      <PageTitle title="A new loop" subtitle={`Step ${step + 1} of ${total}. Go slow. You can change any of it later.`} />
      <Card>
        {step === 0 && (
          <Field label="Name it, in your own words" hint='"The Overcommit Spiral", "Shut Down and Scroll", "The Sunday Dread".'>
            <input className="sh-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
          </Field>
        )}
        {step === 1 && (
          <Field label="Choose a shape" hint="A template to fill in, or build your own. Stages can be renamed, reordered, added, or removed later (four to ten).">
            <div className="sh-stack-sm">
              {TEMPLATES.map((tp) => (
                <button key={tp.key} type="button" className="sh-tile" aria-pressed={template === tp.key} style={{ textAlign: "left", borderColor: template === tp.key ? t.accent : undefined }} onClick={() => pick(tp.key)}>
                  <span className="sh-tile-name">{tp.name}</span>
                  <span className="sh-tile-tagline">{tp.blurb}</span>
                </button>
              ))}
            </div>
          </Field>
        )}
        {stageIdx >= 0 && stageIdx < stages.length && (
          <>
            <p className="sh-eyebrow">Stage {stageIdx + 1} of {stages.length}</p>
            <Field label="What is this stage called?">
              <input className="sh-input" value={stages[stageIdx].name} maxLength={40} onChange={(e) => setStages(stages.map((s, i) => (i === stageIdx ? { ...s, name: e.target.value } : s)))} />
            </Field>
            <Field label={stages[stageIdx].prompt} hint="What it looks like for you. Short is fine. Blank is fine too.">
              <textarea className="sh-input sh-textarea" rows={3} value={stages[stageIdx].description} maxLength={600} onChange={(e) => setStages(stages.map((s, i) => (i === stageIdx ? { ...s, description: e.target.value } : s)))} autoFocus />
            </Field>
            {template === "blank" && (
              <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}>
                {stages.length < 10 && <Btn variant="secondary" onClick={() => setStages([...stages.slice(0, stageIdx + 1), { key: "behavior", name: `Stage ${stages.length + 1}`, prompt: "Then what?", description: "" }, ...stages.slice(stageIdx + 1)])}>Add a stage after this</Btn>}
                {stages.length > 4 && <Btn variant="ghost" onClick={() => { setStages(stages.filter((_, i) => i !== stageIdx)); setStep(Math.max(2, step - 1)); }}>Remove this stage</Btn>}
              </div>
            )}
          </>
        )}
        <ErrorNote error={error} />
        <div className="sh-row sh-wrap mt-3" style={{ gap: "0.5rem" }}>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(step - 1)}>Back</Btn>}
          {step < total - 1 ? (
            <Btn disabled={step === 0 && !name.trim()} onClick={() => setStep(step + 1)}>Next</Btn>
          ) : (
            <Btn big disabled={busy || !name.trim()} onClick={() => void run(async () => { const id = await create({ name, templateType: template, stages }); router.push(`${t.mount}/${id}`); })}>Draw the loop</Btn>
          )}
          {stageIdx >= 0 && <Btn variant="ghost" disabled={busy || !name.trim()} onClick={() => void run(async () => { const id = await create({ name, templateType: template, stages }); router.push(`${t.mount}/${id}`); })}>Skip the rest and draw it</Btn>}
        </div>
      </Card>
      {theme === "shire" && <p className="sh-hint">Psalm 139:23-24, paraphrased: &ldquo;Search me, God, and know my heart; see if there&apos;s a way in me that hurts, and lead me in the way that lasts.&rdquo; A good prayer while you build.</p>}
    </>
  );
}
