"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COPY } from "@/core/copy/strings";
import { SafetyPlan } from "@/core/safety/SafetyPlan";
import { UrgentHeadsUp } from "@/core/safety/UrgentHeadsUp";
import { Card, LinkBtn } from "@/core/ui";

/**
 * Reachable from the profile menu on every screen, and without signing in.
 * Plain, large, and short. The one-tap urgent heads-up needs a signed-in
 * person with a partner; the numbers never do.
 */
export default function HelpNowPage() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
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

      {partner && (
        <Card className="mt-6">
          <UrgentHeadsUp />
        </Card>
      )}
      {me?.setUp && <SafetyPlan partnerName={partner?.displayName ?? null} />}
      {isAuthenticated && (
        <p className="mt-6">
          <LinkBtn href="/" variant="ghost">
            Back home
          </LinkBtn>
        </p>
      )}
      {!isAuthenticated && <p className="sh-muted mt-6">Sign in to see your safety plan here.</p>}
    </div>
  );
}
