import { createServerFn } from "@tanstack/react-start";
import type { QuizId } from "~/lib/questConfig";
import { currentAttribution, recordCampaignEvent, type CampaignEventKind } from "~/server/attribution.server";
import { allowRequest, clientAddress } from "~/server/rateLimit.server";

/**
 * Public, tiny: the quiz pages call this when a quiz starts and when it is
 * completed, so the scoreboard can show quiz starts and completions per
 * quest (Quest Board spec, Section 9.1). Nothing is stored unless the
 * visitor came through a campaign link inside the attribution window, and
 * no answers or personal details are ever sent here.
 */
export const recordQuizEvent = createServerFn({ method: "POST" })
  .validator((d: { quiz: QuizId; kind: "quiz_start" | "quiz_complete" }) => ({
    quiz: (d?.quiz === "financial" ? "financial" : "life_insurance") as QuizId,
    kind: (d?.kind === "quiz_complete" ? "quiz_complete" : "quiz_start") as CampaignEventKind,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const attribution = currentAttribution();
    if (!attribution) return { ok: true };
    if (!allowRequest(`quiz-event:${clientAddress()}`, 40, 10 * 60_000)) return { ok: true };
    await recordCampaignEvent(data.kind, attribution.tag, data.quiz);
    return { ok: true };
  });
