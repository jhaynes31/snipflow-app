"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, BookOpen, Compass, Footprints, HandHeart, Scissors, Shield, Sunrise, Users } from "lucide-react";
import type { ReactNode } from "react";
import "./the-well.css";

const ROUTE = "/the-well";
const NAV = [
  { href: ROUTE, label: "Today", icon: Sunrise, exact: true },
  { href: `${ROUTE}/bible`, label: "Bible", icon: BookOpen },
  { href: `${ROUTE}/ways`, label: "Ways of Jesus", icon: Footprints },
  { href: `${ROUTE}/lies`, label: "Lies and truth", icon: Shield },
  { href: `${ROUTE}/untangle`, label: "Untangle", icon: Scissors },
  { href: `${ROUTE}/talking`, label: "Talking with him", icon: HandHeart },
  { href: `${ROUTE}/remembering`, label: "Remembering", icon: Anchor },
  { href: `${ROUTE}/together`, label: "Together", icon: Users },
  { href: `${ROUTE}/permissions`, label: "Permissions", icon: Compass },
];

/** The Well's frame. No counters anywhere in it, on purpose. */
export function WellShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="well">
      <nav className="well-subnav" aria-label="The Well">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <Icon size={16} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
