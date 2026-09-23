/**
 * What I know (The Hearth, 2026-09-23): the advice and lived experience Jen
 * carries that no one has asked for yet. Written by topic, kept ready. Private
 * by default; each entry can be shared with John when she chooses.
 */
export interface KnowTopic {
  key: string;
  name: string;
  prompt: string;
}

export const KNOW_TOPICS: KnowTopic[] = [
  { key: "body", name: "Living in a body that gets sick", prompt: "What you know now that you wish someone had told you at the start." },
  { key: "marriage", name: "Marriage", prompt: "What actually holds it together, from the inside." },
  { key: "faith", name: "God, without the religion", prompt: "What you've found to be true after the churchy version fell apart." },
  { key: "people", name: "People and their signals", prompt: "What you can see in people that took years to learn to see." },
  { key: "boundaries", name: "Boundaries and no", prompt: "What it cost, what it saved, how you'd teach it." },
  { key: "grief", name: "Loss and what comes after", prompt: "What grief taught you that you'd hand to someone in the first month." },
  { key: "brain", name: "An AuDHD brain", prompt: "The workarounds, the truths, the things that are not laziness." },
  { key: "money", name: "Money on not enough", prompt: "How you made it work, and what you'd do differently." },
  { key: "home", name: "Making a home", prompt: "What makes a place feel like a home, from someone who had to build one." },
  { key: "healing", name: "Healing from parents", prompt: "What you'd say to someone whose parents were there and not there." },
  { key: "younger", name: "To a younger woman", prompt: "If a twenty-year-old asked you one thing, what would you make sure she heard." },
  { key: "other", name: "Something else", prompt: "Whatever it is. Give it a title." },
];

export const KNOW_TOPIC_MAP: Record<string, KnowTopic> = Object.fromEntries(KNOW_TOPICS.map((t) => [t.key, t]));
