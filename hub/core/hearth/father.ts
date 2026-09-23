import type { Ref } from "../well/refs";

/**
 * The Father's chair (The Hearth, 2026-09-23). A father's voice for a daughter
 * who got the opposite: verbal abuse, especially about her body, her appearance
 * and her weight. Every line here is the reverse of that. Affirming, kind,
 * protective, proud of her, never about her weight, never a comment on her
 * body that she did not ask for. Claude's first draft; Jen edits what she wants.
 */
export interface DailyWord {
  ref?: Ref;
  line: string;
}

/** He'd say: one a day, never tied to yesterday. */
export const FATHER_WORDS: DailyWord[] = [
  { ref: { book: "psalms", chapter: 139, from: 13, to: 14 }, line: "Knit together. On purpose, by hand, with care. That is how you were made, and it's how I see you." },
  { line: "I'm proud of you. Not for what you got done today. Of you." },
  { line: "You don't have to earn a seat here. Sit down. It's yours." },
  { ref: { book: "zephaniah", chapter: 3, from: 17 }, line: "He sings over you. A father who is glad you exist and says so out loud. That's the voice I want you to hear when you think of a father." },
  { line: "Whatever they said about you, they were wrong. I'm not guessing. I know you." },
  { line: "You're strong, and I love that about you. You don't have to be strong with me." },
  { ref: { book: "isaiah", chapter: 43, from: 1 }, line: "'I have called you by name; you are mine.' Not 'you're mine when you behave.' Mine." },
  { line: "You carry a lot for a lot of people. Put some of it down here. I'll hold it while you rest." },
  { line: "You were a good kid. You were always a good kid. Nobody told you, so I'm telling you." },
  { line: "When someone treats you badly, I'm on your side. I don't need the whole story first." },
  { ref: { book: "luke", chapter: 15, from: 20 }, line: "The father in the story ran. That's the kind of father you're allowed to expect from God, and it's the kind I'm trying to be for you here." },
  { line: "Your wisdom is real. The people who don't want it are the ones losing out." },
  { line: "You can be tired today. I'm not going anywhere." },
  { ref: { book: "psalms", chapter: 27, from: 10 }, line: "'Though my father and mother forsake me, the Lord will take me in.' David wrote that. It's allowed to be true for you too." },
  { line: "I like who you are. Not who you could be. Who you are, right now, on a Tuesday." },
  { line: "You're allowed to take up space. In a room, in a conversation, in a life." },
  { ref: { book: "matthew", chapter: 3, from: 17 }, line: "'This is my beloved, in whom I am well pleased.' Said before the work started. That's the order." },
  { line: "Nobody gets to talk to you the way he did. Not him, not anyone, not you." },
  { line: "You did your best with what you had. That was always enough for me." },
  { ref: { book: "psalms", chapter: 103, from: 13 }, line: "'As a father has compassion on his children.' Compassion. Not inspection." },
  { line: "Go rest. The world will keep. I've got the watch." },
  { line: "You're not too much. You were never too much. They were too small." },
  { ref: { book: "john", chapter: 1, from: 12 }, line: "Daughter of God. Not a guest, not a project. A daughter, with the run of the house." },
  { line: "I'd pick you. Out of every daughter in the world, I'd pick you." },
];

/**
 * In his eyes. Her father used words about her body, her appearance and her
 * weight as weapons. This is the opposite: what a father should have said,
 * and says now. Never a comment on weight, never "you'd be pretty if". No
 * praise that depends on how she looks today. Her body is hers.
 */
export const IN_HIS_EYES: string[] = [
  "Your body is yours. Nobody gets a vote on it, and that includes me. I'm only here to say it's good.",
  "You were never the problem. A grown man talking to a girl like that was the problem.",
  "I don't look at you and see something to fix. I look at you and see my daughter.",
  "The number on a scale has never once told me who you are, and it never will.",
  "You get to eat. You get to enjoy it. That was never something to be ashamed of.",
  "Your face is the face I'd know in any crowd. That's what it is to me.",
  "Whatever your body is doing today, it's still carrying you through, and I'm grateful to it.",
  "You didn't have to be smaller to be loved. You don't have to be anything to be loved.",
  "The way you look in the mirror on a hard day is not the truth about you. His voice in there is not the truth either.",
  "I'm proud to be seen with you. Anywhere. Exactly as you are.",
  "A body that has been through what yours has and is still here deserves gentleness, not a lecture.",
  "If you want to change something about how you look, that's yours to choose, for your reasons. If you don't, that's yours too. Either way I'm on your side.",
  "You were a beautiful kid and you're a beautiful woman, and I mean the whole of you, not a measurement.",
  "When you wear what you like, you look like yourself. That's the best thing anyone can look like.",
  "Rest when you're tired. Eat when you're hungry. Move because it feels good. That's all I want for your body.",
  "Anyone who makes you feel small about your body doesn't get to be close to you. I'll stand at the door.",
  "The girl he yelled at was lovable. She's still in there. Tell her I said so.",
  "You don't owe anyone pretty. You don't owe anyone an explanation. You don't owe anyone a version of you that's easier to look at.",
];

export interface TeachCard {
  key: string;
  title: string;
  /** One line for the tile. */
  lead: string;
  body: string[];
}

/** What a father teaches a daughter. Practical, protective, plain. */
export const FATHER_TEACHES: TeachCard[] = [
  { key: "money", title: "Money, plainly", lead: "How to look at a bill without your stomach dropping.", body: [
    "Money is a tool, not a verdict. Being short on it says nothing about you.",
    "Once a week, look. Ten minutes, everything open, no fixing, just knowing. Not looking is what makes it scary.",
    "Three buckets before anything else: what keeps the lights on, what keeps you fed, what keeps you safe. Everything else waits its turn.",
    "Never sign in the moment. Anyone who won't let you take it home overnight is telling you something.",
    "An emergency fund isn't a luxury. Even a small one changes how you sleep. Twenty dollars a week is a start, and a start counts.",
  ] },
  { key: "cars", title: "Cars and repair shops", lead: "How not to get walked over at the counter.", body: [
    "Ask for it in writing before any work: what, why, how much. A good shop expects the question.",
    "'I'll think about it' is a complete sentence. Get a second quote for anything over a few hundred dollars.",
    "Ask to see the old part. Ask them to show you what's wrong on the car. If they won't, leave.",
    "Oil, tires, brakes, battery. Learn those four words and what they cost, and you'll know when a number is wrong.",
    "Keep a folder of every receipt in the glove box. It's proof, and it's also a history a good mechanic will thank you for.",
  ] },
  { key: "men", title: "Reading a man", lead: "What a father wants his daughter to know before she trusts one.", body: [
    "Watch how he treats people who can't do anything for him: waiters, his mother, a slow driver. That's who he is.",
    "Watch what he does with your no. A good man hears it the first time and doesn't punish you for it later.",
    "Words are cheap. Time and follow-through are not. Count what he does.",
    "A man who makes you feel small about your body, your mind or your money is not a man you keep close, whatever else he does right.",
    "You don't have to explain your gut. If something feels off, you're allowed to step back and find out why later.",
  ] },
  { key: "ground", title: "Standing your ground", lead: "How to hold a line without apologizing for having one.", body: [
    "Say it once, plainly. 'No.' 'That doesn't work for me.' 'I'm not discussing that.' Then stop talking. The silence is where they try to get you to fill it.",
    "You don't need a reason they'll accept. You need a reason you accept.",
    "If someone raises their voice, you're allowed to end the conversation. Walking away is not losing.",
    "Repeat yourself calmly instead of arguing new points. The broken record wins because it can't be baited.",
    "Standing your ground will cost you some people. Those were people who wanted a doormat. Let them go find one.",
  ] },
  { key: "negotiate", title: "Asking for what you're worth", lead: "Rent, pay, prices, favors.", body: [
    "Ask. Most people never do, and the answer to a question you don't ask is always no.",
    "Say the number and stop. Don't soften it, don't explain it, don't fill the silence.",
    "Know your walk-away before you sit down. If you don't have one, you're not negotiating, you're pleading.",
    "'Is that the best you can do?' is a full sentence and it works far more often than it should.",
    "Being liked is not the goal. Being fair to yourself is. You can do both, but if you have to choose, choose yourself.",
  ] },
  { key: "fix", title: "Fixing things around the house", lead: "The five things that are easier than they look.", body: [
    "Where the water shuts off. Find it today, before you need it. Usually under the sink and one main valve for the house.",
    "The breaker box. Flip each one and label it. A tripped breaker is not an emergency; it's a switch.",
    "A running toilet is almost always the flapper. Ten dollars and a video. You can do it.",
    "Pilot lights, filters, smoke alarm batteries: once a season. Put it on the calendar so it isn't a memory job.",
    "Anyone who tells you it's too complicated for you to understand is either wrong or selling something.",
  ] },
  { key: "safety", title: "Keeping yourself safe", lead: "The things a father checks, out loud, so you know he cares.", body: [
    "Tell someone where you're going and when you'll be back. Not because you're fragile. Because you're valuable.",
    "Keep gas above a quarter tank and a charger in the car. Small things that mean you're never stuck.",
    "You never owe a stranger politeness that costs you safety. Being rude is fine. Being unsafe isn't.",
    "If a place or a person feels wrong, leave. You don't need to be right about why.",
    "Doors locked, phone charged, one person who'd notice if you went quiet. That's the checklist. I'd be that person if I could.",
  ] },
  { key: "proud", title: "What I'm proud of", lead: "So you know exactly what a father sees.", body: [
    "You kept going. Through things that should have stopped you. That isn't nothing; it's the main thing.",
    "You built a whole home for looking after yourself and the man you love. Most people can't look after one of those.",
    "You tell the truth even when it costs you. That's rare, and it's what integrity actually is.",
    "You kept your softness. After all of it. Anyone can go hard; staying tender is the strong thing.",
    "You ask for help now. That took more courage than doing everything alone ever did.",
  ] },
];

/** A blessing from the Father's chair, written to be read aloud. Jen can edit it. */
export const FATHER_BLESSING: string[] = [
  "You are my daughter, and I am glad of it. Before you did one useful thing today, before you got out of bed, I was already glad.",
  "I bless your body: the one that carries you, the one that was spoken against. I say the opposite over it. It is good. It is yours. It has done nothing wrong.",
  "I bless your mind: sharp, quick, full of things you've learned the hard way. May the people who need your wisdom find you, and may you stop handing it to people who don't.",
  "I bless your strength, and I bless your softness, and I refuse to make you choose between them.",
  "I bless your no. May it come out of your mouth clean and unafraid. I bless your yes, so that it is only ever given freely.",
  "Where a father's voice should have been, and was cruel instead, I speak over that place: you were never the problem. You were a child. You were lovable. You still are.",
  "Go and be who you are. I'm in the chair by the fire. The door is open. You don't have to knock.",
];
