"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users } from "lucide-react";
import type { ReactNode } from "react";
import "./seasons.css";

const ROUTE = "/seasons";
const NAV = [
  { href: ROUTE, label: "My season", icon: BookOpen, exact: true },
  { href: `${ROUTE}/ours`, label: "Our season", icon: Users },
];

export function SeasonsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="se">
      <nav className="se-subnav" aria-label="Seasons">
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
