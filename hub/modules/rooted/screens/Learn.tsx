"use client";

import Link from "next/link";
import { EARNED, STYLE_MAP, STYLES, TRAP, type Section, type StyleKey } from "@/core/rooted/content";
import { Card, PageTitle } from "@/core/ui";

function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s) => (
        <div key={s.title} className="rt-entry">
          <h3 className="sh-h3">{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </>
  );
}

export function Learn({ page }: { page: string | null }) {
  if (page === "trap" || page === "earned") {
    const p = page === "trap" ? TRAP : EARNED;
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title={p.title} subtitle={p.line} action={<Link href="/rooted/learn" className="sh-btn sh-btn-secondary">All pages</Link>} />
        <Card><Sections sections={p.sections} /></Card>
        <div className="rt-faith"><strong>{p.faith.ref}</strong>{p.faith.plain}</div>
      </div>
    );
  }
  if (page && page in STYLE_MAP) {
    const s = STYLE_MAP[page as StyleKey];
    return (
      <div className="sh-container sh-narrow sh-stack">
        <PageTitle title={s.name} subtitle={s.alsoCalled} action={<Link href="/rooted/learn" className="sh-btn sh-btn-secondary">All pages</Link>} />
        <p className="rt-line">{s.line}</p>
        <Card><Sections sections={s.sections} /></Card>
        <div className="rt-faith"><strong>{s.faith.ref}</strong>{s.faith.plain}</div>
        {s.key !== "secure" && (
          <p className="sh-muted">
            Next: <Link href="/rooted/learn/earned" className="sh-link">earned security</Link>, then <Link href="/rooted/secure" className="sh-link">becoming secure</Link>.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Learn" subtitle="Plain words. Read them in any order; the trap and earned security are the two to come back to." />
      <div className="sh-tiles">
        {STYLES.map((s) => (
          <Link key={s.key} href={`/rooted/learn/${s.key}`} className="sh-tile">
            <span className="sh-tile-name">{s.name}</span>
            <span className="sh-tile-tagline">{s.line}</span>
          </Link>
        ))}
        <Link href="/rooted/learn/trap" className="sh-tile"><span className="sh-tile-name">{TRAP.title}</span><span className="sh-tile-tagline">{TRAP.line}</span></Link>
        <Link href="/rooted/learn/earned" className="sh-tile"><span className="sh-tile-name">{EARNED.title}</span><span className="sh-tile-tagline">{EARNED.line}</span></Link>
      </div>
      <p className="sh-hint">Drawn from Bowlby and Ainsworth, Mary Main, Levine and Heller, Diane Poole Heller, Julie Menanno, and Thais Gibson, written in this home&apos;s words. Scripture is referenced and paraphrased; the text itself is in The Well.</p>
    </div>
  );
}
