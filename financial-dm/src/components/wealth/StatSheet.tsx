import { useEffect, useRef, useState } from "react";
import { STAT_META, formatMod, type Profile, type StatKey } from "~/lib/wealthProfile";
import { readCharacterSheet } from "~/lib/characterSheet";

/** Where the locked AC slot points. Empty string makes it non interactive. */
export const LIFE_INSURANCE_QUIZ_URL = "/quiz";

/**
 * The character sheet that stays on screen for the whole quiz: one chip per
 * active stat with a signed value, plus the locked AC teaser. Compact chips
 * on phones, a roomier row on desktop. Values come straight from the
 * profile (derived from answers), never from the floating labels.
 */
export default function StatSheet({ profile, flash }: { profile: Profile; flash?: StatKey | null }) {
  return (
    <div className="w-full rounded-xl border border-[#406080]/40 bg-[#0d1520]/90 backdrop-blur px-2 py-2 sm:px-4 sm:py-3 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {profile.activeStats.map((k) => {
          const v = profile.stats[k];
          const tone = v > 0 ? "text-[#7fd08a] border-[#3f8f4a]/60" : v < 0 ? "text-[#f0a0a0] border-[#c83a3a]/50" : "text-[#e0e0e0] border-[#406080]/50";
          return (
            <div
              key={k}
              data-stat={k}
              title={`${STAT_META[k].name}: ${STAT_META[k].meaning}`}
              className={`flex-1 min-w-0 rounded-lg border bg-[#111a28] px-1.5 py-1.5 sm:px-3 sm:py-2 text-center transition-all ${tone} ${
                flash === k ? "ring-2 ring-[#c08020] scale-105" : ""
              }`}
              aria-label={`${STAT_META[k].name} ${formatMod(v)}`}
            >
              <div className="text-[10px] sm:text-xs font-fantasy tracking-widest text-[#a0a0a0]">
                <span aria-hidden="true">{STAT_META[k].icon} </span>
                {k}
              </div>
              <div className="text-lg sm:text-2xl font-bold font-fantasy leading-tight tabular-nums">{formatMod(v)}</div>
            </div>
          );
        })}
        <AcSlot />
      </div>
      <p className="hidden sm:block text-center text-[#606080] text-[11px] font-fantasy mt-2">
        You can't control the roll, but you can stack your modifiers.
      </p>
    </div>
  );
}

/** Short names that fit the chip. */
const AC_SHORT: Record<string, string> = { "Plate Armor": "Plate", "Chain Mail": "Chain", "Leather Armor": "Leather", Unarmored: "None", "Traveling Light": "Light" };

/**
 * The AC slot. Locked ("???") until the life insurance quiz has been
 * completed in this browser; then it shows that quiz's armor tier with a
 * short unlock flash. Display only: nothing here touches the profile.
 */
function AcSlot() {
  const [armor, setArmor] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  useEffect(() => {
    const tier = readCharacterSheet().armor?.tier ?? null;
    if (!tier) return;
    setArmor(tier);
    setJustUnlocked(true);
    const t = setTimeout(() => setJustUnlocked(false), 1400);
    return () => clearTimeout(t);
  }, []);

  if (armor) {
    return (
      <a
        href={LIFE_INSURANCE_QUIZ_URL || undefined}
        data-ac-unlocked={armor}
        className={`flex-1 min-w-0 rounded-lg border bg-[#111a28] px-1.5 py-1.5 sm:px-3 sm:py-2 text-center text-[#e8c884] border-[#c08020]/60 transition-all ${
          justUnlocked ? "animate-slide-in ring-2 ring-[#c08020] scale-105" : ""
        }`}
        title={`Armor Class: ${armor}, from the life insurance quiz. It doesn't change your financial stats.`}
        aria-label={`Armor Class unlocked: ${armor}. From the life insurance quiz; it does not change your financial stats.`}
      >
        <div className="text-[10px] sm:text-xs font-fantasy tracking-widest text-[#a0a0a0]">
          <span aria-hidden="true">🛡️ </span>AC
        </div>
        <div className="text-base sm:text-xl font-bold font-fantasy leading-tight truncate">{AC_SHORT[armor] ?? armor}</div>
      </a>
    );
  }

  const inner = (
    <>
      <div className="text-[10px] sm:text-xs font-fantasy tracking-widest text-[#606080]">
        <span aria-hidden="true">🔒 </span>AC
      </div>
      <div className="text-lg sm:text-2xl font-bold font-fantasy leading-tight text-[#606080]">???</div>
    </>
  );
  const cls = "flex-1 min-w-0 rounded-lg border border-dashed border-[#406080]/50 bg-[#111a28]/60 px-1.5 py-1.5 sm:px-3 sm:py-2 text-center";
  const title = "Armor Class: measured in a different dungeon.";
  if (!LIFE_INSURANCE_QUIZ_URL) {
    return (
      <div className={cls} title={title} aria-label="Armor Class, locked. Measured in a different dungeon.">
        {inner}
      </div>
    );
  }
  return (
    <a
      href={LIFE_INSURANCE_QUIZ_URL}
      className={`${cls} hover:border-[#c08020]/60 transition-all`}
      title={`${title} Take the life insurance quiz to find out.`}
      aria-label="Armor Class, locked. Measured in a different dungeon. Opens the life insurance quiz."
    >
      {inner}
    </a>
  );
}

// ── Floating "+2 CON" labels ────────────────────────────────────────

export interface FloatingMod {
  id: number;
  text: string;
  negative: boolean;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const FLOAT_MS = 700;

/** Display only: labels that drift from the chosen answer to the stat chip. */
export function FloatingMods({ items, onDone }: { items: FloatingMod[]; onDone: (id: number) => void }) {
  return (
    <>
      {items.map((m) => (
        <FloatingLabel key={m.id} mod={m} onDone={onDone} />
      ))}
    </>
  );
}

function FloatingLabel({ mod, onDone }: { mod: FloatingMod; onDone: (id: number) => void }) {
  const [go, setGo] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGo(true));
    const t = setTimeout(() => doneRef.current(mod.id), FLOAT_MS + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [mod.id]);
  const dx = mod.to.x - mod.from.x;
  const dy = mod.to.y - mod.from.y;
  return (
    <span
      aria-hidden="true"
      className={`fixed z-50 pointer-events-none px-2 py-0.5 rounded-full font-bold font-fantasy text-sm shadow-lg ${
        mod.negative ? "bg-[#c83a3a] text-white" : "bg-[#3f8f4a] text-white"
      }`}
      style={{
        left: mod.from.x,
        top: mod.from.y,
        transform: go ? `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.8)` : "translate(-50%, -50%) scale(1)",
        opacity: go ? 0.15 : 1,
        transition: `transform ${FLOAT_MS}ms cubic-bezier(.2,.7,.3,1), opacity ${FLOAT_MS}ms ease-in`,
      }}
    >
      {mod.text}
    </span>
  );
}

/** Center of an element in viewport coordinates. */
export function centerOf(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
