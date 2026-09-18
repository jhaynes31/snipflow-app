"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COPY } from "@/core/copy/strings";
import { useHub } from "@/core/shell/HubContext";
import { Btn, ErrorNote, LinkBtn, useAction } from "@/core/ui";

type Answer = "steady" | "tender" | "low";

/**
 * "How are you, really?" One idea per screen, at most three big choices.
 * A low answer offers gentle day mode and a heads-up; it never turns
 * anything on by itself.
 */
export default function CheckInPage() {
  const router = useRouter();
  const { gentle, partner } = useHub();
  const record = useMutation(api.checkIns.record);
  const setGentle = useMutation(api.gentleMode.set);
  const [step, setStep] = useState<"ask" | "low" | "done">("ask");
  const { busy, error, run } = useAction();

  async function answer(a: Answer, turnGentleOff = false) {
    const ok = await run(() => record({ answer: a, turnGentleOff }));
    if (ok === undefined) return;
    if (a === "low") setStep("low");
    else setStep("done");
  }

  if (step === "low") {
    return (
      <div className="sh-container sh-narrow sh-lowdemand">
        <h1 className="sh-h1">Thank you for saying so.</h1>
        <p>Would either of these help right now?</p>
        <ErrorNote error={error} />
        <div className="sh-stack">
          {!gentle && (
            <Btn
              big
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await setGentle({ on: true });
                  router.push("/");
                })
              }
            >
              Turn on a gentle day
            </Btn>
          )}
          {partner && (
            <LinkBtn href="/heads-up/new?preset=low" big variant="secondary">
              Send {partner.displayName} a heads-up
            </LinkBtn>
          )}
          <LinkBtn href="/" big variant="ghost">
            Neither. Just noting it.
          </LinkBtn>
        </div>
        <p className="sh-muted mt-6">
          <Link href="/help-now" className="sh-link">
            {COPY.needHelpNow}
          </Link>
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="sh-container sh-narrow sh-lowdemand">
        <h1 className="sh-h1">Noted.</h1>
        <p>That&apos;s the whole check-in.</p>
        <LinkBtn href="/" big>
          Back home
        </LinkBtn>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow sh-lowdemand">
      <h1 className="sh-h1">{COPY.checkInButton}</h1>
      <ErrorNote error={error} />
      <div className="sh-stack">
        {gentle ? (
          <Btn big disabled={busy} onClick={() => void answer("steady", true)}>
            Feeling steadier. Gentle day off.
          </Btn>
        ) : (
          <Btn big disabled={busy} onClick={() => void answer("steady")}>
            Steady
          </Btn>
        )}
        <Btn big variant="secondary" disabled={busy} onClick={() => void answer("tender")}>
          Tender
        </Btn>
        <Btn big variant="accent" disabled={busy} onClick={() => void answer("low")}>
          Low
        </Btn>
      </div>
      {gentle && (
        <p className="sh-muted mt-4">Gentle day stays on unless you choose &ldquo;feeling steadier.&rdquo;</p>
      )}
    </div>
  );
}
