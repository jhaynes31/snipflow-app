import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { TOOL_TOPICS } from "~/components/admin/ToolGuide";
import { QuestGuideOverview, QuestGuideRules, QuestGuideStep } from "~/components/quest/QuestGuide";
import { GUIDE_SECTIONS } from "~/lib/questGuide";
import { HOW_TO_GROUPS, HOW_TO_TOPICS, neighbours, searchTopics, topicById, type HowToTopic } from "~/lib/howTo";

/**
 * The How To tab. One topic on screen at a time, chosen from a dropdown or
 * by typing a few words, so John never scrolls a long page to find the
 * part he needs. Covers the Quest Board step by step, the DM Screen,
 * presenting, the Sparring Dummy, and recruit access.
 */
export const Route = createFileRoute("/_admin/admin/how-to")({
  validateSearch: (s: Record<string, unknown>): { topic?: string } => ({
    topic: typeof s.topic === "string" && topicById(s.topic) ? s.topic : undefined,
  }),
  component: HowToPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const input = `w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs ${focus}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (topic: string) => ({ to: "/admin/how-to", search: { topic } } as any);

function TopicBody({ topic }: { topic: HowToTopic }) {
  if (topic.id === "quest-overview") return <QuestGuideOverview withNav={false} />;
  if (topic.id === "quest-rules") return <QuestGuideRules />;
  if (topic.id.startsWith("quest-")) {
    const i = GUIDE_SECTIONS.findIndex((s) => `quest-${s.id}` === topic.id);
    if (i >= 0) return <QuestGuideStep section={GUIDE_SECTIONS[i]} index={i} />;
  }
  const render = TOOL_TOPICS[topic.id];
  return render ? <>{render()}</> : null;
}

function HowToPage() {
  const { topic: topicId } = Route.useSearch();
  const navigate = useNavigate();
  const topic = topicById(topicId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchTopics(query), [query]);
  const pick = (id: string) => {
    setQuery("");
    setOpen(false);
    navigate(linkTo(id));
    window.scrollTo({ top: 0 });
  };
  // Typing outside the box closes the results; Esc clears.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const around = topic ? neighbours(topic.id) : {};

  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-how-to-page>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>📖 How To</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Pick a topic from the list, or type a few words to find it. One topic at a time, no scrolling through the lot.</p>
        </div>

        <section className={`${card} p-4 grid gap-3 sm:grid-cols-[1fr_1fr]`} data-how-to-picker>
          <div ref={box} className="relative">
            <label htmlFor="howto-search" className="block text-[11px] text-[#a0a0a0] font-fantasy mb-1">Search</label>
            <input
              id="howto-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) pick(results[0].id);
                if (e.key === "Escape") {
                  setQuery("");
                  setOpen(false);
                }
              }}
              placeholder="e.g. remote, bullets, debrief, archive"
              autoComplete="off"
              className={input}
              data-how-to-search
            />
            {open && query.trim() && (
              <ul className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#406080]/40 bg-[#0d1520] shadow-xl" role="listbox" data-how-to-results>
                {results.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-[#808080]">Nothing matches. Try another word, or pick from the list.</li>
                ) : (
                  results.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => pick(t.id)} className="w-full text-left px-3 py-2 hover:bg-[#c08020]/15 focus:bg-[#c08020]/15 focus:outline-none" data-how-to-result={t.id}>
                        <span className="block text-sm text-[#e0e0e0]">{t.title}</span>
                        <span className="block text-[11px] text-[#808080]">{t.group}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="howto-select" className="block text-[11px] text-[#a0a0a0] font-fantasy mb-1">Or choose a topic</label>
            <select id="howto-select" value={topic?.id ?? ""} onChange={(e) => e.target.value && pick(e.target.value)} className={input} data-how-to-select>
              <option value="" className="bg-gray-900">Choose a topic...</option>
              {HOW_TO_GROUPS.map((g) => (
                <optgroup key={g} label={g} className="bg-gray-900">
                  {HOW_TO_TOPICS.filter((t) => t.group === g).map((t) => (
                    <option key={t.id} value={t.id} className="bg-gray-900">{t.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </section>

        {topic ? (
          <div className="space-y-3" data-how-to-topic={topic.id}>
            <p className="text-[11px] text-[#606080] font-fantasy uppercase tracking-wider">{topic.group}</p>
            <TopicBody topic={topic} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {around.prev ? <Link {...linkTo(around.prev.id)} className={btnGhost} data-how-to-prev>← {around.prev.title}</Link> : <span />}
              {around.next ? <Link {...linkTo(around.next.id)} className={btnGhost} data-how-to-next>{around.next.title} →</Link> : <span />}
            </div>
          </div>
        ) : (
          <section className={`${card} p-4`} data-how-to-index>
            <h2 className="font-fantasy text-[#c08020] text-sm mb-3">All topics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {HOW_TO_GROUPS.map((g) => (
                <div key={g}>
                  <p className="text-[11px] text-[#a0a0a0] font-fantasy uppercase tracking-wider mb-1">{g}</p>
                  <ul className="space-y-0.5">
                    {HOW_TO_TOPICS.filter((t) => t.group === g).map((t) => (
                      <li key={t.id}>
                        <Link {...linkTo(t.id)} className={`text-sm text-[#e0e0e0] hover:text-[#c08020] ${focus}`} data-how-to-link={t.id}>{t.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
