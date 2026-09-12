import { createFileRoute } from "@tanstack/react-router";
import SessionView, { type SessionApi } from "~/components/practice/SessionView";
import { recruitEndSession, recruitGetDebrief, recruitGetSession, recruitPauseHint, recruitSectionEvent, recruitSendTurn, recruitShareWithJohn } from "~/server/practiceRecruit";

/**
 * One practice session through a recruit's link (AI practice spec, Section
 * 9): their own, live or finished, or one of John's shared examples read
 * only. Every server call carries the token; the server checks the session
 * belongs to that recruit.
 */
export const Route = createFileRoute("/practice_/$token_/session/$id")({
  loader: ({ params }) => recruitGetSession({ data: { token: params.token, id: Number(params.id) } }),
  head: () => ({
    meta: [
      { title: "Practice session · The Financial DM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RecruitSessionPage,
});

function RecruitSessionPage() {
  const initial = Route.useLoaderData();
  const { token } = Route.useParams();
  const api: SessionApi = {
    sendTurn: (id, text) => recruitSendTurn({ data: { token, id, text } }),
    pauseHint: (id) => recruitPauseHint({ data: { token, id } }),
    endSession: (id, outcome) => recruitEndSession({ data: { token, id, outcome } }),
    sectionEvent: (id, sectionId, event, said, seconds) => recruitSectionEvent({ data: { token, id, sectionId, event, said, seconds } }),
    getDebrief: (id) => recruitGetDebrief({ data: { token, id } }),
    shareWithJohn: (id, shared) => recruitShareWithJohn({ data: { token, id, shared } }),
  };
  const example = initial?.practitioner === "john";
  return <SessionView initial={initial} api={api} backTo={`/practice/${token}`} readOnly={example} who={example ? "One of John's example sessions" : "Your practice"} />;
}
