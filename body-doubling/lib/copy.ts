/**
 * Member-facing words for the portal notices. The policy is here to protect
 * everyone's seats, never to shame anyone, so the copy stays warm.
 */
export type NoticeKind = "goals" | "gentleReminder" | "priorityPaused" | "waitlistPromoted" | "waitlistSkipped";

export function noticeCopy(kind: NoticeKind, session: string): { title: string; body: string; tone: "accent" | "good" | "warn" } {
  switch (kind) {
    case "goals":
      return {
        title: "Your goals form is ready ✍️",
        body: `What would feel good to get done in each block of ${session}? A sentence is plenty. Jen & John read these before the call.`,
        tone: "accent",
      };
    case "gentleReminder":
      return {
        title: "We missed you!",
        body: `We didn't see you at ${session} — no worries, life happens. A quick note on how seats work: spots are limited, so if plans change, canceling anytime before the start gives your hours back and passes the seat to someone on the waitlist.`,
        tone: "accent",
      };
    case "priorityPaused":
      return {
        title: "A small change to your waitlist spot",
        body: "It's been a couple of missed sessions lately, so for now your waitlist spot sits after everyone else's. You can still book any open seat, anytime. Whenever you're ready, reach out and Jen or John will reset it — no explanation needed.",
        tone: "warn",
      };
    case "waitlistPromoted":
      return {
        title: "A seat opened up — it's yours! 🎉",
        body: `You're in for ${session}. We used your hours for it. If you can't make it, cancel from here and it goes to the next person.`,
        tone: "good",
      };
    case "waitlistSkipped":
      return {
        title: "A seat opened up",
        body: `A seat opened at ${session}, but you didn't have enough hours for it just then. Add hours and you'll be first in line if another opens.`,
        tone: "warn",
      };
  }
}

export const NO_SHOW_POLICY =
  "Seats are limited, so we ask for a heads-up if you can't make it — cancel anytime before the start and your hours come right back. If a member misses a couple of sessions without canceling, their waitlist spot moves to the back for a while. That's it: no fees, no judgment. It just keeps seats open for folks who are waiting.";
