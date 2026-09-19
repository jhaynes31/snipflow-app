"use client";

import Link from "next/link";
import { CoachChat } from "@/core/coach/CoachChat";
import { PageTitle } from "@/core/ui";

/** The Landing: a safe place to land. Heard, not fixed. */
export function Landing() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Landing" subtitle="I'm listening. Say it however it comes out. Nothing gets fixed here unless you ask." />
      <CoachChat module="metamorphosis" task="metamorphosis.landing" placeholder="Just say it." />
      <p className="sh-hint">
        The mentor here reads only the parts of your Character Sheet you allowed. If you&apos;re not safe, <Link href="/help-now" className="sh-link">Need help now</Link> is one tap away.
      </p>
    </div>
  );
}
