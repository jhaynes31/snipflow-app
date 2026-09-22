"use client";

import Link from "next/link";
import { LAYERS, PEARLS_DEFAULT, TRUTH, WATCH_FOR } from "@/convex/orchard/pure";
import { Card, Note, PageTitle } from "@/core/ui";

/** The layers, what each gets, what earns it, and what would move someone out. Said plainly, never enforced. */
export function SlowTrust() {
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Slow trust" subtitle="You trust first and hope safety follows. That isn't naivety; it's a nervous system that learned to attach fast. This time, let them earn it." />
      <p className="or-truth">{TRUTH}</p>
      <Note>
        <p>The rule is simple. Each layer has a minimum time known before someone moves into it. Not because people are dangerous, but because trust is built in the ordinary, and the ordinary takes weeks. Excitement is allowed on day one. Access is not.</p>
        <p className="sh-muted">The app says the rule out loud when you move someone early. It never stops you. The reason you give is the point.</p>
      </Note>
      {[...LAYERS].reverse().map((l) => (
        <Card key={l.index}>
          <h2 className="sh-h2">{l.name} <span className="sh-muted">· {l.minDays === 0 ? "from day one" : `${l.minDays}+ days known`}</span></h2>
          <p>{l.meaning}</p>
          <p className="sh-eyebrow mt-2">What they can have</p>
          <p className="sh-muted">{l.access.join(" · ")}</p>
          <p className="sh-eyebrow mt-2">What I can expect</p>
          <p className="sh-muted">{l.expect.join(" · ")}</p>
          <p className="sh-eyebrow mt-2">Earned by</p>
          <p className="sh-muted">{l.earnedBy.join(" · ")}</p>
          <p className="sh-eyebrow mt-2">What would move them out</p>
          <p className="sh-muted">{l.exitSignals.join(" · ")}</p>
        </Card>
      ))}
      <Card tone="alt">
        <h2 className="sh-h2">Pearls</h2>
        <p className="sh-muted">The things that get shared too early when the vibes are good. Held, not hidden. Each is offered when the layer earns it.</p>
        <ul className="sh-list">{PEARLS_DEFAULT.map((p) => <li key={p}>{p}</li>)}</ul>
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">What to watch for, in the ordinary</h2>
        <ul className="sh-list">{WATCH_FOR.map((w) => <li key={w}>{w}</li>)}</ul>
        <p className="sh-muted mt-2">These are the tests. None of them can be passed in a great first conversation. <Link href="/orchard" className="sh-link">Write what you see as facts</Link>, and let the list grow.</p>
      </Card>
    </div>
  );
}
