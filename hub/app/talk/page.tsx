"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CoachChat } from "@/core/coach/CoachChat";
import { MODULE_NAMES } from "@/core/modules/names";
import { useHub } from "@/core/shell/HubContext";
import { PageTitle, Spinner } from "@/core/ui";

/**
 * Talk it through: the coach from anywhere. `?place=<module id>` tells it
 * where the person is, so it speaks in that place's terms and can hand
 * them a tool with an Open button. In Metamorphosis it is the mentor; in
 * Re-Centered it knows the room's tools; elsewhere it is the plain coach.
 */
export default function TalkPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Talk />
    </Suspense>
  );
}

function Talk() {
  const params = useSearchParams();
  const place = params.get("place") ?? "hub";
  const { profile } = useHub();
  const mm = useQuery(api.rooms.status, { moduleId: "metamorphosis" });
  const hh = useQuery(api.rooms.status, { moduleId: "hearth" });
  if (place === "metamorphosis" && !mm) return <Spinner />;
  if (place === "hearth" && !hh) return <Spinner />;

  let convoModule = "hub";
  let task = "hub.talk";
  let title = "Talk it through";
  let subtitle = "Say what's going on, in your own words. The coach knows every tool in The Shire and can open one for you.";
  if (place === "tend") {
    convoModule = "tend";
    task = "tend.talkItOut";
  } else if (place === "love-and-release") {
    convoModule = "re-centered";
    task = "reCentered.talk";
    subtitle = "In Re-Centered. The coach knows whose-is-this, the pause before rescuing, the fawn alarm, and the rest, and can open one for you.";
  } else if (place === "apothecary") {
    convoModule = "apothecary";
    task = "apothecary.ask";
    subtitle = "In The Apothecary. Describe what's going on in your body; the answer comes in six parts, and says 'a person, today' only when it's true.";
  } else if (place === "orchard") {
    convoModule = "orchard";
    task = "orchard.compass";
    subtitle = "In The Orchard. The coach knows the slow-trust rule and can help you sort what they've shown from the story.";
  } else if (place === "hearth" && hh?.state === "mine") {
    convoModule = "hearth";
    task = "hearth.mother";
    title = "At the table";
    subtitle = "The Hearth. The mother's voice, with the whole Shire's tools in reach.";
  } else if (place === "metamorphosis" && mm?.state === "mine") {
    convoModule = "metamorphosis";
    task = "metamorphosis.mentor";
    title = "The mentor";
    subtitle = "Your room. Say it plainly; he'll say it back plainly.";
  }
  const placeName = MODULE_NAMES[place] ?? null;
  const opening = placeName && convoModule === "hub" ? `I'm in ${placeName} right now.` : undefined;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={title} subtitle={subtitle} />
      <CoachChat module={convoModule} task={task} opening={opening} placeholder={`Ask in your own words, ${profile.displayName.split(" ")[0]}.`} />
      <p className="sh-muted" style={{ marginTop: "0.8rem" }}>
        Private to you. Earlier conversations are in <Link href="/tend/tools/talkItOut" className="sh-link">Talk It Out</Link> and can be deleted there.
      </p>
    </div>
  );
}
