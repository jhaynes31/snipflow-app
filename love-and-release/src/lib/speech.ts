import { useCallback, useEffect, useRef, useState } from 'react'

type RecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}

const getCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechSupported = () => getCtor() !== null

/** Optional voice entry via the Web Speech API. Appends finalized phrases to the caller. */
export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const cb = useRef(onText)
  cb.current = onText

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) cb.current(r[0].transcript.trim())
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [])

  useEffect(() => () => recRef.current?.stop(), [])
  return { listening, start, stop, supported: speechSupported() }
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.92
  window.speechSynthesis.speak(u)
}
