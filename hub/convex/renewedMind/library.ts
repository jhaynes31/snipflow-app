/**
 * Live It: practical steps that put a truer line into practice, where a
 * belief is actually felt, not recited. Small enough for this week. Each
 * theme names the old lines it tends to sit under; `suggestFor` matches a
 * person's own words to themes by keyword. Self-contained for the tests.
 */
export type Arena = "marriage" | "outside" | "friends" | "work" | "faith" | "alone";

export const ARENA_LABEL: Record<Arena, string> = {
  marriage: "In the marriage",
  outside: "Outside the house",
  friends: "New and old friends",
  work: "Work and the business",
  faith: "With God",
  alone: "On your own",
};

export interface Step {
  arena: Arena;
  text: string;
}

export interface Theme {
  key: string;
  /** The old line, roughly. */
  title: string;
  keywords: string[];
  steps: Step[];
}

export const THEMES: Theme[] = [
  {
    key: "tooMuch",
    title: "I'm too much",
    keywords: ["too much", "too intense", "too loud", "too needy", "too sensitive", "overwhelming", "a lot"],
    steps: [
      { arena: "marriage", text: "Tell John one real need this week, in full, without shrinking it or adding \"but it's fine if not.\"" },
      { arena: "outside", text: "Ask a store clerk or barista one follow-up question. Let the conversation be a sentence longer than it needs to be." },
      { arena: "friends", text: "Send a friend a voice message longer than thirty seconds about your actual day." },
      { arena: "work", text: "Say the whole idea in a meeting or message, not the trimmed version." },
      { arena: "faith", text: "Pray out loud, alone, for as long as it takes. He has never once said \"that's enough.\"" },
      { arena: "alone", text: "Take up the whole couch. Play the song again. Notice that nothing bad happens." },
    ],
  },
  {
    key: "cantSayNo",
    title: "I can't say no",
    keywords: ["say no", "can't say no", "yes when", "people please", "pleasing", "keep everyone happy", "let them down", "disappoint"],
    steps: [
      { arena: "marriage", text: "Decline one small ask from John this week, kindly and plainly, and notice what actually happens after." },
      { arena: "outside", text: "Say \"no, thank you\" to one upsell, sample, or signup, without explaining why." },
      { arena: "friends", text: "Turn down one invitation honestly: \"I can't this week.\" No excuse, no apology paragraph." },
      { arena: "work", text: "Push back on one deadline or extra task once: \"I can do it by Thursday, not Tuesday.\"" },
      { arena: "faith", text: "Skip one religious \"should\" this week on purpose, and watch whether God's posture toward you changes. It won't." },
      { arena: "alone", text: "Leave a text unanswered until tomorrow morning." },
    ],
  },
  {
    key: "burden",
    title: "I'm a burden",
    keywords: ["burden", "in the way", "bother", "too needy", "asking too much", "imposing", "trouble"],
    steps: [
      { arena: "marriage", text: "Ask John for one specific thing: \"Can you handle dinner Thursday?\" Then let him, start to finish." },
      { arena: "outside", text: "Let someone hold the door and say only \"thank you.\" Accept help you didn't ask for once." },
      { arena: "friends", text: "Ask a friend to sit with you while you do a hard task, even over the phone. Being helped is what friends are for." },
      { arena: "work", text: "Ask a question you've been Googling for a week." },
      { arena: "faith", text: "Bring him the thing you think is too small to pray about." },
      { arena: "alone", text: "Rest for twenty minutes in the middle of the day without earning it first." },
    ],
  },
  {
    key: "ifTheyKnew",
    title: "If they really knew me, they'd leave",
    keywords: ["knew me", "really knew", "they'd leave", "hide", "hiding", "mask", "unlovable", "fake", "found out"],
    steps: [
      { arena: "marriage", text: "Tell John one small true thing you've been keeping tidy. Watch him stay." },
      { arena: "outside", text: "Show up somewhere without polishing first: the messy bun, the honest answer to \"how are you?\"" },
      { arena: "friends", text: "Share one real struggle with one friend this week, not the resolved version." },
      { arena: "work", text: "Say \"I don't know yet\" out loud once." },
      { arena: "faith", text: "Read John 13:1-5, and remember who was at that table when he washed feet." },
      { arena: "alone", text: "Write the thing you're most afraid they'd find out. Then read it as if a friend wrote it." },
    ],
  },
  {
    key: "notEnough",
    title: "I'm not enough, or I'm lazy",
    keywords: ["not enough", "never enough", "lazy", "behind", "falling short", "useless", "should have done more", "not doing enough", "failure to launch"],
    steps: [
      { arena: "marriage", text: "Tell John one thing you finished today, however small. Say it plainly, no \"just.\"" },
      { arena: "outside", text: "Do one errand and go home. Don't add three more to make the trip \"worth it.\"" },
      { arena: "friends", text: "Say yes to a hangout even though the house isn't clean and the week wasn't productive." },
      { arena: "work", text: "Stop one task at good enough. Ship it. Tend's Good Enough tool can hold your hand." },
      { arena: "faith", text: "Sit for ten minutes doing nothing for God. Matthew 11:28: the invitation is to rest, not to catch up." },
      { arena: "alone", text: "Eat lunch sitting down, at a table, before the work is done." },
    ],
  },
  {
    key: "alone",
    title: "I'm on my own with this",
    keywords: ["on my own", "alone", "nobody", "no one", "by myself", "unsupported", "lonely"],
    steps: [
      { arena: "marriage", text: "Ask John to sit next to you while you do the hard thing. He doesn't have to help; he has to be there." },
      { arena: "outside", text: "Say hello to the same person twice: a neighbor, the librarian, the person at the gym desk. Twice is how it starts." },
      { arena: "friends", text: "Invite one person for coffee with a specific day and time. Vague invitations are how we protect ourselves from being alone together." },
      { arena: "work", text: "Ask one person in your field one real question this week." },
      { arena: "faith", text: "Say Matthew 28:20 out loud on the drive: \"I am with you always.\" It's a promise, not a feeling." },
      { arena: "alone", text: "Send a heads-up in The Shire instead of carrying the day silently." },
    ],
  },
  {
    key: "fixEverything",
    title: "If I don't handle it, it falls apart",
    keywords: ["fix", "handle", "falls apart", "everything", "manage", "overfunction", "rescue", "do it myself", "hold it all", "if i stop"],
    steps: [
      { arena: "marriage", text: "Let John own one thing start to finish this week, including the part where it might go differently than you'd do it." },
      { arena: "outside", text: "Leave one thing undone when you leave the house. The dish, the pillow. Come back and notice the world kept turning." },
      { arena: "friends", text: "When a friend shares a problem, ask \"do you want help or a witness?\" before doing anything." },
      { arena: "work", text: "Delegate one task without a backup plan for it." },
      { arena: "faith", text: "Hand one worry over in words, then don't pick it back up for an hour. Re-Centered's Let it land is there for after." },
      { arena: "alone", text: "Sit on your hands through one silence. The pause before rescuing, in Re-Centered, has the four questions." },
    ],
  },
  {
    key: "failed",
    title: "I've failed too many times",
    keywords: ["failed", "failure", "screw up", "mess up", "always fail", "never follow through", "give up", "quit", "too late"],
    steps: [
      { arena: "marriage", text: "Tell John \"I'm trying again on this,\" about one thing, and give your word in Kept Word small enough to keep." },
      { arena: "outside", text: "Go back to one place you stopped going. Once. The gym, the class, the church. Just walk in." },
      { arena: "friends", text: "Reach out to one person you went quiet on. \"I dropped the ball; I'd like to pick it back up.\"" },
      { arena: "work", text: "Do the five-minute version of the thing you abandoned. Tend's Smallest Step." },
      { arena: "faith", text: "Read John 21:15-17. Peter got his job back over breakfast, three times, by name." },
      { arena: "alone", text: "Start again today without a plan to make up for the gap." },
    ],
  },
  {
    key: "seen",
    title: "It's not safe to be seen, or to be wrong",
    keywords: ["seen", "exposed", "wrong", "defensive", "criticized", "judged", "stupid", "look dumb", "embarrass", "can't be wrong"],
    steps: [
      { arena: "marriage", text: "Say \"you're right\" once this week, without a \"but.\" Metamorphosis's Shield Down can go first." },
      { arena: "outside", text: "Ask a question in a group where you might look like you don't know. You don't know; that's why you're asking." },
      { arena: "friends", text: "Tell a friend one want, out loud: \"I'd love it if we did this again.\"" },
      { arena: "work", text: "Show one piece of unfinished work to one person and ask what they see." },
      { arena: "faith", text: "Pray a complaint. The Psalms are full of them, and he kept every one." },
      { arena: "alone", text: "Post, send, or share the thing at 80 percent." },
    ],
  },
  {
    key: "scorekeeper",
    title: "God is disappointed, or keeping score",
    keywords: ["disappointed", "keeping score", "punish", "angry god", "not praying enough", "not reading", "backslid", "unworthy", "god is mad"],
    steps: [
      { arena: "marriage", text: "Tell John what you're afraid God thinks of you. Let it be heard by one person." },
      { arena: "outside", text: "Go somewhere restful on a Sunday and call it Sabbath, not skipping." },
      { arena: "friends", text: "Ask one friend of faith what they'd say to someone who believed this. Listen without arguing." },
      { arena: "work", text: "Take the break you'd tell an employee to take." },
      { arena: "faith", text: "Read Luke 15:20. The father ran. He didn't ask how long. Then sit with The Well's Lies and truth card for this." },
      { arena: "alone", text: "Skip the devotional one morning and notice you're still his." },
    ],
  },
  {
    key: "dontMatter",
    title: "I don't matter, or my wants don't count",
    keywords: ["don't matter", "doesn't matter", "my wants", "my needs", "invisible", "unimportant", "second", "afterthought"],
    steps: [
      { arena: "marriage", text: "State a preference for dinner, the show, the weekend, before John asks, and hold it." },
      { arena: "outside", text: "Take the first seat, order what you actually want, ask for the sauce on the side." },
      { arena: "friends", text: "Suggest the plan instead of waiting to be invited." },
      { arena: "work", text: "Name your price or your hours once without softening it." },
      { arena: "faith", text: "Read Matthew 10:29-31 and count one hair, on purpose." },
      { arena: "alone", text: "Buy the good coffee. Small, and yours." },
    ],
  },
  {
    key: "friends",
    title: "Building friendships, for any line",
    keywords: ["friend", "friends", "friendship", "community", "people", "lonely", "isolated"],
    steps: [
      { arena: "friends", text: "Pick one recurring thing (a class, a group, a church table) and go three times before deciding anything about it." },
      { arena: "friends", text: "Ask one person one question about their life, remember the answer, and ask about it next time." },
      { arena: "friends", text: "Invite someone for coffee with a day and a time. \"Thursday at ten?\" beats \"we should get together.\"" },
      { arena: "friends", text: "Say one true thing about yourself early, before you've earned it. Friendship moves at the speed of the first real sentence." },
      { arena: "friends", text: "Text a person you like, with no reason. \"Thought of you.\" That's the whole message." },
      { arena: "marriage", text: "Tell John who you'd like to know better, and ask him the same. Then help each other make one invitation." },
    ],
  },
];

/** Themes that match the person's own words, best first; the friendship theme always last as a general one. */
export function suggestFor(oldLine: string, newLine: string, max = 3): Theme[] {
  const text = `${oldLine} ${newLine}`.toLowerCase();
  const scored = THEMES.filter((t) => t.key !== "friends")
    .map((t) => ({ t, score: t.keywords.filter((k) => text.includes(k)).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.t);
  return scored.slice(0, max);
}

export function themeByKey(key: string): Theme | undefined {
  return THEMES.find((t) => t.key === key);
}

/** Lines the coach writes as steps: "- [Marriage] Tell John ..." → text, with the arena read off when it is there. */
export function extractSteps(reply: string): { text: string; arena: Arena | null }[] {
  const out: { text: string; arena: Arena | null }[] = [];
  for (const raw of reply.split("\n")) {
    const m = raw.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*\S)\s*$/);
    if (!m) continue;
    let text = m[1];
    let arena: Arena | null = null;
    const tag = text.match(/^\[([^\]]+)\]\s*/);
    if (tag) {
      const label = tag[1].toLowerCase();
      arena = (Object.keys(ARENA_LABEL) as Arena[]).find((a) => label.includes(a) || ARENA_LABEL[a].toLowerCase().includes(label)) ?? null;
      text = text.slice(tag[0].length);
    }
    if (text.length >= 12) out.push({ text: text.slice(0, 300), arena });
  }
  return out;
}
