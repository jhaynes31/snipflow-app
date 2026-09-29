/**
 * Voice (Section 2). Web Speech API for v1 behind a small interface so a better
 * TTS can be swapped in later without touching the player.
 */
export interface Speaker {
  speak(text: string, opts?: { voice?: 'coach' | 'pt'; rate?: number; voiceName?: string }): void;
  cancel(): void;
  readonly available: boolean;
  /** English voices on this device, for the picker in Settings. */
  listVoices(): { name: string; lang: string }[];
}

class WebSpeechSpeaker implements Speaker {
  private voices: SpeechSynthesisVoice[] = [];
  constructor() {
    if (this.available) {
      this.voices = speechSynthesis.getVoices();
      speechSynthesis.addEventListener?.('voiceschanged', () => { this.voices = speechSynthesis.getVoices(); });
    }
  }
  get available() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }
  listVoices() { return this.voices.filter((v) => v.lang.toLowerCase().startsWith('en')).map((v) => ({ name: v.name, lang: v.lang })); }
  private pickVoice(kind: 'coach' | 'pt', name?: string): SpeechSynthesisVoice | undefined {
    if (name) { const byName = this.voices.find((v) => v.name === name); if (byName) return byName; }
    const en = this.voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (!en.length) return undefined;
    // Two distinct voices where possible: coach = first, PT = a different one.
    return kind === 'coach' ? en[0] : (en[1] ?? en[0]);
  }
  speak(text: string, opts: { voice?: 'coach' | 'pt'; rate?: number; voiceName?: string } = {}) {
    if (!this.available || !text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.voice === 'pt' ? 1.05 : 1;
      const v = this.pickVoice(opts.voice ?? 'coach', opts.voiceName);
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { /* voice is optional; never block the session */ }
  }
  cancel() { if (this.available) try { speechSynthesis.cancel(); } catch { /* ignore */ } }
}

class SilentSpeaker implements Speaker { available = false; speak() {} cancel() {} listVoices() { return []; } }

let current: Speaker | null = null;
export function getSpeaker(): Speaker {
  if (!current) current = typeof window !== 'undefined' && 'speechSynthesis' in window ? new WebSpeechSpeaker() : new SilentSpeaker();
  return current;
}
export function setSpeaker(s: Speaker) { current = s; }
