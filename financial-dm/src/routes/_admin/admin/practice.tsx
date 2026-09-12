import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, DIFFICULTY_NOTE, outcomeLabel, temperamentById, temperamentsFor, type Conversation, type Difficulty } from "~/lib/practiceConfig";
import type { Persona } from "~/lib/practicePrompts";
import { deletePersona, deletePresentation, generatePersona, getPracticeSetup, getPresentations, getRubrics, savePersona, savePresentation, saveRubric, startSession, type PracticeSetup, type Rubrics } from "~/server/practice";
import type { Presentation, PresentationSection } from "~/lib/practicePresentation";
import type { PracticeMode } from "~/lib/practiceConfig";

/**
 * The Sparring Dummy setup screen (AI practice spec, Sections 1, 4, 5, 6).
 * Pick the conversation, a profile, a temperament, and a difficulty; invent
 * a fictional persona from the profile's description; start Objection
 * Practice. Every screen says PRACTICE (Rule 2.6).
 */
export const Route = createFileRoute("/_admin/admin/practice")({
  component: PracticePage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const chip = (on: boolean) => `px-3 py-1.5 rounded-lg border text-sm font-fantasy transition-all ${focus} ${on ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50"}`;
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs ${focus}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, params?: Record<string, string>) => ({ to, params } as any);

export function PracticeBanner() {
  return (
    <div className="bg-[#b8860b] text-[#1c1a12] text-xs sm:text-sm px-4 py-1.5 text-center font-semibold" data-practice-banner>
      PRACTICE · The person you are talking to is fictional. Nothing here touches a real lead or recruit.
    </div>
  );
}

function PracticePage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<PracticeSetup | null>(null);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState<Conversation>("coverage");
  const [profileId, setProfileId] = useState<number | null>(null);
  const [temperament, setTemperament] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const [rerolled, setRerolled] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [mode, setMode] = useState<PracticeMode>("objection");
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [presentationId, setPresentationId] = useState<number | null>(null);
  const loadPresentations = () => getPresentations().then(setPresentations).catch(() => setPresentations([]));

  const load = () => Promise.all([getPracticeSetup().then(setSetup), loadPresentations()]).catch((e) => setError(String(e)));
  useEffect(() => {
    load();
  }, []);

  const profiles = useMemo(() => (setup?.profiles ?? []).filter((p) => (conversation === "recruiting" ? p.kind === "recruit" : p.kind === "client")), [setup, conversation]);
  const saved = useMemo(() => (setup?.savedPersonas ?? []).filter((p) => p.conversation === conversation), [setup, conversation]);
  const temps = temperamentsFor(conversation);
  const presForConversation = presentations.filter((x) => x.conversation === conversation);
  useEffect(() => {
    if (!presForConversation.some((x) => x.id === presentationId)) setPresentationId(presForConversation[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentations, conversation]);
  useEffect(() => {
    // Switching the conversation resets what depends on it.
    setProfileId(null);
    setTemperament("");
    setPersona(null);
    setSnapshot("");
    setRerolled([]);
  }, [conversation]);

  const roll = async () => {
    if (!profileId) return;
    setBusy("persona");
    setError("");
    try {
      const avoid = persona ? [...rerolled, persona.name] : rerolled;
      const res = await generatePersona({ data: { profileId, conversation, avoidNames: avoid } });
      if (!res.ok || !res.persona) setError(res.error ?? "Could not invent a persona.");
      else {
        if (persona) setRerolled(avoid);
        setPersona(res.persona);
        setSnapshot(res.snapshot ?? "");
      }
    } finally {
      setBusy("");
    }
  };
  const keep = async () => {
    if (!persona) return;
    setBusy("save");
    try {
      const res = await savePersona({ data: { conversation, profileId, profileSnapshot: snapshot, persona } });
      if (res.ok) await load();
      else setError(res.error ?? "Could not save.");
    } finally {
      setBusy("");
    }
  };
  const start = async () => {
    if (!persona || !temperament) return;
    setBusy("start");
    setError("");
    try {
      const res = await startSession({ data: { conversation, profileId, profileSnapshot: snapshot, persona, temperament, difficulty, mode, presentationId: mode === "presentation" ? presentationId ?? undefined : undefined } });
      if (!res.ok || !res.session) setError(res.error ?? "Could not start.");
      else navigate({ ...linkTo("/admin/practice/$id", { id: String(res.session.id) }) });
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-practice-setup>
      <div className="max-w-5xl mx-auto space-y-5">
        <PracticeBanner />
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>🥊 The Sparring Dummy</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Rehearse a conversation with a fictional person before the real one. Reps, not evidence: AI personas are more patient and more articulate than real people, even on a rough day.</p>
        </div>
        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-practice-error>{error}</div>}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            {/* Conversation */}
            <section className={`${card} p-4`}>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">1 · Conversation</h2>
              <div className="flex gap-2" role="radiogroup" aria-label="Conversation">
                {(["coverage", "recruiting"] as Conversation[]).map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={conversation === c} onClick={() => setConversation(c)} className={chip(conversation === c)} data-conversation={c}>
                    {c === "coverage" ? "🛡️ Coverage" : "🧭 Recruiting"}
                  </button>
                ))}
              </div>
            </section>

            {/* Who */}
            <section className={`${card} p-4`}>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-1">2 · Who</h2>
              <p className="text-[11px] text-[#a0a0a0] mb-2">A profile from the {conversation === "recruiting" ? "Guild's recruit profiles" : "Quest Board's client profiles"}. The persona is invented from its description only.</p>
              {!setup ? (
                <p className="text-xs text-[#a0a0a0]">Loading profiles...</p>
              ) : profiles.length === 0 ? (
                <p className="text-xs text-[#a0a0a0]">No {conversation === "recruiting" ? "recruit" : "client"} profiles yet. Add one on the <Link {...linkTo("/admin/quests")} search={{ section: "profiles" }} className="underline text-[#c08020]">Quest Board</Link>.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {profiles.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setProfileId(p.id); setPersona(null); setRerolled([]); }} aria-pressed={profileId === p.id} className={`text-left rounded-lg border px-3 py-2 ${focus} ${profileId === p.id ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-profile={p.id}>
                      <span className="block text-[#e0e0e0] text-sm font-fantasy">{p.name}</span>
                      <span className="block text-[11px] text-[#808080] line-clamp-2">{p.lifeStage || p.worries}</span>
                    </button>
                  ))}
                </div>
              )}
              {saved.length > 0 && (
                <div className="mt-3 border-t border-[#406080]/20 pt-3">
                  <p className="text-[11px] text-[#a0a0a0] font-fantasy mb-1">Saved personas: practice the same person again</p>
                  <ul className="space-y-1">
                    {saved.map((sp) => (
                      <li key={sp.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#406080]/30 px-3 py-1.5" data-saved-persona={sp.id}>
                        <button type="button" onClick={() => { setPersona(sp.persona); setSnapshot(sp.profileSnapshot); setProfileId(sp.profileId); }} className={`text-left flex-1 min-w-0 ${focus}`} data-saved-persona-use>
                          <span className="block text-sm text-[#e0e0e0]">{sp.persona.name}, {sp.persona.ageRange}</span>
                          <span className="block text-[11px] text-[#808080] truncate">{sp.persona.backstory}</span>
                        </button>
                        <button type="button" onClick={async () => { await deletePersona({ data: { id: sp.id } }); load(); }} className="text-[11px] text-[#606080] hover:text-red-300" aria-label="Forget this persona">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Temperament */}
            <section className={`${card} p-4`}>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">3 · Temperament</h2>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Temperament">
                {temps.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={temperament === t.id} onClick={() => setTemperament(t.id)} className={chip(temperament === t.id)} data-temperament={t.id}>
                    {t.label}
                  </button>
                ))}
              </div>
              {temperament && <p className="text-[11px] text-[#a0a0a0] mt-2" data-temperament-blurb>{temperamentById(temperament)?.behavior}</p>}
            </section>

            {/* Difficulty */}
            <section className={`${card} p-4`}>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">4 · Difficulty</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Difficulty">
                {DIFFICULTY_LEVELS.map((d) => (
                  <button key={d.level} type="button" role="radio" aria-checked={difficulty === d.level} onClick={() => setDifficulty(d.level)} className={`text-left rounded-lg border px-3 py-2 ${focus} ${difficulty === d.level ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-difficulty={d.level}>
                    <span className="block text-[#e0e0e0] text-sm font-fantasy">{d.level} · {d.name}{d.level === DEFAULT_DIFFICULTY && <span className="ml-1 text-[10px] text-[#c08020]">default</span>}</span>
                    <span className="block text-[11px] text-[#808080]">{d.summary}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#e0c080] font-fantasy mt-2" data-difficulty-note>{DIFFICULTY_NOTE}</p>
            </section>
          </div>

          <div className="space-y-4">
            {/* Persona */}
            <section className={`${card} p-4`} data-persona-card>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">5 · The person</h2>
              {!persona ? (
                <>
                  <p className="text-[11px] text-[#a0a0a0] mb-2">{profileId ? "Invent a fictional person from this profile." : "Pick a profile first."}</p>
                  <button type="button" onClick={roll} disabled={!profileId || busy === "persona"} className={btnPrimary} data-persona-generate>{busy === "persona" ? "Inventing..." : "🎲 Invent a person"}</button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-[#e0e0e0] font-fantasy text-lg" data-persona-name>{persona.name}<span className="text-[#a0a0a0] text-sm font-sans">, {persona.ageRange}</span></p>
                  <p className="text-xs text-[#a0a0a0]">{persona.household}</p>
                  <p className="text-sm text-[#c9d3e3]" data-persona-backstory>{persona.backstory}</p>
                  <p className="text-[11px] text-[#606080]">Fictional. Built from the profile description only. What they are really worried about stays hidden until you pause for a hint or read the debrief.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={roll} disabled={busy === "persona"} className={btnGhost} data-persona-reroll>{busy === "persona" ? "Inventing..." : "🎲 Reroll"}</button>
                    <button type="button" onClick={keep} disabled={busy === "save"} className={btnGhost} data-persona-save>💾 Save this person</button>
                  </div>
                </div>
              )}
            </section>

            {/* Mode + start */}
            <section className={`${card} p-4`}>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">6 · Mode</h2>
              <div className="space-y-2" role="radiogroup" aria-label="Mode">
                <button type="button" role="radio" aria-checked={mode === "objection"} onClick={() => setMode("objection")} className={`w-full text-left rounded-lg border px-3 py-2 ${focus} ${mode === "objection" ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-mode="objection">
                  <p className="text-[#e0e0e0] text-sm font-fantasy">💬 Objection Practice</p>
                  <p className="text-[11px] text-[#a0a0a0]">Open back-and-forth. Short reps on handling pushback. Pause any time for a hint.</p>
                </button>
                <button type="button" role="radio" aria-checked={mode === "presentation"} onClick={() => setMode("presentation")} className={`w-full text-left rounded-lg border px-3 py-2 ${focus} ${mode === "presentation" ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-mode="presentation">
                  <p className="text-[#e0e0e0] text-sm font-fantasy">🎤 Presentation Practice</p>
                  <p className="text-[11px] text-[#a0a0a0]">Walk through your outline section by section while they react, interrupt, and jump ahead. Getting back on track is the skill.</p>
                </button>
                {mode === "presentation" && (
                  <div className="pl-3">
                    {presForConversation.length === 0 ? (
                      <p className="text-[11px] text-[#e0c080]">No {conversation} presentation yet. Add one under "Your presentations" below.</p>
                    ) : (
                      <select value={presentationId ?? ""} onChange={(e) => setPresentationId(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`} aria-label="Presentation" data-presentation-pick>
                        {presForConversation.map((x) => (
                          <option key={x.id} value={x.id} className="bg-gray-900">{x.name} · {x.sections.length} sections · v{x.version}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <button type="button" onClick={start} disabled={!persona || !temperament || busy === "start" || (mode === "presentation" && !presentationId)} className={`${btnPrimary} mt-3 w-full`} data-practice-start>
                {busy === "start" ? "Setting the scene..." : `Start practice with ${persona?.name ?? "..."}`}
              </button>
              {(!persona || !temperament) && <p className="text-[11px] text-[#606080] mt-1">Needs a person and a temperament.</p>}
              {setup && <p className="text-[10px] text-[#606080] mt-2">Practice partner model: {setup.model}</p>}
            </section>

            {/* Recent */}
            <section className={`${card} p-4`} data-recent-sessions>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">Recent practice</h2>
              {!setup ? null : setup.recent.length === 0 ? (
                <p className="text-xs text-[#a0a0a0]">No sessions yet.</p>
              ) : (
                <ul className="space-y-1">
                  {setup.recent.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <Link {...linkTo("/admin/practice/$id", { id: String(s.id) })} className={`block rounded-lg border border-[#406080]/30 px-3 py-2 hover:border-[#c08020]/50 ${focus}`} data-recent-session={s.id}>
                        <span className="block text-sm text-[#e0e0e0]">{s.persona.name} · {temperamentById(s.temperament)?.label ?? s.temperament} · L{s.difficulty}</span>
                        <span className="block text-[11px] text-[#808080]">{s.conversation === "recruiting" ? "Recruiting" : "Coverage"} · {s.turns} exchange{s.turns === 1 ? "" : "s"} · {s.endedAt ? outcomeLabel(s.outcome ?? "ended_early") : "in progress"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

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
