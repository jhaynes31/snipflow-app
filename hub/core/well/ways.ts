import type { Ref } from "./refs";

/**
 * The Ways of Jesus: his example organized by real life instead of by book.
 * What he did and said, not rules drawn from it. Claude's first draft; Jen
 * and John review every line.
 */
export interface Way {
  key: string;
  title: string;
  line: string;
  passages: { ref: Ref; note: string }[];
}

export const WAYS: Way[] = [
  { key: "home", title: "Managing a home", line: "Jesus lived in a house, ate at tables, and was not in a hurry.", passages: [
    { ref: { book: "luke", chapter: 10, from: 38, to: 42 }, note: "Martha's kitchen. He didn't say the work didn't matter; he said one thing mattered more." },
    { ref: { book: "john", chapter: 2, from: 1, to: 11 }, note: "A wedding runs out of wine, an embarrassment, and his first miracle is to quietly fix it." },
    { ref: { book: "mark", chapter: 6, from: 30, to: 44 }, note: "Five thousand hungry people. He organized them in groups, gave thanks, and there was enough." },
  ] },
  { key: "marriage", title: "Marriage and closeness", line: "Jesus took marriage seriously and took broken people in it seriously too.", passages: [
    { ref: { book: "john", chapter: 4, from: 16, to: 26 }, note: "Five husbands. He named the truth without shaming her, and kept talking." },
    { ref: { book: "matthew", chapter: 19, from: 3, to: 9 }, note: "Asked about divorce, he pointed back to the beginning: two becoming one, and hard hearts." },
    { ref: { book: "ephesians", chapter: 5, from: 21, to: 33 }, note: "Submit to one another. Love as Christ loved: he gave himself up. Written to both." },
  ] },
  { key: "hurt", title: "People who hurt you", line: "Jesus was betrayed, denied, mocked, and abandoned, and stayed himself.", passages: [
    { ref: { book: "luke", chapter: 23, from: 32, to: 34 }, note: "'Father, forgive them.' Said while it was happening, not after it was tidy." },
    { ref: { book: "john", chapter: 21, from: 15, to: 17 }, note: "He restored Peter without pretending the denial didn't happen." },
    { ref: { book: "matthew", chapter: 18, from: 15, to: 17 }, note: "Go and tell them, just between the two of you. Then bring others. A process, not a fuse." },
  ] },
  { key: "money", title: "Money", line: "Jesus talked about money more than almost anything, and never with panic.", passages: [
    { ref: { book: "matthew", chapter: 6, from: 19, to: 24 }, note: "Where your treasure is, there your heart will be. You can't serve two masters." },
    { ref: { book: "luke", chapter: 12, from: 13, to: 21 }, note: "The man with the bigger barns. Life is not measured by possessions." },
    { ref: { book: "mark", chapter: 12, from: 41, to: 44 }, note: "The widow's two coins. He noticed the smallest gift and called it the largest." },
  ] },
  { key: "rest", title: "Rest", line: "Jesus slept in a storm, withdrew from crowds, and said the Sabbath was made for people.", passages: [
    { ref: { book: "mark", chapter: 2, from: 23, to: 28 }, note: "The Sabbath was made for man, not man for the Sabbath. Rest is a gift, not a rule." },
    { ref: { book: "mark", chapter: 4, from: 35, to: 41 }, note: "Asleep on a cushion in the stern while the boat filled with water." },
    { ref: { book: "matthew", chapter: 11, from: 28, to: 30 }, note: "Come to me and I will give you rest. His yoke is easy." },
  ] },
  { key: "trouble", title: "Unexpected trouble", line: "Interruptions were most of Jesus' ministry.", passages: [
    { ref: { book: "mark", chapter: 5, from: 21, to: 43 }, note: "On the way to one emergency he stopped for another, and both were held." },
    { ref: { book: "john", chapter: 11, from: 1, to: 6 }, note: "He heard Lazarus was sick and stayed two more days. Delay was not absence." },
    { ref: { book: "luke", chapter: 22, from: 31, to: 32 }, note: "'Satan has asked to sift you. But I have prayed for you.' He saw the trouble coming and prayed first." },
  ] },
  { key: "anger", title: "Anger", line: "Jesus got angry at religion that crushed people, and never at people who were crushed.", passages: [
    { ref: { book: "mark", chapter: 3, from: 1, to: 6 }, note: "Angry and grieved at hard hearts that would rather a man stay unhealed than a rule be bent." },
    { ref: { book: "john", chapter: 2, from: 13, to: 17 }, note: "Tables turned in the temple. Zeal for his Father's house, for people being fleeced in it." },
    { ref: { book: "matthew", chapter: 23, from: 1, to: 4 }, note: "They tie up heavy loads and put them on people's shoulders and won't lift a finger." },
  ] },
  { key: "grief", title: "Grief", line: "Jesus wept, and called mourners blessed.", passages: [
    { ref: { book: "john", chapter: 11, from: 32, to: 36 }, note: "Jesus wept. Two words, and no rush to explain them." },
    { ref: { book: "luke", chapter: 19, from: 41, to: 42 }, note: "He wept over a city that would not be gathered." },
    { ref: { book: "matthew", chapter: 5, from: 4 }, note: "Blessed are those who mourn, for they will be comforted." },
  ] },
  { key: "misunderstood", title: "Being misunderstood", line: "His own family thought he was out of his mind. His closest friends missed the point for years.", passages: [
    { ref: { book: "mark", chapter: 3, from: 20, to: 21 }, note: "His family came to take charge of him, saying he was out of his mind." },
    { ref: { book: "john", chapter: 7, from: 1, to: 9 }, note: "His brothers didn't believe in him. He went to the feast quietly, on his own timing." },
    { ref: { book: "mark", chapter: 8, from: 31, to: 33 }, note: "Peter rebuked him. He answered plainly and kept going." },
  ] },
  { key: "wrong", title: "Being wrong, and saying so", line: "Jesus honored people who changed their minds and told the truth about themselves.", passages: [
    { ref: { book: "matthew", chapter: 21, from: 28, to: 32 }, note: "Two sons: one said no and then went; one said yes and didn't. Which did the father's will?" },
    { ref: { book: "luke", chapter: 18, from: 13, to: 14 }, note: "'God, have mercy on me, a sinner.' That one went home justified." },
    { ref: { book: "luke", chapter: 19, from: 8, to: 10 }, note: "Zacchaeus: 'I'll pay back four times.' Repentance with a plan." },
  ] },
  { key: "tired", title: "Being tired", line: "Jesus was tired, thirsty, and hungry, and did not pretend otherwise.", passages: [
    { ref: { book: "john", chapter: 4, from: 6 }, note: "Jesus, tired from the journey, sat down by the well. It was about noon." },
    { ref: { book: "matthew", chapter: 4, from: 1, to: 4 }, note: "Forty days without food. He was hungry. He answered temptation from that place." },
    { ref: { book: "mark", chapter: 6, from: 31 }, note: "So many were coming and going that they didn't even have a chance to eat." },
  ] },
  { key: "brain", title: "Jesus and a brain like yours", line: "The disciples were messy, literal, impulsive, forgetful, and anxious. He picked them on purpose.", passages: [
    { ref: { book: "mark", chapter: 8, from: 14, to: 21 }, note: "They forgot the bread. He asked, 'do you still not understand?' and kept them anyway." },
    { ref: { book: "matthew", chapter: 14, from: 28, to: 31 }, note: "Peter jumped out of a boat in a storm. Impulsive, and Jesus caught him." },
    { ref: { book: "john", chapter: 20, from: 24, to: 29 }, note: "Thomas needed to see and touch. Jesus came back for exactly that." },
    { ref: { book: "luke", chapter: 9, from: 46, to: 48 }, note: "They argued about who was greatest, right after he'd said he'd die. He put a child in front of them." },
    { ref: { book: "psalms", chapter: 139, from: 13, to: 16 }, note: "You knit me together. Fearfully and wonderfully made. This brain included." },
  ] },
];
