import { TONES } from "~/lib/contentOptions";

/**
 * Shared "Step 2": tone within the bartender character plus the optional
 * D&D flavor toggle. Used by every generator (and shared across the hub).
 */
export default function ToneControls({
  tone,
  onTone,
  dndThemed,
  onDndThemed,
  heading = "Step 2: Set the Tone",
}: {
  tone: string;
  onTone: (tone: string) => void;
  dndThemed: boolean;
  onDndThemed: (on: boolean) => void;
  heading?: string;
}) {
  return (
    <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
      <h2 className="font-fantasy text-[#c08020] text-lg">{heading}</h2>
      <p className="text-[#a0a0a0] text-sm font-fantasy">
        Every piece is spoken by the same warm tavern bartender. Tone leans
        that character one way; it never swaps him for someone else.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {TONES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTone(t)}
            aria-pressed={tone === t}
            className={`px-4 py-2 rounded-lg font-fantasy text-sm transition-all border ${
              tone === t
                ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onDndThemed(!dndThemed)}
          aria-pressed={dndThemed}
          className={`px-4 py-2 rounded-lg border font-fantasy text-sm transition-all ${
            dndThemed
              ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
              : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
          }`}
        >
          {dndThemed ? "🛡️ D&D Theme: On" : "🛡️ D&D Theme: Off"}
        </button>
      </div>
      <p className="text-center text-[#606080] text-xs font-fantasy">
        D&D framing is off by default. Turn it on for light quest and dice
        metaphors on top of the bartender's voice.
      </p>
    </section>
  );
}
