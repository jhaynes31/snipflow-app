import { CARDS_PER_GAME, MYTH_INTRO, type MythAnswer } from "./mythDeck";
import { cardById, feedbackLine, type MythGame } from "~/lib/lifeMyths";

interface TrapOrTreasureProps {
  game: MythGame;
  /** Index of the card on the table (0 based). */
  step: number;
  onGuess: (cardId: string, answer: MythAnswer) => void;
  onNext: () => void;
  onBack: () => void;
}

const parchment = {
  background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)",
  boxShadow: "inset 0 0 40px rgba(139,105,20,0.25), 0 20px 50px rgba(0,0,0,0.45)",
};

/**
 * One myth card at a time (Section 8). The player calls Trap or Treasure,
 * John flips it and explains. Cards were drawn once when the phase began and
 * are never redrawn, so going back only shows what was already revealed.
 */
export default function TrapOrTreasure({ game, step, onGuess, onNext, onBack }: TrapOrTreasureProps) {
  const id = game.cards[step];
  const card = cardById(id);
  if (!card) return null;
  const guess = game.guesses[id];
  const revealed = Boolean(guess);
  const correct = guess === card.answer;
  const last = step === CARDS_PER_GAME - 1;

  return (
    <div key={id} className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-1 animate-slide-in">
      <div className="w-full flex flex-col gap-2 items-center">
        <div className="w-full flex gap-1.5">
          {game.cards.map((c, i) => (
            <div key={c} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-[#c83a3a]" : i === step ? "bg-[#c83a3a] animate-pulse" : "bg-[#204060]/40"}`} />
          ))}
        </div>
        <p className="text-sm text-[#f0a0a0] font-fantasy tracking-wider uppercase">
          Trap or Treasure · Card {step + 1} of {CARDS_PER_GAME}
        </p>
      </div>

      <div className="w-full rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 p-5 sm:p-6" style={parchment} data-myth-card={id}>
        <div className="flex items-center justify-between text-[#8b6914] opacity-70 text-sm select-none">
          <span>❦</span>
          <span className="font-fantasy tracking-widest text-xs uppercase">A rumor from the tavern</span>
          <span>❦</span>
        </div>
        {step === 0 && !revealed && <p className="mt-3 text-sm italic text-[#7a5f30] text-center font-fantasy leading-relaxed">“{MYTH_INTRO}”</p>}

        <blockquote className="mt-4 text-xl sm:text-2xl font-bold text-[#3a2c1a] text-center leading-snug">“{card.statement}”</blockquote>

        {!revealed ? (
          <div className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label="Is this a trap or a treasure?">
            <button
              type="button"
              onClick={() => onGuess(id, "trap")}
              className="px-4 py-4 rounded-lg border-2 border-[#8b2020]/60 bg-[#fdf3dc]/70 text-[#8b2020] font-bold font-fantasy text-lg hover:bg-[#8b2020] hover:text-[#f5e6c8] transition-all"
            >
              🪤 Trap
            </button>
            <button
              type="button"
              onClick={() => onGuess(id, "treasure")}
              className="px-4 py-4 rounded-lg border-2 border-[#3f6f2a]/60 bg-[#fdf3dc]/70 text-[#2f5a20] font-bold font-fantasy text-lg hover:bg-[#3f6f2a] hover:text-[#f5e6c8] transition-all"
            >
              💎 Treasure
            </button>
          </div>
        ) : (
          <div className="mt-5 animate-slide-in" aria-live="polite" data-myth-result={correct ? "right" : "wrong"}>
            <p className={`text-center font-fantasy text-lg font-bold ${card.answer === "trap" ? "text-[#8b2020]" : "text-[#2f5a20]"}`}>
              {card.answer === "trap" ? "🪤 It's a trap." : "💎 It's treasure."}
            </p>
            <p className="mt-1 text-center text-sm font-fantasy text-[#3a2c1a]">
              {correct ? "You called it. " : `You said ${guess}. `}
              <span className="italic text-[#7a5f30]">{feedbackLine(correct, step)}</span>
            </p>
            <div className="mt-4 rounded-lg bg-[#fff8e6]/70 border-l-4 border-[#c08020] px-4 py-3 text-sm text-[#3a2c1a] leading-relaxed">
              <span className="font-fantasy text-[#8b6914]">John says: </span>
              {card.reveal}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-between items-center">
          <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-lg font-fantasy text-sm text-[#7a5f30] hover:text-[#3a2c1a] transition-all">
            ← Back
          </button>
          {revealed && (
            <button
              type="button"
              onClick={onNext}
              className="px-6 py-2.5 rounded-lg font-fantasy text-sm bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold shadow-lg shadow-[#8b6914]/30 transition-all"
            >
              {last ? "On to your armor →" : "Next card →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
