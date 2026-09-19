import type { Ref } from "./refs";

/**
 * Lies and truth: a lie paired with what Jesus says and does. Two groups.
 * Identity lies, and religious lies, which is the church-trauma part.
 * Starter cards; each person adds their own.
 */
export interface LieCard {
  key: string;
  group: "identity" | "religious";
  lie: string;
  truth: string;
  ref: Ref;
}

export const LIES: LieCard[] = [
  { key: "tooMuch", group: "identity", lie: "I'm too much.", truth: "He stopped a crowd for one bleeding woman and called her daughter. Too much was never his word for anyone.", ref: { book: "mark", chapter: 5, from: 30, to: 34 } },
  { key: "lazy", group: "identity", lie: "I'm lazy.", truth: "He told the exhausted to come and rest, and called Martha's frantic work the thing to set down. Tired is not lazy.", ref: { book: "matthew", chapter: 11, from: 28, to: 30 } },
  { key: "burden", group: "identity", lie: "I'm a burden.", truth: "He carried a lost sheep home on his shoulders, rejoicing. Being carried was the plan.", ref: { book: "luke", chapter: 15, from: 3, to: 7 } },
  { key: "disqualified", group: "identity", lie: "I've failed too many times.", truth: "Peter denied him three times and was given his job back three times, by name, over breakfast.", ref: { book: "john", chapter: 21, from: 15, to: 17 } },
  { key: "unlovable", group: "identity", lie: "If they really knew me, they'd leave.", truth: "He knew Judas would betray him and Peter would deny him and washed both their feet.", ref: { book: "john", chapter: 13, from: 1, to: 5 } },
  { key: "broken", group: "identity", lie: "My brain is broken.", truth: "Fearfully and wonderfully made. He chose the impulsive, the literal, and the forgetful, and built a church on them.", ref: { book: "psalms", chapter: 139, from: 13, to: 14 } },
  { key: "alone", group: "identity", lie: "I'm on my own with this.", truth: "'I am with you always, to the very end.' Not a feeling; a promise.", ref: { book: "matthew", chapter: 28, from: 20 } },
  { key: "worthless", group: "identity", lie: "I don't matter.", truth: "Not one sparrow falls without your Father knowing. The hairs on your head are counted.", ref: { book: "matthew", chapter: 10, from: 29, to: 31 } },
  { key: "disappointed", group: "religious", lie: "God is disappointed in me when I don't read or pray.", truth: "The father ran to the son who had been gone for a long time. He didn't ask how long.", ref: { book: "luke", chapter: 15, from: 20 } },
  { key: "earn", group: "religious", lie: "I have to earn it.", truth: "'By grace you have been saved, through faith, and this not from yourselves; it is the gift of God, not by works.'", ref: { book: "ephesians", chapter: 2, from: 8, to: 9 } },
  { key: "doubt", group: "religious", lie: "Doubt is disobedience.", truth: "'I believe; help my unbelief' got a healing, not a rebuke. Thomas got scarred hands held out.", ref: { book: "mark", chapter: 9, from: 23, to: 24 } },
  { key: "needs", group: "religious", lie: "My needs are selfish.", truth: "'What do you want me to do for you?' he asked a blind man. Then he did it.", ref: { book: "mark", chapter: 10, from: 51, to: 52 } },
  { key: "anger", group: "religious", lie: "I'm not allowed to be angry at God.", truth: "Habakkuk argued. Job argued. The Psalms argue. 'How long, O Lord?' is Scripture.", ref: { book: "psalms", chapter: 13, from: 1, to: 2 } },
  { key: "rules", group: "religious", lie: "Being good at religion is being close to God.", truth: "The tax collector who couldn't lift his eyes went home right with God. The expert didn't.", ref: { book: "luke", chapter: 18, from: 10, to: 14 } },
  { key: "rest", group: "religious", lie: "Rest has to be earned.", truth: "The Sabbath was made for people, not people for the Sabbath. Rest came before the work.", ref: { book: "mark", chapter: 2, from: 27 } },
  { key: "suffering", group: "religious", lie: "If I'm suffering, I did something wrong.", truth: "'Neither this man nor his parents sinned,' Jesus said about the man born blind, ending that math.", ref: { book: "john", chapter: 9, from: 1, to: 3 } },
  { key: "leaders", group: "religious", lie: "What the church said about me is what God says about me.", truth: "Jesus called the religious leaders of his day whitewashed tombs, and called the people they crushed blessed.", ref: { book: "matthew", chapter: 23, from: 13 } },
];
