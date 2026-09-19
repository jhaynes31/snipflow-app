"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Anchor, Compass, Feather, Home, Leaf, PauseCircle, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, LinkBtn, Spinner, useAction } from "@/core/ui";
import "./re-centered.css";

const ROUTE = "/love-and-release/john";
const NAV = [
  { href: ROUTE, label: "Now", icon: Home, exact: true },
  { href: `${ROUTE}/whose`, label: "Whose is this?", icon: Scale },
  { href: `${ROUTE}/pause`, label: "The pause", icon: PauseCircle },
  { href: `${ROUTE}/landed`, label: "Let it land", icon: Feather },
  { href: `${ROUTE}/security`, label: "Where I stand", icon: Compass },
  { href: `${ROUTE}/own-life`, label: "My own life", icon: Leaf },
  { href: `${ROUTE}/boundaries`, label: "My word to me", icon: Anchor },
];

/**
 * The room's frame, and its gate. The first person to open the room claims
 * it. After that the other account sees one line and nothing else. Every
 * function behind these screens checks the same claim on the server.
 */
export function ReCenteredShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useQuery(api.reCentered.room.status);
  const claim = useMutation(api.reCentered.room.claim);
  const { busy, error, run } = useAction();

  if (!status) return <Spinner />;
  if (status.state === "theirs") {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>This room is {status.ownerName}&apos;s.</p>
          <LinkBtn href="/" variant="ghost">Back home</LinkBtn>
        </Card>
      </div>
    );
  }
  if (status.state === "unclaimed") {
    return (
      <div className="sh-container sh-narrow">
        <h1 className="sh-h1">Re-Centered</h1>
        <Card>
          <p>
            This room is for one person. Whoever claims it keeps it, and the other account will only ever see one line: that the room is theirs. Nothing inside can be shared, on purpose.
          </p>
          <ErrorNote error={error} />
          <Btn big disabled={busy} onClick={() => void run(() => claim({}))}>
            This is my room
          </Btn>
        </Card>
      </div>
    );
  }
  return (
    <div className="rc">
      <nav className="rc-subnav" aria-label="Re-Centered">
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
