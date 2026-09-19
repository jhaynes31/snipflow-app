import type { Ref } from "@/core/well/refs";

/**
 * Getting to know him: one story of Jesus at a time, for a man learning
 * relationship instead of religion. No order he has to keep. Pick up
 * anywhere. Claude's first draft.
 */
export interface KnowingEntry {
  key: string;
  title: string;
  ref: Ref;
  shows: string;
  toYou: string;
}

export const KNOWING: KnowingEntry[] = [
  { key: "well", title: "The woman at the well", ref: { book: "john", chapter: 4, from: 7, to: 26 }, shows: "He starts conversations with people religion avoids, and he doesn't flinch at the truth of someone's life.", toYou: "You don't have to clean up before you talk to me. Bring the actual story." },
  { key: "storm", title: "Asleep in the storm", ref: { book: "mark", chapter: 4, from: 35, to: 41 }, shows: "He's not anxious. He can be woken. He answers panic with power and then a question.", toYou: "Wake me. That's allowed. Then let's talk about the fear." },
  { key: "breakfast", title: "Breakfast on the beach", ref: { book: "john", chapter: 21, from: 1, to: 14 }, shows: "After his friends failed him, he made them breakfast. No lecture first.", toYou: "Come eat. We'll talk about the rest after." },
  { key: "peter", title: "Do you love me?", ref: { book: "john", chapter: 21, from: 15, to: 19 }, shows: "He restores a man exactly at the place of his failure, and gives him the job back.", toYou: "Your failure is not the end of your assignment. It's where I meet you." },
  { key: "children", title: "Let the children come", ref: { book: "mark", chapter: 10, from: 13, to: 16 }, shows: "He gets indignant when small ones are shooed away, and takes them in his arms.", toYou: "The boy in you is welcome here. I'm not sending him away." },
  { key: "tired", title: "Tired at noon", ref: { book: "john", chapter: 4, from: 6 }, shows: "He got tired and sat down. He didn't push through and pretend.", toYou: "Sit down. I did." },
  { key: "wept", title: "Jesus wept", ref: { book: "john", chapter: 11, from: 32, to: 36 }, shows: "He cried in public at a friend's grave, knowing what he was about to do.", toYou: "Crying is not weakness. I did it in front of everyone." },
  { key: "tables", title: "Turning the tables", ref: { book: "john", chapter: 2, from: 13, to: 17 }, shows: "He got angry, on purpose, at religion that fleeced people. Anger has a place.", toYou: "Some things are worth being angry about. Let's find out which ones are yours." },
  { key: "leper", title: "I am willing", ref: { book: "matthew", chapter: 8, from: 1, to: 4 }, shows: "A man said 'if you're willing.' He touched him and said 'I am willing.'", toYou: "I'm willing. Stop asking whether I am and ask for the thing." },
  { key: "thomas", title: "Thomas gets his proof", ref: { book: "john", chapter: 20, from: 24, to: 29 }, shows: "He came back a week later specifically for the one who doubted, and offered his hands.", toYou: "Doubt out loud. I come back for that." },
  { key: "garden", title: "Not my will", ref: { book: "luke", chapter: 22, from: 39, to: 46 }, shows: "He asked for another way, honestly, with sweat like blood. Then he trusted anyway.", toYou: "Ask for the other way. Say it all. Then we'll walk." },
  { key: "zacchaeus", title: "Come down, I'm coming over", ref: { book: "luke", chapter: 19, from: 1, to: 10 }, shows: "He looked up into a tree, called a hiding man by name, and invited himself to dinner.", toYou: "I see you up there. Come down. I'd like to come to your house." },
  { key: "feet", title: "The towel", ref: { book: "john", chapter: 13, from: 1, to: 17 }, shows: "With all authority in his hands, he washed feet, including the feet of the man about to betray him.", toYou: "This is what I do with power. Watch, then do it." },
  { key: "sabbath", title: "Made for man", ref: { book: "mark", chapter: 2, from: 23, to: 28 }, shows: "He broke religious rules to feed and heal people, and said the rule was made for them, not them for the rule.", toYou: "The rules you grew up under were not mine. Rest was made for you." },
  { key: "father", title: "The father who runs", ref: { book: "luke", chapter: 15, from: 11, to: 32 }, shows: "This is the story he told to explain the Father. The father runs, interrupts the apology, throws a party.", toYou: "This is what my Father is like. And I'm the one who told you." },
  { key: "cross", title: "Father, forgive them", ref: { book: "luke", chapter: 23, from: 32, to: 43 }, shows: "While it was happening, he forgave the men doing it, and promised paradise to a criminal beside him.", toYou: "There's nothing you've done that this doesn't cover." },
];
