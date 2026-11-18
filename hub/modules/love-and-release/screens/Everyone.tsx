"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmbeddedApp } from "@/core/embed/EmbeddedApp";
import { personFromName } from "@/core/person";
import { useHub } from "@/core/shell/HubContext";
import { Spinner } from "@/core/ui";
import { LOVE_AND_RELEASE_APP_PATH, LOVE_AND_RELEASE_FRAME_PATH, readLoveAndReleaseSettings } from "../settings";

/**
 * "Everyone, and me", framed under the toolbar (Jen, 2026-11-18). The app
 * itself is unchanged and keeps its data on the device; this page only
 * says who is here and keeps the address in step with the app's screen.
 */
export function Everyone({ path }: { path: string[] }) {
  const { profile } = useHub();
  const router = useRouter();
  const who = readLoveAndReleaseSettings(profile.moduleSettings).who ?? personFromName(profile.displayName);
  useEffect(() => {
    if (!who) router.replace("/love-and-release");
  }, [who, router]);
  if (!who) return <Spinner />;
  return <EmbeddedApp app="love-and-release" appPath={LOVE_AND_RELEASE_APP_PATH} outerPath={LOVE_AND_RELEASE_FRAME_PATH} inner={path} params={{ who }} title="Everyone, and me" />;
}
