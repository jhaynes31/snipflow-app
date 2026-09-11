import { useMemo } from "react";
import { WEALTH_QUESTIONS, computeScore, scoresFromAnswers, tierForScore } from "~/components/WealthReport";
import StatSheet from "~/components/wealth/StatSheet";
import { QUESTS, RESULTS_CTA, SHOW_DRAGON } from "~/components/wealth/wealthCopy";
import { STAT_META, TIER_META, formatMod, type Answers, type Profile } from "~/lib/wealthProfile";

/**
 * The results screen. No dice here: everything comes from the profile,
 * which is computed from the answers alone. Tier title and line, the full
 * character sheet, the quest for the weakest stat, and the CTA. The dragon
 * artwork (chosen by the original 0 to 100 score) is optional via
 * SHOW_DRAGON in wealthCopy.ts.
 */
export default function WealthResults({
  profile,
  answers,
  onCTA,
  showDragon = SHOW_DRAGON,
}: {
  profile: Profile;
  answers: Answers;
  onCTA: () => void;
  showDragon?: boolean;
}) {
  const tier = TIER_META[profile.tier];
  const scores = useMemo(() => scoresFromAnswers(answers), [answers]);
  const score = computeScore(scores);
  const dragon = tierForScore(score);
  const weakest = profile.weakestStat;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 animate-slide-in">
      {showDragon ? (
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-0 rounded-full opacity-60 blur-2xl" style={{ background: "radial-gradient(circle, rgba(192,128,32,0.35) 0%, transparent 70%)" }} />
          <img src={dragon.image} alt={dragon.name} className="relative w-full h-auto rounded-2xl shadow-2xl shadow-black/50 border border-[#406080]/30" />
        </div>
      ) : (
        <div
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#c08020]/70 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl shadow-[#c08020]/20"
          style={{ background: "radial-gradient(circle, #1f3050 0%, #0d1520 75%)" }}
          aria-hidden="true"
        >
          {profile.tier === "legendary" ? "👑" : profile.tier === "seasoned" ? "🛡️" : "🗡️"}
        </div>
      )}

      <div className="text-center">
        <p className="text-xs font-fantasy uppercase tracking-widest text-[#a0a0a0]">Your character</p>
        <h2 className="mt-1 text-3xl sm:text-4xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 30px rgba(192,128,32,0.4)" }}>
          {tier.title}
        </h2>
        <p className="mt-2 text-[#e0e0e0] font-fantasy max-w-sm mx-auto leading-relaxed">{tier.line}</p>
        {showDragon && (
          <p className="mt-2 text-[#a0a0a0] text-xs font-fantasy">
            {dragon.emoji} {dragon.name} hoard · {score}/100
          </p>
        )}
      </div>

      <div className="w-full">
        <h3 className="text-center text-sm font-fantasy uppercase tracking-widest text-[#c08020] mb-2">⚜ Character Sheet ⚜</h3>
        <StatSheet profile={profile} />
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {profile.activeStats.map((k) => (
            <li key={k} className="rounded-lg border border-[#406080]/30 bg-[#162030]/60 px-3 py-2 flex items-start gap-2">
              <span className="text-lg" aria-hidden="true">{STAT_META[k].icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-fantasy text-[#e0e0e0]">
                  {STAT_META[k].name} <span className="text-[#c08020] tabular-nums">{formatMod(profile.stats[k])}</span>
                </p>
                <p className="text-xs text-[#a0a0a0] leading-snug">{STAT_META[k].meaning}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {weakest && (
        <div
          className="w-full rounded-xl border-2 border-[#8b6914]/60 p-5"
          style={{ background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)", boxShadow: "inset 0 0 40px rgba(139,105,20,0.25)" }}
        >
          <p className="text-[#8b6914] text-xs font-fantasy tracking-widest uppercase text-center">📜 Your Quest</p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold text-[#3a2c1a] text-center">Train Your {STAT_META[weakest].name}</h3>
          <p className="mt-3 text-[#4a3820] leading-relaxed text-center">{QUESTS[weakest]}</p>
          <p className="mt-3 text-[#7a5f30] text-xs font-fantasy text-center">John, The Financial DM</p>
        </div>
      )}

      <details className="w-full rounded-lg border border-[#406080]/30 bg-[#162030]/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-fantasy text-[#a0a0a0] hover:text-[#e0e0e0]">Full quest report, question by question</summary>
        <ul className="mt-3 space-y-2">
          {WEALTH_QUESTIONS.map((q) => {
            const opt = q.options.find((o) => o.id === answers[q.key]);
            return (
              <li key={q.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[#e0e0e0] font-fantasy">{q.label}</span>
                <span className="text-[#a0a0a0] text-right">{opt?.text ?? "—"}</span>
              </li>
            );
          })}
        </ul>
      </details>

      <button
        onClick={onCTA}
        className="w-full max-w-sm px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
      >
        🍺 {RESULTS_CTA}
      </button>
      <p className="text-[#606080] text-xs text-center font-fantasy">A free chat with John, no pressure, about your next move.</p>
    </div>
  );
}
