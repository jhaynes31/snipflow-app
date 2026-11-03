"use client";

import { CoachChat } from "@/core/coach/CoachChat";
import { PageTitle } from "@/core/ui";

export function Talk() {
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Talk it through" subtitle="The coach knows the four styles, the early tells, and your fail safes. It steadies you first and believes you before it names anything." />
      <CoachChat module="rooted" task="rooted.talk" placeholder="What's happening, in your own words." />
    </div>
  );
}
