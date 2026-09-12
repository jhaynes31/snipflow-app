import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_VOICE_PREFS, VOICE_PREFS_KEY, chunkForSpeech, parseVoicePrefs, pickDefaultVoice, tidyDictation, type VoiceOption, type VoicePrefs } from "~/lib/voice";

/**
 * The browser's speech recognition (Chrome, Edge, Safari) and speech
 * synthesis, wrapped for the practice screen. Audio never reaches the
 * site: recognition happens in the browser (which may use its maker's
 * speech service), and only the recognized text is passed on.
 */

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface VoiceState {
  supported: { listen: boolean; speak: boolean };
  prefs: VoicePrefs;
  setPrefs: (patch: Partial<VoicePrefs>) => void;
  voices: VoiceOption[];
  listening: boolean;
  interim: string;
  speaking: boolean;
  /** Listen once; the text goes to `target` if given, else to the hook's default handler. */
  startListening: (target?: (text: string) => void) => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  lastError: string;
}

export function useVoice(onFinal: (text: string) => void): VoiceState {
  const [prefs, setPrefsState] = useState<VoicePrefs>(DEFAULT_VOICE_PREFS);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [lastError, setLastError] = useState("");
  const [supported, setSupported] = useState({ listen: false, speak: false });
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const finalBuffer = useRef("");
  const targetRef = useRef<((text: string) => void) | null>(null);

  // Load prefs and voices once in the browser.
  useEffect(() => {
    try {
      setPrefsState(parseVoicePrefs(localStorage.getItem(VOICE_PREFS_KEY)));
    } catch {
      /* private mode */
    }
    const speak = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported({ listen: Boolean(recognitionCtor()), speak });
    if (!speak) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default }));
      if (list.length) setVoices(list);
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  const setPrefs = useCallback((patch: Partial<VoicePrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const chunks = chunkForSpeech(text);
      if (!chunks.length) return;
      window.speechSynthesis.cancel();
      const all = window.speechSynthesis.getVoices();
      const chosen = pickDefaultVoice(all.map((v) => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default })), prefs.voiceName);
      const voice = chosen ? all.find((v) => v.name === chosen.name) ?? null : null;
      setSpeaking(true);
      try {
        chunks.forEach((chunk, i) => {
          const u = new SpeechSynthesisUtterance(chunk);
          if (voice) u.voice = voice;
          u.rate = prefs.rate;
          if (i === chunks.length - 1) u.onend = () => setSpeaking(false);
          u.onerror = () => setSpeaking(false);
          window.speechSynthesis.speak(u);
        });
      } catch (e) {
        // A browser quirk must never break the practice screen.
        console.error("[voice] speak failed:", e);
        setSpeaking(false);
      }
    },
    [prefs.voiceName, prefs.rate],
  );

  const stopListening = useCallback(() => {
    try {
      rec.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const startListening = useCallback((target?: (text: string) => void) => {
    targetRef.current = target ?? null;
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setLastError("Voice input is not available in this browser. Chrome, Edge, or Safari have it built in.");
      return;
    }
    stopSpeaking();
    setLastError("");
    finalBuffer.current = "";
    setInterim("");
    const r = new Ctor();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalBuffer.current += ` ${res[0].transcript}`;
        else interimText += res[0].transcript;
      }
      setInterim((finalBuffer.current + " " + interimText).trim());
    };
    r.onerror = (e) => {
      const code = e?.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed") setLastError("The microphone is blocked. Allow it in the browser's address bar, then try again.");
      else if (code === "no-speech") setLastError("Didn't catch anything. Try again, a little closer to the mic.");
      else if (code === "network") setLastError("Speech recognition needs an internet connection.");
      else if (code && code !== "aborted") setLastError(`Voice input hit a snag (${code}).`);
    };
    r.onend = () => {
      setListening(false);
      const text = tidyDictation(finalBuffer.current);
      setInterim("");
      if (text) (targetRef.current ?? onFinalRef.current)(text);
      targetRef.current = null;
      rec.current = null;
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setLastError("Could not start listening. Try again.");
    }
  }, [stopSpeaking]);

  useEffect(() => () => {
    try {
      rec.current?.abort();
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { supported, prefs, setPrefs, voices, listening, interim, speaking, startListening, stopListening, speak, stopSpeaking, lastError };
}
