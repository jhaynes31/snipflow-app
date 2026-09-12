import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { availableTabs, greetingWord, TOOLS_BUILT } from "~/lib/adminShell";
import { dayLine, quietLine, todayYmd, type HomeCard } from "~/lib/home";
import { getHomeColdLeads, getHomeFilmNext, getHomeNewLeads, getHomeNumbers, getHomeQuestStatus, getHomeRecruits, type HomeNumbers, type QuestStatusCard } from "~/server/home";

/**
 * The Tavern Keeper's Morning (spec, Section 4): greeting and day line,
 * the Needs You cards in fixed priority order, Today's Numbers, and Quick
 * Actions. Each card loads on its own and fails on its own (Rule 2.6).
 * Home only summarizes and links out; it never changes a record (2.1, 2.3).
 */
export const Route = createFileRoute("/_admin/admin/")({
  component: HomePage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, search?: Record<string, string>) => ({ to, search } as any);

type Loaded<T> = { state: "loading" } | { state: "ok"; data: T } | { state: "error"; message: string };

function useCard<T>(fetcher: () => Promise<T>): Loaded<T> {
  const [v, setV] = useState<Loaded<T>>({ state: "loading" });
  useEffect(() => {
    let alive = true;
    fetcher()
      .then((data) => alive && setV({ state: "ok", data }))
      .catch((e) => alive && setV({ state: "error", message: String(e?.message ?? e) }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

const QUICK_ACTIONS: Array<{ label: string; icon: string; to: string; search?: Record<string, string>; blurb: string; built: boolean }> = [
  { label: "Leads", icon: "⚔️", to: "/admin/leads", blurb: "Leads arrive from the quizzes; a manual add is not built yet", built: TOOLS_BUILT.leads },
  { label: "Add a recruit", icon: "🛡️", to: "/admin/guild", search: { view: "recruits", add: "1" }, blurb: "Someone who texted INTERVIEW", built: TOOLS_BUILT.guild },
  { label: "New quest", icon: "🗺️", to: "/admin/quests", search: { section: "quests", new: "1" }, blurb: "Start a campaign", built: TOOLS_BUILT.quests },
  { label: "Open the Content Forge", icon: "🧙", to: "/admin/forge", search: { tab: "script", view: "forge" }, blurb: "Scripts, carousels, cards, memes", built: TOOLS_BUILT.forge },
];

function HomePage() {
  // The greeting follows John's clock, so it is decided in the browser.
  const [word, setWord] = useState<string>("Hello");
  useEffect(() => setWord(greetingWord(new Date().getHours())), []);

  const newLeads = useCard(() => (TOOLS_BUILT.leads ? getHomeNewLeads() : Promise.resolve(null)));
  const recruits = useCard(() => (TOOLS_BUILT.guild ? getHomeRecruits() : Promise.resolve(null)));
  const film = useCard(() => (TOOLS_BUILT.quests ? getHomeFilmNext() : Promise.resolve(null)));
  const cold = useCard(() => (TOOLS_BUILT.leads ? getHomeColdLeads() : Promise.resolve(null)));
  const quests = useCard(() => (TOOLS_BUILT.quests ? getHomeQuestStatus() : Promise.resolve(null)));
  const numbers = useCard(() => getHomeNumbers());

  const cards = [
    { key: "new-leads", title: "New leads waiting", icon: "⚔️", loaded: newLeads, viewAll: "Leads" },
    { key: "recruits", title: "Recruits waiting", icon: "🛡️", loaded: recruits, viewAll: "Guild" },
    { key: "film", title: "Film these next", icon: "🎬", loaded: film, viewAll: "Quest Board" },
    { key: "cold", title: "Leads going cold", icon: "🧊", loaded: cold, viewAll: "Leads" },
    { key: "quests", title: "Quest status", icon: "🗺️", loaded: quests, viewAll: "Quest Board" },
  ] as const;

  const allSettled = cards.every((c) => c.loaded.state !== "loading");
  const count = (l: Loaded<HomeCard | null>) => (l.state === "ok" && l.data ? l.data.count : 0);
  const qs = quests.state === "ok" ? (quests.data as QuestStatusCard | null) : null;
  const line = allSettled
    ? dayLine({
        newLeads: count(newLeads),
        filmSoon: count(film),
        coldLeads: count(cold),
        recruitsWaiting: count(recruits),
        questsEnding: qs?.endingSoon ?? [],
        needsRetro: qs?.needsRetro ?? 0,
        todayYmd: todayYmd(),
      })
    : null;
  const anyError = cards.some((c) => c.loaded.state === "error");
  const allEmpty = allSettled && cards.every((c) => count(c.loaded as Loaded<HomeCard | null>) === 0) && !anyError;

  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-home>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl sm:text-4xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }} data-greeting>
            {word}, John.
          </h1>
          <p className="text-[#a0a0a0] text-sm font-fantasy mt-1" data-day-line aria-live="polite">
            {!allSettled ? "Checking the tavern..." : line ?? quietLine(word)}
          </p>
        </header>

        {/* Needs You */}
        <section aria-labelledby="needs-you" className="space-y-3" data-needs-you>
          <h2 id="needs-you" className="font-fantasy text-[#c08020] text-lg">Needs you</h2>
          {allEmpty ? (
            <div className={`${card} p-6 text-center`} data-all-clear>
              <p className="text-[#e0e0e0] font-fantasy">All quiet. Nothing needs you right now.</p>
              <p className="text-[#606080] text-xs mt-1">New leads, stalled recruits, posts to film, and quest news will show up here.</p>
            </div>
          ) : (
            cards.map((c) => <NeedsCard key={c.key} id={c.key} title={c.title} icon={c.icon} loaded={c.loaded as Loaded<HomeCard | null>} viewAll={c.viewAll} />)
          )}
        </section>

        {/* Today's Numbers */}
        <Numbers loaded={numbers} />

        {/* Quick Actions */}
        <section className={`${card} p-4`} aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="font-fantasy text-[#c08020] text-lg mb-3">Quick actions</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.filter((a) => a.built).map((a) => (
              <Link key={a.label} {...linkTo(a.to, a.search)} className={`rounded-lg border border-[#406080]/40 hover:border-[#c08020]/50 bg-[#0d1520]/60 px-3 py-3 ${focus}`} data-quick-action={a.label}>
                <span className="block text-[#e0e0e0] font-fantasy text-sm">{a.icon} {a.label}</span>
                <span className="block text-[#606080] text-[11px] mt-0.5">{a.blurb}</span>
              </Link>
            ))}
          </div>
        </section>

        <details className={`${card} p-4`}>
          <summary className="font-fantasy text-[#a0a0a0] text-sm cursor-pointer">The tavern: every tool</summary>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
            {availableTabs().filter((t) => t.id !== "home").map((t) => (
              <Link key={t.id} {...linkTo(t.to, t.search)} className={`rounded-lg border border-[#406080]/40 hover:border-[#c08020]/50 bg-[#0d1520]/60 px-3 py-3 ${focus}`} data-home-tool={t.id}>
                <span className="block text-[#e0e0e0] font-fantasy">{t.icon} {t.label}</span>
              </Link>
            ))}
          </div>
        </details>
      </div>
    </main>
  );
}

/** One Needs You card: hidden when empty, an error inside itself when its query fails (Rules 2.2, 2.6). */
function NeedsCard({ id, title, icon, loaded, viewAll }: { id: string; title: string; icon: string; loaded: Loaded<HomeCard | null>; viewAll: string }) {
  if (loaded.state === "loading") return <div className={`${card} p-4 animate-pulse h-16`} aria-hidden="true" data-home-card-loading={id} />;
  if (loaded.state === "error") {
    return (
      <div className={`${card} p-4 border-red-700/30`} data-home-card={id} data-card-error>
        <p className="text-[#e0e0e0] font-fantasy text-sm">{icon} {title}</p>
        <p className="text-red-300 text-xs mt-1">Could not load this one. The rest of the page still works.</p>
      </div>
    );
  }
  const data = loaded.data;
  if (!data || data.count === 0) return null;
  const moreCount = data.count - data.items.length;
  return (
    <section className={`${card} p-4`} aria-labelledby={`card-${id}`} data-home-card={id} data-count={data.count}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`card-${id}`} className="font-fantasy text-[#e0e0e0]">
          {icon} {title} <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#c08020] text-[#0d1520] text-[11px] font-bold px-2 min-w-[20px]">{data.count}</span>
        </h3>
        <a href={data.href} className={`text-xs font-fantasy text-[#c08020] hover:underline underline-offset-2 ${focus} rounded`} data-view-all>
          View all in {viewAll} →
        </a>
      </div>
      <ul className="mt-3 divide-y divide-[#406080]/15">
        {data.items.map((it) => (
          <li key={`${id}-${it.id}`}>
            <a href={it.href} className={`flex items-baseline justify-between gap-3 py-2 rounded hover:bg-[#204060]/20 px-1 -mx-1 ${focus}`} data-home-item={it.id}>
              <span className="min-w-0">
                <span className="block text-[#e0e0e0] text-sm truncate">{it.title}{it.tag && <span className="ml-2 text-[10px] uppercase tracking-wider text-[#c08020] font-fantasy">{it.tag}</span>}</span>
                <span className="block text-[#808080] text-xs truncate">{it.meta}</span>
              </span>
              <span className="text-[#606080] text-xs shrink-0" aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
      {moreCount > 0 && <p className="text-[11px] text-[#606080] mt-2">and {moreCount} more</p>}
    </section>
  );
}

/** Section 6.1: a strip of raw counts, each linking to its tool. Numbers for unbuilt tools are left out, never shown as zero. */
function Numbers({ loaded }: { loaded: Loaded<HomeNumbers> }) {
  const stat = (label: string, value: ReactNode, to: string, search?: Record<string, string>, key?: string) => (
    <Link key={key ?? label} {...linkTo(to, search)} className={`rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 px-3 py-2 ${focus}`} data-number={key ?? label}>
      <span className="block text-2xl font-fantasy text-[#e0e0e0] tabular-nums">{value}</span>
      <span className="block text-[11px] text-[#808080]">{label}</span>
    </Link>
  );
  return (
    <section className={`${card} p-4`} aria-labelledby="numbers" data-numbers>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="numbers" className="font-fantasy text-[#c08020] text-lg">Today's numbers</h2>
        <span className="text-[11px] text-[#606080] font-fantasy">This week, since Monday</span>
      </div>
      {loaded.state === "loading" && <div className="mt-3 h-14 animate-pulse rounded-lg bg-[#0d1520]/60" aria-hidden="true" />}
      {loaded.state === "error" && <p className="text-red-300 text-xs mt-2">Could not load the numbers. The rest of the page still works.</p>}
      {loaded.state === "ok" && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {TOOLS_BUILT.leads && stat("new leads", loaded.data.newLeads, "/admin/leads", undefined, "newLeads")}
          {TOOLS_BUILT.leads && stat("booked", loaded.data.booked, "/admin/leads", undefined, "booked")}
          {TOOLS_BUILT.leads && stat("sold", loaded.data.sold, "/admin/leads", undefined, "sold")}
          {TOOLS_BUILT.quests && stat("posts published", loaded.data.postsPublished, "/admin/quests", { section: "quests" }, "postsPublished")}
          {TOOLS_BUILT.quests && stat("active quests", loaded.data.activeQuests, "/admin/quests", { section: "quests" }, "activeQuests")}
          {TOOLS_BUILT.guild && stat(loaded.data.winStage === "first_sale" ? "recruits with a first sale" : "recruits contracted", loaded.data.recruitsWon, "/admin/guild", { view: "recruits" }, "recruitsWon")}
          {TOOLS_BUILT.guild && stat("recruits in progress", loaded.data.recruitsInProgress, "/admin/guild", { view: "recruits" }, "recruitsInProgress")}
        </div>
      )}
    </section>
  );
}
