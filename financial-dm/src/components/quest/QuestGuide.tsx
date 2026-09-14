import { Link } from "@tanstack/react-router";
import { GUIDE_LOOP, GUIDE_RULES, GUIDE_SECTIONS } from "~/lib/questGuide";

/**
 * The Guide tab: a walk through the Quest Board for John, from profile to
 * scoreboard, naming buttons exactly as they appear. Content lives in
 * src/lib/questGuide.ts so the shareable tutorial page stays identical.
 */
/** One step of the Quest Board guide, as it appears on the Guide section and the How To tab. */
export function QuestGuideStep({ section: s, index: i }: { section: (typeof GUIDE_SECTIONS)[number]; index: number }) {
  return (
    <section id={`guide-${s.id}`} className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 sm:p-6 scroll-mt-4" data-guide-section={s.id}>
      <p className="text-[#606080] text-[11px] uppercase tracking-wider font-fantasy">
        Step {i + 1} · {s.where}
      </p>
      <h3 className="font-fantasy text-[#c08020] text-lg mt-1">{s.title}</h3>
      <p className="text-[#a0a0a0] text-sm mt-2 max-w-2xl leading-relaxed">{s.intro}</p>
      <ol className="mt-4 space-y-3">
        {s.steps.map((st, j) => (
          <li key={j} className="flex gap-3">
            <span className="font-fantasy text-[#c08020]/80 text-sm w-5 shrink-0 tabular-nums pt-0.5">{j + 1}.</span>
            <span className="min-w-0">
              <span className="block text-[#e0e0e0] text-sm leading-relaxed">{st.do}</span>
              {st.note && <span className="block text-[#808080] text-xs mt-1 leading-relaxed">{st.note}</span>}
            </span>
          </li>
        ))}
      </ol>
      {s.tip && (
        <p className="mt-4 rounded-lg border border-[#c08020]/25 bg-[#c08020]/10 px-3 py-2 text-[#e0c890] text-xs font-fantasy">
          🕯️ {s.tip}
        </p>
      )}
    </section>
  );
}

/** The loop at a glance. `withNav` adds the in-page section links used on the Guide section. */
export function QuestGuideOverview({ withNav = true }: { withNav?: boolean }) {
  return (
    <section className="rounded-xl border border-[#c08020]/40 bg-[#111a28] p-5 sm:p-6" data-quest-guide-overview>
      <h2 className="font-fantasy text-[#c08020] text-xl">How a quest works, start to finish</h2>
      <p className="text-[#a0a0a0] text-sm font-fantasy mt-2 max-w-2xl">
        The Quest Board turns "I should post more" into a short campaign with one goal: booked calls. Everything below is the loop{withNav ? ", and each step has its own section further down" : "; each step is its own topic in the list above"}.
      </p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {GUIDE_LOOP.map((s, i) => (
          <li key={s.label} className="flex gap-3 rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 px-3 py-2">
            <span className="font-fantasy text-[#c08020] text-lg leading-none pt-0.5 w-6 shrink-0 tabular-nums">{i + 1}</span>
            <span>
              <span className="block text-[#e0e0e0] text-sm font-fantasy">{s.label}</span>
              <span className="block text-[#808080] text-xs">{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      {withNav && (
        <nav aria-label="Guide sections" className="mt-4 flex flex-wrap gap-2">
          {GUIDE_SECTIONS.map((s, i) => (
            <a key={s.id} href={`#guide-${s.id}`} className="px-3 py-1 rounded-full border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 text-xs font-fantasy">
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>
      )}
    </section>
  );
}

export function QuestGuideRules() {
  return (
    <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 sm:p-6" data-quest-guide-rules>
      <h3 className="font-fantasy text-[#c08020] text-lg">House rules</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {GUIDE_RULES.map((r) => (
          <li key={r} className="flex gap-2 text-sm text-[#e0e0e0]">
            <span className="text-[#c08020]">◆</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/admin/quests" search={{ section: "profiles" }} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm">
          Start with a profile →
        </Link>
        <Link to="/admin/quests" search={{ section: "quests" }} className="px-4 py-2 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/10 font-fantasy text-sm">
          Go to Quests
        </Link>
      </div>
    </section>
  );
}

export default function QuestGuide() {
  return (
    <div className="space-y-6" data-quest-guide>
      <QuestGuideOverview />
      {GUIDE_SECTIONS.map((s, i) => (
        <QuestGuideStep key={s.id} section={s} index={i} />
      ))}
      <QuestGuideRules />
    </div>
  );
}
