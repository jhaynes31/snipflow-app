import { useCallback, useEffect, useRef, useState } from "react";
import { generateBroll, saveBroll, type BrollPlan } from "~/server/brollGenerator";
import {
  BROLL_STYLES,
  BROLL_STYLE_META,
  type BrollStyle,
  type ClipSummary,
  buildBrollText,
  downloadBrollText,
  formatCue,
} from "~/lib/brollUtils";
import { slugify } from "~/lib/scriptUtils";
import BrollShotList from "~/components/generator/BrollShotList";

/** The finished script the planner works from: a fresh forge or a saved one. */
export interface BrollScriptSource {
  scriptId?: number;
  title: string;
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  hook: string;
  script: string;
  callToAction: string;
}

/**
 * B roll planner. Given a finished script it asks for a shot list (what to
 * film or find under each line, from which source, with on screen text and
 * rough cues in seconds), lets John edit it, and saves it to the library.
 * Generation never changes the script itself.
 */
export default function BrollPlanner({
  source,
  heading = "Step 5: Plan the B Roll",
  emptyHint = "Forge a script above and the planner unlocks.",
  clips = [],
  style: styleProp,
  onStyle,
  autoPlan = false,
  onClipSaved,
}: {
  source: BrollScriptSource | null;
  heading?: string;
  emptyHint?: string;
  /** John's clip library, so shots can point at footage he already has. */
  clips?: ClipSummary[];
  /** Controlled shooting style (the picker then lives in the parent). */
  style?: BrollStyle;
  onStyle?: (style: BrollStyle) => void;
  /** Plan as soon as a script arrives, for the one click forge. */
  autoPlan?: boolean;
  /** A stock find was saved to the library from a shot. */
  onClipSaved?: (clip: ClipSummary) => void;
}) {
  const [styleState, setStyleState] = useState<BrollStyle>("mixed");
  const style = styleProp ?? styleState;
  const setStyle = onStyle ?? setStyleState;
  const [plan, setPlan] = useState<BrollPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // A different script (or a re rolled hook) means the old plan no longer
  // lines up, so clear it rather than show stale cues.
  const scriptKey = source ? `${source.scriptId ?? ""}|${source.script}` : "";
  useEffect(() => {
    setPlan(null);
    setError("");
    setSaved(false);
  }, [scriptKey]);

  const handleGenerate = useCallback(async () => {
    if (!source) return;
    setPlan(null);
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await generateBroll({ data: { ...source, style } });
      if (!res) {
        setError(
          "The planner could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setPlan(res);
    } catch {
      setError("Could not plan the b roll. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [source, style]);

  // One click forge: the parent hands us a fresh script and we plan it at once.
  const generateRef = useRef(handleGenerate);
  generateRef.current = handleGenerate;
  useEffect(() => {
    if (autoPlan && source) void generateRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlan, scriptKey]);

  const handleSave = useCallback(async () => {
    if (!plan) return;
    setSaving(true);
    setError("");
    try {
      const res = await saveBroll({ data: plan });
      if (!res.ok) {
        setError(res.error || "Could not save the shot list.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save the shot list.");
    } finally {
      setSaving(false);
    }
  }, [plan]);

  const handleCopy = useCallback(async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(buildBrollText(plan));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, [plan]);

  const handleDownload = useCallback(() => {
    if (!plan) return;
    downloadBrollText(`broll-${slugify(plan.title || "shot-list")}.txt`, buildBrollText(plan));
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }, [plan]);

  return (
    <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
      <h2 className="font-fantasy text-[#c08020] text-lg">{heading}</h2>
      <p className="text-[#a0a0a0] text-sm font-fantasy">
        A shot list for the footage that plays while the voice over runs: what
        to film or find under each line, where it comes from, the on screen
        text in the bartender's voice, and a rough cue in seconds.
      </p>

      {!source ? (
        <p className="text-center text-[#606080] text-sm font-fantasy py-4">{emptyHint}</p>
      ) : (
        <>
          <p className="text-[#a0a0a0] text-xs font-fantasy text-center">
            📜 {source.title || "untitled script"} · 🏷️ {source.topic}
            {source.painPoint ? ` · 🎯 ${source.painPoint}` : ""} · Tone: {source.tone}
          </p>

          {/* Shooting style (hidden when the parent owns it) */}
          {!styleProp && (
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
            <p className="text-center text-[#606080] text-xs font-fantasy">{BROLL_STYLE_META[style].hint}</p>
          </div>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-8 py-4 rounded-lg bg-[#c08020] text-[#0d1520] font-bold font-fantasy text-lg hover:bg-[#e0b45a] transition-all shadow-lg shadow-[#c08020]/20 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                  Storyboarding...
                </span>
              ) : plan ? (
                "🔄 Plan the B Roll Again"
              ) : (
                "🎬 Plan the B Roll"
              )}
            </button>
          </div>

          {error && (
            <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
              {error}
            </div>
          )}

          {plan && (
            <div className="p-5 rounded-xl border border-[#c08020]/30 bg-[#0d1520]/60 text-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-fantasy text-[#c08020] text-xl">🎬 Shot list</h3>
                  <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
                    {plan.shots.length} shots · runtime about {formatCue(plan.totalSeconds)} · Style:{" "}
                    {BROLL_STYLE_META[plan.style].label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                  >
                    {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save Shot List"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                  >
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                  >
                    {downloaded ? "✅ Downloaded!" : "⬇️ Download"}
                  </button>
                </div>
              </div>

              <BrollShotList
                shots={plan.shots}
                clips={clips}
                onClipSaved={onClipSaved}
                onChange={(shots) => {
                  setPlan({ ...plan, shots });
                  setSaved(false);
                }}
              />

              <p className="text-[#606080] text-xs font-fantasy">
                Cues are estimates from a normal speaking pace, so treat them as
                a guide. Edits here are kept when you save.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
