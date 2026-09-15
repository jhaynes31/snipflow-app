import { useCallback, useState, type ReactNode } from "react";

/**
 * Shared call to action block. Every forge shows the same thing: the
 * generated options (one checked), a switch to leave the call to action out
 * altogether, and room for a forge specific control (where the carousel
 * slide goes, whether the cards get a call to action card).
 */
export default function CtaPanel({
  options,
  value,
  on,
  onSelect,
  onToggle,
  compact = false,
  onError,
  onRegenerate,
  regenerating = false,
  regenerateDisabled = false,
  note,
  children,
}: {
  options: string[];
  /** The chosen option (ignored when the switch is off). */
  value: string;
  /** Whether the call to action goes out at all. */
  on: boolean;
  onSelect: (cta: string) => void;
  onToggle: (on: boolean) => void;
  compact?: boolean;
  onError?: (message: string) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  regenerateDisabled?: boolean;
  /** What "off" means in this forge, e.g. "The post text and the prompter skip it." */
  note?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("Could not copy to clipboard.");
    }
  }, [value, onError]);

  const list = options.length > 0 ? options : value ? [value] : [];
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div className={`rounded-lg border border-[#406080]/30 bg-[#204060]/10 ${compact ? "p-3" : "p-4"} space-y-2`} data-cta-panel>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[#c08020] font-bold font-fantasy text-sm">🎯 Call to Action{list.length > 1 ? " options" : ""}</p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onToggle(!on)}
            aria-pressed={on}
            data-cta-toggle
            className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all text-xs font-fantasy ${
              on ? "bg-[#c08020]/20 border-[#c08020]/60 text-[#e8c884]" : "bg-[#0d1520]/60 border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50"
            }`}
            title={on ? "Click to leave the call to action out" : "Click to add a call to action"}
          >
            {on ? "✅ Included" : "○ Left out"}
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={!on || !value}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy disabled:opacity-40"
          >
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerateDisabled || regenerating}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] hover:bg-[#c08020]/30 transition-all text-xs font-fantasy disabled:opacity-50"
              aria-label="New call to action options only"
              data-regen="callToAction"
            >
              {regenerating ? "Re rolling..." : "🎲 New Call to Action"}
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-[#606080] text-sm font-fantasy">No call to action was generated.</p>
      ) : (
        <div className={`space-y-2 ${on ? "" : "opacity-50"}`}>
          {list.map((opt, i) => {
            const selected = on && opt === value;
            return (
              <button
                key={`${i}-${opt.slice(0, 24)}`}
                type="button"
                onClick={() => {
                  onSelect(opt);
                  if (!on) onToggle(true);
                }}
                aria-pressed={selected}
                data-cta-option
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected ? "border-[#c08020] bg-[#c08020]/10" : "border-[#406080]/30 bg-[#0d1520]/40 hover:border-[#c08020]/50"
                }`}
              >
                <span className="flex items-start gap-2">
                  <span className="text-xs mt-0.5" aria-hidden="true">{selected ? "✅" : "○"}</span>
                  <span className={`text-[#e0e0e0] leading-relaxed ${textSize} font-fantasy whitespace-pre-wrap`} data-cta-text>{opt}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[#606080] text-xs font-fantasy" data-cta-note>
        {on
          ? list.length > 1
            ? "The checked call to action is the one that gets saved, copied, and downloaded. Click Included to leave it out."
            : "Click Included to leave the call to action out."
          : `The call to action is left out. ${note ?? ""}`.trim()}
      </p>
      {children}
    </div>
  );
}
