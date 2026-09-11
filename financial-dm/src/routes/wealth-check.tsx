import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import D20Dice from "~/components/D20Dice";
import LeadModal from "~/components/LeadModal";
import WealthReport, { WEALTH_QUESTIONS, computeScore, scoresFromAnswers, tierForScore } from "~/components/WealthReport";
import StatSheet, { FloatingMods, centerOf, type FloatingMod } from "~/components/wealth/StatSheet";
import { OPENING_BUTTON, openingRollCopy } from "~/components/wealth/wealthCopy";
import { computeProfile, formatMod, type Answers, type StatKey } from "~/lib/wealthProfile";
import { defaultRng } from "~/lib/wealthRng";
import { saveLead } from "~/server/leads";

type Phase = "intro" | "questions" | "result";

const TOTAL_QUESTIONS = WEALTH_QUESTIONS.length;

/**
 * Everything the quiz remembers, saved to sessionStorage on every change so
 * a refresh resumes exactly where the player was. Rolls live here too: a
 * roll happens once, is stored the moment it happens, and is never redone.
 */
interface QuizState {
  phase: Phase;
  questionIndex: number;
  answers: Answers;
  rolls: { intro?: number };
}

const STORAGE_KEY = "wealth_quiz_v2";
const FRESH: QuizState = { phase: "intro", questionIndex: 0, answers: {}, rolls: {} };

function loadState(): QuizState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      phase: parsed.phase === "questions" || parsed.phase === "result" ? parsed.phase : "intro",
      questionIndex: Math.max(0, Math.min(TOTAL_QUESTIONS - 1, Number(parsed.questionIndex) || 0)),
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      rolls: parsed.rolls && typeof parsed.rolls === "object" ? parsed.rolls : {},
    };
  } catch {
    return null;
  }
}

function saveState(state: QuizState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function readUtmParams(): { utm_source: string; utm_medium: string; utm_campaign: string } {
  if (typeof window === "undefined") return { utm_source: "", utm_medium: "", utm_campaign: "" };
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
  };
  try {
    if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
      sessionStorage.setItem("wealth_utm", JSON.stringify(utm));
    }
  } catch {
    // ignore
  }
  return utm;
}

function getStoredUtm(): { utm_source: string; utm_medium: string; utm_campaign: string } {
  if (typeof window === "undefined") return { utm_source: "", utm_medium: "", utm_campaign: "" };
  try {
    const stored = sessionStorage.getItem("wealth_utm");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        utm_source: parsed.utm_source || "",
        utm_medium: parsed.utm_medium || "",
        utm_campaign: parsed.utm_campaign || "",
      };
    }
  } catch {
    // ignore
  }
  return { utm_source: "", utm_medium: "", utm_campaign: "" };
}

export const Route = createFileRoute("/wealth-check")({
  component: WealthCheckPage,
});

function WealthCheckPage() {
  const [state, setState] = useState<QuizState>(FRESH);
  const [hydrated, setHydrated] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [utmParams] = useState(() => readUtmParams());
  const [floats, setFloats] = useState<FloatingMod[]>([]);
  const [flash, setFlash] = useState<StatKey | null>(null);
  const floatId = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Resume a saved game after mount (the server render always starts fresh).
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setState(saved);
      if (saved.rolls.intro) setIntroDone(saved.phase !== "intro");
    }
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<QuizState> | ((prev: QuizState) => Partial<QuizState>)) => {
    setState((prev) => {
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
      saveState(next);
      return next;
    });
  }, []);

  // The opening roll is decided once, before the die even starts moving.
  useEffect(() => {
    if (!hydrated) return;
    if (state.phase === "intro" && !state.rolls.intro) {
      update((prev) => ({ rolls: { ...prev.rolls, intro: defaultRng.d20() } }));
    }
  }, [hydrated, state.phase, state.rolls.intro, update]);

  const profile = useMemo(() => computeProfile(WEALTH_QUESTIONS, state.answers), [state.answers]);

  const scrollTop = useCallback(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  const handleBegin = () => {
    update({ phase: "questions", questionIndex: 0 });
    scrollTop();
  };

  const handleSelect = (key: string, optionId: string, buttonEl: HTMLElement) => {
    update((prev) => ({ answers: { ...prev.answers, [key]: optionId } }));
    // Display only: a label drifts from the answer to its stat chip.
    const q = WEALTH_QUESTIONS.find((x) => x.key === key);
    const opt = q?.options.find((o) => o.id === optionId);
    const mods = Object.entries(opt?.modifiers ?? {}) as Array<[StatKey, number]>;
    if (mods.length === 0) return;
    const from = centerOf(buttonEl);
    if (!from || prefersReducedMotion()) {
      setFlash(mods[0][0]);
      setTimeout(() => setFlash(null), 500);
      return;
    }
    const spawned: FloatingMod[] = [];
    for (const [stat, v] of mods) {
      const to = centerOf(sheetRef.current?.querySelector(`[data-stat="${stat}"]`) ?? null) ?? from;
      spawned.push({ id: ++floatId.current, text: `${formatMod(v)} ${stat}`, negative: v < 0, from, to });
    }
    setFloats((prev) => [...prev, ...spawned]);
    setTimeout(() => {
      setFlash(mods[0][0]);
      setTimeout(() => setFlash(null), 400);
    }, 600);
  };

  const handleNext = () => {
    if (state.questionIndex < TOTAL_QUESTIONS - 1) {
      update({ questionIndex: state.questionIndex + 1 });
    } else {
      update({ phase: "result" });
    }
    scrollTop();
  };

  const handleBack = () => {
    if (state.questionIndex > 0) update({ questionIndex: state.questionIndex - 1 });
    else update({ phase: "intro" });
    scrollTop();
  };

  const handleCTA = () => {
    setShowModal(true);
  };

  const handleSubmitLead = async (name: string, email: string, phone: string) => {
    setShowModal(false);
    setTransitioning(true);

    const storedUtm = getStoredUtm();
    const finalUtm = {
      utm_source: utmParams.utm_source || storedUtm.utm_source,
      utm_medium: utmParams.utm_medium || storedUtm.utm_medium,
      utm_campaign: utmParams.utm_campaign || storedUtm.utm_campaign,
    };
    const scores = scoresFromAnswers(state.answers);

    try {
      const saved = await saveLead({
        data: {
          name,
          email,
          phone,
          age_range: "",
          dependents: "",
          has_insurance: "",
          biggest_concern: "",
          timeline: "",
          ...finalUtm,
          quiz_type: "financial-health",
          quiz_result: tierForScore(computeScore(scores)).name,
          quiz_score: computeScore(scores),
        },
      });
      if (!saved.ok) console.error("[lead] save failed:", saved.error);
    } catch (e) {
      // Still send the visitor on to Calendly; the booking matters more than
      // the record. The failure is logged so it is not invisible.
      console.error("[lead] save threw:", e);
    }

    await new Promise((r) => setTimeout(r, 1500));

    const calendlyUrl = new URL("https://calendly.com/thefinancialdm-proton/30min");
    calendlyUrl.searchParams.set("name", name);
    calendlyUrl.searchParams.set("email", email);
    window.location.href = calendlyUrl.toString();
  };

  const q = WEALTH_QUESTIONS[state.questionIndex];
  const selectedId = q ? state.answers[q.key] : undefined;
  const introRoll = state.rolls.intro;

  return (
    <main
      className="min-h-dvh flex flex-col items-center py-8 px-4 relative"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
      <FloatingMods items={floats} onDone={(id) => setFloats((prev) => prev.filter((f) => f.id !== id))} />

      {/* Transition overlay */}
      {transitioning && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: "rgba(8, 14, 22, 0.95)" }}
        >
          <div className="w-16 h-16 border-4 border-[#c08020] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#e0e0e0] font-fantasy text-lg animate-pulse">
            Rolling for wealth...
          </p>
          <p className="text-[#a0a0a0] text-sm font-fantasy">
            Thy council with the DM awaits!
          </p>
        </div>
      )}

      {/* Brand header (compact once the questions start so the sheet has room) */}
      <div className={`text-center ${state.phase === "questions" ? "mb-3" : "mb-6"}`}>
        {state.phase !== "questions" && (
          <>
            <img src="/logo.png" alt="The Financial DM" className="h-40 sm:h-52 w-auto mx-auto mb-2 drop-shadow-lg" />
            <p className="text-[#c9a25a] text-xs sm:text-sm font-fantasy tracking-wide -mt-1 mb-3">Protect what matters most, because life is unpredictable.</p>
          </>
        )}
        <h1
          className={`font-fantasy text-[#c08020] tracking-wide ${state.phase === "questions" ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"}`}
          style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
        >
          💰 Roll for Wealth 💰
        </h1>
        {state.phase !== "questions" && (
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
            The Financial DM: Financial Health Check
          </p>
        )}
      </div>

      {/* Phase: opening roll */}
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-slide-in">
          {introRoll ? (
            <D20Dice
              key={introRoll}
              value={introRoll}
              durationMs={1100}
              skippable
              honorReducedMotion
              resultText={(n) => `You rolled a ${n}.`}
              announce={(n) => `You rolled a ${n}. This roll does not affect your results.`}
              onComplete={() => setIntroDone(true)}
            />
          ) : (
            <div className="h-48" />
          )}

          <div className={`w-full max-w-sm rounded-xl border-2 border-[#8b6914]/60 p-5 text-center transition-opacity duration-500 ${introDone ? "opacity-100" : "opacity-0"}`}
            style={{ background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)" }}
            aria-hidden={!introDone}
          >
            <p className="text-[#3a2c1a] font-fantasy leading-relaxed">“{introRoll ? openingRollCopy(introRoll) : ""}”</p>
            <p className="mt-2 text-[#7a5f30] text-xs font-fantasy">John, behind the bar</p>
          </div>

          <button
            onClick={handleBegin}
            disabled={!introDone}
            className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:opacity-40 text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            ⚔️ {OPENING_BUTTON}
          </button>

          <p className="text-[#606080] text-xs text-center max-w-xs font-fantasy leading-relaxed">
            Ten questions build your character sheet. You can't control the roll, but you can stack your modifiers.
          </p>
        </div>
      )}

      {/* Phase: Questions */}
      {state.phase === "questions" && q && (
        <div className="w-full max-w-md mx-auto">
          <div ref={sheetRef} className="sticky top-2 z-30 mb-4">
            <StatSheet profile={profile} flash={flash} />
          </div>

          <div key={state.questionIndex} className="flex flex-col items-center gap-5 w-full px-1 animate-slide-in">
            {/* Progress */}
            <div className="w-full flex flex-col gap-2 items-center">
              <div className="w-full flex gap-1.5">
                {WEALTH_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i < state.questionIndex
                        ? "bg-[#c08020]"
                        : i === state.questionIndex
                          ? "bg-[#c08020] animate-pulse"
                          : "bg-[#204060]/40"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-[#a0a0a0] font-fantasy tracking-wider uppercase">
                Question {state.questionIndex + 1} of {TOTAL_QUESTIONS}
              </p>
            </div>

            {/* Parchment card */}
            <div
              className="w-full rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 p-5 sm:p-6"
              style={{
                background:
                  "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)",
                boxShadow:
                  "inset 0 0 40px rgba(139,105,20,0.25), 0 20px 50px rgba(0,0,0,0.45)",
              }}
            >
              <div className="flex items-center justify-between text-[#8b6914] opacity-70 text-sm select-none">
                <span>❦</span>
                <span className="font-fantasy tracking-widest text-xs uppercase">
                  {q.label}
                </span>
                <span>❦</span>
              </div>

              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-[#3a2c1a] text-center leading-snug">
                {q.question}
              </h2>
              <p className="mt-2 text-sm italic text-[#7a5f30] text-center font-fantasy leading-relaxed">
                “{q.dm}”
              </p>

              <div className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label={q.question}>
                {q.options.map((opt) => {
                  const isSelected = selectedId === opt.id;
                  const mods = Object.entries(opt.modifiers ?? {}) as Array<[StatKey, number]>;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={(e) => handleSelect(q.key, opt.id, e.currentTarget)}
                      className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-[#3a2c1a] bg-[#3a2c1a] text-[#f5e6c8] shadow-lg"
                          : "border-[#8b6914]/40 bg-[#fdf3dc]/60 text-[#4a3820] hover:border-[#8b6914]/80 hover:bg-[#fdf3dc]"
                      }`}
                    >
                      <span>{opt.text}</span>
                      {mods.length > 0 && isSelected && (
                        <span className="shrink-0 text-xs font-fantasy tabular-nums text-[#e0b45a]">
                          {mods.map(([k, v]) => `${formatMod(v)} ${k}`).join(" ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-lg font-fantasy text-sm text-[#7a5f30] hover:text-[#3a2c1a] transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedId}
                  className={`px-6 py-2.5 rounded-lg font-fantasy text-sm transition-all ${
                    selectedId
                      ? "bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold shadow-lg shadow-[#8b6914]/30"
                      : "bg-[#c9b27e]/50 text-[#8a7a58] cursor-not-allowed"
                  }`}
                >
                  {state.questionIndex === TOTAL_QUESTIONS - 1 ? "Reveal Thy Tier →" : "Next →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Result */}
      {state.phase === "result" && (
        <WealthReport scores={scoresFromAnswers(state.answers)} onCTA={handleCTA} />
      )}

      {/* Lead capture modal */}
      <LeadModal
        isOpen={showModal}
        onSubmit={handleSubmitLead}
        onClose={() => setShowModal(false)}
      />
    </main>
  );
}
