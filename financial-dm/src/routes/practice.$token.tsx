import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import PracticeBanner from "~/components/practice/PracticeBanner";
import SetupForm, { type SetupApi } from "~/components/practice/SetupForm";
import { outcomeLabel, temperamentById } from "~/lib/practiceConfig";
import { getRecruitPractice, recruitGeneratePersona, recruitStartSession, type RecruitPracticePublic } from "~/server/practiceRecruit";

/**
 * A recruit's Sparring Dummy (AI practice spec, Section 9) at
 * /practice/<token>. The link is the key; there is no login. They get the
 * same setup John does minus saved personas and the editors, a suggested
 * (never locked) level for their stage, their own sessions, and the
 * sessions John shared as examples. Nothing about leads, quests, or other
 * recruits is on this page.
 */
export const Route = createFileRoute("/practice/$token")({
  loader: ({ params }) => getRecruitPractice({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Practice · The Financial DM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RecruitPracticePage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";

function RecruitPracticePage() {
  const initial = Route.useLoaderData();
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RecruitPracticePublic>(initial);
  const refresh = () => getRecruitPractice({ data: { token } }).then(setData).catch(() => {});
  const href = (id: number) => `/practice/${token}/session/${id}`;

  if (!data.ok) return <NotActive />;

  const api: SetupApi = {
    generatePersona: (input) => recruitGeneratePersona({ data: { token, ...input } }),
    startSession: (input) => recruitStartSession({ data: { token, ...input } }),
    refresh,
  };

  return (
    <main className="min-h-dvh py-6 px-4 text-[#e0e0e0]" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-recruit-practice>
      <div className="max-w-5xl mx-auto space-y-5">
        <PracticeBanner who={`${data.firstName}'s practice`} />
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>🥊 The Sparring Dummy</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1" data-recruit-greeting>Hi {data.firstName}. Rehearse a conversation with a fictional person before the real one, as many times as you like. Only you see your sessions unless you choose to share one with John. Reps, not evidence: AI personas are more patient than real people.</p>
        </div>

        <SetupForm
          data={{ profiles: data.profiles, savedPersonas: [], presentations: data.presentations, recent: data.sessions }}
          api={api}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStarted={(id) => navigate({ to: href(id) } as any)}
          sessionHref={href}
          suggested={data.suggested}
          suggestedNote={data.suggestedNote}
          profilesEmptyNote="John has not set up any profiles for this conversation yet. Ask him, or try the other one."
        />

        <section className={`${card} p-4`} data-examples>
          <h2 className="font-fantasy text-[#c08020] text-sm mb-2">John's examples</h2>
          {data.examples.length === 0 ? (
            <p className="text-xs text-[#a0a0a0]">When John shares one of his own practice sessions, it shows up here so you can read how he handled it.</p>
          ) : (
            <ul className="space-y-1">
              {data.examples.map((s) => (
                <li key={s.id}>
                  <a href={href(s.id)} className={`block rounded-lg border border-[#406080]/30 px-3 py-2 hover:border-[#c08020]/50 ${focus}`} data-example={s.id}>
                    <span className="block text-sm text-[#e0e0e0]">{s.personaName} · {temperamentById(s.temperament)?.label ?? s.temperament} · L{s.difficulty}</span>
                    <span className="block text-[11px] text-[#808080]">{s.conversation === "recruiting" ? "Recruiting" : "Coverage"} · {s.mode === "presentation" ? "presentation" : "objection practice"} · {s.turns} exchange{s.turns === 1 ? "" : "s"} · {outcomeLabel(s.outcome ?? "ended_early")}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function NotActive() {
  return (
    <main className="min-h-dvh py-10 px-4 text-[#e0e0e0]" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-recruit-practice-inactive>
      <div className="max-w-md mx-auto text-center space-y-3">
        <h1 className="text-2xl font-fantasy text-[#c08020]">🥊 The Sparring Dummy</h1>
        <p className="text-sm text-[#a0a0a0]">This practice link is not active. If John gave you one, ask him for a fresh link.</p>
      </div>
    </main>
  );
}
