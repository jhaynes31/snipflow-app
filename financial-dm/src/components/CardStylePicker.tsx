import { THEME_BACKGROUNDS, THEME_BORDERS } from "~/lib/slideEditor";

/**
 * Backdrop and border frame for a batch of social cards. Used by the forge
 * and by the saved library, always placed directly above the cards it
 * changes so John sees the result as he clicks.
 */
export default function CardStylePicker({
  themeBackground,
  themeBorder,
  onBackground,
  onBorder,
  note = "Backdrop and border apply to every card below and show up in the PNG export.",
  status,
}: {
  themeBackground?: string;
  themeBorder?: string;
  onBackground: (id: string | undefined) => void;
  onBorder: (id: string | undefined) => void;
  note?: string;
  /** A short line such as "Saved" or "Saving..." shown beside the note. */
  status?: string;
}) {
  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-fantasy border ${on ? "bg-[#c08020] text-[#0d1520] border-[#c08020]" : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"}`;
  return (
    <div className="space-y-3 p-4 rounded-lg border border-[#406080]/30 bg-[#111a28]" data-card-style>
      <div>
        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-2">🖼️ Card Backdrop</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button type="button" onClick={() => onBackground(undefined)} className={chip(!themeBackground)} aria-pressed={!themeBackground} data-card-backdrop="classic">
            Classic
          </button>
          {THEME_BACKGROUNDS.map((b) => (
            <button key={b.id} type="button" onClick={() => onBackground(b.id)} className={chip(themeBackground === b.id)} aria-pressed={themeBackground === b.id} data-card-backdrop={b.id}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-2">🪞 Border Frame</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button type="button" onClick={() => onBorder(undefined)} className={chip(!themeBorder)} aria-pressed={!themeBorder} data-card-border="none">
            None
          </button>
          {THEME_BORDERS.map((b) => (
            <button key={b.id} type="button" onClick={() => onBorder(b.id)} className={chip(themeBorder === b.id)} aria-pressed={themeBorder === b.id} data-card-border={b.id}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-[#606080] text-xs font-fantasy">
        {note}
        {status ? <span className="ml-2 text-[#7fd08a]" data-card-style-status>{status}</span> : null}
      </p>
    </div>
  );
}
