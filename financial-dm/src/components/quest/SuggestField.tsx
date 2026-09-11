import { useState } from "react";

const inputClass = "w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";

/**
 * Pick or type: a text box with ready-made options underneath. Clicking an
 * option fills the box (or appends, for list fields); the box stays editable.
 * Shows six options at a time with a "more" toggle.
 */
export default function SuggestField({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  maxLength,
  required,
  textarea,
  rows = 2,
  append = false,
  separator = ", ",
  name,
  hint,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  /** List fields (comma separated): a pick is added instead of replacing. */
  append?: boolean;
  /** What joins appended picks: ", " for lists, "\n" for starters. */
  separator?: string;
  /** Hook for tests. */
  name?: string;
  hint?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const options = suggestions.filter((s, i, a) => s && a.indexOf(s) === i);
  const shown = showAll ? options : options.slice(0, 6);
  const current = value.toLowerCase();
  const pick = (s: string) => {
    if (!append) return onChange(s);
    if (separator === "\n") return onChange(value.trim() ? `${value.replace(/\s+$/, "")}\n${s}` : s);
    const parts = value.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    if (parts.some((p) => p.toLowerCase() === s.toLowerCase())) return;
    onChange([...parts, s].join(separator));
  };
  return (
    <div className="block" data-suggest-field={name}>
      <span className="block text-[#a0a0a0] text-xs font-fantasy mb-1">{label}</span>
      {textarea ? (
        <textarea className={`${inputClass} resize-none`} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} required={required} />
      ) : (
        <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} required={required} />
      )}
      {hint && <p className="text-[#606080] text-[11px] font-fantasy mt-1">{hint}</p>}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5" role="group" aria-label={`Options for ${typeof label === "string" ? label : "this field"}`}>
          <span className="text-[#606080] text-[10px] font-fantasy uppercase tracking-wider self-center">{append ? "Add:" : "Pick or type:"}</span>
          {shown.map((s) => {
            const active = append ? value.toLowerCase().includes(s.toLowerCase()) : current === s.toLowerCase();
            return (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                className={`px-2 py-0.5 rounded-full border text-[11px] font-fantasy transition-all max-w-full truncate ${active ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0c8e0] hover:border-[#c08020]/60 hover:text-[#e0e0e0]"}`}
                title={s}
                data-suggestion
              >
                {s}
              </button>
            );
          })}
          {options.length > 6 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="px-2 py-0.5 rounded-full text-[11px] font-fantasy text-[#a0a0a0] underline">
              {showAll ? "fewer" : `${options.length - 6} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
