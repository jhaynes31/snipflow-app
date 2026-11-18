"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The frame for the two apps that were built on their own and live inside
 * The Shire as static files with their data on the device: "Everyone, and
 * me" (hub/love-and-release at /love-and-release/app/) and Heartwood
 * (hub/heartwood at /fitness/app/). Jen (2026-11-18): every app should keep
 * the Shire's toolbar above it. So the app opens inside this page, below
 * the top bar and above the phone's bottom bar, instead of taking over
 * the whole window.
 *
 * The app reports its own route (postMessage "shire:route") so the
 * address bar follows it and a refresh lands on the same screen. Links in
 * the app that lead to Shire pages open with target="_top". The app's own
 * data never passes through here.
 */
export function EmbeddedApp({ app, appPath, outerPath, inner, params, title }: {
  /** The app's id, echoed in its route messages. */
  app: string;
  /** Where the app's files are served, e.g. /love-and-release/app. */
  appPath: string;
  /** The Shire address that shows this frame, e.g. /love-and-release/everyone. */
  outerPath: string;
  /** The app's own route, from the Shire address. */
  inner: string[];
  /** What to hand the app on the way in (who, and the day's signals). */
  params: Record<string, string>;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() => {
    const p = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    for (const [k, v] of Object.entries(params)) p.set(k, v);
    const q = p.toString();
    return `${appPath}/${inner.map(encodeURIComponent).join("/")}${q ? `?${q}` : ""}`;
  });
  const [box, setBox] = useState<{ top: number; bottom: number } | null>(null);

  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      window.scrollTo(0, 0);
      const top = Math.max(0, Math.round(el.parentElement?.getBoundingClientRect().top ?? 0));
      const nav = document.querySelector<HTMLElement>(".sh-bottomnav");
      const bottom = nav && getComputedStyle(nav).display !== "none" ? nav.offsetHeight : 0;
      setBox({ top, bottom });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return;
      const d = e.data as { type?: string; app?: string; path?: string } | null;
      if (!d || d.type !== "shire:route" || d.app !== app || typeof d.path !== "string") return;
      const path = d.path === "/" ? "" : d.path;
      const next = `${outerPath}${path}`;
      if (window.location.pathname + window.location.search !== next) window.history.replaceState(window.history.state, "", next);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [app, outerPath]);

  return (
    <div className="sh-embed" data-app={app}>
      <iframe
        ref={ref}
        src={src}
        title={title}
        className="sh-embed-frame"
        style={box ? { top: box.top, bottom: box.bottom } : { visibility: "hidden" }}
        allow="clipboard-write; fullscreen"
      />
    </div>
  );
}
