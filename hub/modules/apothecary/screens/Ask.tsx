"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AREAS, CONDITIONS, ONSET, QUALITIES, SIDES, type Side } from "@/convex/apothecary/pure";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/**
 * Ask: what's going on, in your words and a few chips. The entry is saved
 * first, so the log grows whether or not the coach answers; then the
 * coach answers in its fixed shape: needs a person now, what it could be,
 * what to try, what this place holds, for next time, tonight.
 */
export function Ask() {
  const settings = useQuery(api.apothecary.entries.settings);
  const cabinet = useQuery(api.apothecary.entries.cabinet);
  const recent = useQuery(api.apothecary.entries.entries, { limit: 8 });
  const add = useMutation(api.apothecary.entries.addEntry);
  const { busy, error, run } = useAction();
  const [area, setArea] = useState("");
  const [side, setSide] = useState<Side>("n/a");
  const [qualities, setQualities] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [onset, setOnset] = useState("");
  const [duration, setDuration] = useState("");
  const [text, setText] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  if (!settings || !cabinet || !recent) return <Spinner />;

  const flip = (q: string) => setQualities((cur) => (cur.includes(q) ? cur.filter((x) => x !== q) : [...cur, q]));
  const areaObj = AREAS.find((a) => a.key === area);

  function buildOpening(): string {
    const conds = CONDITIONS.filter((c) => settings!.conditions.includes(c.key)).map((c) => c.name);
    const cab = cabinet!.map((c) => `${c.name} (${c.kind}${c.forWhat ? `, for ${c.forWhat}` : ""})`);
    const prior = recent!.slice(0, 6).map((e) => `${e.day}: ${AREAS.find((a) => a.key === e.area)?.name ?? e.area}${e.side !== "n/a" ? ` (${e.side})` : ""}, ${e.qualities.join("/")}, severity ${e.severity}${e.helped ? `; helped: ${e.helped}` : ""}`);
    return [
      `Where: ${areaObj?.name ?? "not sure"}${side !== "n/a" ? `, ${side} side` : ""}.`,
      qualities.length ? `Feels like: ${qualities.join(", ")}.` : "",
      `Severity ${severity} of 5.${onset ? ` Onset: ${onset}.` : ""}${duration ? ` For: ${duration}.` : ""}`,
      `In my words: ${text}`,
      conds.length ? `Conditions I track: ${conds.join("; ")}.` : "Conditions I track: none chosen yet.",
      cab.length ? `In my cabinet: ${cab.join("; ")}.` : "My cabinet is empty so far.",
      prior.length ? `Recent entries: ${prior.join(" | ")}.` : "",
    ].filter(Boolean).join("\n");
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Apothecary" subtitle="Bring the body question. A straight answer: whether it needs a person, what it could be, what to try, what that place tends to hold." />
      {!opening ? (
        <Card>
          <Field label="Where">
            <select className="sh-input" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Pick the place</option>
              {AREAS.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          </Field>
          <div className="sh-row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
            <span className="sh-hint">Side:</span>
            {SIDES.map((s) => <button key={s} type="button" className="sh-chip" aria-pressed={side === s} onClick={() => setSide(s)}>{s}</button>)}
          </div>
          <p className="sh-eyebrow mt-2">Feels like (pick every one that fits)</p>
          <div className="sh-chips">{QUALITIES.map((q) => <button key={q} type="button" className="sh-chip" aria-pressed={qualities.includes(q)} onClick={() => flip(q)}>{q}</button>)}</div>
          <div className="sh-row mt-2" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
            <span className="sh-hint">How much, 1 to 5:</span>
            {[1, 2, 3, 4, 5].map((n) => <Btn key={n} variant={severity === n ? "primary" : "secondary"} onClick={() => setSeverity(n)}>{n}</Btn>)}
          </div>
          <div className="sh-row mt-2" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
            <span className="sh-hint">Onset:</span>
            {ONSET.map((o) => <button key={o} type="button" className="sh-chip" aria-pressed={onset === o} onClick={() => setOnset(onset === o ? "" : o)}>{o}</button>)}
          </div>
          <Field label="For how long (optional)" hint="Two days, three weeks, since Tuesday.">
            <input className="sh-input" value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={80} />
          </Field>
          <Field label="In your words" hint="Everything you'd tell a friend who happened to know a lot. What makes it better or worse, what you've tried, what you're afraid it is.">
            <textarea className="sh-input sh-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          </Field>
          <CrisisNotice texts={[text]} />
          <ErrorNote error={error} />
          <div className="sh-choices">
            <Btn disabled={busy || !area || !text.trim()} onClick={() => void run(async () => { await add({ area, side, qualities, severity, onset: onset || undefined, duration: duration || undefined, text }); setOpening(buildOpening()); })}>Ask</Btn>
            <Link href="/apothecary/now" className="sh-btn sh-btn-ghost">Just tell me if it&apos;s a now thing</Link>
          </div>
          {settings.conditions.length === 0 && <p className="sh-muted mt-2">Tip: choose what you track under <Link href="/apothecary/conditions" className="sh-link">Conditions</Link> so answers are read through your body.</p>}
        </Card>
      ) : (
        <>
          <Card tone="alt">
            <p className="sh-eyebrow">Saved to the log</p>
            <p>{areaObj?.name}{side !== "n/a" ? `, ${side}` : ""}{qualities.length ? ` · ${qualities.join(", ")}` : ""} · {severity} of 5</p>
            <p className="sh-muted">Add what you tried and what helped later, under Log. That&apos;s what makes the patterns.</p>
          </Card>
          <p className="sh-muted">Send it as is, or add anything first. The answer comes in the same six parts every time.</p>
          <CoachChat module="apothecary" task="apothecary.ask" opening={opening} placeholder="Anything to add? Or just: go." />
          <div className="sh-choices mt-2">
            <Btn variant="ghost" onClick={() => { setOpening(null); setText(""); setQualities([]); }}>Ask about something else</Btn>
          </div>
        </>
      )}
      <Note>
        One line, once: this is a well-read friend, not a doctor, and you know that. It says &ldquo;a person, today&rdquo; only for the signs that mean it, and otherwise never. What&apos;s in the <Link href="/apothecary/cabinet" className="sh-link">Cabinet</Link> gets reached for first.
      </Note>
    </div>
  );
}
