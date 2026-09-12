import { rankVoices } from "~/lib/voice";
import type { VoiceState } from "./useVoice";

/**
 * The voice controls for a practice session: on/off, which voice, a
 * preview, and the settings that matter (send when I stop talking, read
 * hints aloud). Plain about what the browser can and cannot do.
 */

const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50 ${focus}`;

export default function VoiceBar({ v, personaName }: { v: VoiceState; personaName: string }) {
  const ranked = rankVoices(v.voices);
  return (
    <div className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-3 space-y-2" data-voice-bar>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-fantasy text-[#e0e0e0]">
          <input type="checkbox" checked={v.prefs.enabled} onChange={(e) => { v.setPrefs({ enabled: e.target.checked }); if (!e.target.checked) v.stopSpeaking(); }} className="accent-[#c08020]" data-voice-toggle />
          🔊 Voice
        </label>
        {v.prefs.enabled && v.supported.speak && (
          <>
            <select value={v.prefs.voiceName} onChange={(e) => v.setPrefs({ voiceName: e.target.value })} className={`px-2 py-1 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-xs max-w-[14rem] ${focus}`} aria-label={`Voice for ${personaName}`} data-voice-pick>
              <option value="" className="bg-gray-900">Best available voice</option>
              {ranked.map((o) => (
                <option key={o.name} value={o.name} className="bg-gray-900">{o.name} ({o.lang})</option>
              ))}
            </select>
            <button type="button" onClick={() => v.speak(`Hi, I'm ${personaName}. This is how I'll sound.`)} className={btnGhost} data-voice-preview>▶ Preview</button>
            {v.speaking && <button type="button" onClick={v.stopSpeaking} className={btnGhost} data-voice-stop>■ Stop</button>}
            <label className="flex items-center gap-1 text-[11px] text-[#a0a0a0]">
              <input type="checkbox" checked={v.prefs.autoSend} onChange={(e) => v.setPrefs({ autoSend: e.target.checked })} className="accent-[#c08020]" data-voice-autosend /> Send when I stop talking
            </label>
            <label className="flex items-center gap-1 text-[11px] text-[#a0a0a0]">
              <input type="checkbox" checked={v.prefs.readHints} onChange={(e) => v.setPrefs({ readHints: e.target.checked })} className="accent-[#c08020]" /> Read hints aloud
            </label>
          </>
        )}
      </div>
      {v.prefs.enabled && (
        <p className="text-[10px] text-[#606080]" data-voice-note>
          {v.supported.listen ? "Speech is recognized by your browser (Chrome, Edge, or Safari) and may use its maker's speech service. Only the words land in the transcript; no audio is kept." : "This browser can read replies aloud but cannot listen. For talking, use Chrome, Edge, or Safari."}
          {" "}A quiet room and a decent microphone help.
        </p>
      )}
      {v.lastError && <p className="text-[11px] text-red-300" data-voice-error>{v.lastError}</p>}
    </div>
  );
}
