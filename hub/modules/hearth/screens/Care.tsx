"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { CoachChat } from "@/core/coach/CoachChat";
import { EMPTY_INTAKE, HAIR, HAIR_INTRO, HYGIENE, INTAKE, SKIN_EVENING, SKIN_INTRO, SKIN_MORNING, SKIN_WEEKLY, styleSuggestions, type StyleIntake } from "@/core/hearth/care";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, useAction } from "@/core/ui";
import { HEARTH } from "../Shell";
import { TeachCards, Tiles } from "../Cards";
import { HairGlyph } from "../Glyphs";

const C = `${HEARTH}/care`;

export function CareHome() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Her care shelf" subtitle="How-tos a mother shows you at the bathroom sink. Seated, no heat, natural, and the flare-day version of everything." />
      <Tiles items={[
        { href: `${C}/skin`, name: "Skin", tagline: "Oily, large pores, natural and simple. Morning, evening, once a week, flare day." },
        { href: `${C}/hygiene`, name: "Hygiene", tagline: "The shower in order, the sink bath, teeth, sweat and folds, hands and feet, period care." },
        { href: `${C}/hair`, name: "Hair", tagline: "Wavy and curly, little frizz, from the chair. Wash day to flare day, step by step with pictures." },
        { href: `${C}/style`, name: "Face and style", tagline: "A short intake, then suggestions built from what you actually like." },
      ]} />
      <Card tone="alt">
        <h2 className="sh-h3">Ask her about any of it</h2>
        <CoachChat module="hearth" task="hearth.care" placeholder="Mom, my hair keeps… / what do I do about…" />
      </Card>
    </div>
  );
}

function Routine({ title, steps }: { title: string; steps: { step: string; why: string }[] }) {
  return (
    <Card>
      <h2 className="sh-h3">{title}</h2>
      <ol className="sh-list">
        {steps.map((s, i) => (
          <li key={i}>
            <p className="hh-line" style={{ margin: 0 }}>{s.step}</p>
            <p className="sh-hint">{s.why}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function Skin() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Skin" subtitle="Oily skin with large pores, cared for naturally. Balance, not stripping." />
      <Note>{SKIN_INTRO}</Note>
      <Routine title="Morning, about three minutes" steps={SKIN_MORNING} />
      <Routine title="Evening, about four minutes" steps={SKIN_EVENING} />
      <TeachCards cards={SKIN_WEEKLY} />
    </div>
  );
}

export function Hygiene() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Hygiene" subtitle="The parts nobody explains, in order, with the low-energy version of each." />
      <TeachCards cards={HYGIENE} />
    </div>
  );
}

export function Hair() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Hair" subtitle="Keeping it wavy and curly with little frizz, from a chair, on the days your arms aren't available." />
      <Note>{HAIR_INTRO}</Note>
      <div className="hh-cards">
        {HAIR.map((h) => (
          <details key={h.key} className="sh-card hh-card">
            <summary>
              <span className="hh-card-title">{h.title}</span>
              <span className="hh-card-lead">{h.lead}</span>
              <span className="hh-meta">
                {h.minutes > 0 ? <span>{h.minutes} min hands-on</span> : <span>No effort</span>}
                {h.seated && <span>Seated, arms down</span>}
              </span>
            </summary>
            <div>
              {h.steps.map((s, i) => (
                <div key={i} className="hh-step">
                  <HairGlyph g={s.glyph} />
                  <div>
                    <p className="hh-step-n">Step {i + 1}</p>
                    <p className="hh-line" style={{ margin: 0 }}>{s.text}</p>
                  </div>
                </div>
              ))}
              {h.tip && <p className="sh-hint mt-2">{h.tip}</p>}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

const HEARTH_MODULE = "hearth";

export function Style() {
  const { profile } = useHub();
  const settings = (profile.moduleSettings?.hearth ?? {}) as { style?: Partial<StyleIntake> };
  const saved: StyleIntake | null = settings.style ? { ...EMPTY_INTAKE, ...settings.style } : null;
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { run, error, busy } = useAction();
  const [editing, setEditing] = useState(!saved);
  const [draft, setDraft] = useState<StyleIntake>(saved ?? EMPTY_INTAKE);

  const toggle = (key: keyof StyleIntake, value: string, multi: boolean) => {
    setDraft((d) => {
      if (!multi) return { ...d, [key]: d[key] === value ? "" : value };
      const list = d[key] as string[];
      return { ...d, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });
  };

  async function save() {
    await run(() => setModuleSettings({ moduleId: HEARTH_MODULE, settings: { ...settings, style: draft } }));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title="Face and style" subtitle="Pick everything that fits. Suggestions come from your answers, not a magazine." />
        {INTAKE.map((q) => (
          <Card key={q.key}>
            <p className="sh-label">{q.question}{q.multi ? " (pick every one that fits)" : ""}</p>
            <div className="sh-chips">
              {q.options.map((o) => {
                const on = q.multi ? (draft[q.key] as string[]).includes(o) : draft[q.key] === o;
                return <button key={o} type="button" className={`sh-chip ${on ? "" : "sh-chip-quiet"}`} aria-pressed={on} onClick={() => toggle(q.key, o, q.multi)}>{o}</button>;
              })}
            </div>
          </Card>
        ))}
        <Card>
          <label className="block">
            <span className="sh-label">Anything else, in your words</span>
            <textarea className="sh-input sh-textarea" rows={3} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} maxLength={800} placeholder="I always feel best in… / I hate how … looks on me" />
          </label>
        </Card>
        <ErrorNote error={error} />
        <div className="sh-row">
          <Btn big disabled={busy} onClick={() => void save()}>Show me</Btn>
          {saved && <Btn variant="ghost" onClick={() => { setDraft(saved); setEditing(false); }}>Cancel</Btn>}
        </div>
      </div>
    );
  }

  const out = styleSuggestions(saved ?? EMPTY_INTAKE);
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Face and style" subtitle="Built from what you said you like. Change your answers any time." action={<Btn variant="secondary" onClick={() => setEditing(true)}>Change my answers</Btn>} />
      {out.map((s) => (
        <Card key={s.title}>
          <h2 className="sh-h3">{s.title}</h2>
          <ul className="sh-list">{s.lines.map((l, i) => <li key={i} className="hh-line">{l}</li>)}</ul>
        </Card>
      ))}
      <Card tone="alt">
        <h2 className="sh-h3">Ask her</h2>
        <p className="sh-muted">She has your answers in front of her.</p>
        <CoachChat module="hearth" task="hearth.care" placeholder="What would you do for a wedding / a flare day / a first impression…" />
      </Card>
    </div>
  );
}
