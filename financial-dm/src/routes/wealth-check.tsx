import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import D20Dice from "~/components/D20Dice";
import LeadModal from "~/components/LeadModal";
import WealthReport, { WEALTH_QUESTIONS } from "~/components/WealthReport";
import { saveLead } from "~/server/leads";

type Phase = "welcome" | "questions" | "result";

const TOTAL_QUESTIONS = WEALTH_QUESTIONS.length;

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
  const [phase, setPhase] = useState<Phase>("welcome");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [utmParams] = useState(() => readUtmParams());

  const scrollTop = useCallback(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBegin = () => {
    setPhase("questions");
    setQuestionIndex(0);
    scrollTop();
  };

  const handleSelect = (key: string, points: number) => {
    setScores((prev) => ({ ...prev, [key]: points }));
  };

  const handleNext = () => {
    if (questionIndex < TOTAL_QUESTIONS - 1) {
      setQuestionIndex((i) => i + 1);
      scrollTop();
    } else {
      setPhase("result");
      scrollTop();
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

    try {
      await saveLead({
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
        },
      });
    } catch {
      // Still redirect to Calendly even if save fails
    }

    await new Promise((r) => setTimeout(r, 1500));

    const calendlyUrl = new URL("https://calendly.com/thefinancialdm-proton/30min");
    calendlyUrl.searchParams.set("name", name);
    calendlyUrl.searchParams.set("email", email);
    window.location.href = calendlyUrl.toString();
  };

  const q = WEALTH_QUESTIONS[questionIndex];
  const selectedPoints = scores[q?.key] ?? null;

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center py-8 px-4 relative"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
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

      {/* Brand header */}
      <div className="mb-6 text-center">
        <img src="/logo.png" alt="The Financial DM" className="h-24 sm:h-28 mx-auto mb-4 drop-shadow-lg" />
        <h1
          className="text-3xl sm:text-4xl font-fantasy text-[#c08020] tracking-wide"
          style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
        >
          💰 Roll for Wealth 💰
        </h1>
        <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
          The Financial DM: Financial Health Check
        </p>
      </div>

      {/* Phase: Welcome */}
      {phase === "welcome" && (
        <div className="flex flex-col items-center gap-8 w-full max-w-md animate-slide-in">
          <D20Dice onComplete={() => {}} />

          <div className="flex flex-col items-center gap-4 w-full px-4">
            <button
              onClick={handleBegin}
              className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
            >
              🎲 Begin Thy Quest
            </button>
          </div>

          <p className="text-[#606080] text-xs text-center max-w-xs font-fantasy leading-relaxed">
            Ten questions to measure the health of thy hoard. Claim thy dragon tier and learn thy next quest.
          </p>
        </div>
      )}

      {/* Phase: Questions */}
      {phase === "questions" && q && (
        <div key={questionIndex} className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-4 animate-slide-in">
          {/* Progress */}
          <div className="w-full flex flex-col gap-2 items-center">
            <div className="w-full flex gap-1.5">
              {WEALTH_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < questionIndex
                      ? "bg-[#c08020]"
                      : i === questionIndex
                        ? "bg-[#c08020] animate-pulse"
                        : "bg-[#204060]/40"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-[#a0a0a0] font-fantasy tracking-wider uppercase">
              Question {questionIndex + 1} of {TOTAL_QUESTIONS}
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

            <div className="mt-5 flex flex-col gap-2.5">
              {q.options.map((opt) => {
                const isSelected = selectedPoints === opt.points;
                return (
                  <button
                    key={opt.text}
                    onClick={() => handleSelect(q.key, opt.points)}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition-all duration-200 ${
                      isSelected
                        ? "border-[#3a2c1a] bg-[#3a2c1a] text-[#f5e6c8] shadow-lg"
                        : "border-[#8b6914]/40 bg-[#fdf3dc]/60 text-[#4a3820] hover:border-[#8b6914]/80 hover:bg-[#fdf3dc]"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleNext}
                disabled={selectedPoints === null}
                className={`px-6 py-2.5 rounded-lg font-fantasy text-sm transition-all ${
                  selectedPoints !== null
                    ? "bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold shadow-lg shadow-[#8b6914]/30"
                    : "bg-[#c9b27e]/50 text-[#8a7a58] cursor-not-allowed"
                }`}
              >
                {questionIndex === TOTAL_QUESTIONS - 1 ? "Reveal Thy Tier →" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Result */}
      {phase === "result" && (
        <WealthReport scores={scores} onCTA={handleCTA} />
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
