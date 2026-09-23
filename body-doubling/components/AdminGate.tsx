"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");
  const path = usePathname();
  if (isLoading || (isAuthenticated && me === undefined)) return <p className="muted">Loading…</p>;
  if (!isAuthenticated) {
    return (
      <p>
        <Link className="link" href={`/login?next=${encodeURIComponent(path)}`}>Sign in</Link> to use the host tools.
      </p>
    );
  }
  if (!me?.isAdmin) return <p>This page is for hosts. If that&apos;s you, ask for your email to be added to ADMIN_EMAILS.</p>;
  const tab = (href: string, label: string) => (
    <Link
      href={href}
      className="rounded-full px-3 py-1 text-sm font-bold"
      style={{ background: path === href ? "var(--accent-soft)" : "transparent", border: "1px solid var(--line)" }}
    >
      {label}
    </Link>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tab("/admin", "Sessions")}
        {tab("/admin/members", "Members")}
      </div>
      {children}
    </div>
  );
}
