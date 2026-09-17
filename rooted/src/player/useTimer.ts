import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Countdown timer. Starts only when `start()` is called (Section 7). Always pausable.
 * `onTick(remaining)` fires every second; `onDone` when it reaches zero.
 */
export function useCountdown(onTick?: (remaining: number) => void, onDone?: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number>(0);
  const cbTick = useRef(onTick); cbTick.current = onTick;
  const cbDone = useRef(onDone); cbDone.current = onDone;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining((prev) => {
        if (left !== prev) cbTick.current?.(left);
        return left;
      });
      if (left <= 0) { setRunning(false); cbDone.current?.(); }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((seconds: number) => {
    setTotal(seconds); setRemaining(seconds);
    endAt.current = Date.now() + seconds * 1000;
    setRunning(true);
  }, []);
  const pause = useCallback(() => { setRunning(false); }, []);
  const resume = useCallback(() => { endAt.current = Date.now() + remaining * 1000; setRunning(true); }, [remaining]);
  const reset = useCallback(() => { setRunning(false); setRemaining(0); setTotal(0); }, []);
  return { remaining, total, running, start, pause, resume, reset };
}
