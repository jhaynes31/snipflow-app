import { Link, useLocation, useSearch } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { logout } from "~/server/auth";
import { getApprovals, type ApprovalsSummary } from "~/server/approvals";
import { ADMIN_TABS, activeTab, availableTabs, crumb } from "~/lib/adminShell";

/**
 * The admin shell's navigation (Tavern Keeper's Morning spec, Section 3.2).
 * One sticky top bar on every signed-in screen: logo, the tab set, the
 * approvals badge, and John's menu. On phones the tabs move to a bottom bar
 * with the five most-used and a More menu. Deep screens get a breadcrumb
 * under the bar. Tabs come from one config, so adding a tool is one entry.
 */

const pill = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-fantasy transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1520]";
const idle = `${pill} border-transparent text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#406080]/50`;
const active = `${pill} border-[#c08020]/60 bg-[#c08020]/15 text-[#c08020]`;
const menuPanel = "absolute right-0 mt-1 w-72 rounded-xl border border-[#406080]/40 bg-[#111a28] shadow-2xl p-1.5 z-50";
const menuItem = "block px-3 py-2 rounded-lg hover:bg-[#204060]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, search?: Record<string, string>) => ({ to, search } as any);

export default function AdminNav() {
  const { pathname } = useLocation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const current = activeTab(pathname);
  const trail = crumb(pathname, search);

  const [approvals, setApprovals] = useState<ApprovalsSummary | null>(null);
  useEffect(() => {
    getApprovals()
      .then(setApprovals)
      .catch(() => setApprovals(null));
  }, [pathname]);

  // Menus close when you click anywhere else, open another menu, pick an item, or press Escape.
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
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/login");
    }
  };

  const tabs = availableTabs();
  const primary = tabs.filter((t) => t.mobilePrimary);
  const more = tabs.filter((t) => !t.mobilePrimary);

  // Section 3.2 fallback order: shorten labels first (CSS), then fold the least-used tabs. Home, Leads, and Quest Board never fold.
  const FOLD_ORDER = ["settings", "howto", "quizzes", "scripts", "practice", "guild", "forge"];
  const foldable = FOLD_ORDER.map((id) => tabs.find((t) => t.id === id)).filter((t): t is (typeof tabs)[number] => Boolean(t));
  // Stage 0: full labels where the screen is wide enough. Stage 1: short labels everywhere. Stage 2+: short labels and (stage - 1) tabs folded.
  // The stage is computed from a hidden strip that holds every label at both lengths, so it does not
  // depend on when the web font arrives: the strip is re-measured whenever its own size changes.
  const [stage, setStage] = useState(0);
  const fullLabels = stage === 0;
  const folded = Math.max(0, stage - 1);
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const foldedIds = new Set(foldable.slice(0, folded).map((t) => t.id));
  const visibleTabs = tabs.filter((t) => !foldedIds.has(t.id));
  // The More menu keeps the bar's own order, whatever order the tabs folded in.
  const menuTabs = tabs.filter((t) => foldedIds.has(t.id));
  useLayoutEffect(() => {
    const row = rowRef.current;
    const strip = measureRef.current;
    if (!row || !strip) return;
    const GAP = 4; // gap-1
    const SAFETY = 6;
    const widthOf = (sel: string) => Array.from(strip.querySelectorAll<HTMLElement>(sel)).map((el) => [el.dataset.measure ?? "", el.offsetWidth] as const);
    const compute = () => {
      const avail = row.clientWidth - SAFETY;
      if (avail <= 0) return;
      const full = new Map(widthOf("[data-measure-full]").map(([id, w]) => [id, w]));
      const short = new Map(widthOf("[data-measure-short]").map(([id, w]) => [id, w]));
      const more = strip.querySelector<HTMLElement>("[data-measure-more]")?.offsetWidth ?? 0;
      const sum = (ids: string[], m: Map<string, number>) => ids.reduce((n, id) => n + (m.get(id) ?? 0), 0) + GAP * Math.max(0, ids.length - 1);
      const all = tabs.map((t) => t.id);
      let next = foldable.length + 1;
      if (sum(all, full) <= avail) next = 0;
      else if (sum(all, short) <= avail) next = 1;
      else {
        for (let k = 1; k <= foldable.length; k++) {
          const hide = new Set(foldable.slice(0, k).map((t) => t.id));
          const left = all.filter((id) => !hide.has(id));
          if (sum(left, short) + GAP + more <= avail) {
            next = k + 1;
            break;
          }
        }
      }
      setStage((cur) => (cur === next ? cur : next));
    };
    compute();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(compute) : null;
    ro?.observe(row);
    ro?.observe(strip);
    window.addEventListener("resize", compute);
    document.fonts?.ready.then(compute).catch(() => {});
    document.fonts?.addEventListener?.("loadingdone", compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", compute);
      document.fonts?.removeEventListener?.("loadingdone", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, foldable.length]);
  const total = approvals?.total ?? 0;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#406080]/30 bg-[#0d1520]/95 backdrop-blur" data-admin-nav>
        <nav aria-label="John's tools" className="max-w-[100rem] mx-auto px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2">
          <Link {...linkTo("/admin")} className="flex items-center gap-2 mr-1 sm:mr-3 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020] rounded-full" title="The Tavern Keeper's Morning">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-full" />
            <span className="hidden lg:inline font-fantasy text-[#c08020] text-sm">The Financial DM</span>
          </Link>

          {/* Desktop and tablet tabs. A hidden strip below holds every label at both lengths; the bar folds the least-used tabs into More until what is left fits beside the badge, whatever the font or width. */}
          <div ref={rowRef} className="hidden md:flex items-center gap-1 flex-1 min-w-0 relative" role="list" data-tab-row data-folded={folded}>
            <div ref={measureRef} aria-hidden="true" className="absolute left-0 top-0 h-0 overflow-hidden invisible pointer-events-none flex items-center gap-1 whitespace-nowrap" data-tab-measure>
              {tabs.map((t) => (
                <span key={`f${t.id}`} className={idle} data-measure={t.id} data-measure-full>
                  <span>{t.icon}</span>
                  <span className="hidden 2xl:inline">{t.id === "home" ? "Tavern Keeper" : t.label}</span>
                  <span className="2xl:hidden">{t.short}</span>
                </span>
              ))}
              {tabs.map((t) => (
                <span key={`s${t.id}`} className={idle} data-measure={t.id} data-measure-short>
                  <span>{t.icon}</span>
                  <span>{t.short}</span>
                </span>
              ))}
              <span className={idle} data-measure-more><span>⋯</span> More</span>
            </div>
            {visibleTabs.map((t) => {
              const isOn = current?.id === t.id;
              return (
                <Link key={t.id} {...linkTo(t.to, t.search)} className={isOn ? active : idle} aria-current={isOn ? "page" : undefined} data-nav={t.id} role="listitem">
                  <span aria-hidden="true">{t.icon}</span>
                  {fullLabels ? (
                    <>
                      <span className="hidden 2xl:inline">{t.id === "home" ? "Tavern Keeper" : t.label}</span>
                      <span className="2xl:hidden">{t.short}</span>
                    </>
                  ) : (
                    <span>{t.short}</span>
                  )}
                </Link>
              );
            })}
            {menuTabs.length > 0 && (
              <details className="relative" data-nav-menu="desktop-more" role="listitem">
                <summary className={`list-none cursor-pointer ${menuTabs.some((t) => current?.id === t.id) ? active : idle}`} data-nav-more>
                  <span aria-hidden="true">⋯</span> More
                </summary>
                <div className="absolute left-0 mt-1 w-56 rounded-xl border border-[#406080]/40 bg-[#111a28] shadow-2xl p-1.5 z-50">
                  {menuTabs.map((t) => (
                    <Link key={t.id} {...linkTo(t.to, t.search)} className={menuItem} onClick={closeMenus} aria-current={current?.id === t.id ? "page" : undefined} data-nav-more-item={t.id}>
                      <span className="block text-[#e0e0e0] text-sm font-fantasy">{t.icon} {t.label}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </div>
          <span className="flex-1 md:hidden" />

          {/* Approvals badge */}
          <details className="relative" data-nav-menu="approvals">
            <summary className={`list-none cursor-pointer ${total > 0 ? active : idle}`} aria-label={`${total} waiting on your approval`} data-approvals-badge data-count={total}>
              <span aria-hidden="true">✅</span>
              <span className="hidden lg:inline">Approvals</span>
              {total > 0 && <span className="inline-flex items-center justify-center rounded-full bg-[#c08020] text-[#0d1520] text-[10px] font-bold px-1.5 min-w-[18px]" data-approvals-count>{total}</span>}
            </summary>
            <div className={menuPanel}>
              {approvals === null ? (
                <p className="px-3 py-2 text-xs text-[#a0a0a0] font-fantasy">Checking...</p>
              ) : approvals.groups.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[#a0a0a0] font-fantasy">Nothing waiting on you. Nice.</p>
              ) : (
                approvals.groups.map((g) => (
                  <a key={g.id} href={g.href} className={menuItem} onClick={closeMenus} data-approvals-group={g.id}>
                    <span className="block text-[#e0e0e0] text-sm font-fantasy">
                      {g.blocking && <span className="text-[#c08020]" title="Blocking">⚑ </span>}
                      {g.count} {g.type}
                    </span>
                    <span className="block text-[#606080] text-[11px]">{g.tool}{g.blocking ? " · blocking until done" : ""}</span>
                  </a>
                ))
              )}
              {approvals && approvals.errors.length > 0 && <p className="px-3 py-1 text-[10px] text-red-300 font-fantasy">Could not check: {approvals.errors.join(", ")}</p>}
              <p className="px-3 py-2 text-[10px] text-[#606080] font-fantasy border-t border-[#406080]/20 mt-1">Approving happens on each tool's own screen.</p>
            </div>
          </details>

          {/* John's menu */}
          <details className="relative" data-nav-menu="account">
            <summary className={`list-none cursor-pointer ${idle}`} data-nav="account">
              <span aria-hidden="true">🧙‍♂️</span> John <span aria-hidden="true">▾</span>
            </summary>
            <div className={menuPanel}>
              <Link {...linkTo("/admin/settings")} className={menuItem} onClick={closeMenus}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">⚙️ Settings</span>
              </Link>
              <Link {...linkTo("/admin/settings/password")} className={menuItem} onClick={closeMenus}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">🔑 Password</span>
              </Link>
              <Link {...linkTo("/admin/how-to", { topic: "quest-overview" })} className={menuItem} onClick={closeMenus}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">📖 How To</span>
              </Link>
              <button type="button" onClick={handleLogout} className={`${menuItem} w-full text-left border-t border-[#406080]/20 mt-1`} data-nav="signout">
                <span className="block text-[#e0e0e0] text-sm font-fantasy">🚪 Sign out</span>
              </button>
            </div>
          </details>
        </nav>

        {/* Breadcrumb for deep screens */}
        {trail && trail.sub.length > 0 && (
          <div className="border-t border-[#406080]/20 bg-[#0d1520]/80">
            <nav aria-label="Where you are" className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 text-xs font-fantasy text-[#808080] flex items-center gap-1.5 flex-wrap" data-breadcrumb>
              <Link {...linkTo(trail.tab.to, trail.tab.search)} className="text-[#a0a0a0] hover:text-[#c08020] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020] rounded">
                ← {trail.tab.id === "home" ? "Home" : trail.tab.label}
              </Link>
              {trail.sub.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span aria-hidden="true">›</span>
                  <span className={i === trail.sub.length - 1 ? "text-[#e0e0e0]" : ""}>{s}</span>
                </span>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Phone bottom bar */}
      <nav aria-label="John's tools, phone" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#406080]/30 bg-[#0d1520]/95 backdrop-blur" data-admin-bottom-nav>
        <div className="grid grid-cols-6 items-stretch">
          {primary.map((t) => {
            const isOn = current?.id === t.id;
            return (
              <Link key={t.id} {...linkTo(t.to, t.search)} aria-current={isOn ? "page" : undefined} className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-fantasy focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c08020] ${isOn ? "text-[#c08020]" : "text-[#a0a0a0]"}`} data-bottom-nav={t.id}>
                <span className="text-lg leading-none" aria-hidden="true">{t.icon}</span>
                {t.short}
              </Link>
            );
          })}
          <details className="relative" data-nav-menu="more">
            <summary className={`list-none cursor-pointer flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-fantasy ${more.some((t) => current?.id === t.id) ? "text-[#c08020]" : "text-[#a0a0a0]"}`} data-bottom-nav="more">
              <span className="text-lg leading-none" aria-hidden="true">⋯</span>
              More
            </summary>
            <div className="absolute bottom-full right-1 mb-1 w-60 rounded-xl border border-[#406080]/40 bg-[#111a28] shadow-2xl p-1.5">
              {more.map((t) => (
                <Link key={t.id} {...linkTo(t.to, t.search)} className={menuItem} onClick={closeMenus} aria-current={current?.id === t.id ? "page" : undefined} data-bottom-more={t.id}>
                  <span className="block text-[#e0e0e0] text-sm font-fantasy">{t.icon} {t.label}</span>
                </Link>
              ))}
              <Link {...linkTo("/admin/how-to", { topic: "quest-overview" })} className={menuItem} onClick={closeMenus}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">📖 How To</span>
              </Link>
              <button type="button" onClick={handleLogout} className={`${menuItem} w-full text-left border-t border-[#406080]/20 mt-1`}>
                <span className="block text-[#e0e0e0] text-sm font-fantasy">🚪 Sign out</span>
              </button>
            </div>
          </details>
        </div>
      </nav>
    </>
  );
}

/** Close any open menu after a pick, so it does not linger over the next page. */
function closeMenus() {
  document.querySelectorAll<HTMLDetailsElement>("[data-nav-menu][open]").forEach((d) => {
    d.open = false;
  });
}

export { ADMIN_TABS };
