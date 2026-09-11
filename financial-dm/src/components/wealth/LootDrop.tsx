import { useEffect, useRef, useState } from "react";
import type { LootItem } from "~/lib/wealthLoot";
import TreasureChest from "~/components/wealth/TreasureChest";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The chest: rattles for about a second, then opens on the loot item the
 * stored d20 chose. Skippable with a tap; a plain fade under reduced motion.
 */
export default function LootDrop({ item, statName, onOpened }: { item: LootItem; statName: string; onOpened?: () => void }) {
  const [open, setOpen] = useState(false);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setOpen(true);
    onOpened?.();
  };
  useEffect(() => {
    const t = setTimeout(finish, reducedMotion() ? 200 : 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <button
        type="button"
        onClick={finish}
        aria-label={open ? "Chest opened" : "Chest rattling. Press to open it now."}
        className={`select-none ${open ? "animate-slide-in" : "animate-wealth-chest cursor-pointer"}`}
      >
        <TreasureChest open={open} className="w-44 h-40 sm:w-56 sm:h-48" />
      </button>
      {!open && <p className="text-[#a0a0a0] font-fantasy text-sm animate-pulse">Something's in there... (tap to open)</p>}
      {open && (
        <div
          className="w-full rounded-xl border-2 border-[#8b6914]/60 p-5 sm:p-6 text-center animate-slide-in"
          style={{ background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)", boxShadow: "inset 0 0 40px rgba(139,105,20,0.25)" }}
          aria-live="polite"
        >
          <p className="text-[#8b6914] text-xs font-fantasy tracking-widest uppercase">Loot drop · for your {statName}</p>
          <p className="mt-2 text-4xl" aria-hidden="true">{item.icon}</p>
          <p className="sr-only">Chest opened.</p>
          <h3 className="mt-2 text-xl sm:text-2xl font-bold text-[#3a2c1a]">{item.title}</h3>
          <p className="mt-2 text-[#4a3820] leading-relaxed">{item.description}</p>
          <a
            href={item.url}
            download
            className="inline-block mt-4 px-6 py-3 rounded-lg bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold font-fantasy shadow-lg shadow-[#8b6914]/30 transition-all"
          >
            ⬇️ Download Your Loot (PDF)
          </a>
          <p className="mt-2 text-[#7a5f30] text-xs font-fantasy">Yours to keep. Print it or save it to your phone.</p>
        </div>
      )}
    </div>
  );
}
