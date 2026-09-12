import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, DIFFICULTY_NOTE, outcomeLabel, temperamentById, temperamentsFor, type Conversation, type Difficulty } from "~/lib/practiceConfig";
import type { Persona } from "~/lib/practicePrompts";
import { deletePersona, generatePersona, getPracticeSetup, savePersona, startSession, type PracticeSetup } from "~/server/practice";

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

  const load = () => getPracticeSetup().then(setSetup).catch((e) => setError(String(e)));
  useEffect(() => {
    load();
  }, []);

  const profiles = useMemo(() => (setup?.profiles ?? []).filter((p) => (conversation === "recruiting" ? p.kind === "recruit" : p.kind === "client")), [setup, conversation]);
  const saved = useMemo(() => (setup?.savedPersonas ?? []).filter((p) => p.conversation === conversation), [setup, conversation]);
  const temps = temperamentsFor(conversation);
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
      const res = await startSession({ data: { conversation, profileId, profileSnapshot: snapshot, persona, temperament, difficulty } });
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
              <div className="space-y-2">
                <div className="rounded-lg border border-[#c08020] bg-[#c08020]/10 px-3 py-2">
                  <p className="text-[#e0e0e0] text-sm font-fantasy">💬 Objection Practice</p>
                  <p className="text-[11px] text-[#a0a0a0]">Open back-and-forth. Short reps on handling pushback. Pause any time for a hint.</p>
                </div>
                <div className="rounded-lg border border-dashed border-[#406080]/40 px-3 py-2 opacity-70">
                  <p className="text-[#a0a0a0] text-sm font-fantasy">🎤 Presentation Practice</p>
                  <p className="text-[11px] text-[#808080]">Coming in Phase 3, once there are scripts to practice against.</p>
                </div>
              </div>
              <button type="button" onClick={start} disabled={!persona || !temperament || busy === "start"} className={`${btnPrimary} mt-3 w-full`} data-practice-start>
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
      </div>
    </main>
  );
}
