"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readTendSettings } from "@/convex/tend/pure";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, useAction } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

/**
 * Pause Before Big Moves: set your own rule on a steady day. When a
 * check-in reads revved up, the rule is shown back to you in your words.
 */
export function PauseBigMoves() {
  return (
    <ToolFrame toolKey="pauseBigMoves">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { profile } = useHub();
  const settings = readTendSettings(profile.moduleSettings);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const [rule, setRule] = useState(settings.pauseRule ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <Card>
      <p className="sh-muted">Write this on a steady day, in your own words. Tend shows it back to you when your energy reads revved up.</p>
      <Field label="My rule" hint="For example: I wait 24 hours before big purchases, commitments, or major decisions.">
        <textarea className="sh-input sh-textarea" rows={3} value={rule} onChange={(e) => setRule(e.target.value)} maxLength={400} />
      </Field>
      <ErrorNote error={error} />
      <div className="sh-row">
        <Btn disabled={busy} onClick={() => void run(async () => { await setModuleSettings({ moduleId: "tend", settings: { ...settings, pauseRule: rule.trim() || undefined } }); setSaved(true); setTimeout(() => setSaved(false), 1800); })}>
          Save my rule
        </Btn>
        {saved && <Note>Saved.</Note>}
      </div>
      {settings.pauseRule && <p className="sh-quote mt-4">{settings.pauseRule}</p>}
    </Card>
  );
}
