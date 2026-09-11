import { useEffect, useRef, useState } from "react";
import { TIER_NAME, approxDollars, spokenDollars, type ArmorResult } from "~/lib/armorEngine";
import { CURSED_LINE, GAP_LABEL, NO_GAP_LINE, TIER_COPY, TIER_ICON } from "./lifeCopy";

interface ArmorRevealProps {
  armor: ArmorResult;
  /** Play the shield slide and the tier reveal; false shows everything at once. */
  animate?: boolean;
  onDone?: () => void;
}

const SLIDE_MS = 1200;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The Armor Class reveal (Section 11): a damage bar, a shield sliding in to
 * cover the share of it that coverage handles, the gap labelled in dollars,
 * then the tier. Numbers carry the meaning; color is decoration.
 */
export default function ArmorReveal({ armor, animate = false, onDone }: ArmorRevealProps) {
  const quiet = !animate || reducedMotion();
  const [slid, setSlid] = useState(quiet);
  const [shown, setShown] = useState(quiet);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finished = useRef(false);

  const finish = () => {
    setSlid(true);
    setShown(true);
    if (finished.current) return;
    finished.current = true;
    onDoneRef.current?.();
  };

  useEffect(() => {
    if (quiet) {
      const t = setTimeout(finish, 300);
      return () => clearTimeout(t);
    }
    const a = setTimeout(() => setSlid(true), 300);
    const b = setTimeout(finish, 300 + SLIDE_MS + 300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coveredPct = armor.damage > 0 ? Math.min(100, (armor.shield / armor.damage) * 100) : 100;
  const tierName = TIER_NAME[armor.acTier];

  return (
    <div className="w-full flex flex-col items-center gap-4" onClick={animate && !shown ? finish : undefined} data-armor-reveal={shown ? "done" : "playing"}>
      {!armor.solo && (
        <div className="w-full rounded-xl border border-[#406080]/40 bg-[#0d1520]/90 px-4 py-4">
          <div className="flex justify-between text-xs font-fantasy tracking-widest uppercase text-[#a0a0a0]">
            <span>Total damage</span>
            <span className="text-[#f5e6c8] tabular-nums">{approxDollars(armor.damage, 10_000)}</span>
          </div>
          <div
            className="mt-2 h-7 w-full rounded-lg bg-[#5a1c1c] border border-[#c83a3a]/60 overflow-hidden relative"
            role="img"
            aria-label={`Damage bar. Your shield covers ${Math.round(coveredPct)} percent. ${armor.gap > 0 ? `${GAP_LABEL}: ${spokenDollars(armor.gap)}.` : NO_GAP_LINE}`}
          >
            <div
              className="h-full bg-gradient-to-r from-[#8b6914] to-[#c08020] flex items-center justify-end pr-2 text-[11px] font-fantasy text-[#0d1520] font-bold whitespace-nowrap"
              style={{ width: `${slid ? coveredPct : 0}%`, transition: quiet ? "none" : `width ${SLIDE_MS}ms cubic-bezier(.2,.8,.2,1)` }}
              data-shield-pct={Math.round(coveredPct)}
            >
              {coveredPct >= 18 && <span>🛡️ Shield</span>}
            </div>
          </div>
          <div className="mt-2 flex justify-between gap-3 text-xs font-fantasy">
            <span className="text-[#e8c884]">🛡️ Shield {approxDollars(armor.shield)}</span>
            <span className="text-[#f0a0a0] text-right" data-gap={approxDollars(armor.gap)}>
              {armor.gap > 0 ? `${GAP_LABEL}: ${approxDollars(armor.gap)}` : NO_GAP_LINE}
            </span>
          </div>
        </div>
      )}

      <div className={`w-full rounded-xl border-2 border-[#8b6914]/60 p-5 text-center transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-0"}`} style={{ background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)" }} aria-hidden={!shown}>
        <p className="font-fantasy tracking-widest text-xs uppercase text-[#8b6914]">Your Armor Class</p>
        <p className="text-4xl mt-1" aria-hidden="true">
          {TIER_ICON[armor.acTier]}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold font-fantasy text-[#3a2c1a]" data-armor-tier={armor.acTier}>
          {tierName}
        </h2>
        <p className="mt-3 text-[#3a2c1a] font-fantasy leading-relaxed">“{TIER_COPY[armor.acTier]}”</p>
        {armor.cursed && (
          <p className="mt-3 rounded-lg border border-[#8b2020]/40 bg-[#fdf3dc]/60 px-3 py-2 text-sm font-fantasy text-[#8b2020] leading-relaxed" data-cursed>
            ☠️ Cursed armor. “{CURSED_LINE}”
          </p>
        )}
        <p className="mt-2 text-[#7a5f30] text-xs font-fantasy">John, The Financial DM</p>
      </div>
      {shown && <span className="sr-only" aria-live="polite">{`Your Armor Class: ${tierName}.${armor.cursed ? " Cursed armor: most of it is work coverage." : ""}`}</span>}
    </div>
  );
}
