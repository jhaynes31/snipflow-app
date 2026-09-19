"use client";

import { useState } from "react";
import { useHub } from "@/core/shell/HubContext";
import { Btn, LinkBtn } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

const STEPS = [
  { key: "water", ask: "Water?" },
  { key: "food", ask: "Something to eat?" },
  { key: "rest", ask: "Lie down?" },
  { key: "quiet", ask: "Somewhere quiet?" },
] as const;

/** Ultra-low-demand: one question at a time, yes or no, big buttons. */
export function ShutdownRecovery() {
  const { partner } = useHub();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  return (
    <ToolFrame toolKey="shutdownRecovery">
      <div className="sh-lowdemand">
        {step ? (
          <>
            <h2 className="sh-h1">{step.ask}</h2>
            <div className="sh-stack">
              <Btn big onClick={() => setI(i + 1)}>Yes, I&apos;ll do that</Btn>
              <Btn big variant="secondary" onClick={() => setI(i + 1)}>Not now</Btn>
            </div>
          </>
        ) : (
          <>
            <h2 className="sh-h1">{partner ? `Tell ${partner.displayName}?` : "That's all."}</h2>
            <div className="sh-stack">
              {partner && (
                <LinkBtn href={`/heads-up/new?status=${encodeURIComponent("Shut down. Not much left today.")}&help=quietPresence&kinds=shutDown`} big>
                  Yes, send a heads-up
                </LinkBtn>
              )}
              <LinkBtn href="/" big variant="secondary">
                No. Just rest.
              </LinkBtn>
            </div>
          </>
        )}
      </div>
    </ToolFrame>
  );
}
