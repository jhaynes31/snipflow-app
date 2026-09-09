import { getRequestIP } from "@tanstack/react-start/server";

/**
 * Small in memory sliding window limiter for public server functions.
 * Server only: import it inside handlers, never from route or component code.
 *
 * Memory resets on a cold start, which is fine here: the goal is to stop a
 * script from filling the leads table in a loop, not to be a perfect quota.
 */

const buckets = new Map<string, number[]>();

export function clientAddress(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Returns true when `key` has made fewer than `limit` calls in the last
 * `windowMs`, recording this call; false when it should be refused.
 */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  // Keep the map from growing without bound.
  if (buckets.size > 5000) {
    for (const [k, times] of buckets) {
      if (!times.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return true;
}
