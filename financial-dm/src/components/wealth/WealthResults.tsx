import { WEALTH_QUESTIONS } from "~/components/WealthReport";
import StatSheet from "~/components/wealth/StatSheet";
import { QUESTS, RESULTS_CTA } from "~/components/wealth/wealthCopy";
import { CLASS_META, STAT_META, TIER_META, formatMod, type Answers, type Profile } from "~/lib/wealthProfile";

/**
 * The results screen. No dice here: everything comes from the profile,
 * which is computed from the answers alone. Class (from the strongest
 * stat), tier title and line, the full character sheet, the quest for the
 * weakest stat, and the CTA.
 */
export default function WealthResults({
  profile,
  answers,
  onClaimLoot,
  onBook,
  leadCaptured,
}: {
  profile: Profile;
  answers: Answers;
  /** Primary: the loot drop (captures the lead first if needed). */
  onClaimLoot: () => void;
  /** Secondary: straight to John's table (captures the lead first if needed). */
  onBook: () => void;
  leadCaptured: boolean;
}) {
  const tier = TIER_META[profile.tier];
  const cls = profile.classId ? CLASS_META[profile.classId] : null;
  const weakest = profile.weakestStat;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 animate-slide-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full opacity-70 blur-2xl" style={{ background: "radial-gradient(circle, rgba(192,128,32,0.4) 0%, transparent 70%)" }} />
        <div
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-[#c08020]/70 flex items-center justify-center text-7xl sm:text-8xl shadow-2xl shadow-[#c08020]/20"
          style={{ background: "radial-gradient(circle, #1f3050 0%, #0d1520 75%)" }}
          aria-hidden="true"
        >
          {cls?.icon ?? "🎲"}
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-fantasy uppercase tracking-widest text-[#a0a0a0]">{tier.title}</p>
        <h2 className="mt-1 text-4xl sm:text-5xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 30px rgba(192,128,32,0.4)" }}>
          {cls?.name ?? "Adventurer"}
        </h2>
        {cls && profile.strongestStat && (
          <p className="mt-2 text-[#e0e0e0] font-fantasy max-w-sm mx-auto leading-relaxed">{cls.blurb}</p>
        )}
        <p className="mt-3 text-[#a0a0a0] text-sm font-fantasy max-w-sm mx-auto leading-relaxed">{tier.line}</p>
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
        onClick={onClaimLoot}
        className="w-full max-w-sm px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
      >
        🎁 Claim Your Loot
      </button>
      <p className="text-[#606080] text-xs text-center font-fantasy -mt-3">
        {leadCaptured ? "A little something for your weakest stat." : "Tell John where to send it, and a little something for your weakest stat drops."}
      </p>
      <button
        onClick={onBook}
        className="w-full max-w-sm px-6 py-3 rounded-lg border-2 border-[#c08020]/60 text-[#c08020] hover:bg-[#c08020]/10 font-bold transition-all font-fantasy tracking-wide"
      >
        🍺 {RESULTS_CTA}
      </button>
      <p className="text-[#606080] text-xs text-center font-fantasy -mt-3">A free chat with John, no pressure, about your next move.</p>
    </div>
  );
}
