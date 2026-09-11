import { useCallback, useEffect, useState } from "react";
import type { TopicSelection } from "~/server/topics";
import { generateScript, saveScript, type ScriptResult } from "~/server/scriptGenerator";
import { getClips } from "~/server/clips";
import { BROLL_STYLES, BROLL_STYLE_META, type BrollStyle, type ClipSummary } from "~/lib/brollUtils";
import BrollPlanner, { type BrollScriptSource } from "~/components/BrollPlanner";
import BrollLibraryPlanner from "~/components/BrollLibraryPlanner";
import ClipLibrary from "~/components/ClipLibrary";

/**
 * The B Roll tab. Same first two steps as every forge (topic, pain point,
 * tone come from the hub), then either forge a fresh script and its shot
 * list in one click, or plan from a saved script. John's clip library sits
 * underneath and feeds both paths.
 */
export default function BrollForge({
  selection,
  tone,
  dndThemed,
}: {
  selection: TopicSelection | null;
  tone: string;
  dndThemed: boolean;
}) {
  const [mode, setMode] = useState<"fresh" | "saved">("fresh");
  const [style, setStyle] = useState<BrollStyle>("mixed");
  const [script, setScript] = useState<ScriptResult | null>(null);
  const [savedId, setSavedId] = useState<number | undefined>(undefined);
  const [forging, setForging] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  const [scriptSaved, setScriptSaved] = useState(false);
  const [error, setError] = useState("");
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);

  useEffect(() => {
    getClips()
      .then((r) => {
        setClips(r.clips);
        setUploadsEnabled(r.uploadsEnabled);
      })
      .catch(() => {});
  }, []);

  const handleForge = useCallback(async () => {
    if (!selection) {
      setError("Roll and select a topic first!");
      return;
    }
    setForging(true);
    setError("");
    setScript(null);
    setSavedId(undefined);
    setScriptSaved(false);
    try {
      const res = await generateScript({
        data: {
          topic: selection.topic,
          fact: selection.fact,
          painPoint: selection.painPoint,
          tone,
          dndThemed,
          hookType: "mix",
          targetViewer: "",
          payoff: "",
        },
      });
      if (!res) {
        setError("The generator could not reach the AI service right now. Please check that the API key is set and try again.");
        return;
      }
      setScript(res);
    } catch {
      setError("Failed to forge the script. Please try again.");
    } finally {
      setForging(false);
    }
  }, [selection, tone, dndThemed]);

  const handleSaveScript = useCallback(async () => {
    if (!script) return;
    setSavingScript(true);
    try {
      const res = await saveScript({ data: script });
      if (res.ok) {
        setSavedId(res.id);
        setScriptSaved(true);
        setTimeout(() => setScriptSaved(false), 2000);
      } else setError(res.error || "Could not save the script.");
    } catch {
      setError("Could not save the script.");
    } finally {
      setSavingScript(false);
    }
  }, [script]);

  const source: BrollScriptSource | null = script
    ? {
        scriptId: savedId,
        title: script.title,
        topic: script.topic,
        fact: script.fact,
        painPoint: script.painPoint,
        tone: script.tone,
        dndThemed: script.dndThemed,
        hook: script.hook,
        script: script.script,
        callToAction: script.callToAction,
      }
    : null;

  const modeButton = (m: "fresh" | "saved", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`px-4 py-2 rounded-lg font-fantasy text-sm transition-all border ${
        mode === m ? "bg-[#c08020] text-[#0d1520] border-[#c08020]" : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        {modeButton("fresh", "✨ Fresh script + shot list")}
        {modeButton("saved", "📚 Plan from a saved script")}
      </div>

      {mode === "saved" ? (
        <BrollLibraryPlanner clips={clips} onClipSaved={(c) => setClips((prev) => [c, ...prev])} />
      ) : (
        <>
          <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
            <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Forge the Script and Shot List</h2>
            {selection ? (
              <p className="text-[#a0a0a0] text-xs font-fantasy text-center">
                🏷️ {selection.topic} · 🎯 “{selection.painPoint || "no pain point chosen"}” · Tone: {tone}
              </p>
            ) : (
              <p className="text-[#606080] text-sm font-fantasy text-center">Roll a topic and pick a pain point above first.</p>
            )}
            <div className="space-y-2">
              <p className="text-[#e0e0e0] font-fantasy text-sm text-center">How are you shooting this one?</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {BROLL_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    aria-pressed={style === s}
                    title={BROLL_STYLE_META[s].hint}
                    className={`px-4 py-2 rounded-lg font-fantasy text-sm transition-all border ${
                      style === s
                        ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                        : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
                    }`}
                  >
                    {BROLL_STYLE_META[s].label}
                  </button>
                ))}
              </div>
              <p className="text-center text-[#606080] text-xs font-fantasy">
                {BROLL_STYLE_META[style].hint}
                {style === "library" && clips.length === 0 ? " (the library is empty, so this plans like Mixed)" : ""}
              </p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleForge}
                disabled={forging || !selection}
                className="px-8 py-4 rounded-lg bg-[#c08020] text-[#0d1520] font-bold font-fantasy text-lg hover:bg-[#e0b45a] transition-all shadow-lg shadow-[#c08020]/20 disabled:opacity-50"
              >
                {forging ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                    Scribing the script...
                  </span>
                ) : script ? (
                  "🔄 Forge a New Script + Shot List"
                ) : (
                  "🎬 Forge Script + Shot List"
                )}
              </button>
            </div>
            {error && (
              <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>
            )}

            {script && (
              <div className="p-4 rounded-lg border border-[#c08020]/30 bg-[#0d1520]/60 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-fantasy text-[#c08020] text-lg">📜 {script.title}</h3>
                  <button
                    type="button"
                    onClick={handleSaveScript}
                    disabled={savingScript}
                    className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                  >
                    {savingScript ? "💾 Saving..." : scriptSaved ? "✅ Saved!" : savedId ? "✅ In the library" : "💾 Save Script to Library"}
                  </button>
                </div>
                <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy whitespace-pre-wrap">{script.script}</p>
                {script.callToAction && <p className="text-[#a0a0a0] text-sm font-fantasy">🎯 {script.callToAction}</p>}
                <p className="text-[#606080] text-xs font-fantasy">
                  Want hook options, captions, and hashtags for this one? The Script tab gives the full package; the shot list below is what matters here.
                </p>
              </div>
            )}
          </section>

          <BrollPlanner
            source={source}
            clips={clips}
            style={style}
            onStyle={setStyle}
            autoPlan
            onClipSaved={(c) => setClips((prev) => [c, ...prev])}
            heading="Step 4: The Shot List"
            emptyHint="Forge a script above and the shot list appears here on its own."
          />
        </>
      )}

      <ClipLibrary
        clips={clips}
        uploadsEnabled={uploadsEnabled}
        onChange={setClips}
        defaultOpen={clips.length === 0}
      />
    </div>
  );
}
