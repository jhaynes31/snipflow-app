import { useEffect } from 'react';

/** Keep the screen awake during sessions (Section 15). Best effort. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try { lock = await navigator.wakeLock.request('screen'); } catch { /* ignore */ }
    };
    const onVis = () => { if (document.visibilityState === 'visible' && !cancelled) request(); };
    request();
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [active]);
}
