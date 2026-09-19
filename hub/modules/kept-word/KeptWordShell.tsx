"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CalendarDays, HandHeart, Handshake, MessageSquareHeart } from "lucide-react";
import type { ReactNode } from "react";
import "./kept-word.css";

const ROUTE = "/kept-word";
const NAV = [
  { href: ROUTE, label: "Open words", icon: Handshake, exact: true },
  { href: `${ROUTE}/asks`, label: "Asks", icon: MessageSquareHeart },
  { href: `${ROUTE}/weeks`, label: "Weeks", icon: CalendarDays },
  { href: `${ROUTE}/kept`, label: "Kept", icon: BookOpenCheck },
  { href: `${ROUTE}/ways`, label: "Ways to show up", icon: HandHeart },
];

/** Kept Word's frame: the record, shared by nature, with its own sub-navigation. */
export function KeptWordShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="kw">
      <nav className="kw-subnav" aria-label="Kept Word">
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
