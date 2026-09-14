"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeFreshness, DEFAULT_COMMITMENT_CADENCE_DAYS, needsAttention } from "@/convex/everybox/freshness";
import { useEveryBox } from "./context";
import { useNow } from "./useNow";

export const BADGE_PREF_KEY = "everybox.badge";

export function badgeEnabled(): boolean {
  try {
    return window.localStorage.getItem(BADGE_PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

const listeners = new Set<() => void>();
function subscribePref(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function setBadgeEnabled(on: boolean) {
  try {
    window.localStorage.setItem(BADGE_PREF_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  for (const cb of listeners) cb();
}

/** The badge preference, hydration-safe (defaults to on during SSR). */
export function useBadgePref(): boolean {
  return useSyncExternalStore(subscribePref, badgeEnabled, () => true);
}

const noopSubscribe = () => () => {};
/** Whether this browser exposes the Badging API. False during SSR. */
export function useBadgeSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, () => "setAppBadge" in navigator, () => false);
}

/**
 * Keeps the installed app's icon badge in step with how many of *my* things
 * could use attention. It's passive: the number sits on the icon until it's
 * checked, and never produces a banner or a sound.
 */
export function useAttentionCount(): number | null {
  const { partner } = useEveryBox();
  const now = useNow();
  const categories = useQuery(api.everybox.categories.list);
  const commitments = useQuery(api.everybox.commitments.list);
  if (!categories || !commitments) return null;

  let count = 0;
  for (const c of categories) {
    if (c.tenderId !== partner._id) continue;
    if (needsAttention(computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage)) count++;
  }
  for (const c of commitments.open) {
    if (c.assignedTo !== partner._id) continue;
    if (c.status === "proposed") {
      count++;
    } else {
      const stage = computeFreshness(
        c.lastTendedAt ?? c.activatedAt ?? c.createdAt,
        c.targetWindowDays ?? DEFAULT_COMMITMENT_CADENCE_DAYS,
        now,
      ).stage;
      if (needsAttention(stage)) count++;
    }
  }
  return count;
}

export function BadgeSync() {
  const count = useAttentionCount();
  const enabled = useBadgePref();
  useEffect(() => {
    if (count === null) return;
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    const apply = enabled && count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge();
    apply.catch(() => {
      /* Badging may be unavailable outside an installed PWA; that's fine. */
    });
  }, [count, enabled]);
  return null;
}
