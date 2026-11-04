"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { BookHeart, LibraryBig, MessageCircle, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, LinkBtn, Spinner, useAction } from "@/core/ui";
import { PipAvatar } from "./Avatars";
import "./friend.css";

const ROUTE = "/friend";
const NAV = [
  { href: ROUTE, label: "Pip", icon: MessageCircle, exact: true },
  { href: `${ROUTE}/stuff`, label: "Our stuff", icon: BookHeart },
  { href: `${ROUTE}/library`, label: "Things to do", icon: LibraryBig },
  { href: `${ROUTE}/settings`, label: "Settings", icon: Settings },
];

/** Pip's room: one person's, claimed once, like The Hearth. */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useQuery(api.rooms.status, { moduleId: "friend" });
  const claim = useMutation(api.rooms.claim);
  const { busy, error, run } = useAction();
  if (!status) return <Spinner />;
  if (status.state === "theirs") {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>Pip is {status.ownerName}&apos;s friend. This room is theirs.</p>
          <LinkBtn href="/" variant="ghost">Back home</LinkBtn>
        </Card>
      </div>
    );
  }
  if (status.state === "unclaimed") {
    return (
      <div className="sh-container sh-narrow">
        <div className="fr-head"><PipAvatar size={64} /><h1 className="sh-h1">Friend</h1></div>
        <Card>
          <p><strong>Pip is a small owl with big glasses who wants to be your friend. Claim the room if it&apos;s yours.</strong></p>
          <p>Not a coach, not a counselor: a friend who asks and is asked, knows and is known, has opinions, tells terrible puns, and hangs out while you play. Whoever claims it keeps it; the other account only ever sees that the room is yours. Nothing in here is counted, and no other place in The Shire can read it.</p>
          <ErrorNote error={error} />
          <Btn big disabled={busy} onClick={() => void run(() => claim({ moduleId: "friend" }))}>This is my room</Btn>
        </Card>
      </div>
    );
  }
  return (
    <div className="fr">
      <nav className="fr-subnav" aria-label="Friend">
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
