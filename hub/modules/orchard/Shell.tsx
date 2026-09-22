"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, DoorOpen, Footprints, Hourglass, ListChecks, Moon, Users, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import "./orchard.css";

const ROUTE = "/orchard";
const NAV = [
  { href: ROUTE, label: "People", icon: Users, exact: true },
  { href: `${ROUTE}/slow-trust`, label: "Slow trust", icon: Hourglass },
  { href: `${ROUTE}/signals`, label: "My signals", icon: ListChecks },
  { href: `${ROUTE}/compass`, label: "The Compass", icon: Compass },
  { href: `${ROUTE}/lonely`, label: "Lonely", icon: Moon },
  { href: `${ROUTE}/too-long`, label: "Too long", icon: DoorOpen },
  { href: `${ROUTE}/together`, label: "Together", icon: UsersRound },
  { href: `${ROUTE}/ways`, label: "Ways", icon: Footprints },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="or">
      <nav className="or-subnav" aria-label="The Orchard">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href || pathname.startsWith(`${ROUTE}/person`) : pathname.startsWith(href);
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
