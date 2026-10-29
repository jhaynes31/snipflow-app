"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Briefcase, History, LayoutDashboard, MessageSquareText, Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, LinkBtn, Spinner, useAction } from "@/core/ui";
import "./lookout.css";

export const LOOKOUT = "/lookout";
const NAV = [
  { href: LOOKOUT, label: "Overview", icon: LayoutDashboard, exact: true },
  { href: `${LOOKOUT}/jobs`, label: "Jobs", icon: Briefcase },
  { href: `${LOOKOUT}/add`, label: "Add a job", icon: Plus },
  { href: `${LOOKOUT}/interview`, label: "Interview", icon: MessageSquareText },
  { href: `${LOOKOUT}/history`, label: "Work history", icon: History },
  { href: `${LOOKOUT}/settings`, label: "Settings", icon: Settings },
];

/**
 * The Lookout's frame and its gate. One person's room: whoever is looking
 * for work claims it, and can let the other account help. Every function
 * behind these screens checks the same thing on the server (convex/lookout/data.ts).
 */
export function LookoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useQuery(api.lookout.data.status);
  const claim = useMutation(api.rooms.claim);
  const { busy, error, run } = useAction();

  if (!status) return <Spinner />;
  if (status.state === "theirs") {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>The Lookout is {status.ownerName}&apos;s. If {status.ownerName} would like your help, it can be turned on in its Settings.</p>
          <LinkBtn href="/" variant="ghost">Back home</LinkBtn>
        </Card>
      </div>
    );
  }
  if (status.state === "unclaimed") {
    return (
      <div className="sh-container sh-narrow">
        <h1 className="sh-h1">The Lookout</h1>
        <Card>
          <p><strong>A personal recruiter for the one of you who&apos;s looking for work.</strong></p>
          <p>
            It learns your work history and what you need, looks for remote jobs that fit, checks each one against your requirements, and drafts a truthful resume and cover letter for the good ones. Nothing is ever sent to an employer from here; you approve and submit every application yourself.
          </p>
          <p className="sh-hint">
            Claim it if you&apos;re the one looking. You can let {status.partnerName ?? "your partner"} help afterwards. If it&apos;s for {status.partnerName ?? "your partner"}, let them open it first.
          </p>
          <ErrorNote error={error} />
          <Btn big disabled={busy} onClick={() => void run(() => claim({ moduleId: "lookout" }))}>
            I&apos;m the one looking for work
          </Btn>
        </Card>
      </div>
    );
  }
  return (
    <div className="lo">
      {status.state === "helping" && <p className="sh-hint">You&apos;re helping {status.ownerName}. Approving applications and confirming work history stay with {status.ownerName}.</p>}
      <nav className="lo-subnav" aria-label="The Lookout">
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
