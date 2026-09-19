"use client";

import { Anchor } from "./Anchor";
import { EvidenceBank } from "./EvidenceBank";
import { FocusMode } from "./FocusMode";
import { PauseBigMoves } from "./PauseBigMoves";
import { ProjectThinker } from "./ProjectThinker";
import { SitWithIt } from "./SitWithIt";
import { ThenOrNow } from "./ThenOrNow";
import { GoodEnough } from "./GoodEnough";
import { GroundMe } from "./GroundMe";
import { LoopBreaker } from "./LoopBreaker";
import { ShameInterrupter } from "./ShameInterrupter";
import { ShutdownRecovery } from "./ShutdownRecovery";
import { SmallestStep } from "./SmallestStep";
import { StoryCheck } from "./StoryCheck";
import { TalkItOut } from "./TalkItOut";

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
    case "projectThinker":
      return <ProjectThinker projectId={id} />;
    case "focusMode":
      return <FocusMode />;
    case "thenOrNow":
      return <ThenOrNow />;
    case "sitWithIt":
      return <SitWithIt />;
    case "pauseBigMoves":
      return <PauseBigMoves />;
    case "talkItOut":
      return <TalkItOut conversationId={id} />;
    default:
      return null;
  }
}
