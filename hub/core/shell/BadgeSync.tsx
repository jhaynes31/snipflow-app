"use client";

import { useEffect } from "react";
import { useHub } from "./HubContext";

/**
 * Keeps the installed app's icon badge equal to the number of open
 * heads-ups for me. Never chores, never reminders, never anything else.
 */
export function BadgeSync() {
  const { headsUpsForMe, profile } = useHub();
  const count = headsUpsForMe.filter((h) => h.status === "open").length;
  const enabled = profile.reminders.badgeEnabled;
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    const apply = enabled && count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge();
    apply.catch(() => {
      /* Badging is unavailable outside an installed app. That's fine. */
    });
  }, [count, enabled]);
  return null;
}
