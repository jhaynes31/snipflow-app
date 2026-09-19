"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, ListChecks, MapPinned, MessageCircleQuestion, Route, Users } from "lucide-react";
import type { ReactNode } from "react";
import "./crossroads.css";

const ROUTE = "/crossroads";
const NAV = [
  { href: ROUTE, label: "Questions", icon: ListChecks, exact: true },
  { href: `${ROUTE}/together`, label: "Together", icon: Users },
  { href: `${ROUTE}/places`, label: "Places", icon: MapPinned },
  { href: `${ROUTE}/guide`, label: "Ask the guide", icon: MessageCircleQuestion },
  { href: `${ROUTE}/road`, label: "The Road", icon: Route },
  { href: `${ROUTE}/sources`, label: "Sources", icon: Compass },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="cr">
      <nav className="cr-subnav" aria-label="The Crossroads">
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
