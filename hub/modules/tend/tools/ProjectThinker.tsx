"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, Spinner, Toggle, timeAgo, useAction } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

const newId = () => Math.random().toString(36).slice(2, 10);

/** Project Thinker: idea to finish, one question per screen, ending in a visual checklist. */
export function ProjectThinker({ projectId }: { projectId?: string }) {
  return <ToolFrame toolKey="projectThinker">{projectId ? <Project id={projectId as Id<"tendProjects">} /> : <ProjectList />}</ToolFrame>;
}

function ProjectList() {
  const mine = useQuery(api.tend.projects.mine);
  const shared = useQuery(api.tend.projects.sharedWithMe);
  const create = useMutation(api.tend.projects.create);
  const remove = useMutation(api.tend.projects.remove);
  const { partner } = useHub();
  const [title, setTitle] = useState("");
  const { busy, error, run } = useAction();
  if (!mine || !shared) return <Spinner />;
  return (
    <div className="sh-stack">
      <Card>
        <form
          className="sh-stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const id = await create({ title });
              window.location.assign(`/tend/tools/projectThinker/${id}`);
            });
          }}
        >
          <Field label="What's the project?" hint="A few words is plenty.">
            <input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </Field>
          <div>
            <Btn type="submit" big disabled={busy || !title.trim()}>Think it through</Btn>
          </div>
        </form>
        <ErrorNote error={error} />
      </Card>
      {mine.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Your projects</h2>
          <ul className="sh-list">
            {mine.map((p) => (
              <li key={p._id} className="sh-row">
                <Link href={`/tend/tools/projectThinker/${p._id}`} className="sh-link">{p.title}</Link>
                <span className="sh-muted">{p.status === "finished" ? "finished" : `${p.parts.length} parts`} · {timeAgo(p.updatedAt)}</span>
                <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Delete this project?")) void run(() => remove({ id: p._id })); }}>Delete</Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {shared.length > 0 && partner && (
        <Card tone="alt">
          <h2 className="sh-h2">{partner.displayName} shared these for body-doubling</h2>
          <ul className="sh-list">
            {shared.map((p) => (
              <li key={p._id}>
                <Link href={`/tend/tools/projectThinker/${p._id}`} className="sh-link">{p.title}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const QUESTIONS = [
  { key: "done", label: "What does “done” look like?", hint: "Good enough to be done. That's the finish line." },
  { key: "parts", label: "What are the big parts?", hint: "Three to six is usual. Names only for now." },
  { key: "needs", label: "What does each part need first?", hint: "What has to exist before it can start." },
  { key: "blockers", label: "What could block it, and what's the plan if it does?", hint: "One blocker per part is plenty." },
  { key: "first", label: "What's the very first physical action, and when?", hint: "Something a body does. Open the drawer. Send the text." },
] as const;

function Project({ id }: { id: Id<"tendProjects"> }) {
  const project = useQuery(api.tend.projects.get, { id });
  if (project === undefined) return <Spinner />;
  if (project === null)
    return (
      <Card>
        <p className="sh-muted">That project isn&apos;t here.</p>
        <LinkBtn href="/tend/tools/projectThinker" variant="secondary">Back to projects</LinkBtn>
      </Card>
    );
  return <Walk project={project} />;
}

function Walk({ project }: { project: Doc<"tendProjects"> }) {
  const { profile, partner } = useHub();
  const mineToEdit = project.ownerId === profile._id;
  const save = useMutation(api.tend.projects.save);
  const setShared = useMutation(api.tend.projects.setShared);
  const send = useMutation(api.tend.projects.sendToEveryBox);
  const { busy, error, run } = useAction();
  const [q, setQ] = useState<number>(project.firstAction ? QUESTIONS.length : project.parts.length ? 2 : project.done ? 1 : 0);
  const [done, setDone] = useState(project.done ?? "");
  const [parts, setParts] = useState(project.parts);
  const [newPart, setNewPart] = useState("");
  const [firstAction, setFirstAction] = useState(project.firstAction ?? "");
  const [when, setWhen] = useState(project.firstActionWhen ?? "");
  const [saved, setSaved] = useState(false);
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const savePartsNow = (next: typeof parts) => { setParts(next); void run(() => save({ id: project._id, parts: next })); };
  const current = QUESTIONS[q];

  const header = (
    <p className="sh-eyebrow">
      <Link href="/tend/tools/projectThinker" className="sh-link">All projects</Link> · {project.title}
      {!mineToEdit && ` · shared by ${partner?.displayName ?? "your partner"}`}
    </p>
  );

  if (!current || !mineToEdit) {
    // The checklist: parts as cards, steps inside.
    return (
      <div className="sh-stack">
        {header}
        <ErrorNote error={error} />
        {project.done && (
          <Card tone="alt">
            <strong>Done looks like:</strong> {project.done}
          </Card>
        )}
        <div className="sh-tiles">
          {parts.map((part) => (
            <div key={part.id} className="sh-card tend-part">
              <h3 className="sh-h3">{part.name}</h3>
              {part.needsFirst && <p className="sh-hint">Needs first: {part.needsFirst}</p>}
              {part.blocker && <p className="sh-hint">If {part.blocker}: {part.planIfBlocked || "decide then"}</p>}
              <ul className="sh-list">
                {part.steps.map((s) => (
                  <li key={s.id}>
                    <label className="sh-toggle">
                      <input type="checkbox" checked={s.done} disabled={!mineToEdit || busy} onChange={(e) => savePartsNow(parts.map((p) => (p.id === part.id ? { ...p, steps: p.steps.map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)) } : p)))} />
                      <span className={s.done ? "sh-muted" : ""}>{s.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {mineToEdit && <AddStep onAdd={(text) => savePartsNow(parts.map((p) => (p.id === part.id ? { ...p, steps: [...p.steps, { id: newId(), text, done: false }] } : p)))} />}
            </div>
          ))}
        </div>
        {project.firstAction && (
          <Card>
            <strong>First physical action:</strong> {project.firstAction}
            {project.firstActionWhen && <span className="sh-muted"> · {project.firstActionWhen}</span>}
          </Card>
        )}
        {mineToEdit && (
          <Card tone="alt">
            <div className="sh-stack-sm">
              <Toggle checked={project.visibility === "shared"} disabled={busy} onChange={(v) => void run(() => setShared({ id: project._id, shared: v }))} label={`Share with ${partner?.displayName ?? "your partner"} for body-doubling`} hint="They see the checklist, not your other projects." />
              <div className="sh-choices">
                <Btn variant="secondary" disabled={busy || !!project.sentToEveryBoxAt} onClick={() => void run(async () => { await send({ id: project._id }); flash(); })}>
                  {project.sentToEveryBoxAt ? "Sent to Every Box" : "Send to Every Box as a commitment"}
                </Btn>
                <Btn variant="ghost" onClick={() => setQ(0)}>Walk through it again</Btn>
                {project.status === "open" ? (
                  <Btn variant="ghost" disabled={busy} onClick={() => void run(() => save({ id: project._id, status: "finished" }))}>Mark finished</Btn>
                ) : (
                  <span className="sh-muted">Finished.</span>
                )}
              </div>
              {saved && <Note>Done.</Note>}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="sh-stack">
      {header}
      <Card>
        <p className="sh-eyebrow">{q + 1} of {QUESTIONS.length}</p>
        <h2 className="sh-h2">{current.label}</h2>
        <p className="sh-hint">{current.hint}</p>
        <ErrorNote error={error} />
        {current.key === "done" && (
          <textarea className="sh-input sh-textarea" rows={2} value={done} onChange={(e) => setDone(e.target.value)} maxLength={400} />
        )}
        {current.key === "parts" && (
          <div className="sh-stack-sm">
            <ul className="sh-list">
              {parts.map((p) => (
                <li key={p.id} className="sh-row">
                  <span>{p.name}</span>
                  <Btn variant="ghost" onClick={() => setParts(parts.filter((x) => x.id !== p.id))}>×</Btn>
                </li>
              ))}
            </ul>
            <form className="sh-row" onSubmit={(e) => { e.preventDefault(); if (newPart.trim()) { setParts([...parts, { id: newId(), name: newPart.trim(), steps: [] }]); setNewPart(""); } }}>
              <input className="sh-input" value={newPart} onChange={(e) => setNewPart(e.target.value)} maxLength={120} placeholder="A big part" aria-label="New part" />
              <Btn type="submit" variant="secondary" disabled={!newPart.trim()}>Add</Btn>
            </form>
          </div>
        )}
        {current.key === "needs" && (
          <div className="sh-stack-sm">
            {parts.map((p) => (
              <Field key={p.id} label={p.name}>
                <input className="sh-input" value={p.needsFirst ?? ""} onChange={(e) => setParts(parts.map((x) => (x.id === p.id ? { ...x, needsFirst: e.target.value } : x)))} maxLength={300} placeholder="What it needs first" />
              </Field>
            ))}
            {parts.length === 0 && <p className="sh-muted">No parts yet. Go back one step.</p>}
          </div>
        )}
        {current.key === "blockers" && (
          <div className="sh-stack-sm">
            {parts.map((p) => (
              <div key={p.id} className="sh-card-alt sh-stack-sm">
                <strong>{p.name}</strong>
                <input className="sh-input" value={p.blocker ?? ""} onChange={(e) => setParts(parts.map((x) => (x.id === p.id ? { ...x, blocker: e.target.value } : x)))} maxLength={300} placeholder="What could block it" aria-label={`Blocker for ${p.name}`} />
                <input className="sh-input" value={p.planIfBlocked ?? ""} onChange={(e) => setParts(parts.map((x) => (x.id === p.id ? { ...x, planIfBlocked: e.target.value } : x)))} maxLength={300} placeholder="The plan if it does" aria-label={`Plan for ${p.name}`} />
              </div>
            ))}
          </div>
        )}
        {current.key === "first" && (
          <div className="sh-stack-sm">
            <Field label="First physical action">
              <input className="sh-input" value={firstAction} onChange={(e) => setFirstAction(e.target.value)} maxLength={300} />
            </Field>
            <Field label="When">
              <input className="sh-input" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={120} placeholder="Tonight after dinner" />
            </Field>
          </div>
        )}
        <div className="sh-choices">
          <Btn
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await save({ id: project._id, done, parts, firstAction, firstActionWhen: when });
                setQ(q + 1);
              })
            }
          >
            {q === QUESTIONS.length - 1 ? "Show the checklist" : "Next"}
          </Btn>
          {q > 0 && <Btn variant="ghost" onClick={() => setQ(q - 1)}>Back</Btn>}
          <Btn variant="ghost" onClick={() => setQ(QUESTIONS.length)}>Skip to the checklist</Btn>
        </div>
      </Card>
    </div>
  );
}

function AddStep({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form className="sh-row mt-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAdd(text.trim()); setText(""); } }}>
      <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Add a step" aria-label="Add a step" />
      <Btn type="submit" variant="secondary" disabled={!text.trim()}>Add</Btn>
    </form>
  );
}
