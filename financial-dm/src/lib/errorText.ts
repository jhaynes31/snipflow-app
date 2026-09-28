/**
 * Words for a failed call, for the screen. A thrown error usually means the
 * network dropped, the server timed out, or the sign in expired; none of
 * those deserve a stack trace in John's face.
 */
export function errorText(e: unknown, fallback = "Something went wrong. Please try again in a moment."): string {
  const text = e instanceof Error ? e.message : String(e ?? "");
  if (/401|unauthori[sz]ed|sign in|signed out|not logged in/i.test(text)) return "Your sign in has expired. Refresh the page and sign in again.";
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(text)) return "The connection dropped. Check your signal and try again.";
  if (/timeout|timed out|504|503/i.test(text)) return "That took too long and gave up. Try again in a moment.";
  return fallback;
}
