import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import D20Dice from "~/components/D20Dice";
import LeadModal, { type LeadSubmitOutcome } from "~/components/LeadModal";
import PartyRoster from "~/components/life/PartyRoster";
import PartyTable from "~/components/life/PartyTable";
import TrapOrTreasure from "~/components/life/TrapOrTreasure";
import DamageRoll, { type DamageDie } from "~/components/life/DamageRoll";
import ArmorReveal from "~/components/life/ArmorReveal";
import ArmorResults from "~/components/life/ArmorResults";
import LifeLoot from "~/components/life/LifeLoot";
import LifeShareCard from "~/components/life/LifeShareCard";
import { LIFE_LOOT_LINE, lifeLootById } from "~/lib/armorLoot";
import { trapShareText } from "~/lib/lifeShare";
import { renderShareCard, shareOrDownload } from "~/lib/wealthShare";
import { ARMOR_BUTTON, DAMAGE_BUTTON, DAMAGE_INTRO, DAMAGE_LABELS, SOLO_DAMAGE_LABEL } from "~/components/life/lifeCopy";
import { CARDS_PER_GAME, type MythAnswer } from "~/components/life/mythDeck";
import { dealMyths, mythScore, mythSummary, parseDebugMyths, type MythGame } from "~/lib/lifeMyths";
import { defaultRng } from "~/lib/wealthRng";
import { LOADED_ROLL_1, LOADED_ROLL_1_BUTTON, LOADED_ROLL_2, LOADED_ROLL_2_BUTTON, LOADED_TAGLINE } from "~/components/life/lifeCopy";
import { ARMOR_CONFIG } from "~/lib/armorConfig";
import { EMPTY_PARTY, PARTY_IDS, TIER_NAME, computeArmor, partySummary, roundTo10k, type LifeAnswers, type PartyId } from "~/lib/armorEngine";
import { YOUNGEST_OPTIONS, optionText, visibleQuestions, type LifeQuestion } from "~/lib/lifeQuestions";
import { saveLead } from "~/server/leads";

/**
 * The life insurance quiz, "loaded dice" version (Section 4):
 * INTRO_ROLL → PARTY → MONEY_QUESTIONS → TRAP_OR_TREASURE → COVERAGE_QUESTIONS
 * → DAMAGE_ROLL → AC_REVEAL → RESULTS → LOOT → SHARE
 *
 * Phase 1 builds the opening roll, the party, the questions, and the estimate
 * engine. The results screen here is an interim preview until Phase 3.
 */
type Phase = "intro" | "party" | "money" | "myths" | "coverage" | "damage" | "armor" | "result" | "loot" | "share";
const PHASES: Phase[] = ["intro", "party", "money", "myths", "coverage", "damage", "armor", "result", "loot", "share"];

interface QuizState {
  phase: Phase;
  /** Which loaded roll is on screen: 1 or 2. */
  introRoll: 1 | 2;
  /** Index within the current question group (or the myth card on the table). */
  step: number;
  answers: LifeAnswers;
  /** Trap or Treasure: dealt once, stored at once, never redrawn. */
  myths?: MythGame;
  /** The lead form was submitted once; never ask twice. */
  leadCaptured?: boolean;
  /** The loot item chosen from the answers at claim time. */
  lootId?: string;
}

const STORAGE_KEY = "life_quiz_v1";
const FRESH: QuizState = { phase: "intro", introRoll: 1, step: 0, answers: { party: EMPTY_PARTY } };

/** Dev-only banner while the estimate's numbers are unconfirmed (Section 9.1). */
const SHOW_UNCONFIRMED_BANNER = Boolean(import.meta.env.DEV) && !ARMOR_CONFIG.confirmedByJohn;

/**
 * QA override (?debugMyths=work_coverage,taxes,conversion) exists only in dev
 * builds or when a preview build sets VITE_ENABLE_DEBUG_ROLLS=1. In production
 * the check is a compile time false, so the parameter is inert.
 */
const DEBUG_ENABLED = Boolean(import.meta.env.DEV) || import.meta.env.VITE_ENABLE_DEBUG_ROLLS === "1";

function loadState(): QuizState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<QuizState>;
    if (!p || typeof p !== "object") return null;
    const a = (p.answers && typeof p.answers === "object" ? p.answers : {}) as Partial<LifeAnswers>;
    const members = Array.isArray(a.party?.members) ? a.party!.members.filter((m): m is PartyId => (PARTY_IDS as readonly string[]).includes(m)) : [];
    const youngest = YOUNGEST_OPTIONS.some((o) => o.id === a.party?.youngest) ? a.party!.youngest : undefined;
    const m = p.myths;
    const myths: MythGame | undefined =
      m && Array.isArray(m.cards) && m.cards.length === CARDS_PER_GAME
        ? { roll: Number(m.roll) || 1, cards: m.cards.map(String), guesses: m.guesses && typeof m.guesses === "object" ? m.guesses : {} }
        : undefined;
    return {
      phase: PHASES.includes(p.phase as Phase) ? (p.phase as Phase) : "intro",
      introRoll: p.introRoll === 2 ? 2 : 1,
      step: Math.max(0, Number(p.step) || 0),
      answers: { ...a, party: { members, kids: Math.max(1, Math.min(6, Number(a.party?.kids) || 1)), youngest } },
      myths,
      leadCaptured: Boolean(p.leadCaptured),
      lootId: typeof p.lootId === "string" ? p.lootId : undefined,
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

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function readUtmParams(): { utm_source: string; utm_medium: string; utm_campaign: string } {
  if (typeof window === "undefined") return { utm_source: "", utm_medium: "", utm_campaign: "" };
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
  };
  // Persist to sessionStorage on first read
  try {
    if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
      sessionStorage.setItem("quiz_utm", JSON.stringify(utm));
    }
  } catch {
    // ignore
  }
  return utm;
}

function getStoredUtm(): { utm_source: string; utm_medium: string; utm_campaign: string } {
  if (typeof window === "undefined") return { utm_source: "", utm_medium: "", utm_campaign: "" };
  try {
    const stored = sessionStorage.getItem("quiz_utm");
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

export const Route = createFileRoute("/quiz")({
  component: QuizPage,
});

function QuizPage() {
  const [state, setState] = useState<QuizState>(FRESH);
  const [hydrated, setHydrated] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [dealt, setDealt] = useState(false);
  const [damageDone, setDamageDone] = useState(false);
  const [armorDone, setArmorDone] = useState(false);
  /** Skip the animations when a saved game lands on one of these screens. */
  const [resumedOn, setResumedOn] = useState<Phase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [utmParams] = useState(() => readUtmParams());
  /** Kept in memory only (never written to storage) to prefill Calendly. */
  const [contact, setContact] = useState<{ name: string; email: string } | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "working" | "shared" | "downloaded" | "error">("idle");
  const shareRef = useRef<HTMLDivElement>(null);
  const debugMythsRef = useRef<string[]>([]);

  // Resume a saved game after mount (the server render always starts fresh).
  useEffect(() => {
    if (DEBUG_ENABLED) debugMythsRef.current = parseDebugMyths(window.location.search);
    const saved = loadState();
    if (saved) {
      setState(saved);
      // A hand that was already dealt shows its cards at once, no replay.
      if (saved.myths && (saved.phase !== "myths" || Object.keys(saved.myths.guesses).length > 0)) setDealt(true);
      // Landing on an animated screen after a refresh: show it finished.
      if (saved.phase === "damage" || saved.phase === "armor") {
        setResumedOn(saved.phase);
        setDamageDone(true);
        if (saved.phase === "armor") setArmorDone(true);
      }
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

  const scrollTop = useCallback(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    if (hydrated) scrollTop();
  }, [state.phase, state.step, hydrated, scrollTop]);

  // The hand is dealt the moment the phase is entered and stored at once,
  // before the encounter die starts moving. It is never dealt twice.
  useEffect(() => {
    if (!hydrated || state.phase !== "myths" || state.myths) return;
    update({ myths: { roll: defaultRng.d20(), cards: dealMyths(defaultRng, DEBUG_ENABLED ? debugMythsRef.current : []), guesses: {} } });
  }, [hydrated, state.phase, state.myths, update]);

  // Everything below is derived from the full answer set, every render, so
  // going back and changing an answer can never double count (Section 3).
  const armor = useMemo(() => computeArmor(state.answers), [state.answers]);
  const moneyQs = useMemo(() => visibleQuestions(state.answers, "money"), [state.answers]);
  const coverageQs = useMemo(() => visibleQuestions(state.answers, "coverage"), [state.answers]);
  const group: LifeQuestion[] = state.phase === "money" ? moneyQs : state.phase === "coverage" ? coverageQs : [];
  const q = group[Math.min(state.step, Math.max(0, group.length - 1))];
  const totalQs = moneyQs.length + coverageQs.length;
  const questionNumber = state.phase === "coverage" ? moneyQs.length + state.step + 1 : state.step + 1;

  // ── Opening roll ────────────────────────────────────────────────
  const handleIntroButton = () => {
    if (state.introRoll === 1) {
      setIntroDone(false);
      update({ introRoll: 2 });
    } else {
      update({ phase: "party" });
    }
  };
  const skipIntro = () => update({ phase: "party" });

  // ── Questions ──────────────────────────────────────────────────
  const setAnswer = (key: LifeQuestion["key"], id: string) => {
    update((prev) => {
      const answers = { ...prev.answers, [key]: id } as LifeAnswers;
      // Switching between "paycheck" and "no paycheck" changes which work
      // coverage question applies, so a stale answer to the other one is dropped.
      if (key === "income" && (prev.answers.income === "none") !== (id === "none")) delete answers.employer;
      return { answers };
    });
  };

  const handleNext = () => {
    if (state.phase === "money") {
      if (state.step < moneyQs.length - 1) update({ step: state.step + 1 });
      else update({ phase: "myths", step: 0 });
    } else if (state.phase === "coverage") {
      if (state.step < coverageQs.length - 1) update({ step: state.step + 1 });
      else {
        setDamageDone(false);
        setArmorDone(false);
        setResumedOn(null);
        update({ phase: "damage", step: 0 });
      }
    }
  };

  const damageDice: DamageDie[] = armor.solo
    ? [{ key: "D", label: SOLO_DAMAGE_LABEL, value: armor.dice.D }]
    : [
        { key: "D", label: DAMAGE_LABELS.D, value: armor.dice.D },
        { key: "I", label: DAMAGE_LABELS.I, value: armor.dice.I },
        { key: "M", label: DAMAGE_LABELS.M, value: armor.dice.M },
        ...(armor.kids > 0 ? [{ key: "E", label: DAMAGE_LABELS.E, value: armor.dice.E }] : []),
      ];

  const handleBack = () => {
    if (state.phase === "money") {
      if (state.step > 0) update({ step: state.step - 1 });
      else update({ phase: "party" });
    } else if (state.phase === "myths") {
      if (state.step > 0) update({ step: state.step - 1 });
      else update({ phase: "money", step: Math.max(0, moneyQs.length - 1) });
    } else if (state.phase === "coverage") {
      if (state.step > 0) update({ step: state.step - 1 });
      else update({ phase: "myths", step: CARDS_PER_GAME - 1 });
    } else if (state.phase === "party") {
      update({ phase: "intro", introRoll: 1 });
      setIntroDone(false);
    }
  };

  // ── Trap or Treasure ───────────────────────────────────────────
  const handleGuess = (cardId: string, answer: MythAnswer) => {
    update((prev) => (prev.myths && !prev.myths.guesses[cardId] ? { myths: { ...prev.myths, guesses: { ...prev.myths.guesses, [cardId]: answer } } } : {}));
  };
  const handleMythNext = () => {
    if (state.step < CARDS_PER_GAME - 1) update({ step: state.step + 1 });
    else update({ phase: "coverage", step: 0 });
  };

  // ── Guardian's loot: the one exit from the results. Captures the lead first, once. ─
  const handleClaimLoot = () => {
    if (state.leadCaptured) {
      update({ phase: "loot", lootId: armor.loot });
      return;
    }
    setShowModal(true);
  };

  const handleShare = async () => {
    if (!shareRef.current || !state.myths) return;
    setShareStatus("working");
    try {
      const blob = await renderShareCard(shareRef.current);
      setShareStatus(await shareOrDownload(blob, `${trapShareText(mythScore(state.myths))} https://thefinancialdm.vercel.app/quiz`));
    } catch (e) {
      console.error("[share] failed", e);
      setShareStatus("error");
    }
  };

  const goToCalendly = (name?: string, email?: string) => {
    const calendlyUrl = new URL("https://calendly.com/thefinancialdm-proton/30min");
    if (name) calendlyUrl.searchParams.set("name", name);
    if (email) calendlyUrl.searchParams.set("email", email);
    window.location.href = calendlyUrl.toString();
  };

  const handleSubmitLead = async (name: string, email: string, phone: string): Promise<LeadSubmitOutcome> => {
    const storedUtm = getStoredUtm();
    const finalUtm = {
      utm_source: utmParams.utm_source || storedUtm.utm_source,
      utm_medium: utmParams.utm_medium || storedUtm.utm_medium,
      utm_campaign: utmParams.utm_campaign || storedUtm.utm_campaign,
    };
    const a = state.answers;
    const tierName = TIER_NAME[armor.acTier];

    try {
      const saved = await saveLead({
        data: {
          name,
          email,
          phone,
          // Existing fields keep their meanings (Phase 0, item 5).
          age_range: a.age ?? "",
          dependents: partySummary(a.party),
          has_insurance: armor.shield > 0 ? "Yes" : "No",
          biggest_concern: "",
          timeline: "",
          household_income: optionText("income", a.income, a),
          ...finalUtm,
          quiz_type: "insurance",
          quiz_result: armor.cursed ? `${tierName} · Cursed armor` : tierName,
          // New, additive fields (Section 16). Estimates are rounded; no health data.
          party: partySummary(a.party),
          youngest_age: a.party.members.includes("kids") ? (YOUNGEST_OPTIONS.find((o) => o.id === a.party.youngest)?.text ?? "") : "",
          income_bracket: optionText("income", a.income, a),
          mortgage_bracket: optionText("mortgage", a.mortgage, a),
          debt_bracket: optionText("debts", a.debts, a),
          education_choice: a.party.members.includes("kids") ? optionText("education", a.education, a) : "",
          employer_coverage: optionText("employer", a.employer, a),
          personal_coverage: optionText("personal", a.personal, a),
          est_damage: roundTo10k(armor.damage),
          est_shield: roundTo10k(armor.shield),
          est_gap: roundTo10k(armor.gap),
          armor_tier: tierName,
          armor_cursed: armor.cursed ? "yes" : "no",
          myth_json: JSON.stringify(mythSummary(state.myths)),
          myth_score: state.myths ? mythScore(state.myths) : null,
          loot_id: armor.loot,
        },
      });
      if (!saved.ok) {
        // Rejected details (fake email, movie phone number) keep the dialog
        // open with the reason instead of sending the visitor on.
        console.warn("[lead] save rejected:", saved.error);
        return { error: saved.error ?? "Please check your details and try again.", field: saved.field };
      }
    } catch (e) {
      // The site itself failed (not the details). Still send the visitor on to
      // Calendly; the booking matters more than the record.
      console.error("[lead] save threw:", e);
    }

    setContact({ name, email });
    setShowModal(false);
    update({ leadCaptured: true, phase: "loot", lootId: armor.loot });
  };

  const inQuestions = state.phase === "money" || state.phase === "coverage";
  const compactHeader = inQuestions || state.phase === "party" || state.phase === "myths";
  const parchment = {
    background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)",
    boxShadow: "inset 0 0 40px rgba(139,105,20,0.25), 0 20px 50px rgba(0,0,0,0.45)",
  };

  return (
    <main
      className="min-h-dvh flex flex-col items-center py-8 px-4 relative"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
      {SHOW_UNCONFIRMED_BANNER && (
        <div className="fixed top-0 inset-x-0 z-40 bg-[#c83a3a] text-white text-center text-xs font-bold py-1" role="status">
          Estimate values not yet confirmed by John.
        </div>
      )}

      {/* Brand header (compact once the questions start) */}
      <div className={`text-center ${compactHeader ? "mb-3" : "mb-6"}`}>
        {!compactHeader && (
          <>
            <img src="/logo.png" alt="The Financial DM" className="h-40 sm:h-52 w-auto mx-auto mb-2 drop-shadow-lg" />
            <p className="text-[#c9a25a] text-xs sm:text-sm font-fantasy tracking-wide -mt-1 mb-3">Protect what matters most, because life is unpredictable.</p>
          </>
        )}
        <h1
          className={`font-fantasy text-[#c08020] tracking-wide ${compactHeader ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"}`}
          style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
        >
          ⚔️ Roll for Initiative ⚔️
        </h1>
        {!compactHeader && <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">The Financial DM</p>}
      </div>

      {/* Phase: the loaded opening roll (Section 5) */}
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-slide-in">
          {hydrated ? (
            <D20Dice
              key={`loaded-${state.introRoll}`}
              value={20}
              durationMs={1400}
              skippable
              honorReducedMotion
              resultText={() => (state.introRoll === 1 ? "Natural 20!" : "Natural 20... again.")}
              announce={() => "You rolled a 20. These dice are loaded on purpose; the roll does not affect your results."}
              onComplete={() => setIntroDone(true)}
            />
          ) : (
            <div className="h-48" />
          )}

          <div
            className={`w-full max-w-sm rounded-xl border-2 border-[#8b6914]/60 p-5 text-center transition-opacity duration-500 ${introDone ? "opacity-100" : "opacity-0"}`}
            style={{ background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)" }}
            aria-hidden={!introDone}
          >
            <p className="text-[#3a2c1a] font-fantasy leading-relaxed">“{state.introRoll === 1 ? LOADED_ROLL_1 : LOADED_ROLL_2}”</p>
            <p className="mt-2 text-[#7a5f30] text-xs font-fantasy">John, The Financial DM</p>
          </div>

          <button
            onClick={handleIntroButton}
            disabled={!introDone}
            className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:opacity-40 text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            🎲 {state.introRoll === 1 ? LOADED_ROLL_1_BUTTON : LOADED_ROLL_2_BUTTON}
          </button>
          <button onClick={skipIntro} className="text-[#a0a0a0] hover:text-[#e0e0e0] text-sm font-fantasy underline underline-offset-4 transition-colors">
            Skip intro
          </button>

          <p className="text-[#606080] text-xs text-center max-w-xs font-fantasy leading-relaxed">{LOADED_TAGLINE}</p>
        </div>
      )}

      {/* Phase: build your party (Section 6) */}
      {state.phase === "party" && (
        <div className="w-full max-w-md mx-auto">
          <div className="sticky top-2 z-30 mb-4">
            <PartyTable party={state.answers.party} compact />
          </div>
          <PartyRoster
            party={state.answers.party}
            onChange={(party) => update((prev) => ({ answers: { ...prev.answers, party } }))}
            onNext={() => update({ phase: "money", step: 0 })}
            onBack={handleBack}
          />
        </div>
      )}

      {/* Phase: Trap or Treasure (Section 8) */}
      {state.phase === "myths" && (
        <div className="w-full max-w-md mx-auto">
          <div className="sticky top-2 z-30 mb-4">
            <PartyTable party={state.answers.party} compact />
          </div>
          {!state.myths ? (
            <div className="h-48" />
          ) : !dealt ? (
            <div className="flex flex-col items-center gap-5 animate-slide-in">
              <D20Dice
                key={`deal-${state.myths.roll}`}
                value={state.myths.roll}
                durationMs={1200}
                variant="encounter"
                skippable
                honorReducedMotion
                resultText={() => "The rumor pile shuffles..."}
                announce={() => "Three myth cards are dealt. Call each one trap or treasure."}
                onComplete={() => setDealt(true)}
              />
            </div>
          ) : (
            <TrapOrTreasure game={state.myths} step={Math.min(state.step, CARDS_PER_GAME - 1)} onGuess={handleGuess} onNext={handleMythNext} onBack={handleBack} />
          )}
        </div>
      )}

      {/* Phase: money and coverage questions (Section 7) */}
      {inQuestions && q && (
        <div className="w-full max-w-md mx-auto">
          <div className="sticky top-2 z-30 mb-4">
            <PartyTable party={state.answers.party} compact />
          </div>

          <div key={`${state.phase}-${state.step}`} className="flex flex-col items-center gap-5 w-full px-1 animate-slide-in">
            <div className="w-full flex flex-col gap-2 items-center">
              <div className="w-full flex gap-1.5">
                {Array.from({ length: totalQs }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i < questionNumber - 1 ? "bg-[#c08020]" : i === questionNumber - 1 ? "bg-[#c08020] animate-pulse" : "bg-[#204060]/40"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-[#a0a0a0] font-fantasy tracking-wider uppercase">
                Question {questionNumber} of {totalQs}
              </p>
            </div>

            <div className="w-full rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 p-5 sm:p-6" style={parchment}>
              <div className="flex items-center justify-between text-[#8b6914] opacity-70 text-sm select-none">
                <span>❦</span>
                <span className="font-fantasy tracking-widest text-xs uppercase">{q.label}</span>
                <span>❦</span>
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-[#3a2c1a] text-center leading-snug">{q.question}</h2>
              <p className="mt-2 text-sm italic text-[#7a5f30] text-center font-fantasy leading-relaxed">“{q.dm}”</p>

              <div className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label={q.question}>
                {q.options.map((opt) => {
                  const selected = state.answers[q.key] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswer(q.key, opt.id)}
                      className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition-all duration-200 ${
                        selected
                          ? "border-[#3a2c1a] bg-[#3a2c1a] text-[#f5e6c8] shadow-lg"
                          : "border-[#8b6914]/40 bg-[#fdf3dc]/60 text-[#4a3820] hover:border-[#8b6914]/80 hover:bg-[#fdf3dc]"
                      }`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-between items-center">
                <button type="button" onClick={handleBack} className="px-4 py-2.5 rounded-lg font-fantasy text-sm text-[#7a5f30] hover:text-[#3a2c1a] transition-all">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!state.answers[q.key]}
                  className={`px-6 py-2.5 rounded-lg font-fantasy text-sm transition-all ${
                    state.answers[q.key]
                      ? "bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold shadow-lg shadow-[#8b6914]/30"
                      : "bg-[#c9b27e]/50 text-[#8a7a58] cursor-not-allowed"
                  }`}
                >
                  {state.phase === "coverage" && state.step === coverageQs.length - 1 ? "Roll for Damage →" : "Next →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase: the damage roll (Section 10) */}
      {state.phase === "damage" && hydrated && (
        <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-1 animate-slide-in">
          <PartyTable party={state.answers.party} compact />
          <div className="w-full rounded-xl border-2 border-[#8b6914]/60 p-4 text-center" style={parchment}>
            <p className="text-[#3a2c1a] font-fantasy leading-relaxed text-sm">“{DAMAGE_INTRO}”</p>
            <p className="mt-1 text-[#7a5f30] text-xs font-fantasy">John, The Financial DM</p>
          </div>
          <DamageRoll key={`damage-${armor.damage}`} dice={damageDice} total={armor.damage} startDone={resumedOn === "damage"} onComplete={() => setDamageDone(true)} />
          <button
            onClick={() => {
              setResumedOn(null);
              update({ phase: "armor" });
            }}
            disabled={!damageDone}
            className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:opacity-40 text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            🛡️ {DAMAGE_BUTTON}
          </button>
        </div>
      )}

      {/* Phase: the Armor Class reveal (Section 11) */}
      {state.phase === "armor" && hydrated && (
        <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-1 animate-slide-in">
          <PartyTable party={state.answers.party} compact />
          <ArmorReveal key={`armor-${armor.shield}-${armor.damage}`} armor={armor} animate={resumedOn !== "armor"} onDone={() => setArmorDone(true)} />
          <button
            onClick={() => update({ phase: "result" })}
            disabled={!armorDone}
            className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:opacity-40 text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            📜 {ARMOR_BUTTON}
          </button>
        </div>
      )}

      {/* Phase: results (Section 12) */}
      {state.phase === "result" && (
        <ArmorResults
          armor={armor}
          answers={state.answers}
          onClaimLoot={handleClaimLoot}
          onChangeAnswer={() => update({ phase: "coverage", step: Math.max(0, coverageQs.length - 1) })}
        />
      )}

      {/* Phase: Guardian's loot (Section 13) */}
      {state.phase === "loot" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-slide-in">
          <p className="text-sm text-[#e0b45a] font-fantasy tracking-wider uppercase">🎁 Loot drop</p>
          <p className="text-[#e0e0e0] font-fantasy text-center max-w-sm leading-relaxed">“{LIFE_LOOT_LINE}”</p>
          {(() => {
            const item = lifeLootById(state.lootId) ?? lifeLootById(armor.loot);
            return item ? <LifeLoot key={item.id} item={item} /> : <div className="h-40" />;
          })()}
          <button
            onClick={() => {
              if (state.myths) update({ phase: "share" });
              else goToCalendly(contact?.name, contact?.email);
            }}
            className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            {state.myths ? "📣 Brag About Your Cards →" : "🎲 Summon Thy DM"}
          </button>
        </div>
      )}

      {/* Phase: Trap or Treasure share card, then John's table (Section 14.1) */}
      {state.phase === "share" && state.myths && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-slide-in">
          <p className="text-sm text-[#e0b45a] font-fantasy tracking-wider uppercase">📣 Your share card</p>
          <div className="w-full max-w-[360px] aspect-square overflow-hidden rounded-xl shadow-2xl shadow-black/50" aria-hidden="true">
            <div style={{ width: 1080, height: 1080, transform: "scale(0.3333)", transformOrigin: "top left" }}>
              <LifeShareCard ref={shareRef} score={mythScore(state.myths)} />
            </div>
          </div>
          <p className="text-[#e0e0e0] text-sm font-fantasy text-center leading-relaxed max-w-sm" data-share-text>
            {trapShareText(mythScore(state.myths))}
          </p>
          <button
            onClick={handleShare}
            disabled={shareStatus === "working"}
            className="w-full max-w-xs px-6 py-3 rounded-lg bg-[#204060]/40 border border-[#406080]/50 text-[#e0e0e0] hover:bg-[#204060]/60 font-bold font-fantasy transition-all disabled:opacity-50"
          >
            {shareStatus === "working" ? "Rendering the card..." : shareStatus === "shared" ? "✅ Shared" : shareStatus === "downloaded" ? "✅ Saved to your device" : shareStatus === "error" ? "Could not render the card. Try again." : "📤 Share the Card"}
          </button>
          <button
            onClick={() => goToCalendly(contact?.name, contact?.email)}
            className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            🎲 Summon Thy DM
          </button>
          <p className="text-[#606080] text-xs text-center font-fantasy -mt-3">Opens John's calendar. A free chat, no pressure, about your next move.</p>
        </div>
      )}

      <LeadModal isOpen={showModal} onSubmit={handleSubmitLead} onClose={() => setShowModal(false)} />
    </main>
  );
}
