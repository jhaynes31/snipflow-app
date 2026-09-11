import { useState, useEffect, useRef, useCallback } from "react";
import { defaultRng, type Rng } from "~/lib/wealthRng";

interface D20DiceProps {
  /** Called once the die has landed, with the face it shows. */
  onComplete: (value: number) => void;
  /**
   * The face to land on. When omitted the die picks its own (the original
   * behavior, used by the life insurance quiz). The financial quiz always
   * passes a value it rolled and stored beforehand, so the animation can
   * never change an outcome.
   */
  value?: number;
  /** Tumble length in ms. Default 2000 keeps the life insurance quiz as is. */
  durationMs?: number;
  /** "encounter" is the DM's die: different colors and an Encounter label. */
  variant?: "player" | "encounter";
  /** Show a Skip button and let a tap on the die jump to the result. */
  skippable?: boolean;
  /** Under prefers-reduced-motion, drop the tumble and fade the result in. */
  honorReducedMotion?: boolean;
  /** Text under the die once it lands. */
  resultText?: (value: number) => string;
  /** Screen reader announcement once it lands. Defaults to the result text. */
  announce?: (value: number) => string;
  rng?: Rng;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function D20Dice({
  onComplete,
  value,
  durationMs = 2000,
  variant = "player",
  skippable = false,
  honorReducedMotion = false,
  resultText = (n) => `You rolled a ${n}!`,
  announce,
  rng = defaultRng,
}: D20DiceProps) {
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(0);
  const [done, setDone] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const timers = useRef<Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>([]);
  const finished = useRef(false);
  const finalRef = useRef<number>(value ?? 0);
  const landMs = durationMs < 2000 ? 300 : 600;

  const clearAll = () => {
    for (const t of timers.current) {
      clearTimeout(t as ReturnType<typeof setTimeout>);
      clearInterval(t as ReturnType<typeof setInterval>);
    }
    timers.current = [];
  };

  const land = useCallback((finalFace: number) => {
    if (finished.current) return;
    finished.current = true;
    clearAll();
    setFace(finalFace - 1);
    setRolling(false);
    setDone(true);
    const t = setTimeout(() => onCompleteRef.current(finalFace), landMs);
    timers.current.push(t);
  }, [landMs]);

  // Start the roll shortly after mount. Every timer is cleared on unmount so
  // leaving the screen mid roll never updates an unmounted component.
  useEffect(() => {
    finished.current = false;
    const quiet = honorReducedMotion && reducedMotion();
    const start = setTimeout(() => {
      const finalFace = value ?? rng.d20();
      finalRef.current = finalFace;
      if (quiet) {
        setFadeIn(true);
        land(finalFace);
        return;
      }
      setRolling(true);
      const frameMs = 100;
      const maxFrames = Math.max(4, Math.round(durationMs / frameMs));
      let count = 0;
      const interval = setInterval(() => {
        setFace(rng.d20() - 1);
        count++;
        if (count >= maxFrames) land(finalFace);
      }, frameMs);
      timers.current.push(interval);
    }, quiet ? 150 : 400);
    timers.current.push(start);
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (finished.current) return;
    land(finalRef.current || value || rng.d20());
  };

  const encounter = variant === "encounter";
  const stroke = encounter ? "#c83a3a" : "#c08020";
  const fills = encounter ? ["#301018", "#3a1420", "#401826", "#2a0e16", "#361422"] : ["#162030", "#1a2840", "#1f3050", "#152238", "#1c2a42"];
  const glow = encounter ? "200, 58, 58" : "192, 128, 32";
  const shown = face + 1;

  return (
    <div
      className={`flex flex-col items-center gap-6 ${skippable ? "cursor-pointer select-none" : ""}`}
      onClick={skippable ? skip : undefined}
      role={skippable ? "button" : undefined}
      tabIndex={skippable ? 0 : undefined}
      onKeyDown={skippable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), skip()) : undefined}
      aria-label={skippable && !done ? "Rolling. Press to skip the animation." : undefined}
    >
      {encounter && (
        <span className="px-3 py-1 rounded-full border border-[#c83a3a]/60 bg-[#301018]/70 text-[#f0a0a0] text-xs font-fantasy tracking-widest uppercase">
          ⚔️ Encounter
        </span>
      )}
      <svg
        viewBox="0 0 120 120"
        className={`w-40 h-40 sm:w-48 sm:h-48 transition-all duration-300 ${
          rolling ? "animate-dice-roll" : done ? "animate-dice-land" : ""
        } ${fadeIn ? "animate-slide-in" : ""}`}
        style={{
          animationDuration: rolling ? `${durationMs}ms` : done ? `${landMs}ms` : undefined,
          filter: done ? `drop-shadow(0 0 12px rgba(${glow}, 0.6))` : `drop-shadow(0 0 6px rgba(${glow}, 0.3))`,
        }}
        aria-hidden="true"
      >
        <polygon points="60,8 112,38 112,82 60,112 8,82 8,38" fill={fills[0]} stroke={stroke} strokeWidth="2.5" />
        <polygon points="60,8 112,38 60,68" fill={fills[1]} stroke={stroke} strokeWidth="1.5" />
        <polygon points="60,8 8,38 60,68" fill={fills[2]} stroke={stroke} strokeWidth="1.5" />
        <polygon points="112,38 112,82 60,68" fill={fills[3]} stroke={stroke} strokeWidth="1.5" />
        <polygon points="8,38 8,82 60,68" fill={fills[4]} stroke={stroke} strokeWidth="1.5" />
        <text
          x="60"
          y="46"
          textAnchor="middle"
          dominantBaseline="central"
          fill={stroke}
          fontSize="26"
          fontWeight="bold"
          fontFamily="serif"
          className={rolling ? "opacity-80" : "opacity-100"}
        >
          {shown}
        </text>
      </svg>

      <p className="text-[#e0e0e0] text-lg font-fantasy animate-pulse" aria-live="polite" aria-atomic="true">
        {rolling ? "Rolling..." : done ? resultText(shown) : "Ready?"}
      </p>
      {done && announce && (
        <span className="sr-only" aria-live="polite">
          {announce(shown)}
        </span>
      )}
      {skippable && !done && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
          className="-mt-3 px-3 py-1 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 text-xs font-fantasy"
        >
          Skip
        </button>
      )}
    </div>
  );
}
