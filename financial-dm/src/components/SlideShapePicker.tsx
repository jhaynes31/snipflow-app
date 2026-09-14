import { SLIDE_ASPECTS, type SlideAspect } from "~/lib/slideEditor";

/**
 * Square, portrait, or full screen for a carousel's slides. Sits above the
 * slides so the preview and every PNG come out in the chosen shape; the
 * choice is remembered in this browser.
 */
export default function SlideShapePicker({ value, onChange }: { value: SlideAspect; onChange: (v: SlideAspect) => void }) {
  const current = SLIDE_ASPECTS.find((a) => a.id === value);
  return (
    <div className="rounded-lg border border-[#406080]/30 bg-[#111a28] p-3" data-slide-shape>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[#c08020] font-bold font-fantasy text-sm mr-1">📐 Shape</p>
        {SLIDE_ASPECTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            aria-pressed={value === a.id}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy border ${value === a.id ? "bg-[#c08020] text-[#0d1520] border-[#c08020]" : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"}`}
            data-slide-shape-option={a.id}
          >
            {a.label} · {a.id}
          </button>
        ))}
      </div>
      {current && <p className="text-[#606080] text-xs font-fantasy mt-1" data-slide-shape-note>{current.note} Exports at {current.width} × {current.height} with square corners and no border, so nothing shows white at the edges.</p>}
    </div>
  );
}
