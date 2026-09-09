import { useCallback, useState } from "react";
import type { TopicPick, ScriptResult } from "~/server/scriptGenerator";
import { HOOK_TYPE_LABELS } from "~/server/scriptGenerator";
import {
  getRandomTopics,
  generateScript,
  saveScript,
} from "~/server/scriptGenerator";
import { buildScriptText, downloadScript, slugify } from "~/lib/scriptUtils";

const TONES = ["Informative", "Warm", "Funny", "Mix / Surprise Me"];

// Hook mechanism picker options. Value is canonical and stored in the DB.
const HOOK_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: "direct_callout", label: "Direct Callout", hint: "Name the exact person or situation" },
  { value: "curiosity_gap", label: "Curiosity Gap", hint: "Surprising fact, withhold the why" },
  { value: "contrarian", label: "Contrarian", hint: "State what everyone gets wrong" },
  { value: "number_specific", label: "Number Specific", hint: "Lead with a number or timeframe" },
  { value: "mix", label: "Mix", hint: "Let the generator pick the best fit" },
];

export default function ScriptGenerator() {
  const [topicOptions, setTopicOptions] = useState<TopicPick[]>([]);
  const [topicPick, setTopicPick] = useState<TopicPick | null>(null);
  const [tone, setTone] = useState("Mix / Surprise Me");
  const [dndThemed, setDndThemed] = useState(false);
  const [hookType, setHookType] = useState("direct_callout");
  const [targetViewer, setTargetViewer] = useState("");
  const [payoff, setPayoff] = useState("");
  const [abTest, setAbTest] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hookCopied, setHookCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleRollTopic = useCallback(async () => {
    setRolling(true);
    setError("");
    setResult(null);
    setTopicPick(null);
    try {
      const picks = await getRandomTopics();
      setTopicOptions(picks);
    } catch (e) {
      setError("Could not roll the topics. Please try again.");
    } finally {
      setRolling(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topicPick) {
      setError("Please select a topic first!");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);
    setHookCopied(false);
    setCaptionCopied(false);
    setHashtagsCopied(false);
    try {
      const res = await generateScript({
        data: {
          topic: topicPick.topic,
          fact: topicPick.fact,
          tone,
          dndThemed,
          hookType,
          targetViewer,
          payoff,
          abTest,
        },
      });
      if (!res) {
        setError(
          "The generator could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setResult(res);
    } catch (e) {
      setError("Failed to generate the posting package. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topicPick, tone, dndThemed, hookType, targetViewer, payoff, abTest]);

  const copyToClipboard = useCallback(
    async (text: string, setter: (v: boolean) => void) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
      } catch (e) {
        setError("Could not copy to clipboard.");
      }
    },
    [],
  );

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    const text = buildScriptText({
      title: result.title,
      topic: result.topic,
      tone: result.tone,
      dndThemed: result.dndThemed,
      hookType: result.hookType,
      targetViewer: result.targetViewer,
      hook: result.hook,
      script: result.script,
      callToAction: result.callToAction,
      caption: result.caption,
      hashtags: result.hashtags || [],
    });
    await copyToClipboard(text, setCopied);
  }, [result, copyToClipboard]);

  const handleCopyHook = useCallback(async () => {
    if (!result) return;
    await copyToClipboard(result.hook, setHookCopied);
  }, [result, copyToClipboard]);

  const handleCopyCaption = useCallback(async () => {
    if (!result) return;
    await copyToClipboard(result.caption, setCaptionCopied);
  }, [result, copyToClipboard]);

  const handleCopyHashtags = useCallback(async () => {
    if (!result || !result.hashtags || result.hashtags.length === 0) return;
    await copyToClipboard(result.hashtags.join(" "), setHashtagsCopied);
  }, [result, copyToClipboard]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const text = buildScriptText({
      title: result.title,
      topic: result.topic,
      tone: result.tone,
      dndThemed: result.dndThemed,
      hookType: result.hookType,
      targetViewer: result.targetViewer,
      hook: result.hook,
      script: result.script,
      callToAction: result.callToAction,
      caption: result.caption,
      hashtags: result.hashtags || [],
    });
    downloadScript(`script-${slugify(result.title)}.txt`, text);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }, [result]);

  // When A/B testing produced a second hook, let John pick which one to keep.
  const handleUseHookB = useCallback(() => {
    if (!result || !result.hookB) return;
    setResult({
      ...result,
      hook: result.hookB,
      hookType: result.hookBType || result.hookType,
      hookB: undefined,
      hookBType: undefined,
    });
    setCopied(false);
    setHookCopied(false);
  }, [result]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    setError("");
    try {
      const res = await saveScript({ data: result });
      if (!res.ok) {
        setError(res.error || "Could not save the posting package.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError("Could not save the posting package.");
    } finally {
      setSaving(false);
    }
  }, [result]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Step 1: Roll a Topic */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 1: Roll a Topic</h2>
        <div className="flex justify-center">
          <button
            onClick={handleRollTopic}
            disabled={rolling}
            className="px-6 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold shadow-lg shadow-[#c08020]/20 transition-all font-fantasy text-lg disabled:opacity-50"
          >
            {rolling ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Rolling the dice...
              </span>
            ) : (
              "🎲 Roll a Topic"
            )}
          </button>
        </div>

        {topicOptions.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topicOptions.map((opt) => {
                const selected =
                  topicPick?.topic === opt.topic && topicPick?.fact === opt.fact;
                return (
                  <button
                    key={`${opt.topic}\u0000${opt.fact}`}
                    type="button"
                    onClick={() => setTopicPick(opt)}
                    className={`text-left p-4 rounded-xl border text-[#e0e0e0] text-sm font-fantasy space-y-1 transition-all ${
                      selected
                        ? "border-[#c08020] bg-[#c08020]/15 shadow-lg shadow-[#c08020]/20"
                        : "border-[#c08020]/30 bg-[#c08020]/5 hover:border-[#c08020]/60 hover:bg-[#c08020]/10"
                    }`}
                  >
                    <p className="text-[#c08020] font-bold text-base uppercase tracking-wide flex items-center justify-between gap-2">
                      <span>🏷️ {opt.topic}</span>
                      {selected && <span aria-hidden="true">✅</span>}
                    </p>
                    <p className="leading-relaxed">{opt.fact}</p>
                  </button>
                );
              })}
            </div>
            {!topicPick && (
              <p className="text-center text-[#a0a0a0] text-sm font-fantasy">
                Click a topic to select it, then set your tone below.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Pick a Tone + D&D toggle */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 2: Set the Tone</h2>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          Baseline is informative, warm, and funny. Pick a button to lean further
          into one tone. The whole posting set keeps that tone.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
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
            onClick={() => setDndThemed((v) => !v)}
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
          D&D framing is off by default. Turn it on only if you want light fantasy
          wording throughout the posting set.
        </p>
      </section>

      {/* Step 3: Aim the Hook */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Aim the Hook</h2>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          Pick the mechanism that stops the scroll, then aim it at the exact
          viewer. The hook stays under 12 words and no generic openers.
        </p>

        {/* hook_type picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {HOOK_OPTIONS.map((opt) => {
            const selected = hookType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setHookType(opt.value)}
                aria-pressed={selected}
                className={`text-left p-3 rounded-lg border font-fantasy text-sm transition-all ${
                  selected
                    ? "border-[#c08020] bg-[#c08020]/15 text-[#c08020] shadow-lg shadow-[#c08020]/20"
                    : "border-[#406080]/40 bg-[#0d1520]/40 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
                }`}
              >
                <span className="font-bold block">
                  {selected ? "✅ " : ""}
                  {opt.label}
                </span>
                <span className="text-xs text-[#808090] block mt-0.5">
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>

        {/* target_viewer input */}
        <div>
          <label
            htmlFor="targetViewer"
            className="text-[#a0a0a0] text-xs font-fantasy block mb-1"
          >
            Who is this hook for? (optional, one sentence)
          </label>
          <input
            id="targetViewer"
            type="text"
            value={targetViewer}
            onChange={(e) => setTargetViewer(e.target.value)}
            placeholder="someone who only has life insurance through their employer"
            className="w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] placeholder-[#606080] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50"
          />
        </div>

        {/* payoff input (internal) */}
        <div>
          <label
            htmlFor="payoff"
            className="text-[#a0a0a0] text-xs font-fantasy block mb-1"
          >
            What the video will deliver (optional, internal only, never shown in
            the hook)
          </label>
          <input
            id="payoff"
            type="text"
            value={payoff}
            onChange={(e) => setPayoff(e.target.value)}
            placeholder="show why employer coverage disappears when you leave the job"
            className="w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] placeholder-[#606080] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50"
          />
        </div>

        {/* A/B toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[#e0e0e0] text-sm font-fantasy">
              🆚 Generate 2 hook variants
            </p>
            <p className="text-[#606080] text-xs font-fantasy">
              Forge two different hooks and pick which one to keep in the
              package.
            </p>
          </div>
          <button
            onClick={() => setAbTest((v) => !v)}
            aria-pressed={abTest}
            className={`px-4 py-2 rounded-lg border font-fantasy text-sm transition-all ${
              abTest
                ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            {abTest ? "✅ A/B On" : "A/B Off"}
          </button>
        </div>
      </section>

      {/* Step 4: Generate */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 4: Forge the Posting Package</h2>
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={loading || !topicPick}
            className="px-8 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Scribing the scroll...
              </span>
            ) : (
              "🧙 Forge Script, Hook, Caption & Hashtags"
            )}
          </button>
        </div>

        {error && (
          <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {error}
          </div>
        )}

        {result && (
          <div className="p-5 rounded-xl border border-[#c08020]/30 bg-[#0d1520]/60 text-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-fantasy text-[#c08020] text-xl">
                📜 {result.title}
              </h3>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                >
                  {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save Package"}
                </button>
                <button
                  onClick={handleCopyAll}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  {copied ? "✅ Copied!" : "📋 Copy All"}
                </button>
                <button
                  onClick={handleDownload}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  {downloaded ? "✅ Downloaded!" : "⬇️ Download"}
                </button>
              </div>
            </div>

            <p className="text-[#a0a0a0] text-xs font-fantasy">
              🏷️ {result.topic} · Tone: {result.tone}
              {result.hookType ? ` · Hook: ${HOOK_TYPE_LABELS[result.hookType] ?? result.hookType}` : ""}
              {result.dndThemed ? " · 🛡️ D&D themed" : ""}
            </p>

            {/* Hook */}
            {result.hook && (
              <div className="p-4 rounded-lg border border-[#c08020]/30 bg-[#204060]/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[#c08020] font-bold font-fantasy text-sm">
                    🪝 Hook{result.hookType ? ` (${HOOK_TYPE_LABELS[result.hookType] ?? result.hookType})` : ""}
                  </p>
                  <button
                    onClick={handleCopyHook}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {hookCopied ? "✅ Copied!" : "📋 Copy Hook"}
                  </button>
                </div>
                <p className="text-[#e0e0e0] leading-relaxed text-base font-fantasy whitespace-pre-wrap">
                  {result.hook}
                </p>

                {/* A/B variant: pick which hook to keep */}
                {result.hookB && (
                  <div className="mt-3 rounded-lg border border-[#406080]/40 bg-[#0d1520]/50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[#c08020] font-bold font-fantasy text-sm">
                        🆚 Variant B
                        {result.hookBType
                          ? ` (${HOOK_TYPE_LABELS[result.hookBType] ?? result.hookBType})`
                          : ""}
                      </p>
                      <button
                        onClick={handleUseHookB}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] hover:bg-[#c08020]/30 transition-all text-xs font-fantasy"
                      >
                        ✅ Keep this one
                      </button>
                    </div>
                    <p className="text-[#e0e0e0] leading-relaxed text-base font-fantasy whitespace-pre-wrap">
                      {result.hookB}
                    </p>
                    <p className="text-[#606080] text-xs font-fantasy mt-1">
                      This variant keeps the same script and caption, only the
                      hook differs. Pick it to keep it in the package.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Script */}
            {result.script && (
              <div className="p-4 rounded-lg border border-[#406080]/30 bg-[#111a28]">
                <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                  🎬 Script
                </p>
                <p className="text-[#e0e0e0] leading-relaxed text-base font-fantasy whitespace-pre-wrap">
                  {result.script}
                </p>
              </div>
            )}

            {/* Call to Action */}
            {result.callToAction && (
              <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#204060]/10">
                <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                  🎯 Call to Action
                </p>
                <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy">
                  {result.callToAction}
                </p>
              </div>
            )}

            {/* Caption */}
            {result.caption && (
              <div className="p-4 rounded-lg border border-[#406080]/30 bg-[#111a28]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[#c08020] font-bold font-fantasy text-sm">
                    ✍️ Caption
                  </p>
                  <button
                    onClick={handleCopyCaption}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {captionCopied ? "✅ Copied!" : "📋 Copy Caption"}
                  </button>
                </div>
                <p className="text-[#e0e0e0] leading-relaxed text-base font-fantasy whitespace-pre-wrap">
                  {result.caption}
                </p>
              </div>
            )}

            {/* Hashtags */}
            <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#111a28]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[#c08020] font-bold font-fantasy text-sm">
                  🏷️ Hashtags
                </p>
                {result.hashtags && result.hashtags.length > 0 && (
                  <button
                    onClick={handleCopyHashtags}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {hashtagsCopied ? "✅ Copied!" : "📋 Copy Hashtags"}
                  </button>
                )}
              </div>
              {result.hashtags && result.hashtags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 rounded-md bg-[#c08020]/10 border border-[#c08020]/30 text-[#c08020] text-sm font-fantasy"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[#606080] text-sm font-fantasy">
                  No hashtags were generated for this package.
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-[#204060]/40 border border-[#406080]/50 text-[#e0e0e0] hover:bg-[#204060]/60 transition-all font-fantasy text-sm disabled:opacity-50"
              >
                {loading ? "Rolling a fresh take..." : "🔄 Regenerate (Variety)"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
