"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, Field, Note } from "@/core/ui";
import { ToolFrame, useToolUse } from "./ToolFrame";

export function ShameInterrupter() {
  return (
    <ToolFrame toolKey="shameInterrupter">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { partner } = useHub();
  const { keep } = useToolUse();
  const evidence = useQuery(api.tend.evidence.threeAboutMe);
  const kept = useQuery(api.tend.tools.kept, { tool: "shameInterrupter", limit: 5 });
  const [voice, setVoice] = useState("");
  const [toPartner, setToPartner] = useState("");
  const [kinder, setKinder] = useState("");
  const [saved, setSaved] = useState(false);
  const name = partner?.displayName ?? "your partner";

  return (
    <div className="sh-stack">
      <Card>
        <Field label="What is the shame voice saying?" hint="Its exact words. Naming it is the first move.">
          <textarea className="sh-input sh-textarea" rows={2} value={voice} onChange={(e) => setVoice(e.target.value)} maxLength={500} />
        </Field>
      </Card>
      <Card>
        <Field label={`What would you say to ${name} if they did this?`} hint="You already know how to be kind. Borrow it.">
          <textarea className="sh-input sh-textarea" rows={2} value={toPartner} onChange={(e) => setToPartner(e.target.value)} maxLength={500} />
        </Field>
      </Card>
      <Card>
        <Field label="One kinder sentence that is also true" hint="This one you keep.">
          <input className="sh-input" value={kinder} onChange={(e) => setKinder(e.target.value)} maxLength={300} />
        </Field>
        <div className="sh-row mt-3">
          <Btn
            disabled={!kinder.trim()}
            onClick={() =>
              void keep({ voice: voice.trim() || undefined, toPartner: toPartner.trim() || undefined, kinder: kinder.trim() }).then(() => setSaved(true))
            }
          >
            Keep this sentence
          </Btn>
          {saved && <Note>Kept.</Note>}
        </div>
      </Card>
      {evidence && evidence.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Three things from your Evidence Bank</h2>
          <ul className="sh-list">
            {evidence.map((e) => (
              <li key={e._id}>
                {e.text}
                {e.showed && <span className="sh-muted"> · {e.showed}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {kept && kept.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Sentences you&apos;ve kept</h2>
          <ul className="sh-list">
            {kept.map((k) => (
              <li key={k._id}>{String((k.saved as { kinder?: string })?.kinder ?? "")}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
