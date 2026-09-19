"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Anchor, BookHeart, Compass, Eye, FileText, Flame, Home, Map, MessageCircle, Navigation, ScrollText, Shield, Sunrise, Swords, Telescope } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { HEADER } from "@/core/metamorphosis/charter";
import { Btn, Card, ErrorNote, LinkBtn, Spinner, useAction } from "@/core/ui";
import "./metamorphosis.css";

const ROUTE = "/metamorphosis";
const NAV = [
  { href: ROUTE, label: "Home", icon: Home, exact: true },
  { href: `${ROUTE}/mirror`, label: "The Mirror", icon: Sunrise },
  { href: `${ROUTE}/sheet`, label: "Character Sheet", icon: ScrollText },
  { href: `${ROUTE}/map`, label: "The Map", icon: Map },
  { href: `${ROUTE}/knowing`, label: "Getting to know him", icon: BookHeart },
  { href: `${ROUTE}/scout`, label: "The Scout", icon: Telescope },
  { href: `${ROUTE}/tired`, label: "Do It Tired", icon: Flame },
  { href: `${ROUTE}/shield`, label: "Shield Down", icon: Shield },
  { href: `${ROUTE}/quests`, label: "Quest Log", icon: Swords },
  { href: `${ROUTE}/iron`, label: "Iron", icon: Anchor },
  { href: `${ROUTE}/compass`, label: "The Compass", icon: Navigation },
  { href: `${ROUTE}/seen`, label: "Seen", icon: Eye },
  { href: `${ROUTE}/landing`, label: "The Landing", icon: MessageCircle },
  { href: `${ROUTE}/charter`, label: "The Charter", icon: Compass },
  { href: `${ROUTE}/export`, label: "My pages", icon: FileText },
];

/**
 * The room's frame and its gate. The first person to claim it keeps it;
 * after that the other account sees one line. Every function behind these
 * screens checks the same claim on the server.
 */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useQuery(api.rooms.status, { moduleId: "metamorphosis" });
  const claim = useMutation(api.rooms.claim);
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
        <h1 className="sh-h1">Metamorphosis</h1>
        <Card>
          <p>
            <strong>A room for one man. Claim it if you want it.</strong>
          </p>
          <p>
            Whoever claims it keeps it. The other account will only ever see one line: that the room is yours. Nothing inside can be shared, on purpose. No one is counting anything in here.
          </p>
          <ErrorNote error={error} />
          <Btn big disabled={busy} onClick={() => void run(() => claim({ moduleId: "metamorphosis" }))}>
            This is my room
          </Btn>
        </Card>
      </div>
    );
  }
  return (
    <div className="mm">
      <header className="sh-card mm-header">
        <p className="mm-header-verse">{HEADER.verse} <span className="sh-muted">{HEADER.ref}</span></p>
        <p className="mm-header-note">{HEADER.note}</p>
      </header>
      <nav className="mm-subnav" aria-label="Metamorphosis">
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
