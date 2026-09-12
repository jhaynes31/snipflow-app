import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Conversation } from "~/lib/practiceConfig";
import type { Presentation, PresentationSection } from "~/lib/practicePresentation";
import PracticeBanner from "~/components/practice/PracticeBanner";
import SetupForm, { type SetupApi, type SetupData } from "~/components/practice/SetupForm";
import { deletePersona, deletePresentation, generatePersona, getPracticeSetup, getPresentations, getRubrics, savePersona, savePresentation, saveRubric, startSession, type PracticeSetup, type Rubrics } from "~/server/practice";

/**
 * The Sparring Dummy setup screen (AI practice spec, Sections 1, 4, 5, 6).
 * The setup grid itself lives in components/practice/SetupForm so a recruit
 * can use the same form through their own token; this route wires it to
 * John's server calls and adds the outline and rubric editors underneath.
 * Every screen says PRACTICE (Rule 2.6).
 */
export const Route = createFileRoute("/_admin/admin/practice")({
  component: PracticePage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs ${focus}`;

const adminSetupApi = (refresh: () => void): SetupApi => ({
  generatePersona: (input) => generatePersona({ data: input }),
  startSession: (input) => startSession({ data: input }),
  savePersona: (input) => savePersona({ data: input }),
  deletePersona: (id) => deletePersona({ data: { id } }),
  refresh,
});

function PracticePage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<PracticeSetup | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [error, setError] = useState("");
  const loadPresentations = () => getPresentations().then(setPresentations).catch(() => setPresentations([]));
  const load = () => Promise.all([getPracticeSetup().then(setSetup), loadPresentations()]).catch((e) => setError(String(e)));
  useEffect(() => {
    load();
  }, []);

  const data: SetupData | null = setup
    ? { profiles: setup.profiles, savedPersonas: setup.savedPersonas, recent: setup.recent, model: setup.model, presentations: presentations.map((x) => ({ id: x.id, name: x.name, conversation: x.conversation, version: x.version, sectionCount: x.sections.length })) }
    : null;

  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-practice-setup>
      <div className="max-w-5xl mx-auto space-y-5">
        <PracticeBanner />
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>🥊 The Sparring Dummy</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Rehearse a conversation with a fictional person before the real one. Reps, not evidence: AI personas are more patient and more articulate than real people, even on a rough day.</p>
        </div>
        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-practice-error>{error}</div>}
        {!data ? (
          <p className="text-xs text-[#a0a0a0] font-fantasy">Loading profiles...</p>
        ) : (
          <SetupForm
            data={data}
            api={adminSetupApi(load)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStarted={(id) => navigate({ to: "/admin/practice/$id", params: { id: String(id) } } as any)}
            sessionHref={(id) => `/admin/practice/${id}`}
          />
        )}

        <PresentationEditor presentations={presentations} onChange={loadPresentations} />
        <RubricEditor />
      </div>
    </main>
  );
}

/** Section 8.2: the things John wants noticed, one per line, separately for Coverage and Recruiting. The debrief judges only against these. */
function RubricEditor() {
  const [rubrics, setRubrics] = useState<Rubrics | null>(null);
  const [drafts, setDrafts] = useState<Record<Conversation, string>>({ coverage: "", recruiting: "" });
  const [saved, setSaved] = useState("");
  useEffect(() => {
    getRubrics().then((r) => { setRubrics(r); setDrafts({ coverage: r.coverage.join("\n"), recruiting: r.recruiting.join("\n") }); }).catch(() => setRubrics({ coverage: [], recruiting: [] }));
  }, []);
  const save = async (c: Conversation) => {
    const res = await saveRubric({ data: { conversation: c, items: drafts[c] } });
    if (res.ok) {
      setRubrics((prev) => (prev ? { ...prev, [c]: res.items } : prev));
      setDrafts((prev) => ({ ...prev, [c]: res.items.join("\n") }));
      setSaved(c);
      setTimeout(() => setSaved(""), 1500);
    }
  };
  return (
    <details className={`${card} p-4`} data-rubric-editor>
      <summary className="font-fantasy text-[#c08020] cursor-pointer">📋 Your rubric: what the debrief should notice</summary>
      <p className="text-[11px] text-[#a0a0a0] mt-2">One thing per line, in your words. The debrief judges only against these and the content rules; it never brings its own theory of selling. Lines that start with "Example: edit or delete" are starters.</p>
      {!rubrics ? (
        <p className="text-xs text-[#a0a0a0] mt-2">Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 mt-3">
          {(["coverage", "recruiting"] as Conversation[]).map((c) => (
            <div key={c} data-rubric={c}>
              <label className="block text-xs font-fantasy text-[#e0e0e0] mb-1">{c === "coverage" ? "🛡️ Coverage" : "🧭 Recruiting"} · {rubrics[c].length} item{rubrics[c].length === 1 ? "" : "s"}</label>
              <textarea value={drafts[c]} onChange={(e) => setDrafts((prev) => ({ ...prev, [c]: e.target.value }))} rows={6} className={`w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`} data-rubric-input />
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => save(c)} className={btnGhost} data-rubric-save>Save</button>
                {saved === c && <span className="text-[11px] text-[#7fd08a] font-fantasy">Saved</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}


const blankSection = (): PresentationSection => ({ id: "", title: "", minMinutes: 5, maxMinutes: 10, points: [] });

/** Section 7.2: John's outline in his own words, never the deck. Sections, target minutes, points. */
function PresentationEditor({ presentations, onChange }: { presentations: Presentation[]; onChange: () => void }) {
  const [editing, setEditing] = useState<{ id: number | null; name: string; conversation: Conversation; sections: Array<PresentationSection & { pointsText: string }> } | null>(null);
  const [msg, setMsg] = useState("");
  const input = `px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`;
  const open = (pres?: Presentation) => setEditing(pres
    ? { id: pres.id, name: pres.name, conversation: pres.conversation, sections: pres.sections.map((x) => ({ ...x, pointsText: x.points.join("\n") })) }
    : { id: null, name: "", conversation: "recruiting", sections: [{ ...blankSection(), pointsText: "" }] });
  const upd = (i: number, patch: Partial<PresentationSection & { pointsText: string }>) => setEditing((e) => (e ? { ...e, sections: e.sections.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : e));
  const move = (i: number, dir: -1 | 1) => setEditing((e) => { if (!e) return e; const a = [...e.sections]; const j = i + dir; if (j < 0 || j >= a.length) return e; [a[i], a[j]] = [a[j], a[i]]; return { ...e, sections: a }; });
  const save = async () => {
    if (!editing) return;
    const res = await savePresentation({ data: { id: editing.id ?? undefined, name: editing.name, conversation: editing.conversation, sections: editing.sections.map((x) => ({ id: x.id, title: x.title, minMinutes: x.minMinutes, maxMinutes: x.maxMinutes, points: x.pointsText.split("\n") })) } });
    if (res.ok) { setMsg(`Saved · version ${res.presentation?.version}`); setEditing(null); onChange(); setTimeout(() => setMsg(""), 2000); }
    else setMsg(res.error ?? "Could not save.");
  };
  return (
    <details className={`${card} p-4`} data-presentation-editor>
      <summary className="font-fantasy text-[#c08020] cursor-pointer">🎤 Your presentations: the outlines you practice</summary>
      <p className="text-[11px] text-[#a0a0a0] mt-2">An outline in your own words: sections in order, how long each should take, and the points you make. Not the deck itself. Editing one saves a new version; past sessions keep the version they were practiced against.</p>
      {msg && <p className="text-[11px] text-[#7fd08a] font-fantasy mt-1" data-presentation-msg>{msg}</p>}
      {!editing ? (
        <div className="mt-3 space-y-2">
          {presentations.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#406080]/30 px-3 py-2" data-presentation={x.id}>
              <div>
                <p className="text-sm text-[#e0e0e0] font-fantasy">{x.name} <span className="text-[11px] text-[#808080] font-sans">· {x.conversation} · {x.sections.length} sections · v{x.version}</span></p>
                <p className="text-[11px] text-[#808080]">{x.sections.map((sec) => sec.title).join(" → ")}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => open(x)} className={btnGhost} data-presentation-edit>Edit</button>
                <button type="button" onClick={async () => { if (confirm("Delete this presentation? Past sessions keep their copy.")) { await deletePresentation({ data: { id: x.id } }); onChange(); } }} className="text-[11px] text-[#606080] hover:text-red-300 font-fantasy">Delete</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => open()} className={btnGhost} data-presentation-new>➕ New presentation</button>
        </div>
      ) : (
        <div className="mt-3 space-y-3" data-presentation-form>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Presentation name" maxLength={120} className={input} data-presentation-name />
            <select value={editing.conversation} onChange={(e) => setEditing({ ...editing, conversation: e.target.value as Conversation })} className={input} aria-label="Conversation">
              <option value="recruiting" className="bg-gray-900">Recruiting</option>
              <option value="coverage" className="bg-gray-900">Coverage</option>
            </select>
          </div>
          <ol className="space-y-2">
            {editing.sections.map((sec, i) => (
              <li key={i} className="rounded-lg border border-[#406080]/30 p-3 space-y-2" data-section-row={i}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#808080] font-fantasy w-5">{i + 1}.</span>
                  <input value={sec.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Section title" maxLength={120} className={`${input} flex-1 min-w-[10rem]`} data-section-title />
                  <label className="text-[11px] text-[#a0a0a0]">min <input type="number" min={0} max={120} value={sec.minMinutes} onChange={(e) => upd(i, { minMinutes: Number(e.target.value) })} className={`${input} w-16 py-1`} /></label>
                  <label className="text-[11px] text-[#a0a0a0]">max <input type="number" min={0} max={180} value={sec.maxMinutes} onChange={(e) => upd(i, { maxMinutes: Number(e.target.value) })} className={`${input} w-16 py-1`} /></label>
                  <span className="text-[11px] text-[#808080]">minutes</span>
                  <button type="button" onClick={() => move(i, -1)} className="text-[#606080] hover:text-[#e0e0e0] text-xs" aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(i, 1)} className="text-[#606080] hover:text-[#e0e0e0] text-xs" aria-label="Move down">↓</button>
                  <button type="button" onClick={() => setEditing({ ...editing, sections: editing.sections.filter((_, j) => j !== i) })} className="text-[#606080] hover:text-red-300 text-xs" aria-label="Remove section">×</button>
                </div>
                <textarea value={sec.pointsText} onChange={(e) => upd(i, { pointsText: e.target.value })} rows={3} placeholder="The points you make in this section, one per line" className={`${input} w-full resize-none`} data-section-points />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing({ ...editing, sections: [...editing.sections, { ...blankSection(), pointsText: "" }] })} className={btnGhost}>➕ Add a section</button>
            <span className="flex-1" />
            <button type="button" onClick={() => setEditing(null)} className={btnGhost}>Cancel</button>
            <button type="button" onClick={save} className={btnPrimary} data-presentation-save>Save presentation</button>
          </div>
        </div>
      )}
    </details>
  );
}
