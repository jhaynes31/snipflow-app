"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, ErrorNote, useAction } from "@/core/ui";

/**
 * The one-tap urgent heads-up: "I'm not okay right now. Please come."
 * Self-contained so it works on the public "Need help now" screen and
 * inside any crisis card, with or without the hub context around it.
 */
export function UrgentHeadsUp({ compact }: { compact?: boolean }) {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const send = useMutation(api.headsUps.send);
  const { busy, error, run } = useAction();
  const [sent, setSent] = useState(false);
  const partner = me?.setUp ? me.partner : null;
  if (!partner) return null;
  if (sent) {
    return (
      <p>
        <strong>Sent.</strong> {partner.displayName} will see it at the top of their home screen and on their icon badge.
      </p>
    );
  }
  return (
    <div className="sh-stack-sm">
      {!compact && (
        <p>
          <strong>Tell {partner.displayName} with one tap.</strong> This sends an urgent heads-up that says you&apos;re not okay and asks them to come.
        </p>
      )}
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
    </div>
  );
}
