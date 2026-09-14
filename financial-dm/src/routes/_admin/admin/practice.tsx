import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { outcomeLabel, temperamentById, type Conversation, type Outcome } from "~/lib/practiceConfig";
import type { Presentation, PresentationSection } from "~/lib/practicePresentation";
import { stageLabel } from "~/lib/guildConfig";
import PracticeBanner from "~/components/practice/PracticeBanner";
import SetupForm, { type SetupApi, type SetupData } from "~/components/practice/SetupForm";
import { deletePersona, deletePresentation, deleteSession, generatePersona, getPracticeOverview, getPracticeSetup, getPresentations, getRubrics, savePersona, savePresentation, saveRubric, setSessionExample, startSession, type PracticeOverview, type PracticeSetup, type Rubrics, type SessionSummary } from "~/server/practice";
import { listPracticeRecruits } from "~/server/practiceRecruit";

/**
 * The Sparring Dummy setup screen (AI practice spec, Sections 1, 4, 5, 6).
 * The setup grid itself lives in components/practice/SetupForm so a recruit
 * can use the same form through their own token; this route wires it to
 * John's server calls and adds the outline and rubric editors underneath.
 * Every screen says PRACTICE (Rule 2.6).
 */
export const Route = createFileRoute("/_admin/admin/practice")({
  validateSearch: (s: Record<string, unknown>): { view?: "sessions" } => ({ view: s.view === "sessions" ? "sessions" : undefined }),
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
  const { view } = Route.useSearch();
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
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>🥊 The Sparring Dummy</h1>
            <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Rehearse a conversation with a fictional person before the real one. Reps, not evidence: AI personas are more patient and more articulate than real people, even on a rough day.</p>
          </div>
          <Link to="/admin/settings" search={{ view: "guide", topic: "dummy" }} className={`${btnGhost} shrink-0`} data-how-to>📖 How to</Link>
        </div>
        <nav className="flex gap-2" aria-label="Practice views" data-practice-views>
          <Link to="/admin/practice" search={{}} className={viewChip(!view)} data-practice-view="setup" aria-current={!view ? "page" : undefined}>Set up a session</Link>
          <Link to="/admin/practice" search={{ view: "sessions" }} className={viewChip(view === "sessions")} data-practice-view="sessions" aria-current={view === "sessions" ? "page" : undefined}>Sessions and recruits</Link>
        </nav>
        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-practice-error>{error}</div>}
        {view === "sessions" ? (
          <SessionsView />
        ) : (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}

const viewChip = (on: boolean) => `px-3 py-1.5 rounded-lg border text-sm font-fantasy ${focus} ${on ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50"}`;
const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "");

/** Section 9: every session John has run, with the "share as an example" switch, and what his recruits have practiced (counts and outcomes; transcripts only where they shared). */
function SessionsView() {
  const [data, setData] = useState<PracticeOverview | null>(null);
  const [recruits, setRecruits] = useState<Array<{ id: number; name: string; stage: string; granted: boolean }>>([]);
  const [error, setError] = useState("");
  const load = () => Promise.all([getPracticeOverview().then(setData), listPracticeRecruits().then(setRecruits)]).catch((e) => setError(String(e)));
  useEffect(() => {
    load();
  }, []);
  const toggleExample = async (s: SessionSummary) => {
    const res = await setSessionExample({ data: { id: s.id, shared: !s.sharedAsExample } });
    if (!res.ok) setError(res.error ?? "Could not change that.");
    else load();
  };
  const remove = async (id: number) => {
    if (!confirm("Delete this practice session? This cannot be undone.")) return;
    await deleteSession({ data: { id } });
    load();
  };
  const outcomesLine = (o: Partial<Record<Outcome, number>>) => Object.entries(o).map(([k, n]) => `${n} ${outcomeLabel(k).toLowerCase()}`).join(", ") || "none finished yet";
  const rows = recruits.filter((r) => r.granted || data?.recruits.some((x) => x.recruitId === r.id));
  const examples = data?.sessions.filter((s) => s.sharedAsExample).length ?? 0;

  return (
    <div className="space-y-4" data-sessions-view>
      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}
      <section className={`${card} p-4`} data-john-sessions>
        <h2 className="font-fantasy text-[#c08020] text-sm mb-1">Your sessions</h2>
        <p className="text-[11px] text-[#a0a0a0] mb-2">Mark a finished session as an example and every recruit with practice access can read it, debrief included. {examples ? `${examples} shared now.` : "None shared yet."}</p>
        {!data ? (
          <p className="text-xs text-[#a0a0a0]">Loading...</p>
        ) : data.sessions.length === 0 ? (
          <p className="text-xs text-[#a0a0a0]">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-session-table>
              <thead>
                <tr className="text-left text-[11px] text-[#808080] font-fantasy border-b border-[#406080]/20">
                  <th className="py-1 pr-3">When</th>
                  <th className="py-1 pr-3">Who</th>
                  <th className="py-1 pr-3">Conversation</th>
                  <th className="py-1 pr-3">Level</th>
                  <th className="py-1 pr-3">Exchanges</th>
                  <th className="py-1 pr-3">How it ended</th>
                  <th className="py-1 pr-3">Example</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id} className="border-b border-[#406080]/10" data-session-row={s.id}>
                    <td className="py-1.5 pr-3 text-[#a0a0a0] text-xs whitespace-nowrap">{fmt(s.createdAt)}</td>
                    <td className="py-1.5 pr-3 text-[#e0e0e0]"><a href={`/admin/practice/${s.id}`} className="underline underline-offset-2 hover:text-[#c08020]" data-session-open>{s.personaName}</a><span className="text-[11px] text-[#808080]"> · {temperamentById(s.temperament)?.label ?? s.temperament}</span></td>
                    <td className="py-1.5 pr-3 text-xs text-[#a0a0a0]">{s.conversation === "recruiting" ? "Recruiting" : "Coverage"}{s.mode === "presentation" ? " · presentation" : ""}</td>
                    <td className="py-1.5 pr-3 text-xs text-[#a0a0a0]">L{s.difficulty}</td>
                    <td className="py-1.5 pr-3 text-xs text-[#a0a0a0]">{s.turns}</td>
                    <td className="py-1.5 pr-3 text-xs text-[#a0a0a0]">{s.endedAt ? outcomeLabel(s.outcome ?? "ended_early") : "in progress"}</td>
                    <td className="py-1.5 pr-3">
                      <button type="button" onClick={() => toggleExample(s)} disabled={!s.endedAt} aria-pressed={s.sharedAsExample} className={`px-2 py-1 rounded border text-[11px] font-fantasy disabled:opacity-40 ${focus} ${s.sharedAsExample ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50"}`} data-session-example>{s.sharedAsExample ? "Shared" : "Share"}</button>
                    </td>
                    <td className="py-1.5 text-right"><button type="button" onClick={() => remove(s.id)} className="text-[11px] text-[#606080] hover:text-red-300 font-fantasy" data-session-delete>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${card} p-4`} data-recruit-practice-overview>
        <h2 className="font-fantasy text-[#c08020] text-sm mb-1">Your recruits' practice</h2>
        <p className="text-[11px] text-[#a0a0a0] mb-2">Give or take back access on each recruit's card in the <Link to="/admin/guild" search={{ view: "recruits" }} className="underline text-[#c08020]">Guild</Link>. You see how much they practiced and how it ended. Transcripts only when they share one.</p>
        {!data ? (
          <p className="text-xs text-[#a0a0a0]">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-[#a0a0a0]">No recruit has practice access yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const st = data.recruits.find((x) => x.recruitId === r.id);
              return (
                <li key={r.id} className="rounded-lg border border-[#406080]/30 px-3 py-2" data-recruit-practice={r.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-[#e0e0e0] font-fantasy">{r.name} <span className="text-[11px] text-[#808080] font-sans">· {stageLabel(r.stage)} · {r.granted ? "has access" : "access taken back"}</span></p>
                    <p className="text-[11px] text-[#a0a0a0]" data-recruit-practice-count>{!st || st.sessions === 0 ? "No sessions yet" : `${st.sessions} session${st.sessions === 1 ? "" : "s"} · last ${fmt(st.lastAt)}`}</p>
                  </div>
                  {st && st.sessions > 0 && <p className="text-[11px] text-[#a0a0a0]">How they ended: {outcomesLine(st.outcomes)}</p>}
                  {st && st.shared.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {st.shared.map((s) => (
                        <li key={s.id}><a href={`/admin/practice/${s.id}`} className="text-[11px] text-[#c08020] underline underline-offset-2" data-recruit-shared={s.id}>Shared with you: {fmt(s.createdAt)} · {s.personaName} · {s.endedAt ? outcomeLabel(s.outcome ?? "ended_early") : "in progress"}</a></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
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
      <p className="text-[11px] text-[#a0a0a0] mt-2">Your DM Screen scripts show up here on their own and are the best thing to practice against: write them once under Scripts, practice here, present from them. The outlines below are the older way and still work. Past sessions keep the version they were practiced against.</p>
      {presentations.some((x) => x.source === "dmScreen") && (
        <ul className="mt-3 space-y-1" data-dm-screen-scripts>
          {presentations.filter((x) => x.source === "dmScreen").map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#c08020]/30 px-3 py-2" data-presentation={x.id}>
              <p className="text-sm text-[#e0e0e0] font-fantasy">📜 {x.name} <span className="text-[11px] text-[#808080] font-sans">· {x.conversation} · {x.sections.length} sections · v{x.version} · DM Screen script</span></p>
              <a href={`/admin/scripts/${-x.id}`} className={btnGhost} data-presentation-open-script>Edit in The DM Screen</a>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-[11px] text-[#7fd08a] font-fantasy mt-1" data-presentation-msg>{msg}</p>}
      {!editing ? (
        <div className="mt-3 space-y-2">
          {presentations.filter((x) => x.source !== "dmScreen").map((x) => (
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
