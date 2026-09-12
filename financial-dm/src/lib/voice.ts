/**
 * Voice mode, step one (AI practice spec, "Later: voice"): the browser's own
 * speech recognition and speech synthesis. No accounts, no keys, no audio
 * stored by the site; only the recognized text reaches the transcript.
 * Pure helpers here so they can be tested; the browser bits live in the
 * useVoice hook.
 */

export const VOICE_PREFS_KEY = "fdm_practice_voice_v1";

export interface VoicePrefs {
  enabled: boolean;
  voiceName: string;
  /** Send what John said as soon as he stops talking. */
  autoSend: boolean;
  readHints: boolean;
  rate: number;
}

export const DEFAULT_VOICE_PREFS: VoicePrefs = { enabled: false, voiceName: "", autoSend: true, readHints: true, rate: 1 };

export function parseVoicePrefs(raw: string | null | undefined): VoicePrefs {
  if (!raw) return DEFAULT_VOICE_PREFS;
  try {
    const o = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      enabled: Boolean(o.enabled),
      voiceName: typeof o.voiceName === "string" ? o.voiceName.slice(0, 120) : "",
      autoSend: o.autoSend === undefined ? true : Boolean(o.autoSend),
      readHints: o.readHints === undefined ? true : Boolean(o.readHints),
      rate: typeof o.rate === "number" && o.rate >= 0.6 && o.rate <= 1.4 ? o.rate : 1,
    };
  } catch {
    return DEFAULT_VOICE_PREFS;
  }
}

export interface VoiceOption {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/** English voices first, natural-sounding names ahead of robotic ones, then the rest. */
export function rankVoices(voices: VoiceOption[]): VoiceOption[] {
  const score = (v: VoiceOption) => {
    let s = 0;
    if (/^en(-|_|$)/i.test(v.lang)) s += 100;
    if (/en-US/i.test(v.lang)) s += 20;
    if (/natural|neural|premium|enhanced|siri|samantha|ava|allison|aria|jenny|guy|daniel|karen|moira|tessa/i.test(v.name)) s += 30;
    if (/google/i.test(v.name)) s += 10;
    if (/espeak|compact|whisper|zarvox|bells|cellos|bad news|bubbles|deranged|hysterical|trinoids|albert|jester|organ|wobble|superstar/i.test(v.name)) s -= 80;
    if (v.default) s += 5;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

export function pickDefaultVoice(voices: VoiceOption[], preferredName?: string): VoiceOption | null {
  if (!voices.length) return null;
  if (preferredName) {
    const hit = voices.find((v) => v.name === preferredName);
    if (hit) return hit;
  }
  return rankVoices(voices)[0];
}

/** Split a reply into sentence-sized pieces so long lines start sooner and pause naturally. */
export function chunkForSpeech(text: string, maxLen = 220): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [clean];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((cur + " " + piece).trim().length > maxLen && cur) {
      out.push(cur.trim());
      cur = piece;
    } else cur = `${cur} ${piece}`.trim();
  }
  if (cur) out.push(cur.trim());
  return out;
}

/** Tidy dictated text: capitalize, close with a period if the recognizer left it open. */
export function tidyDictation(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}
