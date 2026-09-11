import { useMemo, useState } from "react";
import {
  BROLL_SOURCES,
  BROLL_SOURCE_META,
  type BrollShot,
  type BrollSource,
  cueRange,
} from "~/lib/brollUtils";

type Filter = BrollSource | "all";

const WORD_LIMIT = 8;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * The shot list itself: one card per shot with the cue, the script line it
 * sits under, the source badge, and editable shot, on screen text, and
 * notes. Filter chips narrow the list by source so John can pull up "just
 * the stuff I have to film" on a shoot day. Shared by the planner and the
 * saved library.
 */
export default function BrollShotList({
  shots,
  onChange,
}: {
  shots: BrollShot[];
  /** Omit for a read only list. */
  onChange?: (shots: BrollShot[]) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<BrollSource, number> = { film: 0, stock: 0, screen: 0, text: 0 };
    for (const s of shots) c[s.source] = (c[s.source] ?? 0) + 1;
    return c;
  }, [shots]);

  const visible = filter === "all" ? shots : shots.filter((s) => s.source === filter);

  const update = (order: number, patch: Partial<BrollShot>) => {
    if (!onChange) return;
    onChange(shots.map((s) => (s.order === order ? { ...s, ...patch } : s)));
  };

  const inputClass =
    "w-full bg-[#0d1520] border border-[#406080]/40 rounded-lg px-3 py-2 text-[#e0e0e0] font-fantasy text-sm focus:border-[#c08020] focus:outline-none";

  return (
    <div className="space-y-3">
      {/* Source filter */}
      <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Filter shots by source">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`px-3 py-1.5 rounded-lg border font-fantasy text-xs transition-all ${
            filter === "all"
              ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
              : "bg-[#111a28] border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50"
          }`}
        >
          All shots · {shots.length}
        </button>
        {BROLL_SOURCES.map((src) => {
          const meta = BROLL_SOURCE_META[src];
          return (
            <button
              key={src}
              type="button"
              onClick={() => setFilter(src)}
              aria-pressed={filter === src}
              disabled={counts[src] === 0}
              title={meta.hint}
              className={`px-3 py-1.5 rounded-lg border font-fantasy text-xs transition-all disabled:opacity-40 ${
                filter === src
                  ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                  : "bg-[#111a28] border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50"
              }`}
            >
              {meta.icon} {meta.label} · {counts[src]}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="text-[#606080] text-sm font-fantasy">No shots use that source in this plan.</p>
      )}

      <ol className="space-y-3">
        {visible.map((s) => {
          const meta = BROLL_SOURCE_META[s.source];
          const words = wordCount(s.onScreenText);
          const tooLong = words > WORD_LIMIT;
          return (
            <li
              key={s.order}
              className="p-4 rounded-lg border border-[#406080]/30 bg-[#111a28] space-y-3"
              data-shot-order={s.order}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-8 h-8 rounded-full bg-[#c08020] text-[#0d1520] font-bold font-fantasy flex items-center justify-center text-sm">
                    {s.order}
                  </span>
                  <span className="text-[#e0b45a] font-fantasy text-sm" title="Rough cue into the video">
                    ⏱️ {cueRange(s)}
                  </span>
                </div>
                {onChange ? (
                  <label className="flex items-center gap-2 text-xs font-fantasy text-[#a0a0a0]">
                    Source
                    <select
                      value={s.source}
                      onChange={(e) => update(s.order, { source: e.target.value as BrollSource })}
                      className="bg-[#0d1520] border border-[#406080]/40 rounded-lg px-2 py-1 text-[#e0e0e0] font-fantasy text-xs focus:border-[#c08020] focus:outline-none"
                    >
                      {BROLL_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {BROLL_SOURCE_META[src].icon} {BROLL_SOURCE_META[src].label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="px-2 py-1 rounded bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] text-xs font-fantasy">
                    {meta.icon} {meta.label}
                  </span>
                )}
              </div>

              <p className="text-[#a0a0a0] text-sm font-fantasy italic border-l-2 border-[#406080]/50 pl-3">
                Under the line: “{s.beat}”
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[#c08020] font-bold font-fantasy text-xs mb-1">🎬 What to shoot or find</p>
                  {onChange ? (
                    <textarea
                      value={s.shot}
                      onChange={(e) => update(s.order, { shot: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#e0e0e0] text-sm font-fantasy leading-relaxed">{s.shot}</p>
                  )}
                </div>
                <div>
                  <p className="text-[#c08020] font-bold font-fantasy text-xs mb-1">
                    🔤 On screen text{" "}
                    <span className={tooLong ? "text-red-300" : "text-[#606080]"}>
                      ({words}/{WORD_LIMIT} words)
                    </span>
                  </p>
                  {onChange ? (
                    <input
                      type="text"
                      value={s.onScreenText}
                      onChange={(e) => update(s.order, { onScreenText: e.target.value })}
                      className={`${inputClass} ${tooLong ? "border-red-400/60" : ""}`}
                    />
                  ) : (
                    <p className="text-[#e0e0e0] text-base font-fantasy">{s.onScreenText}</p>
                  )}
                  <p className="text-[#c08020] font-bold font-fantasy text-xs mt-3 mb-1">📝 Notes</p>
                  {onChange ? (
                    <input
                      type="text"
                      value={s.notes}
                      onChange={(e) => update(s.order, { notes: e.target.value })}
                      placeholder="props, framing, lighting"
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#a0a0a0] text-sm font-fantasy">{s.notes || "none"}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
