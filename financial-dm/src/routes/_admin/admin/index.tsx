import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { availableTabs, greetingWord } from "~/lib/adminShell";

/**
 * The Tavern Keeper's Morning (spec, Section 4): the landing screen after
 * login. Phase 1 ships the greeting, the quick actions, and a door to every
 * tool. The "Needs You" cards and Today's Numbers arrive in Phase 2.
 */
export const Route = createFileRoute("/_admin/admin/")({
  component: HomePage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, search?: Record<string, string>) => ({ to, search } as any);

const QUICK_ACTIONS: Array<{ label: string; icon: string; to: string; search?: Record<string, string>; blurb: string }> = [
  { label: "Add a lead", icon: "⚔️", to: "/admin/leads", blurb: "Someone who called or texted about coverage" },
  { label: "Add a recruit", icon: "🛡️", to: "/admin/guild", search: { view: "recruits" }, blurb: "Someone who texted INTERVIEW" },
  { label: "New quest", icon: "🗺️", to: "/admin/quests", search: { section: "quests" }, blurb: "Start a campaign" },
  { label: "Open the Content Forge", icon: "🧙", to: "/admin/forge", search: { tab: "script", view: "forge" }, blurb: "Scripts, carousels, cards, memes" },
];

function HomePage() {
  // The greeting follows John's clock, so it is decided in the browser, not on the server.
  const [word, setWord] = useState<string>("Hello");
  useEffect(() => setWord(greetingWord(new Date().getHours())), []);
  const tools = availableTabs().filter((t) => t.id !== "home");
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-home>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl sm:text-4xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }} data-greeting>
            {word}, John.
          </h1>
          <p className="text-[#a0a0a0] text-sm font-fantasy mt-1" data-day-line>
            The Tavern Keeper's Morning. Your day's list appears here next; for now every door in the tavern is one tap away.
          </p>
        </header>

        <section className={`${card} p-4`} aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="font-fantasy text-[#c08020] text-lg mb-3">Quick actions</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.label} {...linkTo(a.to, a.search)} className="rounded-lg border border-[#406080]/40 hover:border-[#c08020]/50 bg-[#0d1520]/60 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]" data-quick-action={a.label}>
                <span className="block text-[#e0e0e0] font-fantasy text-sm">{a.icon} {a.label}</span>
                <span className="block text-[#606080] text-[11px] mt-0.5">{a.blurb}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${card} p-4`} aria-labelledby="tools">
          <h2 id="tools" className="font-fantasy text-[#c08020] text-lg mb-3">The tavern</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <Link key={t.id} {...linkTo(t.to, t.search)} className="rounded-lg border border-[#406080]/40 hover:border-[#c08020]/50 bg-[#0d1520]/60 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]" data-home-tool={t.id}>
                <span className="block text-[#e0e0e0] font-fantasy">{t.icon} {t.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
