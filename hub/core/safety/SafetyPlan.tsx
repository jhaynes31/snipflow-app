"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CrisisNotice } from "./CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, Spinner, Toggle, useAction } from "@/core/ui";

const PARTS = [
  { key: "warningSigns", title: "My warning signs", hint: "What it looks like when I'm starting to slide. Thoughts, feelings, things I do." },
  { key: "whatCalmsMe", title: "What calms me", hint: "Places, people, music, prayer, a walk, a shower, a tool in Tend. Anything that has worked once." },
  { key: "peopleToCall", title: "People I can call", hint: "Names and numbers. My partner, a friend, family, my doctor or counselor, 988." },
  { key: "reasonsToHoldOn", title: "My reasons to hold on", hint: "In my own words, for the moments I can't remember them." },
] as const;

type PartKey = (typeof PARTS)[number]["key"];
type PlanText = Record<PartKey, string>;

const EMPTY: PlanText = { warningSigns: "", whatCalmsMe: "", peopleToCall: "", reasonsToHoldOn: "" };

/**
 * The personal safety plan, behind "Need help now". Written on a steadier
 * day, read on a hard one. Private unless the person shares it.
 */
export function SafetyPlan({ partnerName }: { partnerName: string | null }) {
  const mine = useQuery(api.safetyPlan.mine);
  const theirs = useQuery(api.safetyPlan.partners);
  const save = useMutation(api.safetyPlan.save);
  const setShared = useMutation(api.safetyPlan.setShared);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlanText>(EMPTY);
  const [saved, setSaved] = useState(false);

  if (mine === undefined) return <Spinner label="Loading your plan" />;
  const filled = mine && PARTS.some((p) => mine[p.key].trim());

  function startEditing() {
    setDraft(mine ? { warningSigns: mine.warningSigns, whatCalmsMe: mine.whatCalmsMe, peopleToCall: mine.peopleToCall, reasonsToHoldOn: mine.reasonsToHoldOn } : EMPTY);
    setEditing(true);
  }

  return (
    <div className="sh-stack mt-6" aria-label="My safety plan">
      <h2 className="sh-h2">My safety plan</h2>
      {!editing && !filled && (
        <Card>
          <p>
            A safety plan is four short lists you write on a steadier day, so they&apos;re here on a hard one: your warning signs, what calms you, people to call, and your reasons to hold on.
          </p>
          <Btn big onClick={startEditing}>Write my plan</Btn>
        </Card>
      )}
      {!editing && filled && mine && (
        <Card>
          {PARTS.map((p) => (
            mine[p.key].trim() ? (
              <div key={p.key} className="sh-plan-part">
                <h3 className="sh-h3">{p.title}</h3>
                <p className="sh-plan-text">{mine[p.key]}</p>
              </div>
            ) : null
          ))}
          <div className="sh-row sh-wrap mt-3">
            <Btn variant="secondary" onClick={startEditing}>Edit my plan</Btn>
            {partnerName && (
              <Toggle
                checked={mine.visibility === "shared"}
                onChange={(on) => void run(() => setShared({ shared: on }))}
                label={`${partnerName} can see my plan`}
                hint="Off means it stays yours alone."
              />
            )}
          </div>
          <ErrorNote error={error} />
        </Card>
      )}
      {editing && (
        <Card>
          <form
            className="sh-stack-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await save(draft);
                setEditing(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              });
            }}
          >
            {PARTS.map((p) => (
              <Field key={p.key} label={p.title} hint={p.hint}>
                <textarea className="sh-input sh-textarea" rows={3} value={draft[p.key]} onChange={(e) => setDraft({ ...draft, [p.key]: e.target.value })} maxLength={2000} />
              </Field>
            ))}
            <CrisisNotice texts={Object.values(draft)} />
            <ErrorNote error={error} />
            <div className="sh-row sh-wrap">
              <Btn type="submit" big disabled={busy}>Save my plan</Btn>
              <Btn variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}
      {saved && <Note>Saved. It&apos;s here whenever you need it.</Note>}
      {theirs && (
        <Card tone="alt">
          <h3 className="sh-h3">{theirs.displayName}&apos;s plan</h3>
          <p className="sh-hint">They chose to share it with you, so you can help when they can&apos;t remember it themselves.</p>
          {PARTS.map((p) => (
            theirs[p.key].trim() ? (
              <div key={p.key} className="sh-plan-part">
                <h4 className="sh-h4">{p.title}</h4>
                <p className="sh-plan-text">{theirs[p.key]}</p>
              </div>
            ) : null
          ))}
        </Card>
      )}
    </div>
  );
}
