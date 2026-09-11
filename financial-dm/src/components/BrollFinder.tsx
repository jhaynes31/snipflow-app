import { useCallback, useEffect, useRef, useState } from "react";
import type { ScriptResult } from "~/server/scriptGenerator";
import { findBroll, type BrollIdea } from "~/server/brollFinder";
import { getClips, saveClip, searchStockClips } from "~/server/clips";
import { type ClipSummary, type StockClip, formatCue } from "~/lib/brollUtils";
import ClipLibrary from "~/components/ClipLibrary";

/**
 * B roll footage for the script on screen. Each script line gets a search
 * idea and a row of real clips John can preview, download, and drop into
 * his edit, next to anything matching from his own library.
 */
export default function BrollFinder({ script }: { script: ScriptResult | null }) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [ideas, setIdeas] = useState<BrollIdea[]>([]);
  const [libraryMatches, setLibraryMatches] = useState<ClipSummary[]>([]);
  const [stockEnabled, setStockEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState("");
  const [searching, setSearching] = useState(false);
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getClips()
      .then((r) => {
        setClips(r.clips);
        setUploadsEnabled(r.uploadsEnabled);
      })
      .catch(() => {});
  }, []);

  const run = useCallback(
    async (fresh: boolean) => {
      if (!script) return;
      setLoading(true);
      setError("");
      try {
        const res = await findBroll({
          data: {
            topic: script.topic,
            fact: script.fact,
            painPoint: script.painPoint,
            tone: script.tone,
            dndThemed: script.dndThemed,
            script: script.script,
            callToAction: script.callToAction,
            orientation,
            exclude: fresh ? ideas.map((i) => i.query) : [],
          },
        });
        setIdeas(res.ideas);
        setLibraryMatches(res.libraryMatches);
        setStockEnabled(res.stockEnabled);
        if (res.error) setError(res.error);
      } catch {
        setError("Could not find footage right now. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [script, orientation, ideas],
  );

  // Pull footage on its own whenever a new script (or hook) lands.
  const runRef = useRef(run);
  runRef.current = run;
  const scriptKey = script ? script.script : "";
  useEffect(() => {
    if (scriptKey) {
      setIdeas([]);
      void runRef.current(false);
    } else {
      setIdeas([]);
      setLibraryMatches([]);
    }
  }, [scriptKey]);

  const handleCustom = useCallback(async () => {
    const q = custom.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    try {
      const res = await searchStockClips({ data: { query: q, orientation, perPage: 6 } });
      if (!res.ok) setError(res.error || "Stock search failed.");
      setIdeas((prev) => [{ beat: "", query: q, why: "Your own search", clips: res.clips }, ...prev]);
      setCustom("");
    } catch {
      setError("Stock search failed.");
    } finally {
      setSearching(false);
    }
  }, [custom, orientation]);

  const saveToLibrary = useCallback(
    async (st: StockClip, query: string) => {
      const res = await saveClip({
        data: { name: st.name, description: st.credit, tags: query.split(/\s+/).filter(Boolean), url: st.url, posterUrl: st.posterUrl, durationSec: st.durationSec, kind: "link" },
      });
      if (res.ok && res.clip) {
        setSavedIds((prev) => new Set(prev).add(st.id));
        setClips((prev) => [res.clip!, ...prev]);
      } else setError(res.error || "Could not save to the library.");
    },
    [],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-fantasy text-[#c08020] text-lg">Step 5: B Roll for this Script</h2>
          <div className="flex gap-2">
            {(["portrait", "landscape"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOrientation(o)}
                aria-pressed={orientation === o}
                className={`px-3 py-1.5 rounded-lg border font-fantasy text-xs transition-all ${
                  orientation === o ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]" : "bg-[#111a28] border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50"
                }`}
              >
                {o === "portrait" ? "📱 Vertical (Reels, TikTok)" : "🖥️ Horizontal (YouTube)"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          Real clips, free to use, matched to each line of the script in order. Hover to preview, download the ones you like, or save them to your library.
        </p>

        {!script ? (
          <p className="text-center text-[#606080] text-sm font-fantasy py-4">Forge a script above and the footage appears here on its own.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => run(true)}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#c08020] text-[#0d1520] font-bold font-fantasy text-sm hover:bg-[#e0b45a] transition-all disabled:opacity-50"
              >
                {loading ? "Pulling footage..." : ideas.length ? "🎲 Different Footage" : "🎬 Find B Roll"}
              </button>
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustom()}
                placeholder="Or search for something specific, e.g. hand stacking coins"
                className="flex-1 min-w-[14rem] bg-[#0d1520] border border-[#406080]/40 rounded-lg px-3 py-2 text-[#e0e0e0] font-fantasy text-sm focus:border-[#c08020] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCustom}
                disabled={searching || !custom.trim()}
                className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy disabled:opacity-50"
              >
                {searching ? "Searching..." : "🔍 Search"}
              </button>
            </div>

            {error && (
              <div className={`text-center p-3 rounded-lg border text-sm font-fantasy ${stockEnabled ? "bg-red-900/20 border-red-700/30 text-red-300" : "bg-amber-900/20 border-amber-700/30 text-amber-200"}`}>
                {error}
              </div>
            )}

            {loading && ideas.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-6 text-[#a0a0a0] font-fantasy text-sm">
                <span className="w-5 h-5 border-3 border-[#c08020] border-t-transparent rounded-full animate-spin" />
                Reading the script and pulling clips for each line...
              </div>
            )}

            {libraryMatches.length > 0 && (
              <div className="space-y-2">
                <p className="text-[#e0b45a] font-fantasy text-sm">📁 From your library</p>
                <ul className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  {libraryMatches.map((c) => (
                    <li key={c.id} className="rounded-lg border border-[#c08020]/30 bg-[#0d1520]/60 overflow-hidden">
                      {c.kind === "upload" ? (
                        <video src={c.url} poster={c.posterUrl} muted loop playsInline preload="none" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} className="w-full aspect-[3/4] object-cover bg-black" />
                      ) : c.posterUrl ? (
                        <img src={c.posterUrl} alt="" className="w-full aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-[#204060]/30 flex items-center justify-center text-2xl">🔗</div>
                      )}
                      <div className="p-2">
                        <p className="text-[#e0e0e0] text-xs font-fantasy truncate" title={c.name}>{c.name}</p>
                        <a href={c.url} target="_blank" rel="noreferrer" className="text-[#c08020] text-xs font-fantasy hover:underline">⬇️ Open</a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ol className="space-y-5">
              {ideas.map((idea, i) => (
                <li key={`${idea.query}-${i}`} className="space-y-2" data-idea>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#c08020] text-[#0d1520] font-bold font-fantasy flex items-center justify-center text-xs">{i + 1}</span>
                    <div className="min-w-0">
                      {idea.beat && <p className="text-[#a0a0a0] text-sm font-fantasy italic">Under the line: “{idea.beat}”</p>}
                      <p className="text-[#e0e0e0] text-sm font-fantasy">
                        <span className="text-[#e0b45a]">🔍 {idea.query}</span>
                        {idea.why ? <span className="text-[#a0a0a0]"> · {idea.why}</span> : null}
                      </p>
                    </div>
                  </div>
                  {idea.clips.length === 0 ? (
                    <p className="text-[#606080] text-xs font-fantasy pl-10">{stockEnabled ? "No clips came back for this search. Try different words in the search box above." : "Stock search is not switched on yet."}</p>
                  ) : (
                    <ul className="grid gap-2 grid-cols-2 sm:grid-cols-4 pl-10">
                      {idea.clips.map((st) => (
                        <StockCard key={st.id} clip={st} saved={savedIds.has(st.id)} onSave={() => saveToLibrary(st, idea.query)} />
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
            {ideas.length > 0 && (
              <p className="text-[#606080] text-xs font-fantasy">
                Clips come from Pexels and are free to use in John's videos, no credit required. Download opens the full quality file; save your keepers to the library so they are one click away next time.
              </p>
            )}
          </>
        )}
      </section>

      <ClipLibrary clips={clips} uploadsEnabled={uploadsEnabled} onChange={setClips} />
    </div>
  );
}

function StockCard({ clip, saved, onSave }: { clip: StockClip; saved: boolean; onSave: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState(false);
  return (
    <li
      className="rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 overflow-hidden group"
      onMouseEnter={() => {
        setHover(true);
        videoRef.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setHover(false);
        videoRef.current?.pause();
      }}
      data-stock-id={clip.id}
    >
      <a href={clip.pageUrl} target="_blank" rel="noreferrer" className="block relative" title="Open on Pexels">
        {clip.posterUrl && !hover ? (
          <img src={clip.posterUrl} alt="" className="w-full aspect-[3/4] object-cover" loading="lazy" />
        ) : (
          <video ref={videoRef} src={clip.previewUrl || clip.url} poster={clip.posterUrl} muted loop playsInline preload="none" className="w-full aspect-[3/4] object-cover bg-black" />
        )}
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-fantasy">
          {clip.durationSec ? formatCue(clip.durationSec) : ""}{clip.height ? ` · ${clip.height}p` : ""}
        </span>
      </a>
      <div className="p-2 space-y-1">
        <p className="text-[#e0e0e0] text-xs font-fantasy truncate" title={`${clip.name} · ${clip.credit}`}>{clip.name}</p>
        <div className="flex gap-1">
          <a
            href={clip.url}
            download
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center px-1.5 py-1 rounded bg-[#c08020] text-[#0d1520] text-[11px] font-fantasy font-bold hover:bg-[#e0b45a]"
          >
            ⬇️ Download
          </a>
          <button type="button" onClick={onSave} disabled={saved} className="flex-1 px-1.5 py-1 rounded border border-[#406080]/40 text-[#a0a0a0] text-[11px] font-fantasy hover:border-[#c08020]/50 disabled:opacity-60">
            {saved ? "✅ Saved" : "📁 Save"}
          </button>
        </div>
      </div>
    </li>
  );
}
