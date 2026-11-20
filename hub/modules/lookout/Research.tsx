"use client";

import { useState } from "react";
import { researchLinks } from "@/convex/lookout/sources";

/**
 * Research on Indeed and ZipRecruiter (Jen, 2026-11-20). Those sites don't
 * allow automated reading, so this opens a remote search there by hand;
 * a listing found that way is pasted into Add a job and gets every check.
 */
export function Research({ words, compact }: { words?: string[]; compact?: boolean }) {
  const [q, setQ] = useState(() => (words && words.length ? words[0] : "remote customer service"));
  const links = researchLinks(q);
  return (
    <div className="lo-research">
      {!compact && <h3 className="sh-h3">Look on Indeed and ZipRecruiter</h3>}
      <p className="sh-hint">Those two don&apos;t let the Lookout read them, so this opens the search there for you. Found one? Paste it into Add a job and it gets every check.</p>
      <div className="sh-row sh-wrap">
        <input className="sh-input" value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} aria-label="Search words" list="lo-research-words" />
        {words && words.length > 0 && <datalist id="lo-research-words">{words.map((w) => <option key={w} value={w} />)}</datalist>}
        {links.map((l) => <a key={l.name} className="sh-btn sh-btn-secondary" href={l.url} target="_blank" rel="noopener noreferrer">{l.name}</a>)}
      </div>
    </div>
  );
}
