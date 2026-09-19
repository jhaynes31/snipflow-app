"use client";

import Link from "next/link";
import { anyCrisis } from "@/convex/coach/safety";
import { COPY } from "@/core/copy/strings";
import { UrgentHeadsUp } from "./UrgentHeadsUp";

/**
 * The crisis card. Shown by any text field when what's being typed reads
 * as thoughts of suicide, self-harm, or being unsafe, and by the coach when
 * it stops its normal flow. It never blocks, hides, or changes the screen
 * around it; it only adds the numbers and the one-tap heads-up.
 */
export function CrisisCard({ title = "You matter, and help is real." }: { title?: string }) {
  return (
    <section className="sh-card sh-crisis" role="status" aria-live="polite">
      <p>
        <strong>{title}</strong> If you&apos;re having thoughts of suicide or hurting yourself, or you&apos;re not safe, please reach a person now.
      </p>
      <div className="sh-choices">
        <a className="sh-btn sh-btn-primary" href="tel:988">Call 988</a>
        <a className="sh-btn sh-btn-primary" href="sms:988">Text 988</a>
        <a className="sh-btn sh-btn-accent" href="tel:911">Call 911 if in danger now</a>
      </div>
      <UrgentHeadsUp compact />
      <p className="sh-muted">
        <Link href="/help-now" className="sh-link">{COPY.needHelpNow}</Link> has your safety plan and the same numbers.
      </p>
    </section>
  );
}

/** Watches text fields and shows the crisis card when any of them reads as crisis wording. */
export function CrisisNotice({ texts }: { texts: (string | null | undefined)[] }) {
  if (!anyCrisis(texts)) return null;
  return <CrisisCard />;
}
