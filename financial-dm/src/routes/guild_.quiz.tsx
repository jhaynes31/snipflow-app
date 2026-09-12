import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import D20Dice from "~/components/D20Dice";
import InterestForm from "~/components/guild/InterestForm";
import { FIT_COPY_STATUS, FIT_QUESTIONS, FIT_RESULT_COPY, GUILD_CLASSES, fitLevelLabel, isFitComplete, scoreFit, type FitResult } from "~/lib/fitQuiz";
import { GUILD_CONFIG, smsLink } from "~/lib/guildConfig";
import { reportQuizEvent } from "~/lib/quizEvents";
import { defaultRng } from "~/lib/wealthRng";
import { getGuildPublic, type GuildPublic } from "~/server/guild";

/**
 * "Is This Quest for You?" (recruiting spec, Section 8) at /guild/quiz.
 * Seven work-style questions, a d20 for flavor at the reveal, a Guild class
 * and fit level that come only from the answers, a recap drawn from the
 * trust facts with the meeting disclosure, and an optional contact step.
 * Every result offers the interview (Rule 2.7). Hidden from the public
 * until John confirms the "Fit quiz copy approved" fact.
 */
export const Route = createFileRoute("/guild_/quiz")({
  loader: () => getGuildPublic(),
  head: ({ loaderData }) => {
    const live = Boolean(loaderData?.live && loaderData.facts.fitQuizApproved === "yes");
    return {
      meta: [
        { title: "Is This Quest for You? · The Financial DM" },
        { name: "description", content: "Seven quick questions about how you like to work, and an honest read on whether joining John's team fits." },
        ...(live ? [] : [{ name: "robots", content: "noindex, nofollow" }]),
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Work+Sans:wght@400;500;600&display=swap" },
      ],
    };
  },
  component: FitQuizPage,
});

const DISPLAY = { fontFamily: "'Cinzel', Georgia, 'Times New Roman', serif" } as const;
const BODY = { fontFamily: "'Work Sans', 'Segoe UI', system-ui, sans-serif" } as const;
const STORE = "fit_quiz_v1";

type Phase = "intro" | "questions" | "reveal" | "result" | "contact";
interface QuizState {
  phase: Phase;
  index: number;
  answers: Record<string, string>;
  roll?: number;
}
const FRESH: QuizState = { phase: "intro", index: 0, answers: {} };

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function FitQuizPage() {
  const data = Route.useLoaderData();
  const quizLive = data.live && data.facts.fitQuizApproved === "yes";
  if (!quizLive && !data.canPreview) return <ComingSoon />;
  return <FitQuiz data={data} live={quizLive} />;
}

function ComingSoon() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-16 bg-[#1c3660] text-center" style={BODY}>
      <div>
        <img src="/logo.png" alt="The Financial DM" className="h-24 w-24 rounded-full mx-auto shadow-xl" />
        <h1 className="mt-6 text-3xl text-[#f3eee3]" style={DISPLAY}>Is This Quest for You?</h1>
        <p className="mt-2 text-[#c9d3e3]">The quiz is being prepared. The Guild Hall is open.</p>
        <a href="/guild" className="inline-block mt-6 text-[#c8a24b] underline underline-offset-4">Go to the Guild Hall</a>
      </div>
    </main>
  );
}

function FitQuiz({ data, live }: { data: GuildPublic; live: boolean }) {
  const [state, setState] = useState<QuizState>(FRESH);
  const [hydrated, setHydrated] = useState(false);
  const [diceDone, setDiceDone] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw) as Partial<QuizState>;
        setState({
          phase: (["intro", "questions", "reveal", "result", "contact"] as Phase[]).includes(p.phase as Phase) ? (p.phase as Phase) : "intro",
          index: Math.max(0, Math.min(FIT_QUESTIONS.length - 1, Number(p.index) || 0)),
          answers: p.answers && typeof p.answers === "object" ? p.answers : {},
          roll: p.roll,
        });
        if (p.phase === "result" || p.phase === "contact") setDiceDone(true);
      }
    } catch {
      // A blocked store just means a fresh start.
    }
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<QuizState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    if (hydrated && (state.phase === "result" || state.phase === "contact")) reportQuizEvent("fit_quiz", "quiz_complete");
  }, [hydrated, state.phase]);

  const start = () => {
    reportQuizEvent("fit_quiz", "quiz_start");
    update({ phase: "questions", index: 0, answers: {} });
  };
  const answer = (qid: string, oid: string) => {
    const answers = { ...state.answers, [qid]: oid };
    if (state.index < FIT_QUESTIONS.length - 1) update({ answers, index: state.index + 1 });
    else {
      // Roll once, store it, and only then show the die: the animation can never change the outcome.
      update({ answers, phase: "reveal", roll: state.roll ?? defaultRng.d20() });
      setDiceDone(false);
    }
  };
  const back = () => {
    if (state.phase === "questions" && state.index > 0) update({ index: state.index - 1 });
    else if (state.phase === "questions") update({ phase: "intro" });
  };
  const retake = () => {
    setDiceDone(false);
    update({ ...FRESH, roll: undefined });
  };

  const result: FitResult | null = isFitComplete(state.answers) ? scoreFit(state.answers) : null;
  const q = FIT_QUESTIONS[state.index];
  const f = data.facts;
  const sms = smsLink();

  if (!hydrated) return <main className="min-h-dvh bg-[#f3eee3]" />;

  return (
    <main className="min-h-dvh bg-[#f3eee3] text-[#2a3442]" style={BODY}>
      {!live && (
        <div className="bg-[#b8860b] text-[#1c1a12] text-sm px-4 py-2 text-center" data-fit-preview-warning>
          Preview only. {FIT_COPY_STATUS}: read the questions, results, and scoring, then set "Fit quiz copy approved" to Yes in the Guild tab to open it to the public.
        </div>
      )}
      <header className="bg-[#1c3660] text-[#f3eee3] border-b-4 border-[#c8a24b]">
        <div className="max-w-2xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[#c8a24b] text-xs uppercase tracking-widest" style={DISPLAY}>The Guild</p>
            <h1 className="text-2xl sm:text-3xl" style={DISPLAY}>Is This Quest for You?</h1>
          </div>
          <img src="/logo.png" alt="" className="h-14 w-14 rounded-full shadow" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {state.phase === "intro" && (
          <section className="space-y-5" data-fit-intro>
            <p className="text-lg text-[#1c2b3a]">Seven quick questions about how you like to work. About two minutes. Nothing about you personally, just work style.</p>
            <p className="text-[#2a3442]">At the end you get a Guild class, an honest read on the fit, and the straight facts about the role. Whatever it says, John is happy to talk.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={start} className="px-6 py-3 rounded-lg bg-[#1c3660] hover:bg-[#14294a] text-white font-semibold" data-fit-start>🎲 Start the quiz</button>
              <a href="/guild" className="px-6 py-3 rounded-lg border-2 border-[#1c3660]/40 text-[#1c3660] font-semibold">Back to the Guild Hall</a>
            </div>
          </section>
        )}

        {state.phase === "questions" && q && (
          <section className="space-y-5" data-fit-question={q.id}>
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[#1c3660]" style={DISPLAY}>
              <span>Question {state.index + 1} of {FIT_QUESTIONS.length}</span>
              <button type="button" onClick={back} className="underline underline-offset-4 normal-case tracking-normal" style={BODY}>← Back</button>
            </div>
            <div className="h-1.5 rounded-full bg-[#1c3660]/10 overflow-hidden">
              <div className="h-full bg-[#c8a24b]" style={{ width: `${(state.index / FIT_QUESTIONS.length) * 100}%` }} />
            </div>
            <h2 className="text-xl sm:text-2xl text-[#1c3660]" style={DISPLAY}>{q.text}</h2>
            <div className="grid gap-3">
              {q.options.map((o) => (
                <button key={o.id} type="button" onClick={() => answer(q.id, o.id)} aria-pressed={state.answers[q.id] === o.id} className={`text-left px-4 py-3 rounded-xl border-2 text-[#1c2b3a] bg-[#faf7f0] hover:border-[#c8a24b] ${state.answers[q.id] === o.id ? "border-[#c8a24b]" : "border-[#1c3660]/20"}`} data-fit-option={o.id}>
                  {o.text}
                </button>
              ))}
            </div>
          </section>
        )}

        {state.phase === "reveal" && result && (
          <section className="text-center space-y-4" data-fit-reveal>
            <h2 className="text-xl text-[#1c3660]" style={DISPLAY}>Roll for your class</h2>
            <div className="flex justify-center">
              <D20Dice
                key={`fit-${state.roll}`}
                value={state.roll}
                durationMs={1100}
                skippable
                honorReducedMotion
                resultText={(n) => `You rolled a ${n}. The die is for flavor; your answers decide.`}
                announce={(n) => `You rolled a ${n}. This roll does not affect your result.`}
                onComplete={() => setDiceDone(true)}
              />
            </div>
            {diceDone && (
              <button type="button" onClick={() => update({ phase: "result" })} className="px-6 py-3 rounded-lg bg-[#1c3660] hover:bg-[#14294a] text-white font-semibold" data-fit-see-result>
                See your result →
              </button>
            )}
          </section>
        )}

        {(state.phase === "result" || state.phase === "contact") && result && (
          <section className="space-y-6" data-fit-result data-fit-class={result.guildClass} data-fit-level={result.fitLevel}>
            <div className="rounded-2xl border-2 border-[#c8a24b] bg-[#1c3660] text-[#f3eee3] p-6 text-center">
              <p className="text-5xl" aria-hidden="true">{GUILD_CLASSES[result.guildClass].icon}</p>
              <p className="text-[#c8a24b] text-xs uppercase tracking-widest mt-2" style={DISPLAY}>Your Guild class</p>
              <h2 className="text-3xl mt-1" style={DISPLAY}>{GUILD_CLASSES[result.guildClass].name}</h2>
              <p className="text-[#c9d3e3] mt-1">{GUILD_CLASSES[result.guildClass].title}</p>
              <p className="text-[#f3eee3] mt-3 max-w-md mx-auto">{GUILD_CLASSES[result.guildClass].description}</p>
            </div>

            <div className="rounded-xl border-2 border-[#1c3660]/20 bg-[#faf7f0] p-5">
              <p className="text-xs uppercase tracking-widest text-[#1c3660]" style={DISPLAY}>{fitLevelLabel(result.fitLevel)}</p>
              <h3 className="text-2xl text-[#1c3660] mt-1" style={DISPLAY}>{FIT_RESULT_COPY[result.fitLevel].headline}</h3>
              <p className="text-[#2a3442] mt-2">{FIT_RESULT_COPY[result.fitLevel].body}</p>
            </div>

            <div className="rounded-xl border border-[#1c3660]/20 bg-[#faf7f0] p-5 space-y-3" data-fit-recap>
              <h3 className="text-xl text-[#1c3660]" style={DISPLAY}>What this role really involves</h3>
              <Recap facts={f} />
              <div className="rounded-lg border border-[#c8a24b]/60 bg-[#fff9e8] px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-[#1c3660]" style={DISPLAY}>What the conversation covers</p>
                <p className="text-[#2a3442] mt-1 whitespace-pre-line">{f.meetingCovers || "TODO(John): What the conversation covers"}</p>
              </div>
            </div>

            {state.phase === "result" ? (
              <div className="flex flex-wrap gap-3" data-fit-actions>
                <button type="button" onClick={() => update({ phase: "contact" })} className="px-6 py-3 rounded-lg bg-[#1c3660] hover:bg-[#14294a] text-white font-semibold" data-fit-request>
                  Request an interview
                </button>
                <a href={sms} className="px-6 py-3 rounded-lg bg-[#c8a24b] hover:bg-[#b8923b] text-[#1c1a12] font-semibold" data-sms-button>
                  📱 Text {GUILD_CONFIG.smsKeyword} to {GUILD_CONFIG.recruitPhone}
                </a>
                <button type="button" onClick={retake} className="px-4 py-3 text-[#1c3660] underline underline-offset-4">Retake</button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-[#1c3660]/20 bg-[#faf7f0] p-5 sm:p-6 space-y-3" data-fit-contact>
                <h3 className="text-xl text-[#1c3660]" style={DISPLAY}>Request an interview</h3>
                <p className="text-[#2a3442] text-sm">Optional. John reads every one himself and replies personally, usually by text or phone.</p>
                <InterestForm source="fit_quiz" fitResult={{ guildClass: result.guildClass, fitLevel: result.fitLevel }} />
                <a href="/guild" className="inline-block text-sm text-[#1c3660] underline underline-offset-4">No thanks, back to the Guild Hall</a>
              </div>
            )}
          </section>
        )}
      </div>

      <footer className="bg-[#1c3660] border-t-4 border-[#c8a24b] text-[#f3eee3]">
        <div className="max-w-2xl mx-auto px-5 py-6 text-center">
          <p className="text-xl" style={DISPLAY}>The Financial DM</p>
          <p className="text-xs text-[#c9d3e3] mt-1">A division of {GUILD_CONFIG.presentedBy} · Interviews are free, with no obligation.</p>
        </div>
      </footer>
    </main>
  );
}

/** Trust facts only (amendment, Section 7): never a presentation fact. */
function Recap({ facts }: { facts: Record<string, string> }) {
  const rows: Array<[string, string]> = [
    ["The work", facts.roleSummary],
    ["How you'd work with us", facts.workArrangement],
    ["How it's paid", facts.payBasis],
    ["Licensing", facts.licensingRequired],
    ["The interview", facts.costToInterview],
    ["What it costs to get started", facts.recruitCosts],
  ].filter(([, v]) => (v ?? "").trim().length > 0) as Array<[string, string]>;
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-white/60 border border-[#1c3660]/10 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wider text-[#1c3660]" style={DISPLAY}>{k}</dt>
          <dd className="text-sm text-[#2a3442] whitespace-pre-line">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
