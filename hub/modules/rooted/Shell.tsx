"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Eye, HeartHandshake, MessageCircle, ShieldCheck, Sprout, Sun, Users } from "lucide-react";
import type { ReactNode } from "react";
import "./rooted.css";

const ROUTE = "/rooted";
const NAV = [
  { href: ROUTE, label: "Rooted", icon: Sprout, exact: true },
  { href: `${ROUTE}/learn`, label: "Learn", icon: BookOpen },
  { href: `${ROUTE}/today`, label: "Today", icon: Sun },
  { href: `${ROUTE}/secure`, label: "Becoming secure", icon: Compass },
  { href: `${ROUTE}/read`, label: "The avoidant read", icon: Eye },
  { href: `${ROUTE}/fail-safes`, label: "Fail safes", icon: ShieldCheck },
  { href: `${ROUTE}/people`, label: "Past people", icon: Users },
  { href: `${ROUTE}/us`, label: "Us", icon: HeartHandshake },
  { href: `${ROUTE}/talk`, label: "Talk", icon: MessageCircle },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="rt">
      <nav className="rt-subnav" aria-label="Rooted">
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
