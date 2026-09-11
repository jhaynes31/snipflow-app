import { useMemo, useState } from "react";
import { saveClip, searchStockClips } from "~/server/clips";
import {
  BROLL_SOURCES,
  BROLL_SOURCE_META,
  type BrollShot,
  type BrollSource,
  type ClipSummary,
  type StockClip,
  cueRange,
  formatCue,
  suggestClips,
  withClip,
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
  clips = [],
  onClipSaved,
}: {
  shots: BrollShot[];
  /** Omit for a read only list. */
  onChange?: (shots: BrollShot[]) => void;
  /** John's clip library, for attaching a clip to a shot. */
  clips?: ClipSummary[];
  /** Called when a stock find is saved into the library. */
  onClipSaved?: (clip: ClipSummary) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<BrollSource, number> = { film: 0, stock: 0, screen: 0, text: 0, clip: 0 };
    for (const s of shots) c[s.source] = (c[s.source] ?? 0) + 1;
    return c;
  }, [shots]);

  const visible = filter === "all" ? shots : shots.filter((s) => s.source === filter);

  const update = (order: number, patch: Partial<BrollShot>) => {
    if (!onChange) return;
    onChange(shots.map((s) => (s.order === order ? { ...s, ...patch } : s)));
  };
  const attach = (order: number, clip: ClipSummary | null) => {
    if (!onChange) return;
    onChange(shots.map((s) => (s.order === order ? withClip(s, clip) : s)));
  };
  const attachStock = (order: number, stock: StockClip) => {
    if (!onChange) return;
    onChange(shots.map((s) => (s.order === order ? withClip(s, { name: `${stock.name} (${stock.credit})`, url: stock.url, posterUrl: stock.posterUrl }, "stock") : s)));
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

              {/* Footage attached to this shot: a library clip or a stock find */}
              {(s.clipUrl || onChange) && (
                <div className="flex items-center gap-3 flex-wrap p-2 rounded-lg border border-[#406080]/30 bg-[#0d1520]/60">
                  {s.clipPosterUrl ? (
                    <img src={s.clipPosterUrl} alt="" className="w-16 h-10 object-cover rounded" />
                  ) : (
                    <span className="w-16 h-10 rounded bg-[#204060]/40 flex items-center justify-center text-lg">📁</span>
                  )}
                  <div className="min-w-0 flex-1">
                    {s.clipUrl ? (
                      <>
                        <p className="text-[#e0e0e0] text-sm font-fantasy truncate">{s.clipId ? "📁" : "🎞️"} {s.clipName || "Attached clip"}</p>
                        {s.clipUrl && (
                          <a href={s.clipUrl} target="_blank" rel="noreferrer" className="text-[#c08020] text-xs font-fantasy hover:underline">
                            ▶ Open clip
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-[#606080] text-xs font-fantasy">No footage attached yet. Pick one of your clips or find a free stock clip.</p>
                    )}
                  </div>
                  {onChange && clips.length > 0 && (
                    <ClipPicker clips={clips} shot={s} onPick={(c) => attach(s.order, c)} />
                  )}
                  {onChange && (
                    <StockFinder shot={s} onPick={(st) => attachStock(s.order, st)} onSaved={onClipSaved} />
                  )}
                  {onChange && s.clipUrl && (
                    <button
                      type="button"
                      onClick={() => attach(s.order, null)}
                      className="px-2 py-1 rounded border border-[#406080]/40 text-[#a0a0a0] text-xs font-fantasy hover:border-red-400/60 hover:text-red-300"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
              )}

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

/** Dropdown of library clips, best matches for this shot first. */
function ClipPicker({ clips, shot, onPick }: { clips: ClipSummary[]; shot: BrollShot; onPick: (clip: ClipSummary) => void }) {
  const best = suggestClips(clips, shot, 3);
  const bestIds = new Set(best.map((c) => c.id));
  const rest = clips.filter((c) => !bestIds.has(c.id));
  const label = (c: ClipSummary) => `${c.name}${c.durationSec ? ` (${formatCue(c.durationSec)})` : ""}`;
  return (
    <select
      value=""
      onChange={(e) => {
        const c = clips.find((x) => x.id === Number(e.target.value));
        if (c) onPick(c);
      }}
      aria-label="Pick a clip from the library"
      className="bg-[#0d1520] border border-[#c08020]/50 rounded-lg px-2 py-1 text-[#c08020] font-fantasy text-xs focus:outline-none max-w-[14rem]"
    >
      <option value="">📁 {shot.clipId ? "Swap clip" : "Pick a clip"}</option>
      {best.length > 0 && (
        <optgroup label="Best matches">
          {best.map((c) => (
            <option key={c.id} value={c.id}>{label(c)}</option>
          ))}
        </optgroup>
      )}
      <optgroup label={best.length ? "All clips" : "Your clips"}>
        {rest.map((c) => (
          <option key={c.id} value={c.id}>{label(c)}</option>
        ))}
      </optgroup>
    </select>
  );
}

/** Search free stock footage for this shot and attach a result (or save it to the library). */
function StockFinder({ shot, onPick, onSaved }: { shot: BrollShot; onPick: (clip: StockClip) => void; onSaved?: (clip: ClipSummary) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockClip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const defaultQuery = () => shot.shot.replace(/[^a-zA-Z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).slice(0, 6).join(" ");

  const search = async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await searchStockClips({ data: { query: q, orientation: "portrait" } });
      setResults(res.clips);
      if (!res.ok) setError(res.error || "Stock search failed.");
    } catch {
      setError("Stock search failed.");
    } finally {
      setLoading(false);
    }
  };

  const openAndSearch = () => {
    const q = query || defaultQuery();
    setQuery(q);
    setOpen(true);
    void search(q);
  };

  const saveToLibrary = async (st: StockClip) => {
    const res = await saveClip({ data: { name: st.name, description: st.credit, tags: query.split(/\s+/).filter(Boolean), url: st.url, posterUrl: st.posterUrl, durationSec: st.durationSec, kind: "link" } });
    if (res.ok && res.clip) {
      setSavedIds((prev) => new Set(prev).add(st.id));
      onSaved?.(res.clip);
    } else setError(res.error || "Could not save to the library.");
  };

  return (
    <div className="w-full">
      {!open ? (
        <button
          type="button"
          onClick={openAndSearch}
          className="px-3 py-1 rounded-lg border border-[#406080]/40 text-[#a0a0a0] text-xs font-fantasy hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
        >
          🎞️ Find free stock
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search(query)}
              placeholder="Describe the footage, e.g. opening a paycheck envelope"
              className="flex-1 bg-[#0d1520] border border-[#406080]/40 rounded-lg px-3 py-1.5 text-[#e0e0e0] font-fantasy text-xs focus:border-[#c08020] focus:outline-none"
            />
            <button type="button" onClick={() => search(query)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] text-xs font-fantasy disabled:opacity-50">
              {loading ? "Searching..." : "Search"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] text-xs font-fantasy">
              ✕
            </button>
          </div>
          {error && <p className="text-amber-300/90 text-xs font-fantasy">{error}</p>}
          {results.length > 0 && (
            <ul className="grid gap-2 grid-cols-3">
              {results.map((st) => (
                <li key={st.id} className="rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 overflow-hidden">
                  <a href={st.pageUrl} target="_blank" rel="noreferrer" title={`Preview on ${st.source === "pixabay" ? "Pixabay" : "Pexels"}`}>
                    {st.posterUrl ? <img src={st.posterUrl} alt="" className="w-full aspect-[3/4] object-cover" /> : <div className="w-full aspect-[3/4] bg-[#204060]/40" />}
                  </a>
                  <div className="p-1.5 space-y-1">
                    <p className="text-[#e0e0e0] text-[11px] font-fantasy truncate" title={st.name}>{st.name}{st.durationSec ? ` · ${formatCue(st.durationSec)}` : ""}</p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onPick(st)} className="flex-1 px-1.5 py-1 rounded bg-[#c08020] text-[#0d1520] text-[11px] font-fantasy font-bold">Use</button>
                      <button type="button" onClick={() => saveToLibrary(st)} disabled={savedIds.has(st.id)} className="flex-1 px-1.5 py-1 rounded border border-[#406080]/40 text-[#a0a0a0] text-[11px] font-fantasy disabled:opacity-60">
                        {savedIds.has(st.id) ? "Saved" : "+ Library"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loading && !error && results.length === 0 && <p className="text-[#606080] text-xs font-fantasy">No results yet. Try a few plain words about what should be on screen.</p>}
        </div>
      )}
    </div>
  );
}
