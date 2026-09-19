/**
 * Starter guidance from the Tend spec, "Love them well". Each set belongs
 * to the person it describes and is theirs to edit once seeded. Keys in
 * `kinds` match modules/tend/kinds.ts.
 */
export interface StarterGuidance {
  title: string;
  kinds: string[];
  do: string;
  say: string;
  skip: string;
}

export const STARTER: Record<"john" | "jen", StarterGuidance[]> = {
  john: [
    {
      title: "Stuck in a logic loop",
      kinds: ["loop"],
      do: "Sit with me and open Loop Breaker together.",
      say: "I'm not going to argue the whole thing. What's one piece you'd be willing to test?",
      skip: "Debating each point or counter-arguing.",
    },
    {
      title: "Can't start",
      kinds: ["cantStart"],
      do: "Offer to body-double, or do the first 2 minutes side by side.",
      say: "Want company for the first step?",
      skip: "Reminding me how long it's been.",
    },
    {
      title: "Overwhelmed by a project",
      kinds: ["overwhelmed"],
      do: "Open Project Thinker with me.",
      say: "Let's just find what done looks like.",
      skip: "Adding new ideas to the pile.",
    },
    {
      title: "Low on self-worth",
      kinds: ["shame", "low"],
      do: "Add a specific entry to my Evidence Bank and tell me.",
      say: "I noticed you ___. That mattered.",
      skip: "General praise I can argue with.",
    },
  ],
  jen: [
    {
      title: "Feeling rejected",
      kinds: ["rejected"],
      do: "Answer my Story Check question directly and warmly.",
      say: "I'm not upset with you. I'm here.",
      skip: "Going quiet or answering vaguely.",
    },
    {
      title: "In old pain",
      kinds: ["oldPain"],
      do: "Offer quiet presence and a calm voice.",
      say: "You're safe with me right now.",
      skip: "Reasoning me out of the feeling.",
    },
    {
      title: "In a tender week",
      kinds: [],
      do: "Take one task off my plate without being asked.",
      say: "I've got dinner tonight.",
      skip: "Big conversations or surprises.",
    },
    {
      title: "Asking for the same reassurance again",
      kinds: ["loop"],
      do: "Answer once, lovingly, then point me to Sit With It.",
      say: "I love you, and I trust you can sit with this.",
      skip: "Repeating the reassurance on loop.",
    },
    {
      title: "Revved up",
      kinds: ["wired"],
      do: "Stay calm and help me slow things down.",
      say: "Can we sleep on that one together?",
      skip: "Matching the energy or shaming it.",
    },
    {
      title: "Low or heavy",
      kinds: ["low", "shutDown"],
      do: "Offer the love I named in my manual.",
      say: "No need to talk. I'm just here.",
      skip: "Pep talks or fixing.",
    },
  ],
};
