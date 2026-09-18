"use client";

import type { CSSProperties } from "react";
import { moduleById } from "@/core/modules/registry";
import { useHub } from "./HubContext";
import { LinkBtn } from "@/core/ui";

/**
 * Wraps a module's screen with its own accent inside the village frame and
 * respects the person's on/off choice for that module.
 */
export function ModuleFrame({ moduleId, path }: { moduleId: string; path: string[] }) {
  const { profile } = useHub();
  const manifest = moduleById(moduleId);
  if (!manifest) return null;
  if (profile.modules.disabled.includes(manifest.id)) {
    return (
      <div className="sh-container sh-narrow sh-planned">
        <h1 className="sh-h1">{manifest.name} is turned off.</h1>
        <p className="sh-muted">You can turn it back on in Settings.</p>
        <LinkBtn href="/settings" variant="secondary">
          Open Settings
        </LinkBtn>
      </div>
    );
  }
  const t = manifest.theme;
  const style = {
    "--module-accent": t.accent,
    "--module-on-accent": t.onAccent,
    "--module-tint": t.tint ?? "transparent",
    "--module-accent-dark": t.dark?.accent ?? t.accent,
    "--module-on-accent-dark": t.dark?.onAccent ?? t.onAccent,
    "--module-tint-dark": t.dark?.tint ?? t.tint ?? "transparent",
  } as CSSProperties;
  const Screen = manifest.Screen;
  return (
    <div className="sh-module" style={style} data-module={manifest.id}>
      <Screen path={path} />
    </div>
  );
}
