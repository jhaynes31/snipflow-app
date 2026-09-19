import type { Ref } from "@/core/well/refs";

/**
 * The Father's Voice: one thing a day the Father says to a son, from
 * Scripture, plus one line in the mentor's voice. Three streams rotate,
 * because he is still getting to know him after growing up in religion.
 * Never tied to yesterday. Claude's first draft; John edits it if he wants.
 */
export type Stream = "whoHeIs" | "whoYouAre" | "promise";

export const STREAM_LABEL: Record<Stream, string> = {
  whoHeIs: "Who he actually is",
  whoYouAre: "Who he says you are",
  promise: "What he promises you",
};

export interface VoiceEntry {
  stream: Stream;
  ref: Ref;
  /** One line in the mentor's voice. Plain, direct, no "should". */
  line: string;
}

export const VOICE: VoiceEntry[] = [
  { stream: "whoYouAre", ref: { book: "matthew", chapter: 3, from: 16, to: 17 }, line: "Beloved son, well pleased. Said before one thing was done. That's the order, and it hasn't changed." },
  { stream: "whoHeIs", ref: { book: "luke", chapter: 15, from: 20 }, line: "He runs. Not waits with folded arms. Runs. Whatever you were taught about how he receives a man who comes back, this is the picture he gave." },
  { stream: "promise", ref: { book: "matthew", chapter: 28, from: 20 }, line: "'I am with you always.' Not when you're on form. Always. Including the days you're absent from yourself." },
  { stream: "whoYouAre", ref: { book: "romans", chapter: 8, from: 15, to: 16 }, line: "Not a slave who has to earn his place, a son who already has one. You can call him Abba. Fear is not the engine anymore." },
  { stream: "whoHeIs", ref: { book: "john", chapter: 1, from: 14 }, line: "Full of grace and truth. Both, all the way. Religion gave you one at a time. He doesn't." },
  { stream: "promise", ref: { book: "romans", chapter: 8, from: 1 }, line: "No condemnation. None. If the voice in your head is condemning you, it isn't his." },
  { stream: "whoYouAre", ref: { book: "psalms", chapter: 139, from: 13, to: 14 }, line: "Knit together on purpose. This brain, this loyalty, this water-loving, story-loving man. Fearfully and wonderfully made is his verdict, not yours." },
  { stream: "whoHeIs", ref: { book: "mark", chapter: 4, from: 38, to: 39 }, line: "He sleeps in storms. He's not anxious about your life. That calm is available." },
  { stream: "promise", ref: { book: "philippians", chapter: 1, from: 6 }, line: "He started something in you and he finishes what he starts. Even when you don't. Especially then." },
  { stream: "whoYouAre", ref: { book: "1-john", chapter: 3, from: 1 }, line: "'See what great love the Father has lavished on us, that we should be called children of God.' And that is what you are. Not what you're working toward." },
  { stream: "whoHeIs", ref: { book: "john", chapter: 21, from: 12, to: 13 }, line: "After the failure, breakfast. He cooked for the men who'd run. That's who he is the morning after." },
  { stream: "promise", ref: { book: "isaiah", chapter: 41, from: 10 }, line: "'Do not fear, for I am with you. I will strengthen you and help you.' Strength you don't have to produce." },
  { stream: "whoYouAre", ref: { book: "ephesians", chapter: 2, from: 10 }, line: "His workmanship. The word is closer to 'poem' or 'masterpiece.' Made to do good work he already prepared, not to prove anything." },
  { stream: "whoHeIs", ref: { book: "hebrews", chapter: 4, from: 15, to: 16 }, line: "He knows what tired, tempted, and afraid feel like from the inside. So come boldly, not carefully." },
  { stream: "promise", ref: { book: "matthew", chapter: 11, from: 28, to: 30 }, line: "Rest, from him, for the weary. Not after the work. In it." },
  { stream: "whoYouAre", ref: { book: "john", chapter: 15, from: 15 }, line: "'I no longer call you servants. I have called you friends.' Friend. He said it to men who'd get it wrong within hours." },
  { stream: "whoHeIs", ref: { book: "john", chapter: 8, from: 10, to: 11 }, line: "Everyone else held a stone. He didn't. 'Neither do I condemn you.' He is not the one condemning you." },
  { stream: "promise", ref: { book: "psalms", chapter: 23, from: 4 }, line: "'Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me.' Through, not around. With, not watching." },
  { stream: "whoYouAre", ref: { book: "1-peter", chapter: 2, from: 9 }, line: "Chosen. His own. Called out of darkness into light. That's your file, not the one your family kept." },
  { stream: "whoHeIs", ref: { book: "luke", chapter: 7, from: 13 }, line: "He saw the widow, his heart went out to her, and he said 'don't cry.' Then he did something. That's the sequence: sees, feels, acts." },
  { stream: "promise", ref: { book: "hebrews", chapter: 13, from: 5 }, line: "'Never will I leave you; never will I forsake you.' Said to men whose fathers had, too." },
  { stream: "whoYouAre", ref: { book: "2-corinthians", chapter: 5, from: 17 }, line: "A new creation. The old has passed. You are not the sum of what was done to you." },
  { stream: "whoHeIs", ref: { book: "1-kings", chapter: 19, from: 5, to: 8 }, line: "To a burnt-out man under a tree, he sent bread and sleep. Twice. Before any assignment. He's practical about exhaustion." },
  { stream: "promise", ref: { book: "james", chapter: 1, from: 5 }, line: "Ask for wisdom and he gives generously, without finding fault. Without finding fault. Read that part again." },
  { stream: "whoYouAre", ref: { book: "galatians", chapter: 4, from: 6, to: 7 }, line: "'No longer a slave, but a son; and since you are a son, God has made you also an heir.' Heir. Not employee." },
  { stream: "whoHeIs", ref: { book: "matthew", chapter: 12, from: 20 }, line: "A bruised reed he will not break. A smoldering wick he will not snuff out. He's gentle with what's barely holding on." },
  { stream: "promise", ref: { book: "psalms", chapter: 34, from: 18 }, line: "Close to the brokenhearted. Not disappointed by them. Close." },
  { stream: "whoYouAre", ref: { book: "zephaniah", chapter: 3, from: 17 }, line: "He rejoices over you with singing. A father singing over a son. That's the actual text." },
  { stream: "whoHeIs", ref: { book: "john", chapter: 13, from: 3, to: 5 }, line: "Knowing he had all authority, he picked up a towel. Power, in his hands, looks like washing feet." },
  { stream: "promise", ref: { book: "2-timothy", chapter: 2, from: 13 }, line: "'If we are faithless, He remains faithful.' Your inconsistency does not change his." },
];
