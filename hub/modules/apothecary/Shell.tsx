"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, FlaskConical, MapPin, NotebookPen, PersonStanding, Siren, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import "./apothecary.css";

const ROUTE = "/apothecary";
const NAV = [
  { href: ROUTE, label: "Ask", icon: Sparkles, exact: true },
  { href: `${ROUTE}/now`, label: "Now?", icon: Siren },
  { href: `${ROUTE}/log`, label: "Log", icon: NotebookPen },
  { href: `${ROUTE}/patterns`, label: "Patterns", icon: Activity },
  { href: `${ROUTE}/body`, label: "Body", icon: PersonStanding },
  { href: `${ROUTE}/conditions`, label: "Conditions", icon: BookOpen },
  { href: `${ROUTE}/cabinet`, label: "Cabinet", icon: FlaskConical },
  { href: `${ROUTE}/where`, label: "Where to go", icon: MapPin },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="ap">
      <nav className="ap-subnav" aria-label="The Apothecary">
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
