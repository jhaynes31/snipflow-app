import { Link, createFileRoute } from "@tanstack/react-router";

/**
 * Quizzes tab (Tavern Keeper's Morning spec, Section 3.1): a landing view
 * that links to each quiz, its leads, and where its copy and numbers are
 * set. The quizzes have no admin screens of their own, so nothing is
 * duplicated here.
 */
export const Route = createFileRoute("/_admin/admin/quizzes")({
  component: QuizzesPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const btn = "inline-block px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, search?: Record<string, string>) => ({ to, search } as any);

const QUIZZES = [
  { id: "insurance", icon: "🛡️", name: "Life Insurance Quiz", href: "/quiz", blurb: "Loaded Dice: armor tier, coverage gap, and a loot page. Leads arrive with their tier.", config: "Estimate values and tier copy live in the quiz config files. A read-only view is coming to Settings." },
  { id: "wealth", icon: "🐉", name: "Wealth Check", href: "/wealth-check", blurb: "Financial health character sheet. Leads arrive with their class and score.", config: "Question copy and the ten loot guides live in the quiz config files." },
  { id: "fit", icon: "🎲", name: "Is This Quest for You?", href: "/guild/quiz", blurb: "The Guild's fit quiz. Recruits arrive with their class and fit level.", config: "Turned on and off with the \"Fit quiz copy approved\" answer under Guild facts." },
];

function QuizzesPage() {
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-quizzes>
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>🎲 Quizzes</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Each quiz feeds Leads or the Guild. Preview them as a visitor would; you stay signed in here.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {QUIZZES.map((q) => (
            <section key={q.id} className={`${card} p-4 space-y-3`} data-quiz-card={q.id}>
              <h2 className="font-fantasy text-[#e0e0e0] text-lg">{q.icon} {q.name}</h2>
              <p className="text-[#a0a0a0] text-sm">{q.blurb}</p>
              <div className="flex flex-wrap gap-2">
                <a href={q.href} target="_blank" rel="noreferrer" className={btn}>👁️ Preview ↗</a>
                {q.id === "fit" ? (
                  <Link {...linkTo("/admin/guild", { view: "recruits" })} className={btn}>Recruits</Link>
                ) : (
                  <Link {...linkTo("/admin/leads")} className={btn}>Leads</Link>
                )}
                {q.id === "fit" && <Link {...linkTo("/admin/guild", { view: "facts" })} className={btn}>On/off switch</Link>}
              </div>
              <p className="text-[11px] text-[#606080]">{q.config}</p>
            </section>
          ))}
        </div>
        <section className={`${card} p-4`}>
          <h2 className="font-fantasy text-[#c08020] text-sm">Sending people to a quiz</h2>
          <p className="text-[#a0a0a0] text-xs mt-1">Use a quest link (thefinancialdm.com/word) rather than the bare quiz address, so the Scoreboard can tell which post brought them. Links are made on the <Link {...linkTo("/admin/quests", { section: "quests" })} className="underline text-[#c08020]">Quest Board</Link>.</p>
        </section>
      </div>
    </main>
  );
}
