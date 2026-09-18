import { STUDIO_SOURCES, estimateSeconds, fmtLength, scriptText, wordCount, type StudioScript, type VideoProject } from "~/lib/studio";

const label = "block text-[#e0b45a] text-xs font-fantasy mb-1";
const area = "w-full bg-[#0d1520]/60 border border-[#406080]/40 rounded-lg p-3 text-sm text-[#e0e0e0] font-fantasy leading-relaxed focus:outline-none focus:border-[#c08020] disabled:opacity-40";

/**
 * Step 1: the words. Pre-filled from the tool that opened the Studio; a
 * freestyle video starts empty and John can paste, type, or skip the
 * prompter altogether. Edits here are what the prompter reads next step.
 */
export default function ScriptStep({
  video,
  onChange,
  onNext,
}: {
  video: VideoProject;
  onChange: (patch: { script?: Partial<StudioScript>; noScript?: boolean }) => void;
  onNext: () => void;
}) {
  const src = STUDIO_SOURCES[video.source];
  const words = wordCount(scriptText(video.script));
  const secs = estimateSeconds(video.script);
  return (
    <section className="space-y-4" data-studio-script>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[#a0a0a0] text-xs font-fantasy">
          {src.icon} From the {src.label}
          {video.topic ? ` · 🏷️ ${video.topic}` : ""}
          {video.painPoint ? ` · 🎯 ${video.painPoint}` : ""}
          {video.tone ? ` · Tone: ${video.tone}` : ""}
        </p>
        <button
          type="button"
          onClick={() => onChange({ noScript: !video.noScript })}
          aria-pressed={video.noScript}
          data-studio-noscript
          className={`px-3 py-1.5 rounded-lg border text-xs font-fantasy transition-all ${video.noScript ? "border-[#c08020] bg-[#c08020]/15 text-[#e8c884]" : "border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"}`}
        >
          {video.noScript ? "🎤 Freestyle: no prompter" : "○ Record without a prompter"}
        </button>
      </div>

      <div className={video.noScript ? "opacity-50" : ""}>
        <label className="block">
          <span className={label}>🪝 Hook (the first line)</span>
          <textarea value={video.script.hook} onChange={(e) => onChange({ script: { hook: e.target.value } })} rows={2} disabled={video.noScript} className={area} placeholder="The line that stops the scroll." data-studio-hook />
        </label>
        <label className="block mt-3">
          <span className={label}>🎬 Script</span>
          <textarea value={video.script.body} onChange={(e) => onChange({ script: { body: e.target.value } })} rows={10} disabled={video.noScript} className={area} placeholder="Paste or type what you will say. Blank lines make natural pauses in the prompter." data-studio-body />
        </label>
        <label className="block mt-3">
          <span className={label}>🎯 Call to action (optional)</span>
          <textarea value={video.script.cta} onChange={(e) => onChange({ script: { cta: e.target.value } })} rows={2} disabled={video.noScript} className={area} placeholder="Leave empty for no call to action." data-studio-cta />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[#606080] text-xs font-fantasy" data-studio-estimate>
          {video.noScript ? "No prompter. You will record freestyle." : words ? `${words} words · about ${fmtLength(secs)} read aloud${secs > 60 ? " · over a minute, consider trimming" : ""}` : "No words yet. Paste a script or switch to freestyle."}
        </p>
        <button type="button" onClick={onNext} className="px-5 py-2.5 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm" data-studio-next>
          Next: Record →
        </button>
      </div>
    </section>
  );
}
