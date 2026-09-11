import { useState } from "react";
import type { TopicSelection } from "~/server/topics";
import type { ScriptResult } from "~/server/scriptGenerator";
import ScriptGenerator from "~/components/ScriptGenerator";
import BrollFinder from "~/components/BrollFinder";

/**
 * The B Roll tab: the script forge, then real footage for that script.
 * Topic, pain point, tone, and D&D flavor come from the hub like every tab.
 */
export default function BrollTab({
  selection,
  tone,
  dndThemed,
}: {
  selection: TopicSelection | null;
  tone: string;
  dndThemed: boolean;
}) {
  const [script, setScript] = useState<ScriptResult | null>(null);
  return (
    <div className="space-y-6">
      <ScriptGenerator selection={selection} tone={tone} dndThemed={dndThemed} onResult={setScript} showPlanner={false} />
      <BrollFinder script={script} />
    </div>
  );
}
