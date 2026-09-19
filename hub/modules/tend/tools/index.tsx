"use client";

import { Anchor } from "./Anchor";
import { EvidenceBank } from "./EvidenceBank";
import { GoodEnough } from "./GoodEnough";
import { GroundMe } from "./GroundMe";
import { LoopBreaker } from "./LoopBreaker";
import { ShameInterrupter } from "./ShameInterrupter";
import { ShutdownRecovery } from "./ShutdownRecovery";
import { SmallestStep } from "./SmallestStep";
import { StoryCheck } from "./StoryCheck";

/** Routes /tend/tools/<key>[/<id>] to a tool screen. */
export function ToolScreen({ toolKey, id }: { toolKey: string; id?: string }) {
  switch (toolKey) {
    case "groundMe":
      return <GroundMe />;
    case "shameInterrupter":
      return <ShameInterrupter />;
    case "goodEnough":
      return <GoodEnough />;
    case "smallestStep":
      return <SmallestStep />;
    case "shutdownRecovery":
      return <ShutdownRecovery />;
    case "anchor":
      return <Anchor />;
    case "loopBreaker":
      return <LoopBreaker loopId={id} />;
    case "storyCheck":
      return <StoryCheck />;
    case "evidenceBank":
      return <EvidenceBank />;
    default:
      return null;
  }
}
