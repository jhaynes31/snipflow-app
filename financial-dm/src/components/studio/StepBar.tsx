import { STUDIO_STEPS, stepIndex, type StudioStep } from "~/lib/studio";

/** Script → Record → Edit → Save. Any step can be revisited; nothing is lost going back. */
export default function StepBar({ current, onSelect }: { current: StudioStep; onSelect: (step: StudioStep) => void }) {
  const at = stepIndex(current);
  return (
    <ol className="flex items-stretch gap-1 sm:gap-2" data-studio-steps>
      {STUDIO_STEPS.map((s, i) => {
        const done = i < at;
        const here = i === at;
        return (
          <li key={s.id} className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={here ? "step" : undefined}
              data-studio-step={s.id}
              data-state={here ? "current" : done ? "done" : "todo"}
              title={s.blurb}
              className={`w-full h-full px-2 py-2 rounded-lg border text-left transition-all font-fantasy ${
                here ? "border-[#c08020] bg-[#c08020]/15 text-[#e8c884]" : done ? "border-[#406080]/40 bg-[#0d1520]/50 text-[#e0e0e0] hover:border-[#c08020]/50" : "border-[#406080]/30 bg-[#0d1520]/30 text-[#a0a0a0] hover:border-[#c08020]/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${here ? "bg-[#c08020] text-[#0d1520]" : done ? "bg-[#2e7d4f] text-white" : "bg-[#204060]/50 text-[#a0a0a0]"}`}>{done ? "✓" : i + 1}</span>
                <span className="truncate text-sm">{s.label}</span>
              </span>
              <span className="hidden sm:block mt-1 text-[11px] text-[#606080] truncate">{s.blurb}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
