/**
 * Why loops happen: three lenses. Brain science, psychology, faith. One
 * idea per card, plain words, "so what" at the bottom, tagged to stages,
 * paired across lenses where they point the same way. Scripture is a close
 * plain rendering with a link to the text in The Well.
 */
export type Lens = "brain" | "mind" | "faith";
export type StageKey = "trigger" | "body" | "story" | "urge" | "behavior" | "payoff" | "fallout" | "reset" | "all";

export interface LearnCard {
  key: string;
  lens: Lens;
  n: number;
  title: string;
  body: string;
  soWhat: string;
  stages: StageKey[];
  /** Keys of paired cards in other lenses. */
  pairs?: string[];
  /** Which tool a "Try it" button opens, as a loop sub-page. */
  tryIt?: { label: string; page: string };
  /** Psychology: the model it comes from. */
  from?: string;
  /** Faith: the reference, a close plain rendering, where to read it, and a prayer. */
  ref?: string;
  passage?: string;
  slug?: string;
  chapter?: number;
  pray?: string;
}

export const LENS_NAMES: Record<"shire" | "chrysalis", Record<Lens, string>> = {
  shire: { brain: "The Roots", mind: "The Path", faith: "The Light" },
  chrysalis: { brain: "The Wiring", mind: "The Pattern", faith: "The New Creation" },
};
export const LENS_QUESTION: Record<Lens, string> = { brain: "What's happening in my brain and body?", mind: "Why do my thoughts, feelings, and history keep this going?", faith: "What does God say about loops, falling, and freedom?" };

const B = (n: number, title: string, body: string, soWhat: string, stages: StageKey[], extra: Partial<LearnCard> = {}): LearnCard => ({ key: `brain-${n}`, lens: "brain", n, title, body, soWhat, stages, ...extra });
const M = (n: number, title: string, from: string, body: string, soWhat: string, stages: StageKey[], extra: Partial<LearnCard> = {}): LearnCard => ({ key: `mind-${n}`, lens: "mind", n, title, from, body, soWhat, stages, ...extra });
const F = (n: number, title: string, ref: string, passage: string, slug: string, chapter: number, body: string, soWhat: string, pray: string, stages: StageKey[], extra: Partial<LearnCard> = {}): LearnCard => ({ key: `faith-${n}`, lens: "faith", n, title, ref, passage, slug, chapter, body, soWhat, pray, stages, ...extra });

export const LEARN_CARDS: LearnCard[] = [
  // Brain
  B(1, "Your brain loves shortcuts", "Repeated actions become automatic so your brain can save energy. Great for brushing your teeth, tricky for loops. The loop runs without asking you because you've run it so many times.", "The loop isn't a character flaw. It's an over-practiced shortcut.", ["all"]),
  B(2, "Cue, routine, reward", "Habits run on a simple cycle: something cues you, you do the routine, you get a reward, even a bad one like a minute of numbness. The cycle doesn't care whether the reward is good for you.", "To change a loop, keep the cue and the need but swap the routine.", ["trigger", "behavior", "payoff"], { pairs: ["mind-2", "faith-6"], tryIt: { label: "Set a new-path habit", page: "habits" } }),
  B(3, "Paths that get walked get deeper", "Brain connections that fire together get stronger together. A new path starts faint, like a trail through tall grass, and gets clearer every time you walk it. The old trail doesn't vanish; it grows over when you stop using it.", "Every practice counts, even a small one, even a practice run.", ["behavior", "all"], { pairs: ["faith-7"], tryIt: { label: "Log a practice", page: "habits" } }),
  B(4, "Stress puts autopilot in charge", "When you're stressed or tired, your brain leans on old habits more and on careful thinking less. That's why the loop wins at 11pm and not at 10am.", "HALT moments (hungry, angry, lonely, tired) are high-risk. Plan for them in advance.", ["trigger"], { tryIt: { label: "Add a situation guardrail", page: "guardrails" } }),
  B(5, "The reward comes first, the cost comes later", "Your brain weighs instant relief far more heavily than future fallout. A minute of relief now beats an hour of regret later, every time, if you leave it to the brain's own math.", "That's why 'I know better' isn't enough. You need exits that work in the moment.", ["payoff", "fallout"], { tryIt: { label: "Pick an exit for this stage", page: "map" } }),
  B(6, "The body moves before the mind catches up", "Your nervous system often reacts (racing heart, tight chest, shutdown) before you're consciously aware of anything. The body is reading the room faster than your thoughts can.", "Body signals are your earliest warning system. Learn yours.", ["body"], { pairs: ["faith-2"], tryIt: { label: "Write my body signs", page: "guardrails" } }),
  B(7, "Your window", "Everyone has a range where they can think clearly and respond well. Outside it, you either rev up (anxious, angry) or shut down (numb, frozen). Nothing wise gets decided outside the window.", "Get back in your window first (breathing, movement, grounding). Then solve the problem.", ["body", "urge"], { tryIt: { label: "Ground Me", page: "ground" } }),
  B(8, "Urges peak and pass", "Urges rise, crest, and fall like waves, usually faster than you expect if you don't act on them. Acting on one teaches your brain that the only way down is through.", "You don't have to win against the urge, just outlast it.", ["urge"], { tryIt: { label: "Urge surfing", page: "map" } }),
  B(9, "Shame feeds the loop", "Shame makes you want to hide and numb, which is often the loop itself. Self-compassion is linked to more accountability, not less: people who are kind to themselves after a slip get back on track sooner.", "Be kind to yourself after a slip. It's strategy, not softness.", ["reset"], { pairs: ["mind-9", "faith-3"], tryIt: { label: "An encouragement card", page: "deck" } }),
  B(10, "Plans beat willpower", "'If X, then I'll Y' plans make the healthy choice automatic before the moment hits. Willpower is a muscle that tires; a plan is a path that's already laid.", "Decide now, so future-you doesn't have to decide under pressure.", ["urge", "trigger"], { tryIt: { label: "Write an if-then plan", page: "guardrails" } }),
  B(11, "Loops often started as protection", "Many patterns were the best tool a younger you had. Numbing kept you from feeling what you couldn't carry. Pleasing kept the peace. The pattern worked, once.", "Honor where it came from, and give that part a better tool now.", ["payoff", "all"], { tryIt: { label: "Inner kids", page: "kids" } }),
  B(12, "Slips are normal in change", "Change rarely happens in a straight line. Most people cycle back several times before a new pattern sticks. The researchers who study this draw it as a spiral, not a line.", "A slip isn't the end of the road. It's part of the road.", ["reset", "fallout"], { pairs: ["mind-10", "faith-9"] }),
  // Psychology
  M(1, "Thoughts, feelings, and actions feed each other", "Cognitive Behavioral Therapy", "What you think shapes how you feel, how you feel shapes what you do, and what you do confirms what you think. Round and round.", "You can break in at any one of the three. Change the thought, calm the feeling, or change the action, and the whole loop shifts.", ["story", "urge", "behavior"]),
  M(2, "Relief is a powerful teacher", "Learning psychology (negative reinforcement)", "When something makes a bad feeling go away, even briefly, your brain learns 'do that again'. Avoiding, pleasing, numbing, and shutting down all 'work' for a moment, so they get reinforced.", "The loop isn't stupid. It's been rewarded. You'll need to put up with a little discomfort while the new path starts paying off.", ["payoff"], { pairs: ["brain-2", "faith-6"] }),
  M(3, "Core beliefs are glasses you forgot you're wearing", "Schema therapy", "Early experiences form deep beliefs about yourself, others, and the world ('I'm too much', 'People leave', 'I have to earn love'). They filter everything, so life keeps seeming to prove them.", "The Beliefs workshop is where you take the glasses off and check whether they're the right prescription.", ["story"], { tryIt: { label: "Push back on a belief", page: "beliefs" } }),
  M(4, "Every loop has a protector", "Parts and inner-child work", "The part of you that runs the loop is usually trying to protect a younger, more tender part from pain. It's not the enemy. It's an overworked guard.", "Thank it, then let adult-you take over the job.", ["all"], { tryIt: { label: "Inner kids", page: "kids" } }),
  M(5, "You are not your thoughts", "Acceptance and Commitment Therapy", "A thought like 'I always mess this up' is a thought, not a fact. Try saying: 'I'm noticing the thought that I always mess this up.' Notice the space that creates.", "You don't have to win an argument with a thought to stop obeying it.", ["story"], { pairs: ["faith-5"] }),
  M(6, "Avoidance shrinks your world", "Anxiety research", "Every time you dodge the scary thing, it feels a little scarier next time. Every time you face it, even in a small way, it shrinks.", "Small, brave steps toward what the loop avoids are some of the most powerful exits there are.", ["urge", "behavior"]),
  M(7, "Old roles, new stage", "Family systems", "In families we take on roles: the peacekeeper, the fixer, the invisible one, the strong one. We often keep playing the role long after we've left that house.", "Ask: 'What role am I playing right now? Did I choose it?'", ["trigger", "story"], { tryIt: { label: "Where it came from", page: "kids" } }),
  M(8, "The 'what the heck' effect", "Relapse-prevention research", "After one slip, people often think 'I already blew it, might as well go all the way.' That thought, not the slip, is what turns a stumble into a full relapse.", "When you slip, the most important moment is the next one. Stop at one.", ["behavior", "reset"], { pairs: ["faith-9"] }),
  M(9, "Self-compassion makes you more accountable", "Self-compassion research", "Studies have found that people who treat their failures with kindness are more motivated to improve and take responsibility, not less. Harsh self-criticism tends to lead to hiding.", "Talk to yourself like a coach who believes in you, not a judge.", ["reset"], { pairs: ["faith-3", "brain-9"] }),
  M(10, "Change happens in stages", "Stages of Change model", "People move through stages: not ready, thinking about it, preparing, doing, maintaining. Slipping back is a normal part of the cycle, not a failure of it.", "Ask 'What stage am I in with this loop?' and take the next step from there.", ["all"], { pairs: ["brain-12", "faith-9"], tryIt: { label: "Set my stage of change", page: "settings" } }),
  M(11, "We repeat what feels familiar", "Attachment and relationship psychology", "Familiar can feel 'safe' even when it's painful. That's why we drift toward patterns, and sometimes people, that match what we grew up with.", "'This feels familiar' is a cue to slow down, not proof it's right.", ["trigger"]),
  M(12, "Needs, not flaws", "Needs-based psychology", "Underneath most loops is a legitimate need: rest, safety, connection, being seen. The loop is a bad strategy for a good need.", "Meet the need on purpose and the loop loses its job.", ["payoff"], { tryIt: { label: "What this stage gives me", page: "map" } }),
  // Faith
  F(1, "Even Paul was stuck in a loop", "Romans 7:15-25", "I do not do what I want, but what I hate I do… Thanks be to God, who delivers me through Jesus Christ our Lord.", "romans", 7, "One of the greatest followers of Jesus described the exact feeling of a loop, then ended with thanks for the one who delivers him.", "Being stuck doesn't mean your faith is fake. It means you're human and in good company.", "Lord, I do the thing I hate. Deliver me the way you delivered Paul.", ["all"]),
  F(2, "Temptation has stages, so you can catch it early", "James 1:14-15", "Each one is tempted when, by their own desire, they are dragged away and enticed. Then desire, once it has conceived, gives birth to sin; and sin, when full-grown, gives birth to death.", "james", 1, "Desire, enticed, conceived, born, full-grown. Scripture describes a progression, not a single moment.", "This is the loop map, written two thousand years ago. The earlier you catch it, the easier the exit.", "Show me the first step, Lord, while it's still small.", ["trigger", "body", "story", "urge", "behavior"], { pairs: ["brain-6"] }),
  F(3, "No condemnation", "Romans 8:1", "There is now no condemnation for those who are in Christ Jesus.", "romans", 8, "Conviction says, 'That's not who you are, come back.' Condemnation says, 'That's exactly who you are, hide.' Only one of those is God's voice.", "Shame is fuel for the loop. Grace takes the fuel away.", "I hear the voice that says hide. I choose the one that says come back.", ["reset"], { pairs: ["brain-9", "mind-9"] }),
  F(4, "There's always a way out", "1 Corinthians 10:13", "God is faithful; he will not let you be tempted beyond what you can bear. With the temptation he will also provide a way out, so that you can endure it.", "1-corinthians", 10, "Every temptation comes with a door. Not always the door you'd pick, but a door.", "Every exit ramp on your loop map is a way out. Look for the door at every stage. It's there.", "Show me the door, Lord. I'll walk through it.", ["all"], { tryIt: { label: "Exits for this stage", page: "map" } }),
  F(5, "Take thoughts captive", "2 Corinthians 10:5", "We take captive every thought to make it obedient to Christ.", "2-corinthians", 10, "We're invited to examine our thoughts and bring them under the truth, not just let them run.", "This is what you're doing in the Beliefs workshop. You don't have to believe every thought that shows up.", "This thought is not the boss of me. I bring it to you.", ["story"], { pairs: ["mind-5"], tryIt: { label: "Push back on a belief", page: "beliefs" } }),
  F(6, "Put off, put on", "Ephesians 4:22-24", "Put off your old self… be made new in the attitude of your minds; and put on the new self, created to be like God.", "ephesians", 4, "Scripture doesn't just say stop. It says take off the old and put on the new.", "Don't just try to quit a loop. Replace it with a new path habit.", "Help me put on the new thing, not just take off the old.", ["behavior"], { pairs: ["brain-2", "mind-2"], tryIt: { label: "Set a new-path habit", page: "habits" } }),
  F(7, "Renewing the mind", "Romans 12:2", "Be transformed by the renewing of your mind.", "romans", 12, "Renewal is a process, not a single event. Science calls it neuroplasticity: your brain physically changes as you practice new thoughts.", "Every time you practice the new path, you're taking part in transformation.", "Renew my mind, one practice at a time.", ["all"], { pairs: ["brain-3"] }),
  F(8, "Don't leave the house empty", "Matthew 12:43-45", "When an impure spirit comes out of a person… it says, 'I will return to the house I left.' It finds the house unoccupied, swept clean and put in order, and brings seven others.", "matthew", 12, "Jesus describes a house swept clean but left empty, and what left comes back with company.", "Removing a loop without filling the space with something good leaves you open to falling back. Fill it: new habits, connection, rest, worship.", "Fill the space the loop leaves, Lord. Don't let me leave it empty.", ["behavior", "payoff"]),
  F(9, "Fall seven times, rise eight", "Proverbs 24:16", "Though the righteous fall seven times, they rise again.", "proverbs", 24, "Being righteous isn't defined by never falling. It's defined by getting back up.", "Your next step after a slip is the one that matters most.", "I'm down. Help me up. Again.", ["reset"], { pairs: ["mind-8", "brain-12"] }),
  F(10, "New every morning", "Lamentations 3:22-23", "His compassions never fail. They are new every morning; great is your faithfulness.", "lamentations", 3, "The mercy doesn't carry over a balance from yesterday; it's issued fresh.", "You don't carry yesterday's loop into today's grace. Start from here.", "Thank you that this morning's mercy is new, and mine.", ["reset"]),
  F(11, "Work it out, because he's working in you", "Philippians 2:12-13", "Work out your salvation with fear and trembling, for it is God who works in you to will and to act in order to fulfill his good purpose.", "philippians", 2, "This is the partnership. You show up and practice; God supplies the power and the desire.", "You're not doing this alone, and you're not doing nothing.", "You work in me. I'll work it out.", ["all"]),
  F(12, "The cycle ends with you", "Exodus 20:5-6; Ezekiel 18:20; 2 Corinthians 5:17", "Showing love to a thousand generations… The child will not share the guilt of the parent… If anyone is in Christ, the new creation has come.", "2-corinthians", 5, "Patterns can pass down generations, but God's love extends to a thousand of them, and each person can choose a new way. In Christ you're a new creation.", "You can be the one in your family line where the loop stops.", "Let it stop with me, Lord, and let what I pass down be yours.", ["all"], { tryIt: { label: "Where it came from, and what I'll pass down", page: "kids" } }),
  F(13, "Ask God to show you the pattern", "Psalm 139:23-24", "Search me, God, and know my heart; test me and know my anxious thoughts. See if there is any offensive way in me, and lead me in the way everlasting.", "psalms", 139, "Asking God to reveal your loop is a prayer he loves to answer.", "Use it when building a new loop map.", "Search me. Show me the loop I can't see.", ["all"]),
  F(14, "Even God's people looped", "Judges 2:16-19; Numbers 14; Numbers 32:13", "Whenever the Lord raised up a judge for them… but when the judge died, the people returned to ways even more corrupt… he made them wander in the wilderness forty years.", "judges", 2, "Israel cycled through forgetting, falling, crying out, being rescued, and resting, again and again. God never stopped pursuing them.", "God is patient with loops. His patience is your invitation to keep going, not permission to stay.", "You were patient with them. Be patient with me, and don't let me settle here.", ["all"]),
  F(15, "He remembers we are dust", "Psalm 103:13-14", "As a father has compassion on his children, so the Lord has compassion on those who fear him; for he knows how we are formed, he remembers that we are dust.", "psalms", 103, "God isn't surprised by your weakness.", "Bring it to him instead of hiding it.", "You know what I'm made of. I bring you the dust.", ["reset"]),
];

export const LEARN_MAP: Record<string, LearnCard> = Object.fromEntries(LEARN_CARDS.map((c) => [c.key, c]));

/** Up to one card per lens for a stage, for the "Why this happens" strip. */
export function cardsForStage(stageKey: string, faithOn: boolean): LearnCard[] {
  const out: LearnCard[] = [];
  for (const lens of ["brain", "mind", "faith"] as Lens[]) {
    if (lens === "faith" && !faithOn) continue;
    const exact = LEARN_CARDS.find((c) => c.lens === lens && c.stages.includes(stageKey as StageKey));
    const any = LEARN_CARDS.find((c) => c.lens === lens && c.stages.includes("all"));
    const pick = exact ?? any;
    if (pick) out.push(pick);
  }
  return out;
}

/** The topics where two or three lenses point the same way. */
export function pairedSets(): LearnCard[][] {
  const seen = new Set<string>();
  const sets: LearnCard[][] = [];
  for (const c of LEARN_CARDS) {
    if (!c.pairs?.length || seen.has(c.key)) continue;
    const group = [c, ...c.pairs.map((k) => LEARN_MAP[k]).filter(Boolean)];
    for (const g of group) seen.add(g.key);
    sets.push(group);
  }
  return sets;
}
