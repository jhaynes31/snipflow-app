"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Home, LifeBuoy, Settings, UserRound, Users, Sun, Moon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { COPY } from "@/core/copy/strings";
import { useHub } from "./HubContext";

/** Desktop top bar: name, one doorway tab per module, gentle toggle, check-in, profile menu. */
export function TopBar() {
  const { modules, profile } = useHub();
  return (
    <header className="sh-topbar">
      <Link href="/" className="sh-brand">
        {COPY.appName}
      </Link>
      <nav className="sh-tabs" aria-label="Places">
        <Tab href="/" label="Home" icon={Home} exact />
        {modules.map((m) => (
          <Tab key={m.id} href={m.route} label={m.name} icon={m.icon} accent={m.theme.accent} />
        ))}
      </nav>
      <div className="sh-topbar-actions">
        <GentleToggle />
        <TalkLink className="sh-btn sh-btn-secondary sh-checkin" />
        <Link href="/check-in" className="sh-btn sh-btn-accent sh-checkin" aria-label={COPY.checkInButton}>
          {COPY.checkInButton}
        </Link>
        <ProfileMenu name={profile.displayName} />
      </div>
    </header>
  );
}

/** Phone bottom bar: the same tabs as doorways along the bottom. */
export function BottomNav() {
  const { modules } = useHub();
  return (
    <nav className="sh-bottomnav" aria-label="Places">
      <Tab href="/" label="Home" icon={Home} exact />
      {modules.map((m) => (
        <Tab key={m.id} href={m.route} label={m.name} icon={m.icon} accent={m.theme.accent} />
      ))}
      <Tab href="/settings" label="Settings" icon={Settings} />
    </nav>
  );
}

/** "Talk it through" from anywhere: the coach, told which place you're in. */
function TalkLink({ className }: { className: string }) {
  const pathname = usePathname();
  const place = pathname.split("/")[1] || "hub";
  return (
    <Link href={`/talk?place=${encodeURIComponent(place)}`} className={className} aria-label="Talk it through">
      Talk it through
    </Link>
  );
}

/** Floating buttons for phones, visible on every screen: talk it through, and the check-in. */
export function FloatingCheckIn() {
  return (
    <>
      <TalkLink className="sh-fab sh-fab-talk" />
      <Link href="/check-in" className="sh-fab" aria-label={COPY.checkInButton}>
        {COPY.checkInButton}
      </Link>
    </>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  exact,
  accent,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  exact?: boolean;
  accent?: string;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className="sh-tab"
      aria-current={active ? "page" : undefined}
      style={accent ? ({ "--tab-accent": accent } as React.CSSProperties) : undefined}
    >
      <Icon size={20} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

export function GentleToggle() {
  const { gentle } = useHub();
  const set = useMutation(api.gentleMode.set);
  return (
    <button
      type="button"
      className={`sh-gentle-toggle ${gentle ? "is-on" : ""}`}
      aria-pressed={gentle}
      onClick={() => void set({ on: !gentle })}
      title={gentle ? COPY.gentleDayOn : COPY.gentleDay}
    >
      {gentle ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
      <span>{COPY.gentleDay}</span>
    </button>
  );
}

function ProfileMenu({ name }: { name: string }) {
  const { signOut } = useAuthActions();
  return (
    <details className="sh-menu">
      <summary aria-label="Profile menu">
        <UserRound size={18} aria-hidden />
        <span>{name}</span>
      </summary>
      <div className="sh-menu-list" role="menu">
        <Link role="menuitem" href="/profile">
          <UserRound size={16} aria-hidden /> My profile and manual
        </Link>
        <Link role="menuitem" href="/partner">
          <Users size={16} aria-hidden /> My partner&apos;s manual
        </Link>
        <Link role="menuitem" href="/settings">
          <Settings size={16} aria-hidden /> Settings
        </Link>
        <Link role="menuitem" href="/help-now" className="sh-menu-help">
          <LifeBuoy size={16} aria-hidden /> {COPY.needHelpNow}
        </Link>
        <button role="menuitem" type="button" onClick={() => void signOut()}>
          {COPY.signOut}
        </button>
      </div>
    </details>
  );
}
