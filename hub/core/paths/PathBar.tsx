"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/core/ui";
import { usePath } from "./usePath";

/**
 * The slim bar at the top of every page while a path is running: where you
 * are, what's next, one Next button. Nothing is counted. Stopping is just
 * stopping. Steps inside Heartwood or the Re-Centered app leave The Shire;
 * the bar is waiting when you come back.
 */
export function PathBar() {
  const p = usePath();
  const pathname = usePathname();
  const [finished, setFinished] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  if (finished) {
    return (
      <div className="sh-pathbar" role="status">
        {thanks ? (
          <span>Noted. That was <strong>{finished}</strong>.</span>
        ) : (
          <>
            <span>You walked <strong>{finished}</strong>. Did it help?</span>
            <span className="sh-pathbar-actions">
              {["A lot", "A little", "Not really"].map((l) => (
                <Btn key={l} variant="secondary" onClick={() => { setThanks(true); setTimeout(() => setFinished(null), 2500); }}>{l}</Btn>
              ))}
            </span>
          </>
        )}
      </div>
    );
  }
  if (!p.current || !p.state || !p.step) return null;
  const n = p.state.step + 1;
  const total = p.current.steps.length;
  const here = p.stepHref ? pathname === p.stepHref.split("?")[0] : false;
  const last = n === total;
  const finish = async () => { const name = p.current!.name; await p.stop(); setThanks(false); setFinished(name); };
  return (
    <div className="sh-pathbar" role="status" aria-label="Your path">
      <span className="sh-pathbar-where">
        <span className="sh-pathbar-name">{p.current.name}</span>
        <span> · step {n} of {total}: <strong>{p.step.name}</strong></span>
        {!last && p.nextTool && <span className="sh-muted"> · next: {p.nextTool.name}</span>}
      </span>
      <span className="sh-pathbar-actions">
        {!here && <Btn variant="secondary" onClick={p.openStep}>Open {p.step.name}</Btn>}
        {last ? (
          <Btn onClick={() => void finish()}>Done with the path</Btn>
        ) : (
          <Btn onClick={() => void p.next()}>Next: {p.nextTool?.name} →</Btn>
        )}
        <Btn variant="ghost" onClick={() => void p.stop()} aria-label="Stop this path">Stop</Btn>
      </span>
    </div>
  );
}
