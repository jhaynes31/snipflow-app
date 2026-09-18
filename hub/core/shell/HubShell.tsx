"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { modulesFor } from "@/core/modules/registry";
import { Spinner } from "@/core/ui";
import { BadgeSync } from "./BadgeSync";
import { HubContext, type HubContextValue } from "./HubContext";
import { BottomNav, FloatingCheckIn, TopBar } from "./Nav";
import { Setup } from "./Setup";

/** Routes that render without a signed-in, set-up person. */
const PUBLIC_PREFIXES = ["/login", "/help-now", "/calendar"];

function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* Installability is a nice-to-have; the app works without it. */
    });
  }, []);
}

/**
 * Writes the person's view settings onto <html> so CSS can react:
 * data-quiet (no textures or motion), data-text-size, data-contrast and
 * data-theme. A gentle day is a signal only and never changes the view.
 */
function useViewSettings(value: HubContextValue | null) {
  useEffect(() => {
    const el = document.documentElement;
    if (!value) return;
    const a = value.profile.accessibility;
    el.dataset.quiet = a.quietVisuals ? "on" : "off";
    el.dataset.textSize = a.textSize;
    el.dataset.contrast = a.highContrast ? "high" : "normal";
    el.dataset.theme = a.theme;
  }, [value]);
}

export function HubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  useServiceWorker();

  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const setUp = me?.setUp === true;
  const gentle = useQuery(api.gentleMode.mine, setUp ? {} : "skip");
  const partnerGentle = useQuery(api.gentleMode.partners, setUp ? {} : "skip");
  const headsUps = useQuery(api.headsUps.openForMe, setUp ? {} : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, isPublic, pathname, router]);

  const value = useMemo<HubContextValue | null>(() => {
    if (!me || !me.setUp || !gentle || !partnerGentle || !headsUps) return null;
    return {
      profile: me.profile,
      partner: me.partner,
      email: me.email,
      gentle: gentle.on,
      partnerGentle: partnerGentle.on,
      modules: modulesFor(me.profile.modules),
      headsUpsForMe: headsUps,
    };
  }, [me, gentle, partnerGentle, headsUps]);

  useViewSettings(value);

  if (isPublic && !value) {
    return <main className="sh-main">{children}</main>;
  }
  if (isLoading || (isAuthenticated && me === undefined)) return <Spinner label="Opening the door" />;
  if (!isAuthenticated) return <Spinner label="Heading to sign in" />;
  if (me && !me.setUp) return <Setup email={me.email} />;
  if (!value) return <Spinner label="Lighting the lamps" />;

  return (
    <HubContext.Provider value={value}>
      <BadgeSync />
      <TopBar />
      <main className="sh-main">{children}</main>
      <BottomNav />
      <FloatingCheckIn />
    </HubContext.Provider>
  );
}
