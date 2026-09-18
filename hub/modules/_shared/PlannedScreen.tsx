"use client";

import { useHub } from "@/core/shell/HubContext";
import { LinkBtn } from "@/core/ui";
import type { ModuleManifest } from "@/core/modules/types";

/**
 * The screen a module shows before it is built. Plain and literal: it says
 * what the place will be and which build phase brings it, and nothing else.
 */
export function PlannedScreen({ manifest, phase }: { manifest: ModuleManifest; phase: number }) {
  const { profile } = useHub();
  const Icon = manifest.icon;
  return (
    <div className="sh-container sh-narrow sh-planned">
      <div className="sh-place-icon" style={{ background: manifest.theme.accent, color: manifest.theme.onAccent }}>
        <Icon size={32} aria-hidden />
      </div>
      <h1 className="sh-h1">{manifest.name}</h1>
      <p>{manifest.tagline}</p>
      <p className="sh-muted">
        {profile.displayName}, this place isn&apos;t built yet. It is planned for build phase {phase}. The tab is here so the
        village has its shape from the start.
      </p>
      <LinkBtn href="/" variant="secondary">
        Back home
      </LinkBtn>
    </div>
  );
}
