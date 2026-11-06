/**
 * Us: the anxious–avoidant dance in a marriage (2026-11-06, Jen's ask, for
 * her and John). Written for two people who both want out of the loop.
 * Draws on Sue Johnson's emotionally focused work (the cycle as the enemy,
 * the pursuer and the withdrawer, raw spots), Stan Tatkin (islands and
 * waves, the couple bubble), and Levine and Heller. Scripture referenced
 * and paraphrased, never quoted from memory as exact.
 */

export interface Section { title: string; body: string }

export const DANCE: { title: string; line: string; sections: Section[]; faith: { ref: string; plain: string } } = {
  title: "The dance",
  line: "The loop is the enemy. Not her, not him. The loop.",
  sections: [
    { title: "What it is", body: "One of you reaches when things feel far (a question, a text, a tone, a complaint that is really a plea). The other feels the reach as pressure or criticism and pulls back to keep the peace or to breathe. The pulling back lands on the first one as abandonment, so they reach harder, louder, sharper. The second one pulls back further. Within minutes you are both certain the other is the problem, and you are both alone in the same house. Therapists call this pursue and withdraw. It is the most common loop in marriage, and it is not a sign the marriage is wrong. It is a sign two nervous systems are scared of the same thing from opposite directions." },
    { title: "The pursuer's inside", body: "Underneath the sharp tone is panic: 'I can't reach you. Are you still here? Do I still matter?' The pursuer is usually the anxious or disorganized one. Their reaching is love with the volume turned up by fear. What the withdrawer sees is anger or neediness; what is actually there is a person afraid of being left." },
    { title: "The withdrawer's inside", body: "Underneath the silence is also panic, lower and slower: 'I can't do this right. Whatever I say makes it worse. If I step back, at least I won't break it.' The withdrawer is usually the avoidant-leaning one. Their leaving is self-protection and, often, an attempt to protect the marriage from their own flooding. What the pursuer sees is indifference; what is actually there is a person who cares and has gone numb to survive." },
    { title: "Why it escalates", body: "Each person's protective move is the other person's trigger. Her reach triggers his retreat; his retreat triggers her reach. Nobody has to be wrong for this to run. It runs on its own once it starts, which is why willpower and good intentions in the moment so rarely stop it. It stops when both of you can see it as a thing happening to you, name it out loud, and step out of it together, on purpose, with moves you decided on a calm day." },
    { title: "The one shift that changes everything", body: "From 'you are doing this to me' to 'the loop is doing this to us'. When you can say 'we're in it' and the other can say 'yeah, we are', the loop has already lost half its power. The rest is practice: the pursuer learning to say the soft thing under the sharp thing, the withdrawer learning to stay two minutes longer and say 'I'm here, I'm just flooded', and both of you learning a way to pause that doesn't feel like leaving." },
    { title: "What you are actually asking each other", body: "Both of you are asking the same question in different languages: 'Am I safe with you? Will you be there?' The pursuer asks it by reaching. The withdrawer asks it by watching whether reaching ever stops. When each of you can hear the question under the other's move, the move stops being an attack." },
  ],
  faith: { ref: "Ecclesiastes 4:9-12", plain: "Two are better than one, because if one falls the other lifts them up. A cord of three strands is not quickly broken. The third strand is the one who holds both of you when neither can hold the other." },
};

/** Self-discovery prompts, answered privately, each shareable on its own. */
export interface SidePrompt { key: string; question: string; hint: string }
export const SIDE_PROMPTS: SidePrompt[] = [
  { key: "move", question: "When things feel far or tense between us, what is my move?", hint: "Reach, retreat, freeze, fix, joke, go cold, go loud. Be plain." },
  { key: "tell", question: "What am I telling myself in that moment?", hint: "The sentence that runs: 'they don't care', 'I'll just make it worse', 'here we go again'." },
  { key: "fear", question: "What am I actually afraid of underneath?", hint: "Being left. Being too much. Being a failure. Being trapped. Not being enough. Say the real one." },
  { key: "origin", question: "Where did I first learn this move?", hint: "The house you grew up in. Who reached and who left. What happened when you needed something." },
  { key: "need", question: "What do I need from you that I almost never say plainly?", hint: "One sentence. 'I need to know you're coming back.' 'I need a minute without it meaning I don't care.'" },
  { key: "own", question: "What part of the loop is mine to own?", hint: "Not the whole thing. Your move, your tone, your timing, your silence." },
  { key: "sees", question: "What do I think you see when I do my move, and what is actually there?", hint: "'You see anger. What's there is fear.' 'You see a wall. What's there is a person trying not to break it.'" },
  { key: "signal", question: "What is the earliest sign, in my body, that the loop is starting?", hint: "Chest, jaw, stomach, the urge to check the phone, the urge to leave the room." },
  { key: "better", question: "What would I rather do instead, when I notice that sign?", hint: "One small move. The cards under Instead can help." },
];

/** Alternative moves, by role. Each: when, instead of, say this, why. */
export interface MoveCard { key: string; role: "pursuer" | "withdrawer" | "both"; name: string; when: string; insteadOf: string; say: string; why: string }
export const MOVES: MoveCard[] = [
  { key: "soft", role: "pursuer", name: "The soft thing under the sharp thing", when: "You're about to criticize, question, or press.", insteadOf: "'You never…' / 'Why didn't you…'", say: "I'm feeling far from you and it's scaring me. I need you, not an answer.", why: "The withdrawer can move toward fear; they can only defend against attack." },
  { key: "pause-before", role: "pursuer", name: "The pause before pursuing", when: "The urge to text again, ask again, follow them into the other room.", insteadOf: "The second message, the follow, the 'we need to talk right now'.", say: "(to yourself) This is the loop, not the end. Twenty minutes.", why: "A pursuit started from panic lands as pressure. Twenty minutes lets the panic drop to a level where the need can be said at its true size." },
  { key: "ask-time", role: "pursuer", name: "Ask for a time, not a verdict", when: "They've gone quiet and you need to resolve it now.", insteadOf: "'So you're just not going to talk to me?'", say: "I can see you need a minute. Can we come back to this at eight? I just need to know we're coming back.", why: "What the pursuer actually needs is the return, not the resolution. Asking for the time gets the thing you need." },
  { key: "one-need", role: "pursuer", name: "One need, one sentence", when: "You've been building a case.", insteadOf: "The history, the list, the pattern recited.", say: "Here's the one thing: I need you to text me when you'll be late.", why: "A case asks them to lose. A single need asks them to help. Withdrawers can help." },
  { key: "stay", role: "withdrawer", name: "Two more minutes", when: "The urge to leave the room, go quiet, go to the garage.", insteadOf: "Walking away without a word.", say: "I'm flooded and I'm about to go quiet. I'm not leaving. Give me two minutes and I'll say something.", why: "The pursuer's panic is about the leaving, not the silence. Naming the silence turns it from abandonment into a pause." },
  { key: "return", role: "withdrawer", name: "Say when you'll come back", when: "You need space.", insteadOf: "'I need space' with no end.", say: "I need thirty minutes. I'll come find you at nine. I mean it.", why: "Space with a return time is a pause. Space without one is the exact thing the pursuer is afraid of." },
  { key: "one-question", role: "withdrawer", name: "One question back", when: "You've gone blank and don't know what to say.", insteadOf: "Nothing, or 'I don't know'.", say: "What do you need from me right now, in one sentence?", why: "It keeps you in the room without requiring you to have the answer, and it hands the pursuer the thing they need: being asked." },
  { key: "name-flood", role: "withdrawer", name: "Name the flood", when: "Your heart is pounding and you've stopped hearing the words.", insteadOf: "Pretending you're fine, or shutting down.", say: "My heart's going. I'm not angry at you; I'm flooded. Can we slow down?", why: "A withdrawer's shutdown is physical. Saying so turns it from a wall into information the pursuer can work with." },
  { key: "we-re-in-it", role: "both", name: "Name the loop", when: "Either of you notices the pattern starting.", insteadOf: "Playing your part harder.", say: "We're in it. The loop's got us.", why: "The loop loses half its power the moment it has a name and both of you are on the same side of it." },
  { key: "pause", role: "both", name: "The pause, by the rules", when: "Either of you says the pause word.", insteadOf: "Storming off, or refusing to let go.", say: "(the pause word) Back at (time). I'm not going anywhere.", why: "A pause both of you agreed to on a calm day is a repair, not a rupture. The rules are under Agreements." },
  { key: "repair", role: "both", name: "The repair attempt", when: "After the loop ran, even badly.", insteadOf: "Waiting for the other to go first, or acting as if nothing happened.", say: "That was the loop. My part was (one thing). I'm sorry for that part. Are we okay?", why: "Marriages aren't made by never fighting; they're made by repairing. The one who repairs first isn't losing." },
  { key: "ritual", role: "both", name: "The six-second hello", when: "Every day, leaving and returning.", insteadOf: "Passing each other with a glance.", say: "(a real kiss or a real hug, six seconds, every time)", why: "It's long enough for both nervous systems to register 'you're here' before anything else happens. Islands and waves both need it." },
  { key: "state-of-us", role: "both", name: "Fifteen minutes on Sunday", when: "Once a week, same time.", insteadOf: "Only talking about us when something is wrong.", say: "One thing that went well between us this week. One thing I need next week. One thing I appreciate.", why: "Pursuers stop needing to pursue when there's a known time to be heard. Withdrawers stop dreading the talk when it has an end." },
];

export interface Practice { key: string; name: string; time: string; steps: string[]; faith?: { ref: string; plain: string } }
export const PRACTICES: Practice[] = [
  { key: "slow-motion", name: "The loop in slow motion", time: "20 minutes, on a calm day", steps: ["Pick one recent run of the loop, not the worst one.", "Each of you, in turn: 'When you did X, I felt Y, and I told myself Z, so I did W.' No interrupting, no correcting.", "Find the first move. Usually it's earlier than either of you thought.", "Each say what you were afraid of underneath. That's the real conversation.", "Write it into Our loop, together, so it's on paper and not in your chests."] },
  { key: "raw-spot", name: "The raw spot", time: "15 minutes", steps: ["Each of you names one raw spot: a place where you're easily bruised, with where it came from.", "The other repeats it back in their own words until you say 'yes, that's it.'", "No fixing, no defending, no 'but'.", "Finish with: 'When I touch that spot, what would you like me to do instead?'"], faith: { ref: "Galatians 6:2", plain: "Carry each other's burdens. A raw spot carried by two is lighter than one hidden." } },
  { key: "hear-need", name: "What I hear, what I need", time: "10 minutes", steps: ["One of you speaks for two minutes about something small that bothers you.", "The other says only: 'What I hear is… Is that right?' until it is.", "Then the listener says: 'What I'd need, to help with that, is…'", "Swap."] },
  { key: "appreciation", name: "The appreciation pass", time: "5 minutes", steps: ["Three specific things the other did this week that you noticed. Specific: 'you made coffee before I asked', not 'you're great'.", "The other only says 'thank you'.", "Swap."], faith: { ref: "Philippians 4:8", plain: "Whatever is true, lovely, admirable: think on those things. Said out loud, they change what you see in each other." } },
  { key: "bubble", name: "The couple bubble", time: "An ongoing agreement", steps: ["Agree: we protect each other in public and in private; nobody else hears our fight before the other does.", "Agree: when one of us is flooded, the other's first job is safety, not winning.", "Agree: we don't go to sleep in the loop. We can go to sleep unresolved, with a return time; we don't go to sleep abandoned.", "Write what you agreed under Agreements and both sign it."] },
  { key: "pray", name: "Pray the loop", time: "3 minutes", steps: ["After a run of the loop, before the repair if you can, each of you says one sentence to God, out loud, about your own part. Not the other's.", "Then one sentence asking for what you need.", "Then the repair attempt."], faith: { ref: "James 5:16", plain: "Confess to each other and pray for each other, and you'll be healed. The order matters: your own part first." } },
];

export const AGREEMENT_FIELDS: { key: string; label: string; hint: string; starter: string }[] = [
  { key: "pauseWord", label: "Our pause word", hint: "A word either of you can say that means 'we're in the loop, let's stop'. Silly is fine; silly helps.", starter: "Pumpkin" },
  { key: "pauseMinutes", label: "How long a pause is", hint: "Twenty to thirty minutes is what nervous systems need to come down. More than an hour starts to feel like leaving.", starter: "25 minutes" },
  { key: "returnHow", label: "How we come back", hint: "Who comes to whom, and what the first sentence is.", starter: "Whoever called the pause comes to find the other. First sentence: 'I'm back. That was the loop.'" },
  { key: "duringPause", label: "What each of us does during a pause", hint: "Not rehearsing the argument. Something that actually settles the body.", starter: "Her: Ground Me, a walk, the wheel. Him: the garage, water, a walk. Neither: the phone thread." },
  { key: "checkIn", label: "Our weekly fifteen minutes", hint: "A day and a time.", starter: "Sunday, 8pm, after the kids are down." },
  { key: "sleep", label: "What we do when it's bedtime and we're still in it", hint: "Unresolved is allowed. Abandoned isn't.", starter: "We say 'we're not done and we're okay,' set a time tomorrow, and the six-second hug still happens." },
];

export const US_WELCOME = "You are not the problem and neither is he. The loop is. This wing is for seeing it together, each owning your own part, and choosing different moves until the loop has nothing to run on.";

export const CATCH_ROLES: { key: "pursued" | "withdrew" | "paused" | "repaired" | "stayed"; label: string }[] = [
  { key: "pursued", label: "I pursued" },
  { key: "withdrew", label: "I withdrew" },
  { key: "paused", label: "I called the pause" },
  { key: "stayed", label: "I stayed when I wanted to leave" },
  { key: "repaired", label: "I repaired first" },
];
