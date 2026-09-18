"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COPY } from "@/core/copy/strings";
import { Btn, Card, ErrorNote, LinkBtn, useAction } from "@/core/ui";

/**
 * Reachable from the profile menu on every screen, and without signing in.
 * Plain, large, and short. The one-tap urgent heads-up needs a signed-in
 * person with a partner; the numbers never do.
 */
export default function HelpNowPage() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const send = useMutation(api.headsUps.send);
  const { busy, error, run } = useAction();
  const [sent, setSent] = useState(false);
  const partner = me?.setUp ? me.partner : null;

  return (
    <div className="sh-container sh-narrow sh-lowdemand">
      <h1 className="sh-h1">{COPY.needHelpNow}</h1>
      <p>You matter, and help is real. Pick the one that fits.</p>
      <div className="sh-stack">
        <a className="sh-btn sh-btn-primary sh-btn-big" href="tel:988">
          Call 988
        </a>
        <a className="sh-btn sh-btn-primary sh-btn-big" href="sms:988">
          Text 988
        </a>
        <a className="sh-btn sh-btn-accent sh-btn-big" href="tel:911">
          Call 911 if you&apos;re in danger right now
        </a>
      </div>
      <p className="sh-muted">988 is the Suicide &amp; Crisis Lifeline in the US. Call or text, any hour.</p>

      {partner && !sent && (
        <Card className="mt-6">
          <p>
            <strong>Tell {partner.displayName} with one tap.</strong> This sends an urgent heads-up that says you&apos;re not
            okay and asks them to come.
          </p>
          <ErrorNote error={error} />
          <Btn
            big
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await send({
                  statusLine: "I'm not okay right now. Please come.",
                  help: "quietPresence",
                  suggestions: { do: [], say: [], skip: [] },
                  urgent: true,
                  addToCalendar: true,
                });
                setSent(true);
              })
            }
          >
            Send {partner.displayName} an urgent heads-up
          </Btn>
        </Card>
      )}
      {sent && partner && (
        <Card className="mt-6">
          <p>
            <strong>Sent.</strong> {partner.displayName} will see it at the top of their home screen and on their icon badge.
          </p>
        </Card>
      )}
      {isAuthenticated && (
        <p className="mt-6">
          <LinkBtn href="/" variant="ghost">
            Back home
          </LinkBtn>
        </p>
      )}
      <p className="sh-muted mt-6">A personal safety plan (warning signs, what calms you, people to call, reasons to hold on) is planned for a later build phase and will live on this screen.</p>
    </div>
  );
}
