"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { COMMUNITY_NAME } from "@/lib/config";

export function Nav() {
  const path = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();

  const item = (href: string, label: string) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link
        href={href}
        className="rounded-full px-3 py-1 text-sm font-bold"
        style={{ background: active ? "var(--accent-soft)" : "transparent" }}
      >
        {label}
      </Link>
    );
  };

  return (
    <header style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
      <nav className="wrap flex flex-wrap items-center gap-2 py-3">
        <Link href="/" className="mr-auto font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {COMMUNITY_NAME}
        </Link>
        {item("/", "Schedule")}
        {isAuthenticated && item("/portal", "My sessions")}
        {me?.isAdmin && item("/admin", "Hosts")}
        {isAuthenticated ? (
          <button className="btn btn-quiet btn-small" onClick={() => void signOut()}>
            Sign out
          </button>
        ) : (
          <Link href="/login" className="btn btn-small">
            Member sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
