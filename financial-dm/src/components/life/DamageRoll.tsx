import { useEffect, useRef, useState } from "react";
import { approxDollars, spokenDollars } from "~/lib/armorEngine";
import { defaultRng } from "~/lib/wealthRng";
import { NO_DAMAGE } from "./lifeCopy";

export interface DamageDie {
  key: string;
  label: string;
  value: number;
}

interface DamageRollProps {
  dice: DamageDie[];
  total: number;
  /** Start with everything already landed (for example after a refresh). */
  startDone?: boolean;
  onComplete: () => void;
}

const TUMBLE_MS = 650;
const COUNT_MS = 450;
const ZERO_MS = 300;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The damage roll (Section 10): the dice roll one at a time and each counter
 * ticks up to a value that was calculated before anything moved. Loaded dice.
 * A tap, Enter, or Skip jumps straight to the result. Every die is announced.
 */
export default function DamageRoll({ dice, total, startDone = false, onComplete }: DamageRollProps) {
  const [shown, setShown] = useState<number[]>(() => (startDone ? dice.map((d) => d.value) : dice.map(() => -1)));
  const [landed, setLanded] = useState<number>(startDone ? dice.length : 0);
  const [tumbling, setTumbling] = useState<number>(-1);
  const [done, setDone] = useState(startDone);
  const [live, setLive] = useState("");
  const timers = useRef<number[]>([]);
  const finished = useRef(startDone);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearAll = () => {
    for (const t of timers.current) {
      clearTimeout(t);
      clearInterval(t);
      cancelAnimationFrame(t);
    }
    timers.current = [];
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    clearAll();
    setShown(dice.map((d) => d.value));
    setLanded(dice.length);
    setTumbling(-1);
    setDone(true);
    setLive(`Total damage: ${spokenDollars(total, 10_000)}.`);
    timers.current.push(window.setTimeout(() => onCompleteRef.current(), 400));
  };

  useEffect(() => {
    if (startDone) return;
    const quiet = reducedMotion();
    let i = 0;
    const next = () => {
      if (finished.current) return;
      if (i >= dice.length) {
        finish();
        return;
      }
      const idx = i;
      const die = dice[idx];
      i++;
      const land = () => {
        setShown((prev) => prev.map((v, k) => (k === idx ? die.value : v)));
        setTumbling(-1);
        setLanded(idx + 1);
        setLive(die.value > 0 ? `${die.label}: ${spokenDollars(die.value)}.` : `${die.label}: no damage here.`);
        timers.current.push(window.setTimeout(next, quiet ? 250 : 150));
      };
      if (quiet || die.value === 0) {
        setTumbling(idx);
        setShown((prev) => prev.map((v, k) => (k === idx ? 0 : v)));
        timers.current.push(window.setTimeout(land, quiet ? 250 : ZERO_MS));
        return;
      }
      // Tumble: the counter shows noise, then counts up to the real value.
      setTumbling(idx);
      const noise = window.setInterval(() => {
        setShown((prev) => prev.map((v, k) => (k === idx ? defaultRng.int(Math.max(2, die.value)) : v)));
      }, 70);
      timers.current.push(noise);
      timers.current.push(
        window.setTimeout(() => {
          clearInterval(noise);
          const start = performance.now();
          const tick = (now: number) => {
            if (finished.current) return;
            const p = Math.min(1, (now - start) / COUNT_MS);
            const eased = 1 - Math.pow(1 - p, 3);
            setShown((prev) => prev.map((v, k) => (k === idx ? Math.round(die.value * eased) : v)));
            if (p < 1) timers.current.push(requestAnimationFrame(tick));
            else land();
          };
          timers.current.push(requestAnimationFrame(tick));
        }, TUMBLE_MS),
      );
    };
    timers.current.push(window.setTimeout(next, 400));
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="w-full flex flex-col items-center gap-4 cursor-pointer select-none"
      onClick={finish}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), finish())}
      aria-label={done ? undefined : "Rolling the damage dice. Press to skip the animation."}
      data-damage-roll={done ? "done" : "rolling"}
    >
      <div className="w-full grid grid-cols-2 gap-3">
        {dice.map((die, idx) => {
          const isLanded = idx < landed;
          const isTumbling = tumbling === idx;
          const v = shown[idx];
          return (
            <div
              key={die.key}
              data-die={die.key}
              data-landed={isLanded ? "1" : "0"}
              className={`rounded-xl border-2 px-3 py-3 text-center transition-all duration-300 ${
                isLanded ? "border-[#c08020] bg-[#162030] shadow-lg shadow-[#c08020]/20" : isTumbling ? "border-[#c08020]/70 bg-[#1a2840] animate-pulse" : "border-[#406080]/40 bg-[#111a28]/70 opacity-60"
              }`}
            >
              <div className="text-[11px] sm:text-xs font-fantasy tracking-widest uppercase text-[#a0a0a0] leading-tight min-h-[2.4em] flex items-center justify-center">{die.label}</div>
              <div className={`mt-1 text-xl sm:text-2xl font-bold font-fantasy tabular-nums leading-tight ${isLanded ? "text-[#e0e0e0]" : "text-[#c08020]"}`} aria-hidden={!isLanded}>
                {v < 0 ? "🎲" : isLanded && die.value === 0 ? <span className="text-sm font-normal text-[#a0a0a0]">{NO_DAMAGE}</span> : isLanded ? approxDollars(v) : `$${v.toLocaleString("en-US")}`}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`w-full rounded-xl border-2 border-[#c83a3a]/60 bg-[#301018]/70 px-4 py-3 text-center transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`} aria-hidden={!done} data-damage-total={done ? approxDollars(total, 10_000) : ""}>
        <div className="text-xs font-fantasy tracking-widest uppercase text-[#f0a0a0]">Total damage</div>
        <div className="text-2xl sm:text-3xl font-bold font-fantasy text-[#f5e6c8] tabular-nums">{approxDollars(total, 10_000)}</div>
      </div>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {live}
      </span>
      {!done && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="px-3 py-1 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 text-xs font-fantasy"
        >
          Skip
        </button>
      )}
    </div>
  );
}
