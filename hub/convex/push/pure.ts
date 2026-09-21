/**
 * Quiet hours for notifications. Pure and self-contained (tests/push.test.ts).
 * Hours are 0-23 in the person's own time zone. A window may cross midnight
 * (22 to 7). No window, or start equal to end, means never quiet.
 */
export function hourIn(timeZone: string, now: number = Date.now()): number {
  try {
    const s = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(new Date(now));
    const h = parseInt(s, 10) % 24;
    return Number.isFinite(h) ? h : new Date(now).getUTCHours();
  } catch {
    return new Date(now).getUTCHours();
  }
}

export function isQuietHour(hour: number, start?: number | null, end?: number | null): boolean {
  if (start == null || end == null || start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/** A short device name from the browser's user agent, for the devices list. */
export function deviceLabel(ua: string): string {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android phone" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows computer" : /Linux/.test(ua) ? "Linux computer" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome or Brave" : /Safari\//.test(ua) ? "Safari" : "browser";
  return `${os}, ${browser}`;
}
