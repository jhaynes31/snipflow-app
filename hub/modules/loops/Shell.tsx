"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { THEMES, type LoopTheme } from "./theme";
import "./loops.css";

/** The tool's frame: theme, small nav, and the quiet "Need more support?" footer on every screen. */
export function Shell({ theme, children }: { theme: LoopTheme; children: ReactNode }) {
  const t = THEMES[theme];
  const pathname = usePathname();
  const nav = [
    { href: t.mount, label: "My loops", exact: true },
    { href: `${t.mount}/learn`, label: "Why loops happen" },
    { href: `${t.mount}/deck`, label: "Encouragement" },
    { href: `${t.mount}/review`, label: "Weekly review" },
  ];
  return (
    <div className="lp sh-container sh-narrow sh-stack" data-theme={theme}>
      <nav className="lp-subnav" aria-label={t.toolName}>
        <Link href={t.backHref}>← {t.backLabel.replace("Back to ", "")}</Link>
        {nav.map((n) => <Link key={n.href} href={n.href} aria-current={(n.exact ? pathname === n.href : pathname.startsWith(n.href)) ? "page" : undefined}>{n.label}</Link>)}
      </nav>
      {children}
      <p className="lp-footer">
        <details>
          <summary>Need more support?</summary>
          <span style={{ display: "block", marginTop: "0.4rem" }}>
            If you&apos;re not safe, call or text <strong>988</strong> (the Suicide &amp; Crisis Lifeline, US). Reaching out to a counselor, a pastor, or a trusted person is a strength, not a failure. <Link href="/help-now" className="sh-link">Need help now</Link>.
          </span>
        </details>
      </p>
    </div>
  );
}
