/**
 * The public lead form's safety net. A database or network blip during a
 * quiz submit must never lose the person: try once more after a short
 * pause, and if it still fails the caller sends the visitor on to their
 * results anyway. Details problems (a fake email) are not retried.
 */
export async function saveLeadWithRetry<T extends { ok: boolean; serverError?: boolean }>(attempt: () => Promise<T>, pauseMs = 1500): Promise<T> {
  const first = await attempt();
  if (first.ok || !first.serverError) return first;
  await new Promise((r) => setTimeout(r, pauseMs));
  return attempt();
}
