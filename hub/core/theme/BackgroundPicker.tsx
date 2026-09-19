"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { ErrorNote, useAction } from "@/core/ui";
import { BACKGROUNDS, readBackground } from "./backgrounds";

/** A row of color swatches. Each person's pick is their own; the partner's screen never changes. */
export function BackgroundPicker() {
  const { profile } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { run, error } = useAction();
  const current = readBackground(profile.moduleSettings);
  const dark = profile.accessibility.theme === "dark";

  async function choose(key: string) {
    const hub = (profile.moduleSettings?.hub as Record<string, unknown> | undefined) ?? {};
    await run(() => setModuleSettings({ moduleId: "hub", settings: { ...hub, background: key } }));
  }

  return (
    <div>
      <div className="sh-swatches" role="radiogroup" aria-label="Background color">
        {BACKGROUNDS.map((b) => (
          <button
            key={b.key}
            type="button"
            role="radio"
            aria-checked={current === b.key}
            className="sh-swatch"
            style={{ "--swatch": dark ? b.dark : b.light } as React.CSSProperties}
            onClick={() => void choose(b.key)}
            title={b.name}
          >
            <span className="sh-swatch-dot" aria-hidden />
            <span className="sh-swatch-name">{b.name}</span>
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
    </div>
  );
}
