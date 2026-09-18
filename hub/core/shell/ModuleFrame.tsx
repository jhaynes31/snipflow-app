"use client";

import type { CSSProperties } from "react";
import { moduleById } from "@/core/modules/registry";

/** Wraps a module's screen with its own accent inside the village frame. */
export function ModuleFrame({ moduleId, path }: { moduleId: string; path: string[] }) {
  const manifest = moduleById(moduleId);
  if (!manifest) return null;
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
