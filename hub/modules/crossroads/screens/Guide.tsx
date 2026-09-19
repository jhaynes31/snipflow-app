"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PLACES } from "@/core/crossroads/places";
import { FACTOR_LABEL, QUESTIONS, type Factor, combinedImportance, rank } from "@/core/crossroads/pure";
import { CoachChat } from "@/core/coach/CoachChat";
import { Card, PageTitle, Spinner } from "@/core/ui";

/** Ask the guide: the coach, handed both sets of answers and the shortlist. It never picks for you. */
export function Guide() {
  const answers = useQuery(api.crossroads.entries.answers);
  const data = useQuery(api.crossroads.entries.places);
  if (!answers || !data) return <Spinner />;
  const importance = combinedImportance(answers.mine, answers.theirs);
  const short = new Set(data.overrides.filter((o) => o.shortlisted).map((o) => o.key));
  const candidates = PLACES.filter((p) => short.size ? short.has(p.key) : true);
  const top = rank(candidates, importance).slice(0, 4).map((f) => PLACES.find((p) => p.key === f.key)!);
  const textAnswers = (rows: typeof answers.mine, who: string) =>
    rows.filter((a) => a.text).map((a) => `${who}, "${QUESTIONS.find((q) => q.key === a.key)?.text}": ${a.text}`).join("\n");
  const opening = [
    `What matters to us both, 0 to 5: ${(Object.keys(importance) as Factor[]).map((f) => `${FACTOR_LABEL[f]} ${importance[f]!.toFixed(1)}`).join("; ")}.`,
    `Places we're weighing: ${top.map((p) => `${p.name} (${p.line} Path: ${p.path})`).join(" | ")}.`,
    textAnswers(answers.mine, answers.myName),
    answers.partnerName ? textAnswers(answers.theirs, answers.partnerName) : "",
  ].filter(Boolean).join("\n\n");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Ask the guide" subtitle="The coach, with both of your answers and your shortlist in front of it. It compares, it names what to check, and it doesn't pick for you." />
      <Card tone="alt">
        <p className="sh-muted">It knows: what you both rated, what you each wrote, and the {top.length} places {short.size ? "on your shortlist" : "that fit best so far"}. It doesn&apos;t know current visa thresholds or this year&apos;s crime numbers, and it will say so.</p>
      </Card>
      <CoachChat module="crossroads" task="crossroads.guide" opening={opening} placeholder="Compare our top three. Or: what would a move to Portugal actually cost us the first year?" />
    </div>
  );
}
