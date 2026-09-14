"use client";

import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getTheme, type Theme } from "@/convex/everybox/themes";
import { EveryBoxContext, type EveryBoxContextValue } from "./context";
import { Nav } from "./Nav";
import { Onboarding } from "./Onboarding";
import { BadgeSync } from "./BadgeSync";
import { Spinner } from "./ui";

/** Routes that render without a signed-in, onboarded partner. */
const PUBLIC_PREFIXES = ["/everybox/login", "/everybox/join"];
/** Routes that hide the main navigation (the glanceable widget). */
const BARE_PREFIXES = ["/everybox/widget", "/everybox/login", "/everybox/join"];

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

function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/everybox/sw.js", { scope: "/everybox/", updateViaCache: "none" })
      .catch(() => {
        /* Installability is a nice-to-have; the app works without it. */
      });
  }, []);
}

export function EveryBoxShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.everybox.households.me, isAuthenticated ? {} : "skip");
  useServiceWorker();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      const next = encodeURIComponent(pathname);
      router.replace(`/everybox/login?next=${next}`);
    }
  }, [isLoading, isAuthenticated, isPublic, pathname, router]);

  const value = useMemo<EveryBoxContextValue | null>(() => {
    if (!me || !me.onboarded) return null;
    return {
      partner: me.partner,
      household: me.household,
      partners: me.partners,
      other: me.partners.find((p) => p._id !== me.partner._id) ?? null,
      theme: getTheme(me.household.activeTheme),
      availableThemes: me.availableThemes,
      email: me.email,
    };
  }, [me]);

  const theme = value?.theme ?? getTheme("garden");

  let body: ReactNode;
  if (isPublic) {
    body = children;
  } else if (isLoading) {
    body = <Spinner label="Opening Every Box" />;
  } else if (!isAuthenticated) {
    body = <Spinner label="Heading to sign in" />;
  } else if (me === undefined || me === null) {
    // Query still loading, or the auth token hasn't reached it yet.
    body = <Spinner label="Opening Every Box" />;
  } else if (!me.onboarded) {
    body = <Onboarding email={me.email} />;
  } else if (value) {
    body = (
      <EveryBoxContext.Provider value={value}>
        <BadgeSync />
        {!isBare && <Nav />}
        {children}
      </EveryBoxContext.Provider>
    );
  }

  return (
    <div className="eb" style={themeStyle(theme)}>
      {body}
    </div>
  );
}
