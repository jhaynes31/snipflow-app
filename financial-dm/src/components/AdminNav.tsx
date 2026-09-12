import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { logout } from "~/server/auth";
import { getGuildBadge } from "~/server/guild";

/**
 * One bar on every signed-in page, so John reaches everything from any
 * screen after a single login: leads, the Quest Board, every forge, both
 * quizzes, the guide, his password, and sign out. Sticky on desktop, wraps
 * to a second row on phones. Menus are plain <details> so they work with
 * the keyboard and need no state.
 */

const FORGES: Array<{ tab: "script" | "meme" | "carousel" | "card" | "broll" | "guild"; label: string; blurb: string }> = [
  { tab: "script", label: "📜 Script forge", blurb: "Video scripts and hooks" },
  { tab: "carousel", label: "🎠 Carousel forge", blurb: "Swipe-through photo posts" },
  { tab: "card", label: "🎨 Social card forge", blurb: "One stat or tip, one image" },
  { tab: "meme", label: "🎭 Meme forge", blurb: "Relatable moments" },
  { tab: "broll", label: "🎬 B Roll finder", blurb: "Clips to cut under a script" },
  { tab: "guild", label: "🛡️ Guild forge", blurb: "Recruiting scripts, flyers, and job posts" },
];

const QUIZZES: Array<{ href: string; label: string; blurb: string }> = [
  { href: "/quiz", label: "🛡️ Life Insurance Quiz", blurb: "Loaded Dice: armor, gap, loot" },
  { href: "/wealth-check", label: "🐉 Wealth Check", blurb: "Financial health character sheet" },
  { href: "/", label: "🏠 Home page", blurb: "What visitors see first" },
];

const pill = "px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-fantasy transition-all whitespace-nowrap";
const idle = `${pill} border-transparent text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#406080]/50`;
const active = `${pill} border-[#c08020]/60 bg-[#c08020]/15 text-[#c08020]`;

export default function AdminNav() {
  const { pathname } = useLocation();
  const on = (p: string) => pathname === p || pathname.startsWith(p + "/");
  // New recruits John has not looked at yet (recruiting spec, Section 5.3).
  const [newRecruits, setNewRecruits] = useState(0);
  useEffect(() => {
    getGuildBadge()
      .then((b) => setNewRecruits(b.newRecruits))
      .catch(() => setNewRecruits(0));
  }, [pathname]);

  // Menus close when you click anywhere else, open another menu, pick an
  // item, or press Escape, so one never lingers open over the page.
  useEffect(() => {
    const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-nav-menu]"));
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      for (const m of menus()) if (m.open && !m.contains(t)) m.open = false;
    };
    const onToggle = (e: Event) => {
      const opened = e.target as HTMLDetailsElement;
      if (!opened.open) return;
      for (const m of menus()) if (m !== opened) m.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    for (const m of menus()) m.addEventListener("toggle", onToggle);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      for (const m of menus()) m.removeEventListener("toggle", onToggle);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#406080]/30 bg-[#0d1520]/95 backdrop-blur" data-admin-nav>
      <nav aria-label="John's tools" className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center gap-1 sm:gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 mr-1 sm:mr-3 shrink-0" title="Lead Dashboard">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-full" />
          <span className="hidden md:inline font-fantasy text-[#c08020] text-sm">The Financial DM</span>
        </Link>

        <Link to="/dashboard" className={on("/dashboard") ? active : idle} data-nav="leads">
          ⚔️ Leads
        </Link>
        <Link to="/quest-board" search={{ section: "quests" }} className={on("/quest-board") ? active : idle} data-nav="quests">
          🗺️ Quest Board
        </Link>

        <details className="relative group" data-nav-menu="forge">
          <summary className={`list-none cursor-pointer ${on("/generator") ? active : idle}`}>🧙 Content Forge ▾</summary>
          <div className="absolute left-0 mt-1 w-64 rounded-xl border border-[#406080]/40 bg-[#111a28] shadow-2xl p-1.5 z-50">
            {FORGES.map((f) => (
              <Link key={f.tab} to="/generator" search={{ tab: f.tab, view: "forge" }} className="block px-3 py-2 rounded-lg hover:bg-[#204060]/30" onClick={closeMenus}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">{f.label}</span>
                <span className="block text-[#606080] text-[11px]">{f.blurb}</span>
              </Link>
            ))}
            <Link to="/generator" search={{ tab: "script", view: "saved" }} className="block px-3 py-2 rounded-lg hover:bg-[#204060]/30 border-t border-[#406080]/20 mt-1" onClick={closeMenus}>
              <span className="block text-[#e0e0e0] text-sm font-fantasy">💾 Saved work</span>
              <span className="block text-[#606080] text-[11px]">Everything the forges have made</span>
            </Link>
          </div>
        </details>

        <details className="relative" data-nav-menu="quizzes">
          <summary className={`list-none cursor-pointer ${idle}`}>🎲 Quizzes ▾</summary>
          <div className="absolute left-0 mt-1 w-64 rounded-xl border border-[#406080]/40 bg-[#111a28] shadow-2xl p-1.5 z-50">
            {QUIZZES.map((q) => (
              <a key={q.href} href={q.href} target="_blank" rel="noreferrer" className="block px-3 py-2 rounded-lg hover:bg-[#204060]/30" onClick={closeMenus}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">{q.label} ↗</span>
                <span className="block text-[#606080] text-[11px]">{q.blurb}</span>
              </a>
            ))}
            <p className="px-3 py-2 text-[10px] text-[#606080] font-fantasy border-t border-[#406080]/20 mt-1">Opens in a new tab, as a visitor would see it. You stay signed in here.</p>
          </div>
        </details>

        <Link to="/guild-hall" search={{ view: "recruits" }} className={`${on("/guild-hall") ? active : idle} relative`} data-nav="guild">
          🛡️ Guild
          {newRecruits > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#c08020] text-[#0d1520] text-[10px] font-bold px-1.5 min-w-[18px]" data-guild-badge>
              {newRecruits}
            </span>
          )}
        </Link>
        <Link to="/quest-board" search={{ section: "guide" }} className={idle} data-nav="guide">
          📖 Guide
        </Link>

        <span className="flex-1" />

        <Link to="/change-password" className={on("/change-password") ? active : idle} title="Change the password for the private tools">
          🔑 Password
        </Link>
        <button type="button" onClick={handleLogout} className={idle} title="Sign out of the private tools" data-nav="signout">
          🚪 Sign out
        </button>
      </nav>
    </header>
  );
}

/** Close any open menu after a pick, so it does not linger over the next page. */
function closeMenus() {
  document.querySelectorAll<HTMLDetailsElement>("[data-nav-menu][open]").forEach((d) => {
    d.open = false;
  });
}
