import { createFileRoute } from "@tanstack/react-router";
import SessionView, { type SessionApi } from "~/components/practice/SessionView";
import { endSession, getDebrief, getSession, pauseHint, sectionEvent, sendTurn } from "~/server/practice";

/**
 * One practice session for John (AI practice spec, Sections 7 and 8). The
 * screen itself is shared with the recruit view; this route only supplies
 * the admin server calls.
 */
export const Route = createFileRoute("/_admin/admin/practice_/$id")({
  loader: ({ params }) => getSession({ data: { id: Number(params.id) } }),
  component: SessionPage,
});

const adminApi: SessionApi = {
  sendTurn: (id, text) => sendTurn({ data: { id, text } }),
  pauseHint: (id) => pauseHint({ data: { id } }),
  endSession: (id, outcome) => endSession({ data: { id, outcome } }),
  sectionEvent: (id, sectionId, event, said, seconds) => sectionEvent({ data: { id, sectionId, event, said, seconds } }),
  getDebrief: (id) => getDebrief({ data: { id } }),
};

function SessionPage() {
  const initial = Route.useLoaderData();
  return <SessionView initial={initial} api={adminApi} backTo="/admin/practice" readOnly={Boolean(initial?.practitioner === "recruit")} who={initial?.practitioner === "recruit" ? "A recruit's shared session" : undefined} />;
}
