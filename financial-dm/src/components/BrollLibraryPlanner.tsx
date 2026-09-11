import { useCallback, useEffect, useState } from "react";
import { getSavedScripts, initScriptsTable, type SavedScript } from "~/server/scriptGenerator";
import BrollPlanner, { type BrollScriptSource } from "~/components/BrollPlanner";

/**
 * The hub's B Roll tab: pick any saved script from the library and plan its
 * b roll. Fresh scripts get the same planner as Step 5 of the script forge.
 */
export default function BrollLibraryPlanner() {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SavedScript | null>(null);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initScriptsTable();
      setScripts(await getSavedScripts());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const q = search.toLowerCase();
  const filtered = (q
    ? scripts.filter((s) => s.title.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q))
    : scripts
  ).slice(0, 30);

  const source: BrollScriptSource | null = selected
    ? {
        scriptId: selected.id,
        title: selected.title,
        topic: selected.topic,
        fact: selected.fact,
        painPoint: selected.painPoint,
        tone: selected.tone,
        dndThemed: selected.dndThemed,
        hook: selected.hook,
        script: selected.script,
        callToAction: selected.callToAction,
      }
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 1: Choose a Saved Script</h2>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          The shot list follows a finished script line by line. Pick one from
          the library, or forge a new one on the Script tab and plan its b roll
          there in Step 5.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved scripts by title or topic"
            className="bg-[#0d1520] border border-[#406080]/40 rounded-lg px-4 py-2 text-[#e0e0e0] font-fantasy text-sm focus:border-[#c08020] focus:outline-none w-full sm:w-80"
          />
          <button
            type="button"
            onClick={fetchScripts}
            className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
          >
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center text-[#a0a0a0] font-fantasy py-4">Opening the archives...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[#606080] font-fantasy py-4">
            {scripts.length === 0 ? "No saved scripts yet. Forge one on the Script tab first." : "Nothing matches that search."}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 max-h-80 overflow-y-auto pr-1">
            {filtered.map((s) => {
              const active = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  aria-pressed={active}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    active
                      ? "border-[#c08020] bg-[#c08020]/10"
                      : "border-[#406080]/30 bg-[#0d1520]/40 hover:border-[#c08020]/50"
                  }`}
                >
                  <span className="block text-[#e0e0e0] font-fantasy text-sm">
                    {active ? "✅ " : "📜 "}
                    {s.title || "Untitled"}
                  </span>
                  <span className="block text-[#a0a0a0] text-xs font-fantasy mt-1 truncate">
                    🏷️ {s.topic} · Tone: {s.tone}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#0d1520]/60">
            <p className="text-[#c08020] font-bold font-fantasy text-xs mb-1">📜 {selected.title}</p>
            <p className="text-[#a0a0a0] text-sm font-fantasy whitespace-pre-wrap leading-relaxed">{selected.script}</p>
          </div>
        )}
      </section>

      <BrollPlanner
        source={source}
        heading="Step 2: Plan the B Roll"
        emptyHint="Choose a saved script above and the planner unlocks."
      />
    </div>
  );
}
