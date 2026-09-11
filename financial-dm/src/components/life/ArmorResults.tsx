import { TIER_NAME, approxDollars, type ArmorResult, type LifeAnswers } from "~/lib/armorEngine";
import ArmorReveal from "./ArmorReveal";
import { BUSINESS_NOTE, CHARACTER_SHEET_LINK, DAMAGE_LABELS, RESULTS_DISCLAIMER, ctaCopy } from "./lifeCopy";
import { armorLineFor, isFullSheet, type CharacterSheetRecord } from "~/lib/characterSheet";

interface ArmorResultsProps {
  armor: ArmorResult;
  answers: LifeAnswers;
  onClaimLoot: () => void;
  onChangeAnswer: () => void;
  /** What this browser has completed so far (Section 14.2). */
  sheet: CharacterSheetRecord;
  onShareSheet: () => void;
  sheetShareStatus: "idle" | "working" | "shared" | "downloaded" | "error";
}

const parchment = {
  background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)",
  boxShadow: "inset 0 0 40px rgba(139,105,20,0.25), 0 20px 50px rgba(0,0,0,0.45)",
};

/** The results screen (Section 12). The disclaimer sits with the numbers, never behind a click. */
export default function ArmorResults({ armor, answers, onClaimLoot, onChangeAnswer, sheet, onShareSheet, sheetShareStatus }: ArmorResultsProps) {
  const rows: Array<[string, number]> = [
    [DAMAGE_LABELS.D, armor.dice.D],
    [DAMAGE_LABELS.I, armor.dice.I],
    [DAMAGE_LABELS.M, armor.dice.M],
    [DAMAGE_LABELS.E, armor.dice.E],
  ];
  const business = answers.party.members.includes("business") && !armor.solo;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-1 animate-slide-in" data-results>
      <ArmorReveal armor={armor} />

      <div className="w-full rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 p-5 sm:p-6" style={parchment}>
        <p className="text-center font-fantasy tracking-widest text-xs uppercase text-[#8b6914]">The damage roll</p>
        <dl className="mt-3 text-sm text-[#4a3820] space-y-1.5" data-breakdown>
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt>{label}</dt>
              <dd className="tabular-nums">{value === 0 && armor.solo && label !== DAMAGE_LABELS.D ? "—" : approxDollars(value)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 font-bold text-[#3a2c1a] border-t border-[#8b6914]/30 pt-1.5">
            <dt>Total damage</dt>
            <dd className="tabular-nums">{approxDollars(armor.damage, 10_000)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Your shield (coverage today)</dt>
            <dd className="tabular-nums">{approxDollars(armor.shield)}</dd>
          </div>
          <div className="flex justify-between gap-3 font-bold text-[#3a2c1a]">
            <dt>Where damage gets through</dt>
            <dd className="tabular-nums">{approxDollars(armor.gap)}</dd>
          </div>
        </dl>

        {armor.assumptions.map((note) => (
          <p key={note} className="mt-3 text-xs text-[#7a5f30] italic leading-relaxed" data-assumption>
            {note}
          </p>
        ))}
        {business && (
          <p className="mt-3 text-xs text-[#7a5f30] leading-relaxed" data-business-note>
            {BUSINESS_NOTE}
          </p>
        )}

        <p className="mt-4 text-[11px] text-[#7a5f30] leading-relaxed border-t border-[#8b6914]/30 pt-3" data-disclaimer>
          {RESULTS_DISCLAIMER}
        </p>
      </div>

      <p className="text-[#a0a0a0] text-center text-sm italic max-w-xs font-fantasy">“{ctaCopy(armor.acTier)}”</p>
      <button
        onClick={onClaimLoot}
        className="w-full max-w-xs px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
        data-cta={TIER_NAME[armor.acTier]}
      >
        🎁 Claim Your Loot
      </button>
      <p className="text-[#606080] text-xs text-center font-fantasy -mt-3 max-w-xs">A free guide, picked from your answers. Then John's table is one tap away.</p>

      {isFullSheet(sheet) ? (
        <div className="w-full max-w-xs flex flex-col items-center gap-3" data-full-sheet>
          <span className="px-4 py-2 rounded-full border-2 border-[#e0b45a] text-[#e0b45a] font-fantasy text-sm tracking-widest uppercase shadow-lg shadow-[#e0b45a]/20 animate-slide-in">
            🏅 Full Character Sheet Complete
          </span>
          <p className="text-[#a0a0a0] text-xs font-fantasy text-center">
            {sheet.financial?.tier} · {armorLineFor(sheet)}
          </p>
          <button
            onClick={onShareSheet}
            disabled={sheetShareStatus === "working"}
            className="w-full px-6 py-3 rounded-lg bg-[#204060]/40 border border-[#406080]/50 text-[#e0e0e0] hover:bg-[#204060]/60 font-bold font-fantasy transition-all disabled:opacity-50"
          >
            {sheetShareStatus === "working" ? "Rendering the card..." : sheetShareStatus === "shared" ? "✅ Shared" : sheetShareStatus === "downloaded" ? "✅ Saved to your device" : sheetShareStatus === "error" ? "Could not render the card. Try again." : "📤 Share Your Full Character Sheet"}
          </button>
        </div>
      ) : (
        <a href="/wealth-check" className="text-center text-sm font-fantasy text-[#e8c884] hover:text-[#f5e6c8] underline underline-offset-4 max-w-xs leading-relaxed" data-sheet-link>
          {CHARACTER_SHEET_LINK}
        </a>
      )}
      <button onClick={onChangeAnswer} className="text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy underline underline-offset-4">
        ← Change an answer
      </button>
    </div>
  );
}
