import type { Ref } from "@/core/well/refs";

/** Content for step 3. Plain, short, in the mentor's voice. Claude's first draft; John edits. */

export const NO_CONDEMNATION: { ref: Ref; note: string }[] = [
  { ref: { book: "romans", chapter: 8, from: 1, to: 2 }, note: "'There is now no condemnation for those who are in Christ Jesus.' Now. Not after you've fixed it. If the voice in your head is condemning you, it is not his." },
  { ref: { book: "john", chapter: 3, from: 17 }, note: "'God did not send His Son into the world to condemn the world, but to save the world through Him.' The purpose was never condemnation. Religion told you otherwise." },
  { ref: { book: "psalms", chapter: 103, from: 8, to: 14 }, note: "'He does not treat us as our sins deserve.' 'As far as the east is from the west.' 'He remembers that we are dust.' He knows what you're made of and is not surprised." },
  { ref: { book: "1-john", chapter: 3, from: 19, to: 20 }, note: "'Even if our hearts condemn us, God is greater than our hearts.' Your heart condemning you is anticipated in the text, and answered." },
  { ref: { book: "2-corinthians", chapter: 7, from: 10 }, note: "Godly sorrow brings repentance and leaves no regret; worldly sorrow brings death. Conviction turns you and lets you go. Shame crushes you and keeps you. Learn to tell them apart." },
  { ref: { book: "micah", chapter: 7, from: 18, to: 19 }, note: "'You will tread our sins underfoot and hurl all our iniquities into the depths of the sea.' A water man should like this one. Into the depths. Done." },
];

export const CONVICTION_VS_SHAME: { conviction: string; shame: string }[] = [
  { conviction: "Points at one specific thing you did.", shame: "Points at who you are." },
  { conviction: "Feels like clarity, even when it stings.", shame: "Feels like fog and weight." },
  { conviction: "Moves you toward people and toward God.", shame: "Moves you to hide, go quiet, go far away." },
  { conviction: "Ends when you turn.", shame: "Never ends. Keeps the receipts." },
  { conviction: "Says: come back.", shame: "Says: you were never welcome." },
];

export const ORIGINS: { title: string; body: string; ref?: Ref }[] = [
  { title: "You were a child.", body: "Whatever you carried in that house, you carried it as a boy. The golden child is still a child. Being the responsible one at ten is not a compliment; it's a job a child should not have had." },
  { title: "Being used is not being loved.", body: "A parent who needs a child to be a certain way for their own sake is using the child, even when it looks like praise. Love wants the child to be who he is. The praise you got for being useful was the price of not being seen.", ref: { book: "matthew", chapter: 23, from: 4 } },
  { title: "Survival was the right response.", body: "Zooming in, going quiet, reading the room, becoming what was needed: those kept you alive in that house. They were skills. They're just the wrong tools for a house where you're safe, and you're allowed to set them down slowly." },
  { title: "An absent father leaves a shape.", body: "The gap isn't your fault and it isn't a verdict on you. It's a shape, and shapes can be filled. Not by an app. By the Father, by men, and by you becoming, for your own family, what you didn't get.", ref: { book: "psalms", chapter: 27, from: 10 } },
  { title: "Loyalty is what you kept.", body: "You could have come out of that house cold. You came out loyal. That's not survival; that's you. Hold onto it and point it somewhere that deserves it." },
];

export const LETTER_PROMPTS: { key: string; title: string; prompt: string }[] = [
  { key: "dad", title: "To my father", prompt: "Say what you needed and didn't get. Say what you're angry about. Say what you'd have wanted him to see. He will never read it; that's the point." },
  { key: "mom", title: "To my mother", prompt: "Say what it cost to be what she needed. Say what you wanted instead. You don't owe this letter kindness or cruelty; you owe it honesty." },
  { key: "fifteen", title: "To myself at fifteen", prompt: "Tell him what you know now. Tell him what wasn't his job. Tell him he made it, and who he turned out to be." },
  { key: "son", title: "To the boy I'll be a father to", prompt: "Whether or not he exists yet. Tell him what you'll give him. This one is a promise; keep it small and true." },
];

export const PARTY_WHERE: string[] = [
  "A board-game shop's open night. You already speak the language.",
  "A D&D table, online or in person. Two to three hours a week with the same people is how friendship actually starts.",
  "A men's group at a church you'd actually go to. Go once. Decide after.",
  "A gym, a climbing wall, or a run club. Bodies side by side make talking easier.",
  "A class: woodworking, cooking, anything with your hands.",
  "The one guy you already like a little. He's the easiest door.",
];

export const PARTY_STEPS: { title: string; body: string }[] = [
  { title: "Show up twice.", body: "Once is a visit. Twice is a pattern. Most friendships start with the third time someone sees your face." },
  { title: "Start with the thing in front of you.", body: "'Have you played this before?' 'What are you running?' Never a speech. One question about the thing, not about them." },
  { title: "The one small ask.", body: "'Want to grab food after?' 'I'm playing Thursday, want in?' Small, specific, easy to say no to. Say it once and let it land." },
  { title: "Follow up without overthinking.", body: "One message within two days. 'Good game Thursday.' That's it. You do not need to draft it four times." },
  { title: "Be a friend back.", body: "Remember one thing they told you and ask about it next time. That's most of it." },
  { title: "When it fizzles.", body: "Most do. Nine out of ten. That's how it works for everyone, and it is not rejection. Keep the door open and go back to step one." },
];

export const MEN_IN_STORY: { name: string; ref?: Ref; line: string; source: "scripture" | "story" }[] = [
  { name: "Joseph", ref: { book: "matthew", chapter: 1, from: 18, to: 25 }, line: "Did the quiet, hard, faithful thing without a speech. Woke up and did what he was told.", source: "scripture" },
  { name: "Boaz", ref: { book: "ruth", chapter: 3, from: 10, to: 18 }, line: "'The man will not rest until he has settled the matter today.' Someone could count on his word by nightfall.", source: "scripture" },
  { name: "Nehemiah", ref: { book: "nehemiah", chapter: 2, from: 11, to: 18 }, line: "Looked at the broken wall at night, grieved, made a plan, and said 'let us rebuild.'", source: "scripture" },
  { name: "David", ref: { book: "psalms", chapter: 51, from: 1, to: 12 }, line: "After the worst thing he ever did: no excuses, no hiding. Honesty was the manly thing.", source: "scripture" },
  { name: "Peter", ref: { book: "john", chapter: 21, from: 15, to: 19 }, line: "Failed three times in public and got his job back three times over breakfast.", source: "scripture" },
  { name: "Paul and Timothy", ref: { book: "2-timothy", chapter: 1, from: 1, to: 7 }, line: "'My dear son.' An older man who claimed a younger one and told him God gave him power, love, and a sound mind.", source: "scripture" },
  { name: "Jesus", ref: { book: "mark", chapter: 14, from: 32, to: 36 }, line: "Tired, angry, grieving, and steady. Deeply distressed in a garden, and he still walked out of it.", source: "scripture" },
  { name: "Aragorn", line: "Did not want the crown. Took up the work anyway, one step ahead of the doubt, and became the king by doing the king's job before anyone called him one.", source: "story" },
  { name: "Sam", line: "Could not carry the ring. Carried his friend. Loyalty with legs.", source: "story" },
  { name: "Faramir", line: "Not his father's favorite. The better man anyway, and he knew it without needing his father to.", source: "story" },
  { name: "Théoden", line: "Sat in a fog for years while a voice told him he was old and done. Stood up, and led again.", source: "story" },
  { name: "Luke", line: "Had to face his father to become himself. Threw the weapon down and was still the one who won.", source: "story" },
];

export const HORIZON_PROMPTS: string[] = [
  "If this were a campaign, what's the story you'd want to be in?",
  "What would you build if no one was watching and no one would grade it?",
  "What did you love at ten? Where is it now?",
  "Describe a Saturday five years from now. Where are you, who's there, what's on the table?",
  "What's a thing you've never said out loud that you'd want?",
  "If the business worked, what does an ordinary Tuesday look like?",
  "What's a place near water you'd like to be, and who would you bring?",
  "What would you make with your hands if you had a free month?",
  "What's a game, story, or world you'd like to create, not just play?",
  "Who do you want to be at the table when you're sixty?",
];

export const SMALL_WAYS: { title: string; body: string }[] = [
  { title: "Decide something small without deferring.", body: "Dinner. The movie. The route. Say it in a sentence, no question mark at the end. 'Let's do tacos.' Small decisions are reps." },
  { title: "Notice what you need before you're empty.", body: "Set a check at 3pm: water, food, quiet, a break. Meet it then, not after you've snapped." },
  { title: "Make a meal you actually want.", body: "Not what's easy. What you'd order. Learn three you can cook without thinking." },
  { title: "Check on someone.", body: "One text, no reason. 'Thinking of you. How's the week?' Caring for people is a practice, not a personality." },
  { title: "Plan one thing for the family.", body: "An evening, a Saturday morning, a walk. You pick, you say, you do the prep. Nobody asked." },
  { title: "Rest on purpose.", body: "Choose the rest before you're wrecked. A shower, water, twenty minutes with a book. Chosen rest is different from collapse." },
  { title: "A simple weekly budget.", body: "Five lines: in, rent, bills, food, everything else. Ten minutes on Sunday. Fear of money shrinks when you look at it weekly." },
  { title: "Fix the small thing in the house.", body: "The loose handle, the dead bulb, the drip. One a week. Every one is a rep in 'I can handle what's mine.'" },
  { title: "Handle the bill you're scared of.", body: "Open it. Read it once. Call if you have to. The dread is bigger than the bill, every time." },
  { title: "Say what you want, plainly.", body: "'I'd like to go to the lake Saturday.' No apology, no hedge. Wanting out loud is a skill." },
];

export const PRESENT_PROMPTS = {
  here: "One way I was actually here today",
  fought: "One thing I fought for today: for me, for us, for her",
  hint: "Fighting for is choosing, saying, and doing. Not conflict. Tiny counts: I put the phone down and asked about her day.",
};

export const BUILDER_LINES: string[] = [
  "You have worked for other people your whole life and shown up every time. That's the record. The business gets that same man.",
  "One action a day. Not a plan for the year. One call, one email, one page.",
  "Fear of working for yourself is fear of being seen fail. You've been seen fail already and you're still here.",
  "Moses at the bush and Gideon in the winepress both said 'not me.' Both were the right man. Reluctance is not disqualification.",
  "The financial DM is a real thing you built. Say that out loud once today.",
  "Done and imperfect is a business. Perfect and unsent is a hobby.",
];

export const BLESSING_SCRIPTURE: { ref: Ref; note: string }[] = [
  { ref: { book: "numbers", chapter: 6, from: 24, to: 26 }, note: "The oldest blessing there is. A father's blessing over his people, meant to be said out loud over you." },
  { ref: { book: "zephaniah", chapter: 3, from: 17 }, note: "He rejoices over you with singing." },
  { ref: { book: "psalms", chapter: 20, from: 1, to: 5 }, note: "'May He give you the desire of your heart and make all your plans succeed.' A blessing for a man with a business and a family." },
  { ref: { book: "2-thessalonians", chapter: 3, from: 16 }, note: "Peace at all times and in every way." },
];

export const FAILURE_CHECK: { key: string; label: string; hint: string }[] = [
  { key: "fact", label: "What actually happened?", hint: "The fact a camera would record. Not the story." },
  { key: "proves", label: "What does it prove?", hint: "Usually: that one thing didn't work, once." },
  { key: "doesntProve", label: "What does it not prove?", hint: "That you're a failure. That it's always like this. That she's leaving. Say the ones your brain jumped to." },
  { key: "mentor", label: "What would the mentor say?", hint: "You know his voice by now. Write it." },
  { key: "next", label: "One next small thing.", hint: "Two minutes. Tired counts." },
];
