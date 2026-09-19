import type { Ref } from "./refs";

/**
 * For me: passages and plain notes for the path a person chooses for
 * themselves (as a man and husband, or as a woman and wife). Chosen, never
 * assumed. Written for two people who have heard these passages used as
 * weapons, so every section includes what the text actually says and how it
 * has been misused. Claude's first draft; Jen and John review every line.
 */
export type PathKey = "man" | "woman";

export interface PathSection {
  title: string;
  line: string;
  passages: { ref: Ref; note: string }[];
}

export interface Path {
  key: PathKey;
  title: string;
  tagline: string;
  sections: PathSection[];
}

export const PATHS: Path[] = [
  {
    key: "man",
    title: "As a man, and a husband",
    tagline: "Before Jesus did anything, the Father called him beloved. Sonship comes first; the rest grows out of it.",
    sections: [
      {
        title: "God's heart for you",
        line: "Not performance. A son, loved before he has done a thing.",
        passages: [
          { ref: { book: "matthew", chapter: 3, from: 16, to: 17 }, note: "'This is My beloved Son, in whom I am well pleased.' Said before a single miracle, sermon, or follow-through. That is the order." },
          { ref: { book: "romans", chapter: 8, from: 14, to: 17 }, note: "Not a spirit of slavery that falls back into fear, but the Spirit of sonship. You can call him Abba. Fear is not the engine." },
          { ref: { book: "luke", chapter: 15, from: 20, to: 24 }, note: "The father ran to a son who had wasted everything. He interrupted the speech. He put a robe on him. That is how God receives a man who comes back." },
          { ref: { book: "1-kings", chapter: 19, from: 3, to: 8 }, note: "Elijah, burnt out under a tree, asked to die. God sent food and sleep, twice, before saying a word about the work. Rest first is God's idea." },
        ],
      },
      {
        title: "Men Jesus and the Father called",
        line: "Not the polished ones. The ones who showed up, fell, and came back.",
        passages: [
          { ref: { book: "matthew", chapter: 1, from: 18, to: 25 }, note: "Joseph: a man who did the quiet, hard, faithful thing without a speech. He woke up and did what he was told. That is most of what husbands are asked for." },
          { ref: { book: "ruth", chapter: 3, from: 10, to: 18 }, note: "Boaz. 'The man will not rest until he has settled the matter today.' Someone could count on his word by the end of the day. Read that with Kept Word open." },
          { ref: { book: "nehemiah", chapter: 2, from: 11, to: 18 }, note: "Nehemiah looked at the broken wall at night, made a plan, and said 'let us rebuild.' Grief, then a plan, then follow-through." },
          { ref: { book: "john", chapter: 21, from: 15, to: 19 }, note: "Peter, after failing publicly three times, was asked three times 'do you love me?' and told 'feed my sheep.' Failure did not end the assignment." },
          { ref: { book: "psalms", chapter: 51, from: 1, to: 12 }, note: "David after the worst thing he ever did. No excuses, no hiding. 'Create in me a clean heart.' Honesty is the manly thing here." },
        ],
      },
      {
        title: "As a husband",
        line: "The whole instruction to husbands is Jesus: give yourself, understand her, don't be harsh.",
        passages: [
          { ref: { book: "ephesians", chapter: 5, from: 25, to: 29 }, note: "'Love your wives, just as Christ loved the church and gave Himself up for her.' The husband's verses are about giving, washing, nourishing. Not being in charge." },
          { ref: { book: "1-peter", chapter: 3, from: 7 }, note: "Live with her 'with understanding' and 'honor.' Peter adds that a husband who doesn't will find his prayers hindered. God takes how she is treated personally." },
          { ref: { book: "colossians", chapter: 3, from: 19 }, note: "'Love your wives and do not be harsh with them.' One line. Harshness includes the harshness of not showing up." },
          { ref: { book: "matthew", chapter: 5, from: 33, to: 37 }, note: "'Let your Yes be Yes.' Jesus on promises: say less, mean it. Kept Word is built on this verse." },
          { ref: { book: "mark", chapter: 10, from: 42, to: 45 }, note: "Greatness in his kingdom is serving. He came to serve. A husband who serves is doing the most Jesus-like thing available to him." },
          { ref: { book: "john", chapter: 13, from: 12, to: 17 }, note: "He washed feet, then said 'do as I have done.' Washing dishes is in the same family." },
        ],
      },
      {
        title: "When this has been used against you",
        line: "Headship has been preached as control, and manhood as never being tired or wrong. Neither is in the text.",
        passages: [
          { ref: { book: "ephesians", chapter: 5, from: 21 }, note: "The section on marriage opens with 'submit to one another.' Verse 21 is the heading over everything after it. Leaving it out changed the meaning." },
          { ref: { book: "matthew", chapter: 20, from: 25, to: 28 }, note: "'The rulers of the Gentiles lord it over them. It shall not be this way among you.' Any teaching that makes a husband a ruler runs into this." },
          { ref: { book: "matthew", chapter: 26, from: 36, to: 39 }, note: "Jesus, 'deeply grieved, to the point of death,' asked friends to stay with him and asked the Father for another way. Strength includes this." },
          { ref: { book: "2-corinthians", chapter: 12, from: 9, to: 10 }, note: "'My power is perfected in weakness.' A man who admits weakness is not failing at manhood. He is where the power is." },
        ],
      },
    ],
  },
  {
    key: "woman",
    title: "As a woman, and a wife",
    tagline: "God's first word about you is that you carry his image. Everything Jesus did with women confirms it.",
    sections: [
      {
        title: "God's heart for you",
        line: "Made in his image. Called daughter. Sung over.",
        passages: [
          { ref: { book: "genesis", chapter: 1, from: 26, to: 27 }, note: "'Male and female He created them,' in his image. The image of God is not carried by men and passed along. It is yours directly." },
          { ref: { book: "genesis", chapter: 2, from: 18 }, note: "'Helper' here is the Hebrew word ezer. It is used of God himself in the Psalms: 'my help comes from the LORD.' It never means assistant." },
          { ref: { book: "psalms", chapter: 121, from: 1, to: 2 }, note: "Here is that same word, ezer, for God. Whatever 'helper' has been made to mean, this is the company the word keeps." },
          { ref: { book: "isaiah", chapter: 49, from: 15, to: 16 }, note: "'Can a woman forget her nursing child? Even if she could, I will not forget you.' God compares his love to a mother's and says his is more sure." },
          { ref: { book: "zephaniah", chapter: 3, from: 17 }, note: "'He will rejoice over you with singing.' Not tolerate. Not put up with. Sing." },
          { ref: { book: "matthew", chapter: 23, from: 37 }, note: "Jesus describes himself as a hen gathering her chicks under her wings. He reached for a mother's image to say what he wanted for a city." },
        ],
      },
      {
        title: "Women Jesus met",
        line: "He taught them, defended them, healed them, and sent them. First.",
        passages: [
          { ref: { book: "luke", chapter: 10, from: 38, to: 42 }, note: "Mary sat at Jesus' feet, which is where a rabbi's students sat. Jesus said she had chosen what was better and it would not be taken from her. A woman as a disciple, defended." },
          { ref: { book: "john", chapter: 4, from: 25, to: 30 }, note: "He told a woman with five husbands, plainly, that he was the Messiah. She went and told a town. The first person to bring a whole town to Jesus was her." },
          { ref: { book: "john", chapter: 20, from: 11, to: 18 }, note: "The risen Jesus showed himself first to Mary Magdalene and sent her to tell the men. The first witness of the resurrection was a woman, on purpose." },
          { ref: { book: "mark", chapter: 5, from: 30, to: 34 }, note: "He stopped everything to find the woman who touched his cloak, so he could call her 'daughter' in front of everyone who thought she was unclean." },
          { ref: { book: "luke", chapter: 13, from: 15, to: 16 }, note: "'This woman, a daughter of Abraham.' No one else in the Gospels is called that. He gave her the family name in the synagogue that had ignored her." },
          { ref: { book: "matthew", chapter: 15, from: 22, to: 28 }, note: "The Canaanite woman argued with Jesus and won. 'Woman, you have great faith.' Persistence with him is not disrespect." },
          { ref: { book: "luke", chapter: 8, from: 1, to: 3 }, note: "Women funded Jesus' ministry out of their own means and traveled with him. They were not in the background." },
          { ref: { book: "1-samuel", chapter: 1, from: 9, to: 18 }, note: "Hannah prayed so honestly the priest thought she was drunk. God heard her; the priest was the one who was wrong." },
        ],
      },
      {
        title: "As a wife",
        line: "The wife Scripture praises has strength, initiative, and a voice. Loyalty is not the same as disappearing.",
        passages: [
          { ref: { book: "proverbs", chapter: 31, from: 10, to: 31 }, note: "The Hebrew calls her a woman of valor, the word used for warriors. She buys land, runs trade, speaks with wisdom, laughs at the future. It is a poem of praise, not a checklist." },
          { ref: { book: "ruth", chapter: 1, from: 16, to: 17 }, note: "'Where you go I will go.' Ruth's loyalty was her own choice and her own initiative; she did the asking in chapter 3. Loyal and bold at once." },
          { ref: { book: "ephesians", chapter: 5, from: 21, to: 33 }, note: "Read the whole thing, starting at 21: 'submit to one another.' The husband is told to give himself up. This is two people laying themselves down, not one." },
          { ref: { book: "1-peter", chapter: 3, from: 7 }, note: "Read the husband's verse too. He is to live with you with understanding and honor, or God will not hear his prayers. You are owed that, by God's word." },
          { ref: { book: "song-of-solomon", chapter: 2, from: 10, to: 13 }, note: "'Arise, my darling, my beautiful one, and come with me.' Desire and delight in marriage are God's idea, written into Scripture." },
          { ref: { book: "1-corinthians", chapter: 7, from: 3, to: 4 }, note: "Paul gives the husband and the wife the same claim on each other, in the same words. Mutual, in a culture that did not think so." },
        ],
      },
      {
        title: "When this has been used against you",
        line: "Submission has been preached as silence and endurance. The text says something else.",
        passages: [
          { ref: { book: "ephesians", chapter: 5, from: 21 }, note: "The heading over the whole marriage passage. 'Submit to one another.' Any teaching that skips verse 21 has changed the passage." },
          { ref: { book: "1-peter", chapter: 3, from: 1, to: 7 }, note: "Often quoted through verse 6 and stopped. Verse 7 turns to the husband: understanding, honor, or unanswered prayers. The passage was never one-sided." },
          { ref: { book: "acts", chapter: 18, from: 24, to: 26 }, note: "Priscilla, with her husband, took a famous preacher aside and taught him. Her name is usually listed first. A woman teaching a man, approved in Scripture." },
          { ref: { book: "romans", chapter: 16, from: 1, to: 7 }, note: "Phoebe, a deacon, carried this letter. Junia, 'outstanding among the apostles.' Paul's team was full of women he named with honor." },
          { ref: { book: "john", chapter: 8, from: 7, to: 11 }, note: "Men with stones, and a woman alone. Jesus sent the men away and did not shame her. That is his posture toward a woman being ganged up on." },
          { ref: { book: "malachi", chapter: 2, from: 14, to: 16 }, note: "God calls himself the witness to the covenant with 'the wife of your youth' and says he hates a man covering himself with violence toward her. He is on record." },
        ],
      },
    ],
  },
];

export function pathByKey(key: string | undefined): Path | undefined {
  return PATHS.find((p) => p.key === key);
}

/** Every passage in a path, flat, for the daily pick. */
export function pathPassages(path: Path): { ref: Ref; note: string; section: string }[] {
  return path.sections.flatMap((s) => s.passages.map((p) => ({ ...p, section: s.title })));
}

export function readWellPath(moduleSettings: Record<string, unknown> | undefined): PathKey | null {
  const raw = (moduleSettings?.well as { path?: unknown } | undefined)?.path;
  return raw === "man" || raw === "woman" ? raw : null;
}
