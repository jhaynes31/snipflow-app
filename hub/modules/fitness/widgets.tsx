"use client";

import Link from "next/link";
import { useHub } from "@/core/shell/HubContext";
import { sessionName, useHeartwoodToday } from "./heartwoodData";
import { personFromName, readFitnessSettings } from "./settings";

/** Heartwood's Today line on The Shire's home: only when a session is planned on this device. */
export function FitnessToday() {
  const { profile } = useHub();
  const who = readFitnessSettings(profile.moduleSettings).who ?? personFromName(profile.displayName);
  const hw = useHeartwoodToday(who);
  if (!hw?.next) return null;
  return (
    <Link href="/fitness" className="sh-card block no-underline">
      <strong>Heartwood:</strong> {sessionName(hw.next.templateId)}
      {hw.next.inProgress ? " is in progress." : " is planned today."}
    </Link>
  );
}
