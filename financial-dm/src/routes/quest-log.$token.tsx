import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GUILD_CONFIG } from "~/lib/guildConfig";
import { getQuestLogByToken, recruitMarkStep, type QuestLogPublic } from "~/server/questLog";

/**
 * A recruit's private Quest Log (recruiting spec, Phase 5) at
 * /quest-log/<token>. The link is the key; there is no login. It shows the
 * onboarding steps in order, where they are, John's note, his licensing
 * notes, and two ways to reach him. The recruit can tick steps themselves;
 * John sees those as "recruit says done" and confirms them on his side.
 */
export const Route = createFileRoute("/quest-log/$token")({
  loader: ({ params }) => getQuestLogByToken({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Your Quest Log · The Financial DM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Work+Sans:wght@400;500;600&display=swap" },
    ],
  }),
  component: QuestLogPage,
});

const DISPLAY = { fontFamily: "'Cinzel', Georgia, 'Times New Roman', serif" } as const;
const BODY = { fontFamily: "'Work Sans', 'Segoe UI', system-ui, sans-serif" } as const;

function QuestLogPage() {
  const initial = Route.useLoaderData();
  const { token } = Route.useParams();
  const [data, setData] = useState<QuestLogPublic>(initial);
  const [busy, setBusy] = useState("");

  const mark = async (stepId: string, done: boolean) => {
    setBusy(stepId);
    try {
      const res = await recruitMarkStep({ data: { token, stepId, done } });
      if (res.ok) setData(res);
    } finally {
      setBusy("");
    }
  };

  if (!data.ok) return <NotActive />;

  const nextIdx = data.steps.findIndex((s) => !s.done);
  const johnFirst = data.johnName.split(/\s+/)[0] || "John";
  const sms = `sms:${GUILD_CONFIG.recruitPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1")}?&body=${encodeURIComponent(`Hi ${johnFirst}, it's ${data.firstName}. Quick question about my Quest Log:`)}`;
  const tel = `tel:${GUILD_CONFIG.recruitPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1")}`;

  return (
    <main className="min-h-dvh bg-[#f3eee3] text-[#2a3442]" style={BODY} data-quest-log>
      <header className="bg-[#1c3660] text-[#f3eee3] border-b-4 border-[#c8a24b]">
        <div className="max-w-2xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#c8a24b]" style={DISPLAY}>The Guild · Quest Log</p>
            <h1 className="text-2xl sm:text-3xl mt-1" style={DISPLAY} data-quest-log-greeting>
              {data.complete ? `Quest complete, ${data.firstName}.` : `Welcome to the Guild, ${data.firstName}.`}
            </h1>
          </div>
          <img src="/logo.png" alt="The Financial DM" className="h-14 w-14 rounded-full shadow-lg shrink-0" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {/* Progress */}
        <section className="rounded-xl border-2 border-[#1c3660] bg-[#faf7f0] p-5" data-quest-log-progress>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm uppercase tracking-wider text-[#1c3660]" style={DISPLAY}>Your progress</p>
            <p className="text-sm text-[#2a3442]"><span className="font-semibold text-[#1c3660]">{data.progress.done}</span> of {data.progress.total} steps</p>
          </div>
          <div className="mt-3 h-3 rounded-full bg-[#e6dfcf] overflow-hidden" role="progressbar" aria-valuenow={data.progress.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[#c8a24b] transition-all" style={{ width: `${data.progress.percent}%` }} />
          </div>
          {nextIdx >= 0 && (
            <p className="mt-3 text-[#1c2b3a]">
              <span className="text-[#1c3660] font-semibold">Next up:</span> {data.steps[nextIdx].title}
            </p>
          )}
          {data.complete && <p className="mt-3 text-[#1c2b3a]">Every step is done. {johnFirst} will be in touch about what comes next.</p>}
        </section>

        {/* John's note */}
        {data.message && (
          <section className="rounded-xl border-2 border-[#c8a24b]/60 bg-[#faf7f0] p-5" data-quest-log-message>
            <p className="text-sm uppercase tracking-wider text-[#1c3660] mb-2" style={DISPLAY}>A note from {johnFirst}</p>
            <p className="text-lg text-[#1c2b3a] whitespace-pre-line">{data.message}</p>
          </section>
        )}

        {/* Steps */}
        <section>
          <h2 className="text-xl text-[#1c3660] mb-3" style={DISPLAY}>The steps</h2>
          <ol className="space-y-2" data-quest-log-steps>
            {data.steps.map((s, i) => {
              const isNext = i === nextIdx;
              const johnDone = s.done && s.doneBy === "john";
              return (
                <li key={s.id} className={`rounded-xl border-2 p-4 ${s.done ? "border-[#c8a24b]/50 bg-[#faf7f0]" : isNext ? "border-[#1c3660] bg-white shadow-md" : "border-[#d9d2c2] bg-[#faf7f0]/60"}`} data-quest-log-step={s.id} data-done={s.done ? "true" : "false"}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${s.done ? "bg-[#c8a24b] text-[#1c1a12]" : isNext ? "bg-[#1c3660] text-[#f3eee3]" : "bg-[#e6dfcf] text-[#6b6355]"}`} aria-hidden="true">
                      {s.done ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg leading-snug ${s.done ? "text-[#6b6355] line-through decoration-[#c8a24b]" : "text-[#1c2b3a]"}`}>{s.title}</p>
                      {s.detail && !s.done && <p className="mt-1 text-sm text-[#4a5568]">{s.detail}</p>}
                      {isNext && <p className="mt-1 text-xs uppercase tracking-wider text-[#1c3660]" style={DISPLAY}>You are here</p>}
                      {s.done && <p className="mt-1 text-xs text-[#6b6355]">{johnDone ? `Confirmed by ${johnFirst}` : "You marked this done"}{s.doneAt ? ` · ${new Date(s.doneAt).toLocaleDateString()}` : ""}</p>}
                    </div>
                    {!johnDone && (
                      <button type="button" onClick={() => mark(s.id, !s.done)} disabled={busy === s.id} className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold ${s.done ? "border border-[#d9d2c2] text-[#6b6355]" : "bg-[#1c3660] text-[#f3eee3]"} disabled:opacity-50`} data-quest-log-mark>
                        {s.done ? "Undo" : "I did this"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Licensing notes */}
        {data.licensingNotes && (
          <section className="rounded-xl border-2 border-[#d9d2c2] bg-[#faf7f0] p-5" data-quest-log-licensing>
            <p className="text-sm uppercase tracking-wider text-[#1c3660] mb-2" style={DISPLAY}>The licensing process, from {johnFirst}</p>
            <p className="text-[#1c2b3a] whitespace-pre-line">{data.licensingNotes}</p>
          </section>
        )}

        {/* Contact */}
        <section className="flex flex-wrap gap-3" data-quest-log-contact>
          <a href={sms} className="px-5 py-3 rounded-lg bg-[#c8a24b] hover:bg-[#b8923b] text-[#1c1a12] font-semibold shadow" data-quest-log-text>📱 Text {johnFirst}</a>
          <a href={tel} className="px-5 py-3 rounded-lg border-2 border-[#1c3660] text-[#1c3660] font-semibold">📞 Call {GUILD_CONFIG.recruitPhone}</a>
        </section>
        <p className="text-xs text-[#6b6355]">This page is private to you. Keep the link to yourself; {johnFirst} can send you a new one any time.</p>
      </div>

      <footer className="bg-[#1c3660] border-t-4 border-[#c8a24b] text-[#f3eee3]">
        <div className="max-w-2xl mx-auto px-5 py-6 text-center">
          <p className="text-xl" style={DISPLAY}>The Financial DM</p>
          <p className="text-xs text-[#c9d3e3] mt-1">A division of {GUILD_CONFIG.presentedBy}</p>
        </div>
      </footer>
    </main>
  );
}

function NotActive() {
  return (
    <main className="min-h-dvh bg-[#f3eee3] text-[#2a3442] flex items-center justify-center px-5" style={BODY} data-quest-log-inactive>
      <div className="max-w-md text-center">
        <img src="/logo.png" alt="The Financial DM" className="h-20 w-20 rounded-full shadow-lg mx-auto" />
        <h1 className="mt-5 text-2xl text-[#1c3660]" style={DISPLAY}>This Quest Log link isn't active.</h1>
        <p className="mt-3 text-[#2a3442]">It may have been replaced with a new one. Text John and he'll send you the current link.</p>
        <a href={`sms:${GUILD_CONFIG.recruitPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1")}?&body=${encodeURIComponent("Hi John, my Quest Log link isn't working.")}`} className="inline-block mt-5 px-5 py-3 rounded-lg bg-[#c8a24b] text-[#1c1a12] font-semibold">📱 Text John</a>
        <p className="mt-6 text-sm"><a href="/guild" className="underline underline-offset-4 text-[#1c3660]">Back to the Guild Hall</a></p>
      </div>
    </main>
  );
}
