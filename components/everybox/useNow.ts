"use client";

import { useEffect, useState } from "react";

/**
 * A clock that ticks once a minute so freshness stays honest while the app
 * sits open on a desktop all morning. Starts at render time to avoid
 * hydration mismatches on the first frame; the interval takes over after that.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
