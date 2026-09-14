"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ListChecks, Settings, Sparkles } from "lucide-react";

const ITEMS = [
  { href: "/everybox", label: "Home", icon: Home, exact: true },
  { href: "/everybox/categories", label: "Categories", icon: LayoutGrid },
  { href: "/everybox/commitments", label: "Commitments", icon: ListChecks },
  { href: "/everybox/review", label: "Review", icon: Sparkles },
  { href: "/everybox/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="eb-nav" aria-label="Every Box">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            <Icon aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
