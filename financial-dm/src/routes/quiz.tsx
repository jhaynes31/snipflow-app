import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import D20Dice from "~/components/D20Dice";
import QuizQuestions, { QUESTIONS } from "~/components/QuizQuestions";
import CharacterSheet from "~/components/CharacterSheet";
import LeadModal from "~/components/LeadModal";
import { saveLead } from "~/server/leads";

type Phase = "landing" | "questions" | "result";

interface QuizAnswers {
  age_range: string;
  dependents: string;
  has_insurance: string;
  biggest_concern: string;
  timeline: string;
  coverage_amount: string;
  health: string;
  tobacco: string;
  monthly_budget: string;
  household_income: string;
}

const EMPTY_ANSWERS: QuizAnswers = {
  age_range: "",
  dependents: "",
  has_insurance: "",
  biggest_concern: "",
  timeline: "",
  coverage_amount: "",
  health: "",
  tobacco: "",
  monthly_budget: "",
  household_income: "",
};

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
  const [phase, setPhase] = useState<Phase>("landing");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [showModal, setShowModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [utmParams] = useState(() => readUtmParams());

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase, questionIndex]);

  const handleDiceComplete = useCallback(() => {
    // Auto-transition handled by the Start button
  }, []);

  const handleStart = () => {
    setPhase("questions");
    setQuestionIndex(0);
  };

  const handleSkip = () => {
    setPhase("questions");
    setQuestionIndex(0);
  };

  const handleAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      setPhase("result");
    }
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

    // Save lead, then redirect
    try {
      await saveLead({
        data: {
          name,
          email,
          phone,
          age_range: answers.age_range,
          dependents: answers.dependents,
          has_insurance: answers.has_insurance,
          biggest_concern: answers.biggest_concern,
          timeline: answers.timeline,
          coverage_amount: answers.coverage_amount,
          health: answers.health,
          tobacco: answers.tobacco,
          monthly_budget: answers.monthly_budget,
          household_income: answers.household_income,
          ...finalUtm,
        },
      });
    } catch {
      // Still redirect to Calendly even if save fails
    }

    // Brief transition before redirect
    await new Promise((r) => setTimeout(r, 1500));

    const calendlyUrl = new URL("https://calendly.com/thefinancialdm-proton/30min");
    calendlyUrl.searchParams.set("name", name);
    calendlyUrl.searchParams.set("email", email);
    window.location.href = calendlyUrl.toString();
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center py-8 px-4 relative"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
      {/* Transition overlay */}
      {transitioning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: "rgba(8, 14, 22, 0.95)" }}
        >
          <div className="w-16 h-16 border-4 border-[#c08020] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#e0e0e0] font-fantasy text-lg animate-pulse">
            Rolling for initiative...
          </p>
          <p className="text-[#a0a0a0] text-sm font-fantasy">
            Thy council with the DM awaits!
          </p>
        </div>
      )}

      {/* Brand header */}
      <div className="mb-6 text-center">
        <img src="/logo.png" alt="The Financial DM" className="h-28 sm:h-36 mx-auto mb-4 drop-shadow-lg" />
        <h1 className="text-3xl sm:text-4xl font-fantasy text-[#c08020] tracking-wide"
          style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
        >
          ⚔️ Roll for Initiative ⚔️
        </h1>
        <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
          The Financial DM
        </p>
      </div>

      {/* Phase: Landing */}
      {phase === "landing" && (
        <div className="flex flex-col items-center gap-8 w-full max-w-md">
          <D20Dice onComplete={handleDiceComplete} />

          <div className="flex flex-col items-center gap-4 w-full px-4">
            <button
              onClick={handleStart}
              className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
            >
              🎲 Start Thy Quest
            </button>
            <button
              onClick={handleSkip}
              className="text-[#a0a0a0] hover:text-[#e0e0e0] text-sm font-fantasy underline underline-offset-4 transition-colors"
            >
              Skip Intro
            </button>
          </div>

          <p className="text-[#606080] text-xs text-center max-w-xs font-fantasy">
            Discover thy character class and begin your journey to protect what matters most.
          </p>
        </div>
      )}

      {/* Phase: Questions */}
      {phase === "questions" && (
        <QuizQuestions
          questionIndex={questionIndex}
          answers={answers}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      )}

      {/* Phase: Result */}
      {phase === "result" && (
        <CharacterSheet answers={answers} onCTA={handleCTA} />
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
