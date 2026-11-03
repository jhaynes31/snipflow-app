/**
 * Rooted (2026-11-03, Jen's ask): attachment, in plain words, for a woman
 * whose pattern has been disorganized with an anxious lean, who has been
 * drawn again and again to avoidant people, and who is done. Everything
 * here is written to be read on a hard day: short sections, no jargon
 * without a plain meaning beside it, no shame.
 *
 * Draws on Bowlby and Ainsworth, Mary Main on disorganized attachment,
 * Levine and Heller (Attached), Diane Poole Heller, Julie Menanno (Secure
 * Love), and Thais Gibson's integrated attachment work. Scripture is
 * referenced by book and verse and paraphrased in plain words, never
 * quoted from memory as if exact; The Well is where the text itself lives.
 */

export type StyleKey = "secure" | "anxious" | "avoidant" | "disorganized";

export interface Section {
  title: string;
  body: string;
}

export interface StylePage {
  key: StyleKey;
  name: string;
  /** The older textbook names, so what she reads elsewhere lines up. */
  alsoCalled: string;
  line: string;
  sections: Section[];
  /** A line of faith, as a reference and a plain paraphrase. */
  faith: { ref: string; plain: string };
}

export const STYLES: StylePage[] = [
  {
    key: "secure",
    name: "Secure",
    alsoCalled: "Earned secure, when it was learned later in life.",
    line: "I can be close and I can be alone. Neither one scares me for long.",
    sections: [
      { title: "Where it comes from", body: "A child whose caregiver was mostly there, mostly warm, and repaired the misses, learns that reaching out works and that being alone is survivable. Mostly is the word. Nobody secure had perfect parents; they had parents who came back." },
      { title: "The inner rules", body: "People are generally trustworthy until they show otherwise. My needs are reasonable. If something is wrong, saying so is the way through, not the thing that ends it. Distance is information, not danger." },
      { title: "Under stress", body: "Reaches for the person, says what's wrong in plain words, can hear a no, can wait for a reply without inventing a story, and can step back from someone who keeps hurting them without a long goodbye." },
      { title: "What it feels like inside", body: "Mostly quiet. A text unanswered for a day is a text unanswered for a day. A hard conversation feels hard and then feels over. Love doesn't feel like a cliff edge." },
      { title: "What it feels like to be with", body: "Steady. Warm without pressure. They say what they want and ask what you want. They are the same person on a Tuesday as on a holiday, and the same with you as with the waiter." },
      { title: "The thing to know", body: "Secure is not a personality type you were born without. It is a state the nervous system can learn at any age, through enough experiences of reaching out and being met, including by yourself, by God, and by people who stay. The name for that is earned security, and it is the whole point of this place." },
    ],
    faith: { ref: "Hebrews 13:5", plain: "He has said he will never leave you or let go of you. Security was always the design." },
  },
  {
    key: "anxious",
    name: "Anxious",
    alsoCalled: "Anxious-preoccupied; in children, ambivalent or resistant.",
    line: "If I hold on tightly enough, maybe this time nobody leaves.",
    sections: [
      { title: "Where it comes from", body: "A caregiver who was sometimes there and sometimes not, in a way the child couldn't predict. Warm one day, distracted or overwhelmed the next. The child learned that love is real but unreliable, and that the way to get it is to work for it: be good, be easy, be alert, be louder." },
      { title: "The inner rules", body: "I have to earn it. Distance means I did something wrong. If I stop paying attention they will drift. My needs are too much, so I should hide them until I can't. Other people's moods are mine to manage." },
      { title: "Under stress", body: "Activates. Checks the phone. Rereads the message. Sends another one. Asks for reassurance, gets it, needs it again. Protest behaviors: withdrawing to see if they notice, keeping score, picking a fight to feel the connection, threatening to leave while hoping to be stopped. None of this is manipulation; it is a nervous system doing what once kept it alive." },
      { title: "What it feels like inside", body: "A low hum of watching. Relief when they reach out, then the clock starts again. Big feelings that arrive fast and seem to belong to this moment but are often older than it." },
      { title: "The trap built in", body: "The anxious system reads calm, steady availability as boring and reads intermittent warmth as chemistry. So it walks past the secure person and toward the one who pulls away, because that pull is the feeling it knows as love. Knowing this is half the cure." },
      { title: "The way toward secure", body: "Self-soothing before seeking soothing. Naming the need in one plain sentence instead of a protest behavior. Learning the difference between a feeling and a fact about the other person. Choosing people whose steadiness you can learn to tolerate, and letting it get boring, because boring is what safe feels like at first." },
    ],
    faith: { ref: "Zephaniah 3:17", plain: "He delights in you and quiets you with his love. Quiets, not corrects. You do not have to earn his attention by being easy." },
  },
  {
    key: "avoidant",
    name: "Avoidant",
    alsoCalled: "Dismissive-avoidant; in children, avoidant.",
    line: "I'm fine on my own. Needing people is where it goes wrong.",
    sections: [
      { title: "Where it comes from", body: "A caregiver who was consistently unavailable for emotion: present for food and school and maybe praise for achievement, absent or uncomfortable when the child cried or needed. The child learned that reaching out doesn't work and that the way to stay close is to need nothing. They turned the longing down so low they often cannot feel it." },
      { title: "The inner rules", body: "Needs are weakness. Closeness costs freedom. If someone wants more from me, they are the problem. I am most myself alone. Feelings are better handled by not having them. Praise of independence is the shield." },
      { title: "Under stress", body: "Deactivates. Goes quiet, goes busy, goes cold, goes away. Finds flaws in the partner right when it gets close. Keeps an ex or a fantasy person on a pedestal so no real person can measure up. Calls your ordinary needs 'drama' or 'a lot'. Comes back warm once you have pulled away, because distance is where they can feel the longing again." },
      { title: "What it feels like inside", body: "Mostly flat, with relief at distance and a pressure in the chest at closeness that they call 'needing space'. They are often not lying when they say they don't know what they feel. Underneath is a child who stopped asking." },
      { title: "What it feels like to be with", body: "Wonderful at a distance, in bursts, at the start. Then a slow starvation. You end up doing all the reaching and being told you are too much for doing it. You begin to shrink your needs to fit, and that shrinking is the injury." },
      { title: "A fair word", body: "Avoidant people are not villains, and some of them do the work and become secure. But that work is theirs to do, on their timeline, and it cannot be done by your patience or your love. Your job is not to heal one. Your job is to notice the pattern early and protect your heart while they decide." },
    ],
    faith: { ref: "Matthew 19:22", plain: "The rich young man walked away sad, and Jesus let him. He did not run after him to renegotiate. Loving someone fully and letting them go are not opposites." },
  },
  {
    key: "disorganized",
    name: "Disorganized",
    alsoCalled: "Fearful-avoidant. The blend: anxious and avoidant at once.",
    line: "Come close. No, go away. No, don't leave.",
    sections: [
      { title: "Where it comes from", body: "A caregiver who was both the source of comfort and the source of fear: frightening, frightened, abusive, or so unpredictable that the child could not build any one strategy. Reaching out sometimes helped and sometimes hurt. The child's system split: pull toward, push away, freeze. This is the pattern that usually comes with trauma, and it is the one most often misread as 'too much' when it is, in fact, injury." },
      { title: "The inner rules", body: "People are the danger and the only safety. I want closeness desperately and I don't trust it when it comes. When someone is kind I wait for the catch. When someone pulls away I chase, and when they come back I flinch. I never know which of me is going to show up." },
      { title: "Under stress", body: "Swings. Anxious protest one hour, avoidant shutdown the next. Can be flooded and numb in the same afternoon. Dissociation, the sense of watching from outside, is common. Fast attachment to new people followed by panic. Tests people, then feels ashamed of testing." },
      { title: "What it feels like inside", body: "Exhausting. Like being two people with opposite instructions. A hypervigilance that reads rooms, tones, and silences faster than thought. Deep loneliness even in company, and relief that feels like grief when someone is finally safe." },
      { title: "Why avoidants, over and over", body: "The disorganized system was built around a parent who was both close and unreachable. An avoidant person reproduces that exact shape: warm enough to hope, distant enough to feel like home. The familiarity is not love. It is recognition. Your body is not choosing wrong on purpose; it is choosing what it knows. You get to teach it something else." },
      { title: "The way toward secure", body: "Safety first, always: body before thoughts, Ground Me before analysis. Then slow, repeated experiences of being met and not punished for it: by God, by the mothering and fathering you give yourself at The Hearth, by John, by friends who earn their layer in The Orchard. Then the fail safes, so your calm self protects your activated self. Disorganized people often become the most secure of all, because they had to learn it on purpose and they know exactly what it is worth." },
    ],
    faith: { ref: "Psalm 27:10", plain: "Even if your father and mother forsake you, the Lord takes you in. The place in you that never got taken in has a home." },
  },
];

export const STYLE_MAP: Record<StyleKey, StylePage> = Object.fromEntries(STYLES.map((s) => [s.key, s])) as Record<StyleKey, StylePage>;

/** The anxious–avoidant trap, as its own page. */
export const TRAP: { title: string; line: string; sections: Section[]; faith: { ref: string; plain: string } } = {
  title: "The trap",
  line: "Why the person who pulls away feels like the one you were looking for.",
  sections: [
    { title: "The shape of it", body: "The anxious system wants closeness and reads distance as a problem to solve. The avoidant system wants distance and reads closeness as a problem to solve. Put them together and each one triggers the other's deepest fear, on a loop. The anxious one reaches; the avoidant one retreats; the reaching gets louder; the retreat gets colder. Both end up certain the other one is the problem." },
    { title: "Why it feels like chemistry", body: "Intermittent warmth is the most addictive reward pattern there is; it is the same one slot machines use. A person who is sometimes wonderful and sometimes gone produces a stronger pull than a person who is reliably warm. Your system calls that pull 'spark'. A secure person's steadiness, by comparison, can feel flat. It is not flat. It is what your nervous system has never been allowed to rest in." },
    { title: "The cost", body: "Years. The anxious partner in this pairing ends up shrinking, apologizing for needs, managing the other's moods, and mistaking crumbs for a meal. The avoidant partner ends up more convinced that people want too much. Nobody heals. The person with the most heart loses the most." },
    { title: "The exit", body: "Not fixing the avoidant. Not becoming avoidant yourself to match. The exit is secure: say the need once, plainly; watch what they do with it; believe what you see; and leave early when the pattern shows, before the investment makes leaving feel impossible. This place exists so that leaving early is a plan you wrote on a calm day, not a feat of strength on a shaky one." },
  ],
  faith: { ref: "Hosea 2:7", plain: "She runs after lovers who don't come back, and only then turns home. The turning home is the whole book. It can happen earlier than it did for her." },
};

export const EARNED: { title: string; line: string; sections: Section[]; faith: { ref: string; plain: string } } = {
  title: "Earned security",
  line: "Style is a state, not a sentence. People move.",
  sections: [
    { title: "What the research says", body: "Attachment style in adults is more stable than mood and less fixed than temperament. Around a quarter of people shift categories over a few years, and the shift toward secure is the common one when the conditions are right: a safe relationship, good therapy, honest self-work, or faith that is lived rather than performed. Researchers call this earned secure. It looks, on every measure, like security that was there from the start." },
    { title: "What moves it", body: "Not insight alone. Repeated experience. Reaching out and being met. Saying a need and not being punished. Being left and surviving it on purpose rather than by collapse. Repairing a rupture and finding the relationship still there. Each one is a deposit; none of them needs to be large." },
    { title: "The three teachers", body: "A secure other (a spouse, a friend, a therapist) who stays through your activation. Your own secure voice, which you build by speaking to yourself the way a good parent would; The Hearth exists for this. And God, who is described from the first page to the last as the one who does not leave, which is the exact definition of a secure base." },
    { title: "What it will feel like", body: "Quieter. A little boring, at first, and then restful. You will still get activated; secure people do. The difference is that the activation will be shorter, you will know what it is while it is happening, and you will have somewhere to put it. You will also start to find avoidant people less magnetic and steady people more interesting. That change in taste is the clearest sign it is working." },
  ],
  faith: { ref: "Isaiah 49:15-16", plain: "Even a mother might forget her nursing child; he will not forget you. He has your name carved into his hands. Earned security has a floor under it that was never earned at all." },
};

/** Protest behaviors with the secure move beside each one. */
export interface Protest {
  key: string;
  name: string;
  looksLike: string;
  underneath: string;
  secureMove: string;
}

export const PROTESTS: Protest[] = [
  { key: "check", name: "Checking", looksLike: "Rereading the thread. Watching for 'last seen'. Checking their stories to see if they're alive and ignoring you.", underneath: "Am I still held in mind?", secureMove: "Put the phone in another room for a set time. Say to yourself: 'A quiet phone is a quiet phone.' If a day passes, ask plainly: 'I'd love to hear from you; is this week a hard one?'" },
  { key: "double", name: "The second message", looksLike: "Sending another text to soften, explain, or fish for a reply before the first was answered.", underneath: "I need to know I didn't ruin it.", secureMove: "One message is enough. Write the second one in Notes if you must, and don't send it. The gap belongs to them." },
  { key: "withdraw", name: "Withdrawing to be noticed", looksLike: "Going quiet, short replies, 'I'm fine', hoping they'll ask what's wrong.", underneath: "I want to matter without having to ask.", secureMove: "Ask. 'I've been feeling far from you today. Can we talk for ten minutes tonight?' Asking is not needy; asking is adult." },
  { key: "score", name: "Keeping score", looksLike: "Counting who reached out last, who gave more, who cancelled.", underneath: "I'm afraid I'm the only one holding this.", secureMove: "Say the pattern once, out loud, as a pattern: 'I've noticed I've initiated the last several times. I'd like it to go both ways.' Then watch, don't count." },
  { key: "fight", name: "Picking a fight to feel the connection", looksLike: "Starting a conflict about something small when the real thing is distance.", underneath: "Even a fight is contact.", secureMove: "Name the real thing: 'I don't actually care about the dishes. I miss you.' If that is too exposed, go to Ground Me first and come back." },
  { key: "threat", name: "Threatening to leave", looksLike: "'Maybe we should just end this,' said in the hope of being stopped.", underneath: "Show me you'd fight for me.", secureMove: "Never say leave unless you mean it. Say the fear instead: 'I get scared that you'd be fine without me.' A secure partner can answer that; an avoidant one will show you who they are." },
  { key: "shrink", name: "Shrinking the need", looksLike: "Deciding you don't really need the call, the plan, the answer. Making yourself cheap to keep.", underneath: "If I need less, there's less to reject.", secureMove: "Write the need down before you shrink it. Then say it, once, at its true size. A need that gets a bad reception at its true size is information about them, not about the need." },
  { key: "fawn", name: "Managing their mood", looksLike: "Reading their face, pre-apologizing, smoothing, being extra easy and extra grateful.", underneath: "If I keep the weather good, nobody leaves.", secureMove: "Their mood is theirs. Ask once: 'You seem far away; is something up?' Then let the answer be the answer. The Fawn alarm in Re-Centered is built for this moment." },
  { key: "fast", name: "Attaching fast", looksLike: "Deep sharing in week one. Planning the future in week three. Calling them your person before they've shown you a single hard day.", underneath: "If I bond fast, maybe it will hold before they see me.", secureMove: "Slow is the test. Share at the pace of what they've shown, not what you've felt. The layers in Re-Centered and the slow-trust rule in The Orchard are the brakes you decided on when you were calm." },
  { key: "flinch", name: "The flinch", looksLike: "Someone is kind and steady and you feel bored, suspicious, or suddenly critical of them.", underneath: "Safety doesn't feel like home yet.", secureMove: "Name it: 'This is what safe feels like, and my body doesn't trust it.' Stay another week. Let it be boring. Notice whether the boredom is their flatness or your alarm turning off." },
];

/** Daily and weekly practices toward secure. */
export interface Practice {
  key: string;
  name: string;
  when: string;
  how: string[];
  /** A tool in The Shire that carries it, if one does. */
  tool?: string;
}

export const PRACTICES: Practice[] = [
  { key: "pause", name: "The pause before pursuing", when: "The moment you feel the pull to text, call, check, or fix.", how: ["Hand on your chest. Three slow breaths out longer than in.", "Say what you feel in one word, then where it sits in your body.", "Ask: is this a need, or an alarm? A need can wait twenty minutes. An alarm needs grounding, not them.", "If it's still a need after twenty minutes, say it once, plainly."], tool: "tend.groundMe" },
  { key: "gap", name: "Tolerating the gap", when: "A message unanswered. Plans unconfirmed. A quiet day.", how: ["Decide out loud what the gap means: 'It means they haven't replied.' Nothing else, yet.", "Do one thing that belongs to you: a walk, a task, a page of a book. Your life keeps happening in the gap.", "Set a time to check, and don't check before it.", "If the gap is a pattern (not a day but a habit), that goes in the fail safes, not in your chest."], tool: "tend.sitWithIt" },
  { key: "plain", name: "The need in one sentence", when: "Before any protest behavior.", how: ["'I feel ___ and I need ___.' One feeling, one need, no history, no case.", "Say it once. Don't manage their reaction.", "Then watch what they do with it over days, not minutes. A secure person moves toward a plainly stated need. An avoidant one treats it as a demand.", "Write what you saw in Someone in my circle, so the pattern is on paper and not in your memory under stress."] },
  { key: "soothe", name: "Self-soothing that works for this body", when: "Activated, flooded, or spiraling.", how: ["Cold water on the wrists or face. A slow exhale. Feet on the floor and the names of five things you can see.", "A hand where it hurts: chest, throat, belly. 'I'm here. I'm not leaving you.'", "Move: a walk, a stretch, the somatic session in Heartwood.", "Then the wheel, so the feeling gets a name and a place."], tool: "hub.felt" },
  { key: "repair", name: "Repair, on purpose", when: "After you've reacted from the old pattern.", how: ["Own the move without owning their part: 'I sent three texts last night. That was my fear, not a request.'", "Don't over-apologize; that's the fawn in a different coat.", "Ask one question about them.", "Notice whether they can receive a repair. People who punish repairs are telling you something."], tool: "tend.repair" },
  { key: "parent", name: "Mothering and fathering yourself", when: "Every day, and especially when you feel like the child.", how: ["Go to The Hearth. Let Mom speak when you need softness, Dad when you need to be told you're enough as you are.", "Say to the five-year-old in you what you'd say to any five-year-old who was scared: 'You didn't do anything wrong. I've got you.'", "This is not pretend. It is the exact mechanism by which earned security is built."], tool: "hh.sit" },
  { key: "anchor", name: "The secure base that never moves", when: "When every human one feels unreliable.", how: ["Read Psalm 139 slowly in The Well: searched, known, held, not left.", "Pray the need instead of texting it. Say it out loud, in full, with the fear attached.", "Sit with the fact that the one who made you does not have an avoidant day.", "Then decide what, if anything, to say to the person."], tool: "well.talking" },
  { key: "boring", name: "Letting it be boring", when: "Someone steady is in front of you and your system wants to run.", how: ["Name the flinch.", "Stay one more week.", "Notice whether you feel filled or drained after time with them. Filled and bored is secure. Thrilled and drained is the old pattern.", "Tell the coach what you noticed. It will not let you call steadiness a flaw."] },
];

/** Secure voice scripts for the moments you go blank. */
export const SCRIPTS: { when: string; say: string }[] = [
  { when: "They've gone quiet for days", say: "I've noticed it's been quiet. I'd like to hear from you. If this is a hard week, say so and I'll give you room." },
  { when: "They cancelled again", say: "That's the third time. I'm not angry, and I'm also not going to keep making plans that don't happen. Let me know when you can actually be there." },
  { when: "They called your need 'a lot'", say: "It's a normal need, said plainly. If it's more than you want to give, that's honest, and it tells me where we are." },
  { when: "They came back warm after pulling away", say: "I'm glad you're back. I need to understand what the distance was, because I can't keep guessing." },
  { when: "You want reassurance for the third time", say: "I notice I'm asking the same question again. I'm going to go settle myself and come back when I'm steadier." },
  { when: "You're about to chase", say: "Not tonight. I said what I needed. Their move." },
  { when: "You're stepping back from someone", say: "I've loved knowing you, and I've noticed a pattern that isn't good for me. I'm going to step back. I don't need you to fix it." },
  { when: "Someone steady asks what you need", say: "I'm not used to being asked. Give me a second. I think I need you to just stay in the room." },
];

/** Early tells of an avoidant pattern, each with its fair exception and the secure contrast. */
export interface Tell {
  key: string;
  name: string;
  looksLike: string;
  /** The healthy thing that can look like it. */
  exception: string;
  /** What a secure person does instead. */
  secure: string;
  /** When it tends to show. */
  window: "weeks" | "months" | "later";
}

export const TELLS: Tell[] = [
  { key: "hotcold", name: "Hot, then cold, after closeness", looksLike: "A wonderful evening, deep talk, real warmth. Then two days of nothing, or a strangely flat message, as if it didn't happen.", exception: "A genuinely busy stretch, said out loud in advance. Once.", secure: "Warmth that holds its temperature. They might be quieter on a busy day; they don't vanish after a good one.", window: "weeks" },
  { key: "texter", name: "'I'm just not a texter'", looksLike: "Said early, as a rule, so that any later silence is pre-excused. Often paired with 'I'm bad at communication' said with a shrug, not a plan.", exception: "Some people really do prefer calls or in person, and they offer that instead.", secure: "'I'm not great at texting; call me, or I'll ring you Thursday.' A limit with a bridge.", window: "weeks" },
  { key: "independence", name: "Independence as armor", looksLike: "'I don't need anyone.' 'I've always been better alone.' Praise for self-sufficiency that quietly makes needing anything look weak.", exception: "Healthy self-reliance, which doesn't put down the alternative.", secure: "'I like my own company, and I like being with you.' Both, without a hierarchy.", window: "weeks" },
  { key: "vague", name: "Vague about plans", looksLike: "'We'll see.' 'Maybe this weekend.' Plans that hover and never land, and irritation when you ask for a day and time.", exception: "A chaotic season with a named end.", secure: "A day and a time, or 'I can't commit this week; how about next Tuesday?'", window: "weeks" },
  { key: "exes", name: "Every ex was 'too needy'", looksLike: "Past partners described as clingy, dramatic, crazy, or too much. Their own part never mentioned.", exception: "One bad relationship described with some ownership.", secure: "'We wanted different things.' 'I wasn't ready.' Room for their own part.", window: "weeks" },
  { key: "needs", name: "Discomfort with your needs", looksLike: "A small ask lands like a big one. A look, a sigh, 'it's not a big deal', or a lecture about expectations.", exception: "Everyone has a bad moment. Watch for the pattern, not the day.", secure: "'Okay. I can do that.' Or 'I can't do that, but here's what I can.'", window: "weeks" },
  { key: "surface", name: "Charming, and never deeper", looksLike: "Great stories, good company, and after a month you know nothing of what they fear or feel. Questions about feelings get a joke.", exception: "A slow opener who gets there with time.", secure: "Depth that grows with the weeks, in both directions.", window: "months" },
  { key: "pedestal", name: "Someone on a pedestal", looksLike: "An ex, a 'one who got away', or an imagined perfect person they compare you to, kept just out of reach so no real person can measure up.", exception: "Grief about a real loss, named as grief.", secure: "The person in front of them is the person they're with.", window: "months" },
  { key: "flaw", name: "Finding flaws right when it gets close", looksLike: "After a weekend together, suddenly your laugh, your friends, your job are a problem.", exception: "A real incompatibility named once, kindly.", secure: "Closeness makes them softer, not sharper.", window: "months" },
  { key: "repair", name: "No repair after a rupture", looksLike: "A conflict, then silence, then acting as if it didn't happen. No 'I'm sorry', no 'what did you need?' Just the weather changing.", exception: "Someone learning repair, who tries it clumsily.", secure: "They come back toward you after a rupture, even badly, even late.", window: "months" },
  { key: "pullback", name: "Warm mostly when you pull back", looksLike: "The moment you step away, they appear: attentive, affectionate, interested. The moment you step back in, the distance returns.", exception: "None, really. This one is the pattern itself.", secure: "Their warmth doesn't depend on your distance.", window: "months" },
  { key: "future", name: "The future stays out of focus", looksLike: "Any talk of what this is, or where it's going, gets a change of subject, a joke, or 'why do we have to label it?' for months.", exception: "Early days, honestly. By three to six months it's a tell.", secure: "'Here's what I want. What do you want?' Even if the answer is hard.", window: "later" },
];

/** What to watch, by when. */
export const WATCH_TIMELINE: { period: string; watch: string[]; youDo: string }[] = [
  { period: "Weeks one to four", watch: ["Do they follow through on small things?", "Is the warmth steady, or in bursts after closeness?", "How do they talk about exes?", "How does a small no land?", "Do they ask about you and remember?"], youDo: "Share at the pace of what they've shown. Keep your own life running. Write what you notice in Someone in my circle." },
  { period: "Months one to three", watch: ["Does depth grow both ways?", "Is there a repair after the first real friction?", "Do plans land, or hover?", "Do you feel filled or drained after time together?", "Are your ordinary needs met with 'okay' or with a sigh?"], youDo: "Say one plain need and watch what they do with it for a week. Read your tripwires. Ask the coach for the read." },
  { period: "Months three to six", watch: ["Can they say what this is and what they want?", "Are they the same person across settings and seasons?", "Has the hot-and-cold rhythm shown up twice?", "Are you shrinking?"], youDo: "Decide. The information is in by now. A secure person has shown steadiness; an avoidant one has shown the pattern. Believe what you've seen." },
];

/** Fail safe templates, in her voice, to edit. */
export const VOW_STARTER = "I don't invest past friendly until someone has shown me steadiness for a season: plans that land, a small no taken well, warmth that doesn't depend on my distance. I don't share my story to make someone stay. When I see the pattern twice, I step back, and I don't need to explain it to them to make it real.";

export const TRIPWIRE_STARTERS = [
  "If they go distant after closeness twice, I step back and stop initiating.",
  "If a plain need gets a sigh, a lecture, or 'you're a lot', I say nothing more about it and I watch for a week.",
  "If they're warm only when I pull away, I take that as the whole answer.",
  "If plans hover for three weeks, I stop making them.",
  "If I catch myself shrinking a need, I write the need at its true size and say it once.",
  "If I'm about to send a second message, I go to Ground Me first.",
];

export const CHECK_BEFORE_INVEST = [
  "Have they followed through on three small things?",
  "Have I seen them take a no well?",
  "Is their warmth steady, or does it spike after I pull back?",
  "Do I know one thing they fear or feel?",
  "How did they describe their exes?",
  "Do I feel filled after time with them, or thrilled and drained?",
  "Have I said one plain need, and what did they do with it?",
  "Am I attaching to who they've shown me, or to who I've imagined?",
];

/** A line from God for the hard day, as reference and plain words. */
export const ANCHORS: { ref: string; plain: string }[] = [
  { ref: "Psalm 139:1-5", plain: "Searched and known. Behind and before. A hand laid on you. That is a secure base." },
  { ref: "Isaiah 54:10", plain: "Mountains may move; his kindness toward you will not." },
  { ref: "Romans 8:38-39", plain: "Nothing, not death or life or anything else made, can separate you from his love." },
  { ref: "1 John 4:18", plain: "Full love drives out fear. The fear you feel in love is the measure of what hasn't been full yet." },
  { ref: "John 21:15-17", plain: "After Peter failed him three times, Jesus asked three times 'do you love me?' and gave him his work back. Repair, offered by the one who was wronged." },
  { ref: "Ruth 1:16", plain: "'Where you go, I will go.' Steadiness chosen on purpose, out loud, by someone who could have left." },
  { ref: "Lamentations 3:22-23", plain: "New every morning. The warmth does not run out and it does not depend on your distance." },
];

export const WELCOME = "Attachment is the shape your nervous system learned for love. It was learned, which means it can be learned again. This place is for learning the shape you were given, choosing the shape you want, and protecting your heart from the people who would use the old one against you.";
