"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LifeBuoy, MessageCircleHeart, Scale, Wheat } from "lucide-react";
import type { ReactNode } from "react";
import "./storehouse.css";

const ROUTE = "/storehouse";
const NAV = [
  { href: ROUTE, label: "This month", icon: CalendarDays, exact: true },
  { href: `${ROUTE}/debts`, label: "Debts", icon: Scale },
  { href: `${ROUTE}/lifeboat`, label: "The Lifeboat", icon: LifeBuoy },
  { href: `${ROUTE}/barns`, label: "The Barns", icon: Wheat },
  { href: `${ROUTE}/worries`, label: "Worries", icon: MessageCircleHeart },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="st">
      <nav className="sh-subnav-store" aria-label="The Storehouse">
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
