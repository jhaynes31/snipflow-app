import { CAMPAIGN_MARKER_COOKIE } from "~/lib/attribution";
import type { QuizId } from "~/lib/questConfig";
import { recordQuizEvent } from "~/server/attribution";

/**
 * Tell the server a quiz started or finished, once per browser session, and
 * only when this visitor came through a campaign link (the readable marker
 * cookie says so). Fire and forget: the quiz never waits on it, and nothing
 * about the person or their answers is sent.
 */
export function reportQuizEvent(quiz: QuizId, kind: "quiz_start" | "quiz_complete"): void {
  if (typeof document === "undefined") return;
  if (!new RegExp(`(?:^|;\\s*)${CAMPAIGN_MARKER_COOKIE}=1`).test(document.cookie)) return;
  const key = `fdm_ev_${quiz}_${kind}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage may be blocked; report anyway rather than lose the count.
  }
  recordQuizEvent({ data: { quiz, kind } }).catch(() => {});
}
