import type { SensorySettings } from '@/domain/types';

/** Soft sound + vibration cues (Section 7). Never harsh. */
let ctx: AudioContext | null = null;

export function softTone(settings: SensorySettings, kind: 'tick' | 'done' = 'tick') {
  if (!settings.soundCues) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = kind === 'done' ? 523 : 392;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'done' ? 0.6 : 0.25));
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (kind === 'done' ? 0.65 : 0.3));
  } catch { /* audio is optional */ }
}

export function softBuzz(settings: SensorySettings, pattern: number | number[] = 40) {
  if (!settings.vibrationCues) return;
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
