"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Briefcase, History, LayoutDashboard, MessageSquareText, Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, Spinner, useAction } from "@/core/ui";
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
 * The Lookout's frame and its gate. Each person can have one search; the
 * partner sees and helps with it unless its owner turned that off. When
 * both searches are open to someone, a switch picks which one is shown.
 * Every function behind these screens checks the same thing on the server
 * (convex/lookout/data.ts).
 */
export function LookoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useQuery(api.lookout.data.status);
  const start = useMutation(api.lookout.data.start);
  const setViewing = useMutation(api.lookout.data.setViewing);
  const { busy, error, run } = useAction();

  if (!status) return <Spinner />;
  const partner = status.partnerName ?? "your partner";
  if (!status.viewing) {
    return (
      <div className="sh-container sh-narrow">
        <h1 className="sh-h1">The Lookout</h1>
        <Card>
          <p><strong>A personal recruiter for remote work that fits.</strong></p>
          <p>
            It learns a person&apos;s work history and what they need, looks for remote jobs that fit, checks each one against their requirements, and drafts a truthful resume and cover letter for the good ones. Nothing is ever sent to an employer from here; the person applying approves and submits every application.
          </p>
          <p className="sh-hint">Each of you can have a search. You can both see and help with each other&apos;s, and the person a search is for approves its applications.</p>
          {status.partnerHas && !status.partnerOpen && <p className="sh-note">{partner} has a search and has kept it private.</p>}
          <ErrorNote error={error} />
          <div className="sh-stack-sm">
            {status.partnerName && !status.partnerHas && (
              <Btn big disabled={busy} onClick={() => void run(() => start({ forWhom: "partner" }))}>Start {partner}&apos;s search</Btn>
            )}
            <Btn big variant={status.partnerName && !status.partnerHas ? "secondary" : "primary"} disabled={busy} onClick={() => void run(() => start({ forWhom: "self" }))}>Start a search for me</Btn>
          </div>
        </Card>
      </div>
    );
  }
  const both = status.mine && status.partnerOpen;
  return (
    <div className="lo">
      {both && (
        <div className="sh-chips" role="tablist" aria-label="Whose search">
          <button type="button" role="tab" aria-selected={status.viewing === "partner"} className={`sh-chip ${status.viewing === "partner" ? "lo-chip-on" : ""}`} disabled={busy} onClick={() => void run(() => setViewing({ viewing: "partner" }))}>{partner}&apos;s search</button>
          <button type="button" role="tab" aria-selected={status.viewing === "self"} className={`sh-chip ${status.viewing === "self" ? "lo-chip-on" : ""}`} disabled={busy} onClick={() => void run(() => setViewing({ viewing: "self" }))}>My search</button>
        </div>
      )}
      {status.viewing === "partner" && <p className="sh-hint">You&apos;re helping with {partner}&apos;s search. Approving applications and confirming work history and answers stay with {partner}.</p>}
      {!status.mine && status.viewing === "partner" && <p className="sh-hint"><button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => start({ forWhom: "self" }))}>Start a search of my own</button> (optional)</p>}
      <ErrorNote error={error} />
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
