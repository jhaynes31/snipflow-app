import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { availableTabs, greetingWord, TOOLS_BUILT } from "~/lib/adminShell";
import { dayLine, quietLine, todayYmd, type HomeCard, type HomeItem } from "~/lib/home";
import { getHomeAppointments, getHomeApprovals, getHomeColdLeads, getHomeFilmNext, getHomeNewLeads, getHomeNumbers, getHomeQuestStatus, getHomeRecruits, type AppointmentsCard, type HomeNumbers, type QuestStatusCard } from "~/server/home";
import { dismissHomeItem, type SnoozeLength } from "~/server/homeState";

/**
 * The Tavern Keeper's Morning (spec, Section 4): greeting and day line,
 * the Needs You cards in fixed priority order, Today's Numbers, and Quick
 * Actions. Each card loads on its own and fails on its own (Rule 2.6).
 * Home only summarizes and links out; its one write is dismiss or snooze
 * on its own items, which never touches the source record (2.3, 6.4).
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
  { label: "Add a lead", icon: "⚔️", to: "/admin/leads", search: { add: "1" }, blurb: "Someone who called, texted, or was referred", built: TOOLS_BUILT.leads },
  { label: "Add a recruit", icon: "🛡️", to: "/admin/guild", search: { view: "recruits", add: "1" }, blurb: "Someone who texted INTERVIEW", built: TOOLS_BUILT.guild },
  { label: "New quest", icon: "🗺️", to: "/admin/quests", search: { section: "quests", new: "1" }, blurb: "Start a campaign", built: TOOLS_BUILT.quests },
  { label: "Open the Content Forge", icon: "🧙", to: "/admin/forge", search: { tab: "script", view: "forge" }, blurb: "Scripts, carousels, cards, memes", built: TOOLS_BUILT.forge },
  { label: "Start a practice session", icon: "🥊", to: "/admin/practice", blurb: "Rehearse with a fictional client or recruit", built: TOOLS_BUILT.practice },
];

function HomePage() {
  // The greeting follows John's clock, so it is decided in the browser.
  const [word, setWord] = useState<string>("Hello");
  useEffect(() => setWord(greetingWord(new Date().getHours())), []);

  const none = () => Promise.resolve(null);
  const newLeads = useCard(() => (TOOLS_BUILT.leads ? getHomeNewLeads() : none()));
  // Card 2 decides its own availability on the server: no booking source, no card.
  const appointments = useCard(() => getHomeAppointments());
  const recruits = useCard(() => (TOOLS_BUILT.guild ? getHomeRecruits() : none()));
  const approvals = useCard(() => (TOOLS_BUILT.approvals ? getHomeApprovals() : none()));
  const film = useCard(() => (TOOLS_BUILT.quests ? getHomeFilmNext() : none()));
  const cold = useCard(() => (TOOLS_BUILT.leads ? getHomeColdLeads() : none()));
  const quests = useCard(() => (TOOLS_BUILT.quests ? getHomeQuestStatus() : none()));
  const numbers = useCard(() => getHomeNumbers());

  // Section 5: fixed priority order.
  const apptLoaded: Loaded<HomeCard | null> = appointments.state === "ok" && appointments.data && !appointments.data.available ? { state: "ok", data: null } : appointments.state === "ok" && appointments.data?.error ? { state: "error", message: appointments.data.error } : (appointments as Loaded<HomeCard | null>);
  const cards = [
    { key: "new-leads", title: "New leads waiting", icon: "⚔️", loaded: newLeads, viewAll: "Leads" },
    { key: "appointments", title: "Appointments coming up", icon: "📅", loaded: apptLoaded, viewAll: "Leads" },
    { key: "recruits", title: "Recruits waiting", icon: "🛡️", loaded: recruits, viewAll: "Guild" },
    { key: "approvals", title: "Waiting on your approval", icon: "✅", loaded: approvals, viewAll: "the Approvals queue" },
    { key: "film", title: "Film these next", icon: "🎬", loaded: film, viewAll: "Quest Board" },
    { key: "cold", title: "Leads going cold", icon: "🧊", loaded: cold, viewAll: "Leads" },
    { key: "quests", title: "Quest status", icon: "🗺️", loaded: quests, viewAll: "Quest Board" },
  ] as const;

  // Dismissals made on this visit, so counts and the day line follow along without a reload.
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const hide = (key: string) => setHiddenKeys((prev) => new Set(prev).add(key));
  const liveCount = (l: Loaded<HomeCard | null>) => {
    if (l.state !== "ok" || !l.data) return 0;
    const shownHidden = l.data.items.filter((it) => hiddenKeys.has(it.key)).length;
    return Math.max(0, l.data.count - shownHidden);
  };

  const allSettled = cards.every((c) => c.loaded.state !== "loading");
  const qs = quests.state === "ok" ? (quests.data as QuestStatusCard | null) : null;
  const line = allSettled
    ? dayLine({
        appointmentsToday: appointments.state === "ok" ? (appointments.data as AppointmentsCard | null)?.today ?? 0 : 0,
        newLeads: liveCount(newLeads),
        filmSoon: liveCount(film),
        coldLeads: liveCount(cold),
        recruitsWaiting: liveCount(recruits),
        questsEnding: qs?.endingSoon ?? [],
        needsRetro: qs?.needsRetro ?? 0,
        todayYmd: todayYmd(),
      })
    : null;
  const anyError = cards.some((c) => c.loaded.state === "error");
  const allEmpty = allSettled && cards.every((c) => liveCount(c.loaded as Loaded<HomeCard | null>) === 0) && !anyError;

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

        <section aria-labelledby="needs-you" className="space-y-3" data-needs-you>
          <h2 id="needs-you" className="font-fantasy text-[#c08020] text-lg">Needs you</h2>
          {allEmpty ? (
            <div className={`${card} p-6 text-center`} data-all-clear>
              <p className="text-[#e0e0e0] font-fantasy">All quiet. Nothing needs you right now.</p>
              <p className="text-[#606080] text-xs mt-1">New leads, stalled recruits, approvals, posts to film, and quest news will show up here.</p>
            </div>
          ) : (
            cards.map((c) => <NeedsCard key={c.key} id={c.key} title={c.title} icon={c.icon} loaded={c.loaded as Loaded<HomeCard | null>} viewAll={c.viewAll} hiddenKeys={hiddenKeys} onHide={hide} />)
          )}
        </section>

        <Numbers loaded={numbers} />

        <section className={`${card} p-4`} aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="font-fantasy text-[#c08020] text-lg mb-3">Quick actions</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
function NeedsCard({ id, title, icon, loaded, viewAll, hiddenKeys, onHide }: { id: string; title: string; icon: string; loaded: Loaded<HomeCard | null>; viewAll: string; hiddenKeys: Set<string>; onHide: (key: string) => void }) {
  if (loaded.state === "loading") return <div className={`${card} p-4 animate-pulse h-16`} aria-hidden="true" data-home-card-loading={id} />;
  if (loaded.state === "error") {
    return (
      <div className={`${card} p-4 border-red-700/30`} data-home-card={id} data-card-error>
        <p className="text-[#e0e0e0] font-fantasy text-sm">{icon} {title}</p>
        <p className="text-red-300 text-xs mt-1">{loaded.message && /Calendly/.test(loaded.message) ? loaded.message : "Could not load this one. The rest of the page still works."}</p>
      </div>
    );
  }
  const data = loaded.data;
  if (!data || data.count === 0) return null;
  const items = data.items.filter((it) => !hiddenKeys.has(it.key));
  const count = Math.max(0, data.count - (data.items.length - items.length));
  if (count === 0) return null;
  const moreCount = count - items.length;
  return (
    <section className={`${card} p-4`} aria-labelledby={`card-${id}`} data-home-card={id} data-count={count}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`card-${id}`} className="font-fantasy text-[#e0e0e0]">
          {icon} {title} <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#c08020] text-[#0d1520] text-[11px] font-bold px-2 min-w-[20px]">{count}</span>
        </h3>
        <a href={data.href} className={`text-xs font-fantasy text-[#c08020] hover:underline underline-offset-2 ${focus} rounded`} data-view-all>
          View all in {viewAll} →
        </a>
      </div>
      <ul className="mt-3 divide-y divide-[#406080]/15">
        {items.map((it) => (
          <ItemRow key={`${id}-${it.key}`} item={it} onHide={onHide} />
        ))}
      </ul>
      {moreCount > 0 && <p className="text-[11px] text-[#606080] mt-2">and {moreCount} more</p>}
    </section>
  );
}

const SNOOZE: Array<{ length: SnoozeLength; label: string }> = [
  { length: "day", label: "Hide for a day" },
  { length: "week", label: "Hide for a week" },
  { length: "gone", label: "Dismiss" },
];

/** A row with its snooze menu. Dismissing hides it here only; it comes back if the record changes (Section 6.4). */
function ItemRow({ item, onHide }: { item: HomeItem; onHide: (key: string) => void }) {
  const [busy, setBusy] = useState(false);
  const snooze = async (length: SnoozeLength) => {
    setBusy(true);
    try {
      const res = await dismissHomeItem({ data: { key: item.key, sig: item.sig, length } });
      if (res.ok) onHide(item.key);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex items-baseline gap-1" data-home-item={item.id} data-item-key={item.key}>
      <a href={item.href} className={`flex-1 min-w-0 flex items-baseline justify-between gap-3 py-2 rounded hover:bg-[#204060]/20 px-1 -mx-1 ${focus}`}>
        <span className="min-w-0">
          <span className="block text-[#e0e0e0] text-sm truncate">{item.title}{item.tag && <span className="ml-2 text-[10px] uppercase tracking-wider text-[#c08020] font-fantasy">{item.tag}</span>}</span>
          <span className="block text-[#808080] text-xs truncate">{item.meta}</span>
        </span>
        <span className="text-[#606080] text-xs shrink-0" aria-hidden="true">→</span>
      </a>
      <details className="relative shrink-0" data-nav-menu={`snooze-${item.key}`}>
        <summary className={`list-none cursor-pointer px-2 py-1 rounded text-[#606080] hover:text-[#e0e0e0] text-sm ${focus}`} aria-label={`Hide ${item.title} from Home`} data-snooze-menu>⋯</summary>
        <div className="absolute right-0 mt-1 w-44 rounded-xl border border-[#406080]/40 bg-[#111a28] shadow-2xl p-1 z-30">
          {SNOOZE.map((o) => (
            <button key={o.length} type="button" disabled={busy} onClick={() => snooze(o.length)} className={`block w-full text-left px-3 py-1.5 rounded-lg text-xs font-fantasy text-[#e0e0e0] hover:bg-[#204060]/30 disabled:opacity-50 ${focus}`} data-snooze={o.length}>
              {o.label}
            </button>
          ))}
          <p className="px-3 py-1 text-[10px] text-[#606080]">Only hides it here. Comes back if it changes.</p>
        </div>
      </details>
    </li>
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
