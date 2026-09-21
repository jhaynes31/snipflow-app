"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, Footprints, Leaf, RefreshCw, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import "./renewed-mind.css";

const ROUTE = "/renewed-mind";
const NAV = [
  { href: ROUTE, label: "Rehearse", icon: RefreshCw, exact: true },
  { href: `${ROUTE}/beliefs`, label: "Put Off, Put On", icon: Leaf },
  { href: `${ROUTE}/captive`, label: "Take It Captive", icon: ShieldCheck },
  { href: `${ROUTE}/live`, label: "Live It", icon: Footprints },
  { href: `${ROUTE}/evidence`, label: "Evidence for the New", icon: BookOpenCheck },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="rm">
      <nav className="rm-subnav" aria-label="Renewed Mind">
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
