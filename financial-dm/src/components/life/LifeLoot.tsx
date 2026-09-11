import { useEffect, useRef, useState } from "react";
import TreasureChest from "~/components/wealth/TreasureChest";
import type { LifeLootItem } from "~/lib/armorLoot";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Guardian's loot: the chest rattles, then opens on the item the answers
 * chose. The item is a page to open and a PDF to keep. Skippable with a tap;
 * a plain fade under reduced motion.
 */
export default function LifeLoot({ item }: { item: LifeLootItem }) {
  const [open, setOpen] = useState(false);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setOpen(true);
  };
  useEffect(() => {
    const t = setTimeout(finish, reducedMotion() ? 200 : 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 w-full" data-life-loot={item.id}>
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
          <p className="text-[#8b6914] text-xs font-fantasy tracking-widest uppercase">Guardian's loot</p>
          <p className="mt-2 text-4xl" aria-hidden="true">
            {item.icon}
          </p>
          <p className="sr-only">Chest opened.</p>
          <h3 className="mt-2 text-xl sm:text-2xl font-bold text-[#3a2c1a]">{item.title}</h3>
          <p className="mt-2 text-[#4a3820] leading-relaxed">{item.description}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href={item.pageUrl}
              target="_blank"
              rel="noopener"
              className="px-5 py-3 rounded-lg bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold font-fantasy shadow-lg shadow-[#8b6914]/30 transition-all"
            >
              📜 Open Your Loot
            </a>
            <a href={item.url} download className="px-5 py-3 rounded-lg border-2 border-[#8b6914]/60 text-[#3a2c1a] hover:bg-[#fdf3dc] font-bold font-fantasy transition-all">
              ⬇️ Download the PDF
            </a>
          </div>
          <p className="mt-2 text-[#7a5f30] text-xs font-fantasy">Yours to keep. Print it or save it to your phone.</p>
        </div>
      )}
    </div>
  );
}
