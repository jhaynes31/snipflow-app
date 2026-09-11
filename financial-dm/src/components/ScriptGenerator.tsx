import { useCallback, useEffect, useState } from "react";
import type { ScriptResult } from "~/server/scriptGenerator";
import { generateScript, regenerateHooks, saveScript } from "~/server/scriptGenerator";
import type { TopicSelection } from "~/server/topics";
import {
  HOOK_TYPE_LABELS,
  buildScriptText,
  composeScript,
  downloadScript,
  slugify,
} from "~/lib/scriptUtils";
import CaptionHashtagPanel from "~/components/generator/CaptionHashtagPanel";
import BrollPlanner from "~/components/BrollPlanner";
import { attachOutputToSlot } from "~/server/campaign";
import { contextOf, type CampaignBrief } from "~/lib/campaign";

// Hook mechanism picker options. Value is canonical and stored in the DB.
const HOOK_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: "direct_callout", label: "Direct Callout", hint: "Name the exact person or situation" },
  { value: "curiosity_gap", label: "Curiosity Gap", hint: "Surprising fact, withhold the why" },
  { value: "contrarian", label: "Contrarian", hint: "State what everyone gets wrong" },
  { value: "number_specific", label: "Number Specific", hint: "Lead with a number or timeframe" },
  { value: "mix", label: "Mix", hint: "Let the generator pick the best fit" },
];

/**
 * Script forge. Topic, pain point, tone, and D&D flavor come from the shared
 * picker in the parent; this component owns the hook aim controls and the
 * generated package.
 */
export default function ScriptGenerator({
  selection,
  tone,
  dndThemed,
  onResult,
  showPlanner = true,
  campaign,
}: {
  selection: TopicSelection | null;
  tone: string;
  dndThemed: boolean;
  /** A Quest Board brief. Optional: without it the forge works exactly as before. */
  campaign?: CampaignBrief;
  /** The B Roll tab listens here and pulls footage for whatever script is on screen. */
  onResult?: (result: ScriptResult | null) => void;
  /** Hide the optional Step 5 shot list (the B Roll tab shows footage instead). */
  showPlanner?: boolean;
}) {
  const [hookType, setHookType] = useState("direct_callout");
  const [targetViewer, setTargetViewer] = useState("");
  const [payoff, setPayoff] = useState("");
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hookCopied, setHookCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  /** saved_scripts.id once this package is saved, so the b roll plan can point at it. */
  const [savedId, setSavedId] = useState<number | undefined>(undefined);
  const [questState, setQuestState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [questNote, setQuestNote] = useState("");
  useEffect(() => {
    onResult?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // A campaign brief fills the hook aim fields John hasn't typed into.
  useEffect(() => {
    if (!campaign) return;
    setTargetViewer((v) => v || [campaign.profileName, campaign.lifeStage].filter(Boolean).join(": "));
    setPayoff((v) => v || campaign.hookAngle);
  }, [campaign]);

  const textParts = useCallback(
    (r: ScriptResult) => ({
      title: r.title,
      topic: r.topic,
      tone: r.tone,
      dndThemed: r.dndThemed,
      hookType: r.hookType,
      targetViewer: r.targetViewer,
      painPoint: r.painPoint,
      hook: r.hook,
      script: r.script,
      callToAction: r.callToAction,
      caption: r.caption,
      hashtags: r.hashtags || [],
    }),
    [],
  );

  const handleGenerate = useCallback(async () => {
    if (!selection) {
      setError("Roll and select a topic first!");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);
    setHookCopied(false);
    setSaved(false);
    setSavedId(undefined);
    try {
      const res = await generateScript({
        data: {
          topic: selection.topic,
          fact: selection.fact,
          painPoint: selection.painPoint,
          tone,
          dndThemed,
          hookType,
          targetViewer,
          payoff,
          campaign: campaign ? contextOf(campaign) : undefined,
        },
      });
      if (!res) {
        setError(
          "The generator could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setQuestState("idle");
      setQuestNote("");
      setResult(res);
    } catch {
      setError("Failed to generate the posting package. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selection, tone, dndThemed, hookType, targetViewer, payoff, campaign]);

  /** Re roll only the hooks; script, call to action, captions, hashtags stay. */
  const handleRegenerateHooks = useCallback(async () => {
    if (!result) return;
    setHooksLoading(true);
    setError("");
    try {
      const hooks = await regenerateHooks({
        data: {
          topic: result.topic,
          fact: result.fact,
          painPoint: result.painPoint,
          tone: result.tone,
          dndThemed: result.dndThemed,
          hookType,
          targetViewer: result.targetViewer,
          payoff: result.payoff,
          title: result.title,
          scriptBody: result.scriptBody,
          previousHooks: result.hooks.map((h) => h.text),
        },
      });
      if (!hooks || hooks.length === 0) {
        setError("Could not forge new hooks right now. The script is unchanged.");
        return;
      }
      const first = hooks[0];
      setResult({
        ...result,
        hooks,
        hook: first.text,
        hookType: first.hookType || result.hookType,
        script: composeScript(first.text, result.scriptBody),
      });
      setSaved(false);
    } catch {
      setError("Could not forge new hooks right now. The script is unchanged.");
    } finally {
      setHooksLoading(false);
    }
  }, [result, hookType]);

  const selectHook = useCallback(
    (idx: number) => {
      if (!result) return;
      const opt = result.hooks[idx];
      if (!opt) return;
      setResult({
        ...result,
        hook: opt.text,
        hookType: opt.hookType || result.hookType,
        script: composeScript(opt.text, result.scriptBody),
      });
      setSaved(false);
    },
    [result],
  );

  const selectCaption = useCallback(
    (caption: string) => {
      if (!result) return;
      setResult({ ...result, caption });
      setSaved(false);
    },
    [result],
  );

  const copyToClipboard = useCallback(
    async (text: string, setter: (v: boolean) => void) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
      } catch {
        setError("Could not copy to clipboard.");
      }
    },
    [],
  );

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    await copyToClipboard(buildScriptText(textParts(result)), setCopied);
  }, [result, copyToClipboard, textParts]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadScript(`script-${slugify(result.title)}.txt`, buildScriptText(textParts(result)));
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }, [result, textParts]);

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
      setSavedId(res.id);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save the posting package.");
    } finally {
      setSaving(false);
    }
  }, [result]);

  /** Save the package, then attach it to the campaign slot (Section 7.2). */
  const handleSaveToQuest = useCallback(async () => {
    if (!result || !campaign) return;
    setQuestState("saving");
    setQuestNote("");
    try {
      let id = savedId;
      if (!id) {
        const res = await saveScript({ data: result });
        if (!res.ok || !res.id) {
          setQuestState("error");
          setQuestNote(res.error || "Could not save the posting package.");
          return;
        }
        id = res.id;
        setSavedId(id);
      }
      const att = await attachOutputToSlot({ data: { slotId: campaign.slotId, ref: `script:${id}`, text: buildScriptText(textParts(result)) } });
      if (!att.ok) {
        setQuestState("error");
        setQuestNote(att.error || "Could not save to the quest.");
        return;
      }
      setQuestState("saved");
      setQuestNote(att.flags.length ? `⚠️ Flagged words to check before approval: ${att.flags.join(", ")}` : "Slot moved to Drafted.");
    } catch {
      setQuestState("error");
      setQuestNote("Could not save to the quest.");
    }
  }, [result, campaign, savedId, textParts]);

  return (
    <div className="space-y-6">
      {/* Aim the Hook */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Aim the Hook</h2>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          Pick the mechanism for the lead hook, then aim it at the exact viewer.
          You get three hook options back, each a different mechanism, all
          under 12 words with no generic openers.
        </p>

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
                <span className="text-xs text-[#808090] block mt-0.5">{opt.hint}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="targetViewer" className="text-[#a0a0a0] text-xs font-fantasy block mb-1">
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

        <div>
          <label htmlFor="payoff" className="text-[#a0a0a0] text-xs font-fantasy block mb-1">
            What the video will deliver (optional, internal only, never shown in the hook)
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
      </section>

      {/* Generate */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 4: Forge the Posting Package</h2>
        {selection ? (
          <p className="text-center text-[#606080] text-xs font-fantasy">
            🏷️ {selection.topic} · 🎯 “{selection.painPoint || "no pain point chosen"}” · Tone: {tone}
            {dndThemed ? " · 🛡️ D&D" : ""}
          </p>
        ) : (
          <p className="text-center text-[#606080] text-xs font-fantasy">
            Roll a topic and pick a pain point above to unlock the forge.
          </p>
        )}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !selection}
            className="px-8 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Scribing the scroll...
              </span>
            ) : (
              "🧙 Forge Script, Hooks, Captions & Hashtags"
            )}
          </button>
        </div>

        {questNote && <p className={`text-xs font-fantasy ${questState === "error" ? "text-red-300" : "text-[#e8c884]"}`} data-quest-note>{questNote}</p>}
      {error && (
          <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {error}
          </div>
        )}

        {result && (
          <div className="p-5 rounded-xl border border-[#c08020]/30 bg-[#0d1520]/60 text-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-fantasy text-[#c08020] text-xl">📜 {result.title}</h3>
              <div className="flex flex-wrap gap-2 shrink-0">
                {campaign && <button
                  type="button"
                  onClick={handleSaveToQuest}
                  disabled={questState === "saving"}
                  className="px-4 py-2 rounded-lg bg-[#c08020]/15 border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/25 transition-all text-sm font-fantasy disabled:opacity-50"
                  data-save-to-quest
                >
                  {questState === "saving" ? "🗺️ Saving to quest..." : questState === "saved" ? "✅ Saved to quest" : "🗺️ Save to quest"}
                </button>
                }
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                >
                  {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save Package"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  {copied ? "✅ Copied!" : "📋 Copy All"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  {downloaded ? "✅ Downloaded!" : "⬇️ Download"}
                </button>
              </div>
            </div>

            <p className="text-[#a0a0a0] text-xs font-fantasy">
              🏷️ {result.topic} · 🎯 {result.painPoint || "no pain point"} · Tone: {result.tone}
              {result.hookType ? ` · Hook: ${HOOK_TYPE_LABELS[result.hookType] ?? result.hookType}` : ""}
              {result.dndThemed ? " · 🛡️ D&D themed" : ""}
            </p>

            {/* Hook options */}
            <div className="p-4 rounded-lg border border-[#c08020]/30 bg-[#204060]/10 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[#c08020] font-bold font-fantasy text-sm">
                  🪝 Hook options (pick the one that opens the video)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.hook, setHookCopied)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {hookCopied ? "✅ Copied!" : "📋 Copy Hook"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateHooks}
                    disabled={hooksLoading || loading}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] hover:bg-[#c08020]/30 transition-all text-xs font-fantasy disabled:opacity-50"
                  >
                    {hooksLoading ? "Re rolling hooks..." : "🎲 New Hooks Only"}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {result.hooks.map((opt, idx) => {
                  const selected = opt.text === result.hook;
                  return (
                    <button
                      key={`${idx}-${opt.text.slice(0, 20)}`}
                      type="button"
                      onClick={() => selectHook(idx)}
                      aria-pressed={selected}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selected
                          ? "border-[#c08020] bg-[#c08020]/10"
                          : "border-[#406080]/30 bg-[#0d1520]/40 hover:border-[#c08020]/50"
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-wider text-[#e0b45a] font-fantasy">
                        {selected ? "✅ " : ""}
                        Option {idx + 1}
                        {opt.hookType ? ` · ${HOOK_TYPE_LABELS[opt.hookType] ?? opt.hookType}` : ""}
                      </span>
                      <span className="block text-[#e0e0e0] leading-relaxed text-base font-fantasy mt-0.5">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[#606080] text-xs font-fantasy">
                “New Hooks Only” re rolls these three and leaves the script,
                call to action, captions, and hashtags untouched.
              </p>
            </div>

            {/* Script */}
            {result.script && (
              <div className="p-4 rounded-lg border border-[#406080]/30 bg-[#111a28]">
                <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">🎬 Script</p>
                <p className="text-[#e0e0e0] leading-relaxed text-base font-fantasy whitespace-pre-wrap">
                  {result.script}
                </p>
              </div>
            )}

            {/* Call to Action */}
            {result.callToAction && (
              <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#204060]/10">
                <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">🎯 Call to Action</p>
                <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy">{result.callToAction}</p>
              </div>
            )}

            <CaptionHashtagPanel
              captions={result.captions}
              caption={result.caption}
              onSelectCaption={selectCaption}
              hashtags={result.hashtags || []}
              onError={setError}
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || hooksLoading}
                className="px-6 py-3 rounded-lg bg-[#204060]/40 border border-[#406080]/50 text-[#e0e0e0] hover:bg-[#204060]/60 transition-all font-fantasy text-sm disabled:opacity-50"
              >
                {loading ? "Rolling a fresh take..." : "🔄 Regenerate Everything"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Plan the B Roll: follows the finished script, never changes it. */}
      {showPlanner && (
      <BrollPlanner
        source={
          result
            ? {
                scriptId: savedId,
                title: result.title,
                topic: result.topic,
                fact: result.fact,
                painPoint: result.painPoint,
                tone: result.tone,
                dndThemed: result.dndThemed,
                hook: result.hook,
                script: result.script,
                callToAction: result.callToAction,
              }
            : null
        }
      />
      )}
    </div>
  );
}
