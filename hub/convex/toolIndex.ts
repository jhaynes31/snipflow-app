/**
 * One index of every tool in The Shire, in the words people actually say.
 * Powers the front desk on the home page ("What's going on?"), the doors
 * under it, and the coach's "Open …" buttons. Pure and self-contained so
 * the Convex bundle, the browser and the tests all load it as is.
 *
 * `href` may contain "{who}" for tools inside the Re-Centered app, which
 * keeps one copy per person on the device; the browser fills it in.
 * `room` marks tools that exist only for the person who claimed that room.
 */
export interface ToolEntry {
  key: string;
  name: string;
  /** The place it lives, as people see it. */
  place: string;
  href: string;
  /** One line: when to reach for it. */
  when: string;
  /** Words people say when this is what they need. */
  words: string[];
  room?: "metamorphosis" | "re-centered";
}

const T = (key: string, name: string, place: string, href: string, when: string, words: string[], room?: ToolEntry["room"]): ToolEntry => ({ key, name, place, href, when, words, room });

export const TOOL_INDEX: ToolEntry[] = [
  // The Shire itself
  T("hub.checkIn", "How are you, really?", "The Shire", "/check-in", "A quick check-in: weather, energy, what would help.", ["check in", "checking in", "how am i", "just here", "okay"]),
  T("hub.talk", "Talk it through", "The Shire", "/talk", "A private chat with the coach, from anywhere.", ["talk", "coach", "chat", "vent", "don't know", "unsure", "confused"]),
  T("hub.headsUp", "Send a heads-up", "The Shire", "/heads-up/new", "Tell your partner how today is and what would help, in one card.", ["heads up", "tell john", "tell jen", "let them know", "need space", "need help"]),
  T("hub.helpNow", "Need help now", "The Shire", "/help-now", "Crisis lines, your safety plan, and one tap to reach your partner.", ["not safe", "crisis", "emergency", "safety plan", "help now"]),

  // Tend
  T("tend.groundMe", "Ground Me", "Tend", "/tend/tools/groundMe", "Overwhelmed, wired, or sensory overload.", ["overwhelmed", "wired", "panic", "anxious", "sensory", "too loud", "breathe", "calm down"]),
  T("tend.shameInterrupter", "Shame Interrupter", "Tend", "/tend/tools/shameInterrupter", "Shame spiral or harsh self-talk.", ["shame", "spiral", "hate myself", "stupid", "failure", "worthless", "harsh"]),
  T("tend.goodEnough", "Good Enough", "Tend", "/tend/tools/goodEnough", "Perfectionism, or stuck on quality.", ["perfect", "perfectionism", "not good enough", "polish", "never done"]),
  T("tend.smallestStep", "Smallest Step", "Tend", "/tend/tools/smallestStep", "Can't start.", ["can't start", "cant start", "stuck", "procrastinating", "putting off", "avoiding", "get started", "begin"]),
  T("tend.shutdownRecovery", "Shutdown Recovery", "Tend", "/tend/tools/shutdownRecovery", "Shut down or overloaded. A few yes/no taps.", ["shut down", "shutdown", "frozen", "numb", "can't move", "checked out"]),
  T("tend.anchor", "Anchor", "Tend", "/tend/tools/anchor", "Low, heavy, or afraid. Read one saved anchor.", ["afraid", "scared", "heavy", "low", "anchor", "scripture", "verse"]),
  T("tend.loopBreaker", "Loop Breaker", "Tend", "/tend/tools/loopBreaker", "Careful logic has become a trap.", ["loop", "looping", "ruminating", "overthinking", "can't stop thinking", "spinning", "obsessing"]),
  T("tend.storyCheck", "Story Check", "Tend", "/tend/tools/storyCheck", "The sting of feeling rejected or left out. Just the facts.", ["stung", "rejected", "left out", "ignored", "hurt", "took it personally", "personal", "story"]),
  T("tend.evidenceBank", "Evidence Bank", "Tend", "/tend/tools/evidenceBank", "Low self-worth, or noticing something good about yourself.", ["worth", "evidence", "proof", "something good", "did well", "win"]),
  T("tend.projectThinker", "Project Thinker", "Tend", "/tend/tools/projectThinker", "A project, from idea to finished.", ["project", "plan", "big task", "finish", "steps"]),
  T("tend.focusMode", "Focus Mode", "Tend", "/tend/tools/focusMode", "One task, one timer, nothing else.", ["focus", "timer", "distracted", "concentrate", "one task"]),
  T("tend.thenOrNow", "Then or Now", "Tend", "/tend/tools/thenOrNow", "Old pain showing up in the present.", ["old pain", "flashback", "then or now", "triggered", "childhood", "past"]),
  T("tend.sitWithIt", "Sit With It", "Tend", "/tend/tools/sitWithIt", "A worry asking for the same reassurance again.", ["reassurance", "worry", "certain", "sure", "checking", "ask again", "doubt"]),
  T("tend.talkItOut", "Talk It Out", "Tend", "/tend/tools/talkItOut", "A private chat with the coach inside Tend.", ["talk it out", "coach", "vent", "process"]),
  T("tend.pauseBigMoves", "Pause Before Big Moves", "Tend", "/tend/tools/pauseBigMoves", "Revved up and about to do something big.", ["revved", "impulsive", "big decision", "quit", "buy", "send it", "rule"]),
  T("tend.repair", "Repair", "Tend", "/tend/together", "After a rupture: prepare, invite, and repair together.", ["repair", "fight", "argument", "rupture", "apologize", "make up", "conflict", "we fought"]),
  T("tend.manual", "My manual", "Tend", "/tend/my-manual", "What helps you and what doesn't, in your own words.", ["manual", "what helps me", "about me", "my manual"]),
  T("hub.partnerManual", "My partner's manual", "The Shire", "/partner", "What they chose to share about what helps them and what doesn't.", ["partner's manual", "what helps john", "what helps jen", "john's manual", "jen's manual", "read their manual", "shared sections", "what they shared"]),

  // Renewed Mind
  T("rm.rehearse", "Rehearse today's line", "Renewed Mind", "/renewed-mind", "The old line, then the truer one you wrote. Say it before you look.", ["rehearse", "today's line", "renew", "renewed mind", "affirm", "truer line", "practice"]),
  T("rm.beliefs", "Put Off, Put On", "Renewed Mind", "/renewed-mind/beliefs", "Name a belief that runs you and write the truer line in your own words.", ["belief", "limiting belief", "lie i believe", "put off", "put on", "rewrite", "old story", "i'm too much", "not enough", "mindset"]),
  T("rm.captive", "Take It Captive", "Renewed Mind", "/renewed-mind/captive", "A thought just went through. Two minutes: is it true, kind, necessary, and the truer line.", ["take it captive", "captive", "thought", "negative thought", "self talk", "is it true", "old voice", "lie is running me", "intrusive"]),
  T("rm.live", "Live It", "Renewed Mind", "/renewed-mind/live", "Practical steps that put a truer line into practice: in the marriage, outside the house, with friends, at work, with God.", ["live it", "practice", "put into practice", "try it", "step", "steps", "experiment", "make friends", "new friends", "friendship", "get out of the house", "do something"]),
  T("rm.evidence", "Evidence for the New", "Renewed Mind", "/renewed-mind/evidence", "Moments that proved a truer line.", ["proof", "evidence for", "it held", "proved", "nothing broke"]),

  // The Orchard
  T("orchard.new", "I met someone", "The Orchard", "/orchard", "Plant them: the story you're already telling, the pearls you're holding, a date to re-read it.", ["met someone", "new friend", "new person", "excited about", "someone new", "vibes", "instant connection", "best friend already"]),
  T("orchard.people", "People", "The Orchard", "/orchard", "Everyone, by layer, with what they've actually shown beside the story.", ["friends list", "my people", "layers", "circle", "who's in my life"]),
  T("orchard.slowTrust", "Slow trust", "The Orchard", "/orchard/slow-trust", "What each layer gets, what earns it, and how long it usually takes.", ["slow trust", "trust too fast", "trusting", "too fast", "pace", "pearls", "oversharing", "share too much"]),
  T("orchard.signals", "My signals", "The Orchard", "/orchard/signals", "The friendship patterns you're done with: the tell, the test, the response, and the green twin.", ["signals", "red flags", "dealbreakers", "patterns i'm done with", "never initiates", "taker", "gossip", "avoidant", "fragile ego", "one sided", "won't let me help", "savior complex", "asks but doesn't share"]),
  T("orchard.compass", "The Compass", "The Orchard", "/orchard/compass", "Conflict or a pattern with a friend: say it, adjust access, step back, or leave?", ["confront", "friend hurt me", "pattern with a friend", "should i say something", "cut them off", "step back", "leave the friendship", "friend conflict", "distance"]),
  T("orchard.lonely", "The lonely hour", "The Orchard", "/orchard/lonely", "Lonely, and not rebuilding the same friendships out of it: who not to text, and what fills instead.", ["lonely", "loneliness", "alone", "no friends", "nobody", "want to text", "miss them", "isolated", "empty"]),
  T("orchard.tooLong", "Too long", "The Orchard", "/orchard/too-long", "A person, place or situation you already know is wrong: the date you knew, what keeps you, what's changed.", ["too long", "stayed too long", "should i leave", "time to go", "let go", "quit", "leave the job", "leave the church", "move on", "release them", "when to leave"]),
  T("orchard.together", "Together", "The Orchard", "/orchard/together", "Mutual friends: what each of you chose to share.", ["mutual friend", "what do you think of", "our friends"]),
  T("orchard.ways", "Ways", "The Orchard", "/orchard/ways", "Small moves that build a friendship.", ["how to make friends", "build friendship", "invite", "host", "follow up", "no friends", "lonely"]),

  // Kept Word
  T("keptWord.words", "Open words", "Kept Word", "/kept-word", "Give your word, or close one: kept, not yet, didn't.", ["my word", "promise", "said i would", "follow through", "commit", "i'll do it", "didn't do"]),
  T("keptWord.asks", "Asks", "Kept Word", "/kept-word/asks", "Ask for something, and answer an ask.", ["ask", "request", "need something", "asked him", "asked her"]),
  T("keptWord.ways", "Ways to show up", "Kept Word", "/kept-word/ways", "Ways to love your partner without being asked.", ["show up", "love her", "love him", "without asking", "initiative", "ideas"]),

  // Re-Centered: the "partner, and me" room (one person's, in The Shire)
  T("rc.now", "A word wasn't kept", "Re-Centered, John and me", "/love-and-release/john", "Your if-then plan, decided on a steady day.", ["word wasn't kept", "broke his word", "didn't follow through", "let me down", "again", "plan"], "re-centered"),
  T("rc.whose", "Whose is this?", "Re-Centered, John and me", "/love-and-release/john/whose", "Something landed. Sort it: mine, theirs, ours, or not mine at all.", ["whose", "mine to carry", "his problem", "carrying", "responsible", "sort it", "my part"], "re-centered"),
  T("rc.pause", "The pause before rescuing", "Re-Centered, John and me", "/love-and-release/john/pause", "Four questions before you step in.", ["rescue", "rescuing", "overfunction", "overfunctioning", "step in", "fix it for him", "do it myself", "manage him"], "re-centered"),
  T("rc.landed", "Let it land", "Re-Centered, John and me", "/love-and-release/john/landed", "You didn't fix it. Write that down.", ["let it land", "didn't fix", "held back", "let it be"], "re-centered"),
  T("rc.security", "Where I stand", "Re-Centered, John and me", "/love-and-release/john/security", "One tap: where your security is sitting today.", ["security", "where i stand", "steady", "secure", "insecure"], "re-centered"),
  T("rc.ownLife", "My own life", "Re-Centered, John and me", "/love-and-release/john/own-life", "The things that are yours, and a way back into them.", ["my own life", "my things", "lost myself", "hobby", "what's mine"], "re-centered"),
  T("rc.boundaries", "My word to me", "Re-Centered, John and me", "/love-and-release/john/boundaries", "What you will and won't do, and your if-then plan.", ["boundary with john", "my word to me", "if then", "i won't", "what i will do"], "re-centered"),

  // Re-Centered: the app ("Everyone, and me"; one copy per person on the device)
  T("lr.comfort", "I need comfort", "Re-Centered, everyone and me", "/love-and-release/app/comfort?who={who}", "No questions. Breath, a truth, Jesus, a flashback check.", ["comfort", "hold me", "just be here", "crying", "sad", "alone"]),
  T("lr.fawn", "Fawn alarm", "Re-Centered, everyone and me", "/love-and-release/app/fawn?who={who}", "About to say yes when you mean no, apologize again, or shape-shift.", ["fawn", "say yes", "mean no", "people please", "people pleasing", "apologize again", "shape-shift", "can't say no"]),
  T("lr.personal", "Taking it personally", "Re-Centered, everyone and me", "/love-and-release/app/personal?who={who}", "The fact, the story, their side, and the slice that's yours.", ["taking it personally", "personally", "about me", "their tone", "what did they mean"]),
  T("lr.loop", "I'm in a loop", "Re-Centered, everyone and me", "/love-and-release/app/unhooked/loop?who={who}", "Breathe, name it, one tool, one true thing.", ["loop", "unhooked", "scrupulosity", "intrusive", "obsessing", "did i sin", "compulsion"]),
  T("lr.pause", "Pause", "Re-Centered, everyone and me", "/love-and-release/app/pause?who={who}", "A breathing circle, 5-4-3-2-1, name what you feel.", ["pause", "breathe", "ground", "slow down", "5 4 3 2 1"]),
  T("lr.boundary", "Say something hard", "Re-Centered, everyone and me", "/love-and-release/app/boundaries/new?who={who}", "A boundary draft: honest and kind is enough.", ["boundary", "say something hard", "tell them", "hard conversation", "no", "draft"]),
  T("lr.someone", "Confused about someone", "Re-Centered, everyone and me", "/love-and-release/app/someone?who={who}", "Look at what's logged before deciding.", ["confused about", "friend", "someone", "is she", "is he", "mixed signals"]),
  T("lr.newPerson", "I met someone", "Re-Centered, everyone and me", "/love-and-release/app/new-person?who={who}", "Set a pace before the attachment sets in.", ["met someone", "new friend", "excited", "new person", "too fast"]),
  T("lr.release", "Release journal", "Re-Centered, everyone and me", "/love-and-release/app/release/new?who={who}", "Set something down, with Gethsemane prompts.", ["release", "let go", "set it down", "surrender", "journal", "gethsemane"]),
  T("lr.circles", "Circles", "Re-Centered, everyone and me", "/love-and-release/app/circles?who={who}", "Who belongs where, and who moves closer or further out.", ["circles", "who to trust", "distance", "closer", "further", "red flag", "watch"]),
  T("lr.morning", "Morning, sixty seconds", "Re-Centered, everyone and me", "/love-and-release/app/daily/morning?who={who}", "Start the day with whose you are.", ["morning", "start the day", "sixty seconds", "rhythm"]),
  T("lr.evening", "Evening, sixty seconds", "Re-Centered, everyone and me", "/love-and-release/app/daily/evening?who={who}", "Set today down.", ["evening", "end of day", "bedtime", "set today down"]),

  // Every Box
  T("everyBox.boxes", "Every Box", "Every Box", "/every-box", "Every part of life, and how recently each was tended.", ["box", "boxes", "forgot", "what needs tending", "neglected", "areas of life"]),
  T("everyBox.commitments", "Commitments", "Every Box", "/every-box/commitments", "To-dos and commitments, in one place.", ["to do", "todo", "task", "commitment", "list", "remember to"]),
  T("everyBox.review", "Weekly review", "Every Box", "/every-box/review", "Look over every box, once a week.", ["review", "weekly", "look over", "sunday"]),

  // The Storehouse
  T("storehouse.month", "This month", "The Storehouse", "/storehouse", "Income, the plan, and the truth line.", ["budget", "money", "this month", "income", "bills", "spending", "plan"]),
  T("storehouse.debts", "Debts", "The Storehouse", "/storehouse/debts", "Every debt as a fact, four ways out compared.", ["debt", "debts", "credit card", "loan", "collections", "payoff", "snowball", "avalanche"]),
  T("storehouse.lifeboat", "The Lifeboat", "The Storehouse", "/storehouse/lifeboat", "Hardship programs and help that doesn't need a credit score.", ["hardship", "can't pay", "behind", "help with bills", "assistance", "lifeboat", "credit score"]),
  T("storehouse.barns", "Barns", "The Storehouse", "/storehouse/barns", "Savings, one barn at a time.", ["savings", "save", "emergency fund", "barn"]),
  T("storehouse.worries", "Money worries", "The Storehouse", "/storehouse/worries", "Write the worry down, privately, and what's true about it.", ["money worry", "worried about money", "broke", "scared about money", "finances"]),

  // The Well
  T("well.today", "The Well, today", "The Well", "/the-well", "One small thing with Jesus, whenever you come.", ["jesus", "god", "faith", "pray", "the well", "quiet time"]),
  T("well.bible", "Bible", "The Well", "/the-well/bible", "Read a passage, plainly explained.", ["bible", "read", "passage", "verse", "chapter", "scripture"]),
  T("well.lies", "Lies and truth", "The Well", "/the-well/lies", "What you were told, and what Jesus says.", ["lie", "lies", "was told", "church said", "condemned", "god is angry"]),
  T("well.untangle", "Untangle", "The Well", "/the-well/untangle", "Something you were taught, checked against what Jesus did and said.", ["untangle", "taught", "doctrine", "church trauma", "religious", "is it true"]),
  T("well.talking", "Talking with him", "The Well", "/the-well/talking", "Prayer without the churchy words.", ["pray", "prayer", "talk to god", "talking with him"]),
  T("well.remembering", "Remembering", "The Well", "/the-well/remembering", "Times he showed up. Read one when you need it.", ["remember", "remembering", "he showed up", "answered", "faithful"]),
  T("well.forMe", "For me", "The Well", "/the-well/for-me", "As a man and a husband, or as a woman and a wife: God's heart for you.", ["as a man", "as a husband", "as a woman", "as a wife", "god's heart for me"]),

  // The Crossroads
  T("crossroads.questions", "The Crossroads", "The Crossroads", "/crossroads", "Stay, another state, or another country: your answers.", ["move", "moving", "relocate", "where to live", "another country", "leave the us", "crossroads"]),
  T("crossroads.road", "The Road", "The Crossroads", "/crossroads/road", "The steps in order, with costs. Passports first.", ["passport", "visa", "steps to move", "the road", "what's next to move"]),
  T("crossroads.guide", "Ask the guide", "The Crossroads", "/crossroads/guide", "A plain comparison of the places you're weighing.", ["compare places", "which country", "which state", "guide"]),

  // Seasons, Heartwood
  T("seasons.mine", "Seasons", "Seasons", "/seasons", "What changed, in plain words, over a week, two, or a month.", ["season", "seasons", "report", "pattern", "what changed", "progress", "looking back"]),
  T("fitness.open", "Heartwood Fitness", "Heartwood Fitness", "/fitness", "Open the app, press Start, follow along.", ["workout", "exercise", "fitness", "move my body", "walk", "stretch", "pt", "physical therapy"]),

  // Metamorphosis (John's room)
  T("mm.mirror", "The Mirror", "Metamorphosis", "/metamorphosis/mirror", "Survival check, and the way back: water first.", ["survival", "survival mode", "braced", "zoomed in", "checked out", "mirror", "water"], "metamorphosis"),
  T("mm.landing", "The Landing", "Metamorphosis", "/metamorphosis/landing", "A safe place to land. Vent first; nothing gets fixed unless you ask.", ["land", "landing", "vent", "safe place", "just listen", "bad day"], "metamorphosis"),
  T("mm.tired", "Do It Tired", "Metamorphosis", "/metamorphosis/tired", "It still needs doing and you're tired. The version that fits tonight.", ["tired", "exhausted", "no motivation", "don't feel like it", "still needs doing", "do it tired"], "metamorphosis"),
  T("mm.shield", "Shield Down", "Metamorphosis", "/metamorphosis/shield", "You got defensive. What was being protected, and what's true.", ["defensive", "shield", "got defensive", "snapped", "argued back", "excuses"], "metamorphosis"),
  T("mm.quests", "Quest Log", "Metamorphosis", "/metamorphosis/quests", "One main quest at a time, small, chosen by you.", ["quest", "quests", "goal", "what to work on", "main quest", "side quest"], "metamorphosis"),
  T("mm.iron", "Iron", "Metamorphosis", "/metamorphosis/iron", "Your word to yourself, and whether you kept it.", ["iron", "my word to myself", "discipline", "promise to myself", "kept it"], "metamorphosis"),
  T("mm.scout", "The Scout", "Metamorphosis", "/metamorphosis/scout", "Notice what's needed before being asked.", ["scout", "notice", "what's needed", "initiative", "before being asked", "see it"], "metamorphosis"),
  T("mm.compass", "The Compass", "Metamorphosis", "/metamorphosis/compass", "Which way you're facing today.", ["compass", "direction", "facing", "drifting"], "metamorphosis"),
  T("mm.seen", "Seen", "Metamorphosis", "/metamorphosis/seen", "What she needs seen this week.", ["seen", "what she needs", "notice her", "love jen", "show up for her"], "metamorphosis"),
  T("mm.noCondemnation", "No Condemnation", "Metamorphosis", "/metamorphosis/no-condemnation", "When the old voice says you failed. Romans 8:1, and the failure check.", ["failed", "failure", "condemned", "disappointed god", "screwed up", "messed up", "no condemnation"], "metamorphosis"),
  T("mm.smallWays", "Small Ways", "Metamorphosis", "/metamorphosis/small-ways", "Small ways to show up, today.", ["small ways", "little things", "something small", "today"], "metamorphosis"),
  T("mm.builder", "The Builder", "Metamorphosis", "/metamorphosis/builder", "The business, one brick at a time.", ["business", "builder", "brand", "clients", "work on the business", "entrepreneur"], "metamorphosis"),
  T("mm.horizon", "The Horizon", "Metamorphosis", "/metamorphosis/horizon", "Dreams and wants, allowed.", ["dream", "dreams", "want", "wants", "horizon", "future", "hope"], "metamorphosis"),
  T("mm.present", "Present", "Metamorphosis", "/metamorphosis/present", "Coming back into the room, with her.", ["present", "absent", "zoned out", "be here", "emotionally absent", "distracted from her"], "metamorphosis"),
  T("mm.fieldGuide", "The Field Guide", "Metamorphosis", "/metamorphosis/field-guide", "Outside voices: men who've walked it, and people who get ADHD.", ["read", "resources", "article", "podcast", "adhd", "field guide", "learn"], "metamorphosis"),
  T("mm.mentor", "The mentor", "Metamorphosis", "/talk?place=metamorphosis", "Talk with the mentor.", ["mentor", "talk to the mentor", "advice", "older man"], "metamorphosis"),
];

export function toolByKey(key: string): ToolEntry | undefined {
  return TOOL_INDEX.find((t) => t.key === key);
}

const STOP = new Set(["i", "im", "i'm", "a", "an", "the", "to", "and", "or", "of", "my", "me", "is", "it", "its", "am", "be", "so", "in", "on", "at", "for", "with", "about", "that", "this", "just", "really", "very", "feel", "feeling", "feels", "like", "want", "need", "something", "he", "she", "they", "him", "her", "we", "us", "our"]);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/, "");
}

function matches(a: string, b: string): boolean {
  if (a === b) return true;
  const sa = stem(a);
  const sb = stem(b);
  if (sa === sb) return true;
  return sa.length >= 4 && sb.length >= 4 && (sa.startsWith(sb) || sb.startsWith(sa));
}

/** The best few tools for what someone typed, or none when nothing fits. */
export function searchTools(query: string, entries: ToolEntry[] = TOOL_INDEX, max = 3): ToolEntry[] {
  const q = query.trim().toLowerCase();
  const qs = tokens(q);
  if (qs.length === 0 && q.length < 2) return [];
  const scored = entries.map((t) => {
    let score = 0;
    // Whole phrases first: "can't start" in the query beats scattered words.
    for (const phrase of t.words) if (phrase.includes(" ") && q.includes(phrase)) score += 6;
    const nameTokens = tokens(t.name);
    const wordTokens = t.words.flatMap(tokens);
    const whenTokens = tokens(t.when);
    for (const w of qs) {
      if (nameTokens.some((n) => matches(n, w))) score += 3;
      if (wordTokens.some((n) => matches(n, w))) score += 2;
      else if (whenTokens.some((n) => matches(n, w))) score += 1;
    }
    return { t, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.t);
}

/**
 * Doors under the front desk: a few situations in feeling language, each
 * straight to a tool. Different for each of them; the first six show.
 */
export interface Door {
  label: string;
  toolKey: string;
}

export const DOORS_HER: Door[] = [
  { label: "Something stung", toolKey: "tend.storyCheck" },
  { label: "I'm about to overfunction", toolKey: "rc.pause" },
  { label: "A word wasn't kept", toolKey: "rc.now" },
  { label: "I'm about to say yes when I mean no", toolKey: "lr.fawn" },
  { label: "My brain won't stop looping", toolKey: "tend.loopBreaker" },
  { label: "An old lie is running me", toolKey: "rm.captive" },
  { label: "I met someone and I'm excited", toolKey: "orchard.new" },
  { label: "I'm lonely", toolKey: "orchard.lonely" },
  { label: "We need to repair", toolKey: "tend.repair" },
  { label: "Money worry", toolKey: "storehouse.worries" },
  { label: "I need comfort", toolKey: "lr.comfort" },
  { label: "Just checking in", toolKey: "hub.checkIn" },
];

export const DOORS_JOHN: Door[] = [
  { label: "I can't get started", toolKey: "tend.smallestStep" },
  { label: "I'm tired and it still needs doing", toolKey: "mm.tired" },
  { label: "I got defensive", toolKey: "mm.shield" },
  { label: "I need to land", toolKey: "mm.landing" },
  { label: "I said I would", toolKey: "keptWord.words" },
  { label: "An old lie is running me", toolKey: "rm.captive" },
  { label: "I met someone and I'm excited", toolKey: "orchard.new" },
  { label: "I'm lonely", toolKey: "orchard.lonely" },
  { label: "Something stung", toolKey: "tend.storyCheck" },
  { label: "We need to repair", toolKey: "tend.repair" },
  { label: "Money worry", toolKey: "storehouse.worries" },
  { label: "Just checking in", toolKey: "hub.checkIn" },
];

export const DOORS_EITHER: Door[] = [
  { label: "Something stung", toolKey: "tend.storyCheck" },
  { label: "I can't get started", toolKey: "tend.smallestStep" },
  { label: "My brain won't stop looping", toolKey: "tend.loopBreaker" },
  { label: "An old lie is running me", toolKey: "rm.captive" },
  { label: "We need to repair", toolKey: "tend.repair" },
  { label: "Money worry", toolKey: "storehouse.worries" },
  { label: "Just checking in", toolKey: "hub.checkIn" },
];

/** The tag the coach writes after naming a tool; the app turns it into an Open button. */
export const TOOL_TAG = /\[\[\s*(?:tool:)?\s*([a-zA-Z0-9.]+)\s*\]\]/g;

export type ReplyPart = { kind: "text"; text: string } | { kind: "tool"; tool: ToolEntry };

/** Splits a coach reply into text and tool buttons. Unknown tags are dropped. */
export function splitReply(text: string, entries: ToolEntry[] = TOOL_INDEX): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let last = 0;
  const seen = new Set<string>();
  for (const m of text.matchAll(TOOL_TAG)) {
    const before = text.slice(last, m.index);
    if (before.trim()) parts.push({ kind: "text", text: before.replace(/\s+$/, "") });
    const tool = entries.find((t) => t.key === m[1]);
    if (tool && !seen.has(tool.key)) {
      parts.push({ kind: "tool", tool });
      seen.add(tool.key);
    }
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = text.slice(last);
  if (tail.trim()) parts.push({ kind: "text", text: tail.replace(/^\s+/, "") });
  // Dropped or repeated tags leave text on both sides; join it back into one piece.
  const merged: ReplyPart[] = [];
  for (const p of parts) {
    const prev = merged[merged.length - 1];
    if (p.kind === "text" && prev?.kind === "text") prev.text = `${prev.text} ${p.text}`;
    else merged.push(p);
  }
  for (const p of merged) if (p.kind === "text") p.text = p.text.replace(/\s+/g, " ").trim();
  return merged;
}

/** The compact list the coach reads. Only tools this person can open. */
export function coachToolList(entries: ToolEntry[]): string {
  return entries.map((t) => `${t.key}: ${t.name} (${t.place}). ${t.when}`).join("\n");
}

/** Tools this person can open: room tools only for the room's owner. */
export function availableTools(rooms: { metamorphosis: boolean; reCentered: boolean }, entries: ToolEntry[] = TOOL_INDEX): ToolEntry[] {
  return entries.filter((t) => !t.room || (t.room === "metamorphosis" ? rooms.metamorphosis : rooms.reCentered));
}
