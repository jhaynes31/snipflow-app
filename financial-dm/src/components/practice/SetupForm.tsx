import { useEffect, useMemo, useState } from "react";
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, DIFFICULTY_NOTE, outcomeLabel, temperamentById, temperamentsFor, type Conversation, type Difficulty, type PracticeMode } from "~/lib/practiceConfig";
import type { Persona } from "~/lib/practicePrompts";
import type { Presentation } from "~/lib/practicePresentation";
import type { PracticeSession, SessionResult } from "~/server/practice";

/**
 * The Sparring Dummy setup (AI practice spec, Sections 1, 4, 5, 6), shared
 * by John's Practice tab and a recruit's limited view. The caller supplies
 * the data and the server calls; recruits get a suggested level, never a
 * locked one (Section 6).
 */

export interface SetupData {
  profiles: Array<{ id: number; kind: "client" | "recruit"; name: string; lifeStage: string; worries: string }>;
  savedPersonas: Array<{ id: number; conversation: Conversation; profileId: number | null; profileSnapshot: string; persona: Persona }>;
  presentations: Array<Pick<Presentation, "id" | "name" | "conversation" | "version"> & { sectionCount: number }>;
  recent: PracticeSession[];
  model?: string;
}

export interface SetupApi {
  generatePersona: (input: { profileId: number; conversation: Conversation; avoidNames: string[] }) => Promise<{ ok: boolean; error?: string; persona?: Persona; snapshot?: string }>;
  startSession: (input: { conversation: Conversation; profileId: number | null; profileSnapshot: string; persona: Persona; temperament: string; difficulty: Difficulty; mode: PracticeMode; presentationId?: number }) => Promise<SessionResult>;
  savePersona?: (input: { conversation: Conversation; profileId: number | null; profileSnapshot: string; persona: Persona }) => Promise<{ ok: boolean; error?: string }>;
  deletePersona?: (id: number) => Promise<{ ok: boolean }>;
  refresh: () => void;
}

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const chip = (on: boolean) => `px-3 py-1.5 rounded-lg border text-sm font-fantasy transition-all ${focus} ${on ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50"}`;
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs ${focus}`;

export default function SetupForm({ data, api, onStarted, sessionHref, suggested, suggestedNote, profilesEmptyNote, defaultConversation = "coverage" }: { data: SetupData; api: SetupApi; onStarted: (id: number) => void; sessionHref: (id: number) => string; suggested?: Difficulty; suggestedNote?: string; profilesEmptyNote?: string; defaultConversation?: Conversation }) {
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState<Conversation>(defaultConversation);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [temperament, setTemperament] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(suggested ?? DEFAULT_DIFFICULTY);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const [rerolled, setRerolled] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [mode, setMode] = useState<PracticeMode>("objection");
  const [presentationId, setPresentationId] = useState<number | null>(null);

  const profiles = useMemo(() => data.profiles.filter((p) => (conversation === "recruiting" ? p.kind === "recruit" : p.kind === "client")), [data.profiles, conversation]);
  const saved = useMemo(() => data.savedPersonas.filter((p) => p.conversation === conversation), [data.savedPersonas, conversation]);
  const temps = temperamentsFor(conversation);
  const presForConversation = data.presentations.filter((x) => x.conversation === conversation);
  useEffect(() => {
    if (!presForConversation.some((x) => x.id === presentationId)) setPresentationId(presForConversation[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.presentations, conversation]);
  useEffect(() => {
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
      const res = await api.generatePersona({ profileId, conversation, avoidNames: avoid });
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
    if (!persona || !api.savePersona) return;
    setBusy("save");
    try {
      const res = await api.savePersona({ conversation, profileId, profileSnapshot: snapshot, persona });
      if (res.ok) api.refresh();
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
      const res = await api.startSession({ conversation, profileId, profileSnapshot: snapshot, persona, temperament, difficulty, mode, presentationId: mode === "presentation" ? presentationId ?? undefined : undefined });
      if (!res.ok || !res.session) setError(res.error ?? "Could not start.");
      else onStarted(res.session.id);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-practice-error>{error}</div>}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
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

          <section className={`${card} p-4`}>
            <h2 className="font-fantasy text-[#c08020] text-sm mb-1">2 · Who</h2>
            <p className="text-[11px] text-[#a0a0a0] mb-2">A {conversation === "recruiting" ? "recruit" : "client"} profile. The persona is invented from its description only.</p>
            {profiles.length === 0 ? (
              <p className="text-xs text-[#a0a0a0]">{profilesEmptyNote ?? `No ${conversation === "recruiting" ? "recruit" : "client"} profiles yet.`}</p>
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
                      {api.deletePersona && <button type="button" onClick={async () => { await api.deletePersona!(sp.id); api.refresh(); }} className="text-[11px] text-[#606080] hover:text-red-300" aria-label="Forget this persona">×</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

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

          <section className={`${card} p-4`}>
            <h2 className="font-fantasy text-[#c08020] text-sm mb-2">4 · Difficulty</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTY_LEVELS.map((d) => (
                <button key={d.level} type="button" role="radio" aria-checked={difficulty === d.level} onClick={() => setDifficulty(d.level)} className={`text-left rounded-lg border px-3 py-2 ${focus} ${difficulty === d.level ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-difficulty={d.level}>
                  <span className="block text-[#e0e0e0] text-sm font-fantasy">{d.level} · {d.name}{d.level === (suggested ?? DEFAULT_DIFFICULTY) && <span className="ml-1 text-[10px] text-[#c08020]">{suggested ? "suggested" : "default"}</span>}</span>
                  <span className="block text-[11px] text-[#808080]">{d.summary}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#e0c080] font-fantasy mt-2" data-difficulty-note>{suggestedNote ? `${suggestedNote} ` : ""}{DIFFICULTY_NOTE}</p>
          </section>
        </div>

        <div className="space-y-4">
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
                  {api.savePersona && <button type="button" onClick={keep} disabled={busy === "save"} className={btnGhost} data-persona-save>💾 Save this person</button>}
                </div>
              </div>
            )}
          </section>

          <section className={`${card} p-4`}>
            <h2 className="font-fantasy text-[#c08020] text-sm mb-2">6 · Mode</h2>
            <div className="space-y-2" role="radiogroup" aria-label="Mode">
              <button type="button" role="radio" aria-checked={mode === "objection"} onClick={() => setMode("objection")} className={`w-full text-left rounded-lg border px-3 py-2 ${focus} ${mode === "objection" ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-mode="objection">
                <p className="text-[#e0e0e0] text-sm font-fantasy">💬 Objection Practice</p>
                <p className="text-[11px] text-[#a0a0a0]">Open back-and-forth. Short reps on handling pushback. Pause any time for a hint.</p>
              </button>
              <button type="button" role="radio" aria-checked={mode === "presentation"} onClick={() => setMode("presentation")} className={`w-full text-left rounded-lg border px-3 py-2 ${focus} ${mode === "presentation" ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/40 hover:border-[#c08020]/50"}`} data-mode="presentation">
                <p className="text-[#e0e0e0] text-sm font-fantasy">🎤 Presentation Practice</p>
                <p className="text-[11px] text-[#a0a0a0]">Walk through the outline section by section while they react, interrupt, and jump ahead. Getting back on track is the skill.</p>
              </button>
              {mode === "presentation" && (
                <div className="pl-3">
                  {presForConversation.length === 0 ? (
                    <p className="text-[11px] text-[#e0c080]">No {conversation} presentation yet.</p>
                  ) : (
                    <select value={presentationId ?? ""} onChange={(e) => setPresentationId(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`} aria-label="Presentation" data-presentation-pick>
                      {presForConversation.map((x) => (
                        <option key={x.id} value={x.id} className="bg-gray-900">{x.name} · {x.sectionCount} sections · v{x.version}</option>
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
            {data.model && <p className="text-[10px] text-[#606080] mt-2">Practice partner model: {data.model}</p>}
          </section>

          <section className={`${card} p-4`} data-recent-sessions>
            <h2 className="font-fantasy text-[#c08020] text-sm mb-2">Recent practice</h2>
            {data.recent.length === 0 ? (
              <p className="text-xs text-[#a0a0a0]">No sessions yet.</p>
            ) : (
              <ul className="space-y-1">
                {data.recent.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <a href={sessionHref(s.id)} className={`block rounded-lg border border-[#406080]/30 px-3 py-2 hover:border-[#c08020]/50 ${focus}`} data-recent-session={s.id}>
                      <span className="block text-sm text-[#e0e0e0]">{s.persona.name} · {temperamentById(s.temperament)?.label ?? s.temperament} · L{s.difficulty}{s.mode === "presentation" ? " · 🎤" : ""}</span>
                      <span className="block text-[11px] text-[#808080]">{s.conversation === "recruiting" ? "Recruiting" : "Coverage"} · {s.turns} exchange{s.turns === 1 ? "" : "s"} · {s.endedAt ? outcomeLabel(s.outcome ?? "ended_early") : "in progress"}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
