"use client";

import Link from "next/link";
import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Home, LayoutGrid, ListChecks, Settings, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { getTheme, type Theme } from "@/convex/everyBox/themes";
import { EveryBoxContext, type EveryBoxContextValue } from "./components/context";
import { Spinner } from "./components/ui";
import "./everybox.css";

const ROUTE = "/every-box";

const NAV = [
  { href: ROUTE, label: "Home", icon: Home, exact: true },
  { href: `${ROUTE}/boxes`, label: "Boxes", icon: LayoutGrid },
  { href: `${ROUTE}/commitments`, label: "Commitments", icon: ListChecks },
  { href: `${ROUTE}/review`, label: "Review", icon: Sparkles },
  { href: `${ROUTE}/settings`, label: "Settings", icon: Settings },
];

export function themeStyle(theme: Theme): CSSProperties {
  const p = theme.palette;
  return {
    "--eb-bg": p.bg,
    "--eb-surface": p.surface,
    "--eb-surface-alt": p.surfaceAlt,
    "--eb-text": p.text,
    "--eb-muted": p.muted,
    "--eb-accent": p.accent,
    "--eb-accent-text": p.accentText,
    "--eb-border": p.border,
    "--eb-tint-1": p.stageTints[0],
    "--eb-tint-2": p.stageTints[1],
    "--eb-tint-3": p.stageTints[2],
    "--eb-tint-4": p.stageTints[3],
    "--eb-tint-5": p.stageTints[4],
  } as CSSProperties;
}

/**
 * Every Box inside The Shire. Login, profiles, and the outer navigation
 * belong to the shell; this only provides Every Box's own context, theme,
 * and sub-navigation. On first visit it creates the household and the
 * person's partner row from their Shire profile.
 */
export function EveryBoxShell({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const pathname = usePathname();
  const me = useQuery(api.everyBox.households.me);
  const ensure = useMutation(api.everyBox.households.ensure);

  useEffect(() => {
    if (me && !me.provisioned) void ensure();
  }, [me, ensure]);

  const value = useMemo<EveryBoxContextValue | null>(() => {
    if (!me || !me.provisioned) return null;
    return {
      partner: me.partner,
      household: me.household,
      partners: me.partners,
      other: me.partners.find((p) => p._id !== me.partner._id) ?? null,
      theme: getTheme(me.household.activeTheme),
      availableThemes: me.availableThemes,
    };
  }, [me]);

  const theme = value?.theme ?? getTheme(undefined);

  return (
    <div className="eb" style={themeStyle(theme)}>
      {!value ? (
        <Spinner label="Opening Every Box" />
      ) : (
        <EveryBoxContext.Provider value={value}>
          {!bare && (
            <nav className="eb-subnav" aria-label="Every Box">
              {NAV.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} aria-current={active ? "page" : undefined}>
                    <Icon aria-hidden />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
          {children}
        </EveryBoxContext.Provider>
      )}
    </div>
  );
}
