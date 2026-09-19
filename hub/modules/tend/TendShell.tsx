"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, HeartHandshake, LineChart, Sunrise, Users, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import "./tend.css";

const ROUTE = "/tend";
const NAV = [
  { href: ROUTE, label: "Now", icon: Sunrise, exact: true },
  { href: `${ROUTE}/tools`, label: "My tools", icon: Wrench },
  { href: `${ROUTE}/log`, label: "My log", icon: LineChart },
  { href: `${ROUTE}/for-you`, label: "For you", icon: HeartHandshake },
  { href: `${ROUTE}/together`, label: "Together", icon: Users },
  { href: `${ROUTE}/my-manual`, label: "My manual", icon: BookOpen },
];

/** Tend's frame inside The Shire: a hearth corner with its own sub-navigation. */
export function TendShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="tend">
      <nav className="tend-subnav" aria-label="Tend">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
