"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Armchair, BookOpen, Flame, Home, Sparkles, Sprout, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, LinkBtn, Spinner, useAction } from "@/core/ui";
import "./hearth.css";

export const HEARTH = "/love-and-release/hearth";
const NAV = [
  { href: HEARTH, label: "The Hearth", icon: Home, exact: true },
  { href: `${HEARTH}/father`, label: "The Father's chair", icon: Armchair },
  { href: `${HEARTH}/mother`, label: "The Mother's Table", icon: UtensilsCrossed },
  { href: `${HEARTH}/care`, label: "Her care shelf", icon: Sparkles },
  { href: `${HEARTH}/know`, label: "What I know", icon: BookOpen },
  { href: `${HEARTH}/girl`, label: "The girl", icon: Sprout },
  { href: `${HEARTH}/teen`, label: "The teenager", icon: Flame },
];

/**
 * The Hearth's frame and its gate. One person's room, claimed once; after
 * that the other account sees one line. Every function behind these screens
 * checks the same claim on the server.
 */
export function HearthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useQuery(api.rooms.status, { moduleId: "hearth" });
  const claim = useMutation(api.rooms.claim);
  const { busy, error, run } = useAction();

  if (!status) return <Spinner />;
  if (status.state === "theirs") {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>This room is {status.ownerName}&apos;s.</p>
          <LinkBtn href="/love-and-release" variant="ghost">Back to Re-Centered</LinkBtn>
        </Card>
      </div>
    );
  }
  if (status.state === "unclaimed") {
    return (
      <div className="sh-container sh-narrow">
        <h1 className="sh-h1">The Hearth</h1>
        <Card>
          <p><strong>A room for one daughter. Claim it if it&apos;s yours.</strong></p>
          <p>
            A father&apos;s chair and a mother&apos;s table, for the daughter who had two parents who never acted like them. Whoever claims it keeps it. The other account will only ever see one line: that the room is yours. Nothing inside is counted.
          </p>
          <ErrorNote error={error} />
          <Btn big disabled={busy} onClick={() => void run(() => claim({ moduleId: "hearth" }))}>
            This is my room
          </Btn>
        </Card>
      </div>
    );
  }
  return (
    <div className="hh">
      <nav className="hh-subnav" aria-label="The Hearth">
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
