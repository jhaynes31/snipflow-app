import type { Ring } from '@/db/types'

/**
 * The guide for one layer (2026-10-03, Jen's ask): how long someone usually
 * sits here before the next layer in, what to expect from each other, the
 * rhythm of talking and seeing each other, and what would qualify someone to
 * move closer. Suggested words for the suggested layers; every line can be
 * made hers in the layer's own page, and a layer she built gets a plain
 * starting point by its position.
 */
export interface LayerGuide {
  /** How long people usually spend here before the next layer in is even a question. */
  timeline: string
  /** How we talk to each other, and about what. */
  talk: string
  /** How often we're in touch. */
  howOften: string
  /** How often, and where, we see each other. */
  hangOut: string
  /** Parts of myself that are safe to share and give here. */
  share: string[]
  /** Parts of myself that stay with closer layers, for now. */
  keep: string[]
  /** Reasonable expectations: patterns of behavior and actions to expect from someone here. */
  patterns: string[]
  /** What I owe someone in this layer. */
  mine: string[]
  /** What they owe me here. */
  theirs: string[]
  /** The character and qualities that would qualify someone to move to the next layer in. */
  qualities: string[]
}

export const GUIDE_LABEL: Record<keyof LayerGuide, string> = {
  timeline: 'How long here, usually',
  talk: 'How we talk',
  howOften: 'How often we talk',
  hangOut: 'How often we see each other',
  share: 'Safe to share and give here',
  keep: 'Stays closer in, for now',
  patterns: 'Reasonable expectations of them',
  mine: 'What I owe them',
  theirs: 'What they owe me',
  qualities: 'What would qualify someone to move closer',
}

const GUIDES: Record<string, LayerGuide> = {
  'ring-outer': {
    timeline: 'One to three months of paths crossing, with a few real conversations, before Acquaintances is even a question. No one is behind for staying here longer.',
    talk: 'Small talk and shared-setting talk: the place we both are, the thing we both do. Nothing personal yet, in either direction.',
    howOften: 'When we happen to be in the same place. No texting expected, no reply owed.',
    hangOut: 'Only in groups, or the place we know each other from. Not one-on-one yet.',
    share: ['My name and what I do', 'Small talk, shared interests, the weather of my week', 'Warmth and good manners', 'A little of my time, in the shared setting'],
    keep: ['My story and my past', 'My struggles, my health, my trauma', 'My marriage and home life', 'My home address and my phone for anytime calls', 'Favors, money, and my labor'],
    patterns: ['Friendly when we cross paths', 'Basic manners', 'No requests for favors, rides, or money', 'Not pushing for more than the setting gives'],
    mine: ['Be kind and honest', 'Keep my own pace; no oversharing to speed it up', 'Notice how they treat the people who can do nothing for them'],
    theirs: ['Basic respect', 'Nothing else is owed'],
    qualities: ['Treats others well, not just me', 'Pleasant more than once, across a few weeks', 'Takes a small no or a slow reply without sulking', 'I feel neutral or lighter after talking with them, not drained'],
  },
  'ring-acq': {
    timeline: 'Three to six months of occasional contact, with a handful of one-on-one moments that went fine, before Friends is a question.',
    talk: 'Friendly and light, mostly about shared things, with the occasional real moment. Honest, but not yet my history or my struggles.',
    howOften: 'A text now and then. It has to go both directions at least sometimes.',
    hangOut: 'Occasionally. Groups, church, a coffee once in a while. One-on-one only when it feels easy.',
    share: ['Surface facts about my life', 'Opinions about shared things', 'An occasional real moment, kept small', 'A coffee, a short favor I would do for anyone'],
    keep: ['My history and my trauma', 'My health details and my hard seasons', 'The inside of my marriage', 'My home as a regular place', 'Big favors, loans, my skills for free'],
    patterns: ['Polite and consistent across settings', 'Remembers my name and the basic facts', 'No early favors or early intensity', 'What they say and what they do match in small things'],
    mine: ['Be friendly, and keep my own pace', 'Share small things first and watch what they do with them', 'Say a small no once and see what happens'],
    theirs: ['Respect and politeness', 'Consistency across settings', 'No asking for favors early', 'Letting the pace be the pace'],
    qualities: ['Initiates contact sometimes, not only responds', 'Remembers what I share and brings it up kindly', 'Treats others well when I am not the audience', 'Took a small no without a change in warmth', 'Words and actions matched over a few weeks'],
  },
  'ring-friends': {
    timeline: 'Six months or more of regular contact, including a hard moment or two that we got through, before Close Friends is a question.',
    talk: 'Real conversations about our actual lives. Honest and kind. We can disagree without a rupture, and we can say "not today" without a fuss.',
    howOften: 'Most weeks, something: a text, a call, a check-in. From both of us, not only from me.',
    hangOut: 'A couple of times a month, one-on-one sometimes. Plans that mostly happen as planned.',
    share: ['What my weeks are actually like', 'A current struggle, in outline', 'My faith, when it comes up naturally', 'Regular time, and my home now and then', 'Help I would also ask of them'],
    keep: ['The deepest parts of my story and my trauma, in detail', 'My marriage\'s hard moments', 'Being my support person in a crisis', 'Hard truths about me, unasked'],
    patterns: ['Reliable: shows up when they said', 'Kind to me and to others', 'Mutual interest in each other\'s lives', 'Initiates sometimes', 'Keeps small promises', 'Handles a small conflict without punishing me'],
    mine: ['Initiate sometimes', 'Remember their life and ask about it', 'Show up for ordinary things, not only crises', 'Say a no when I mean it, kindly', 'Keep what they tell me'],
    theirs: ['Initiate sometimes', 'Remember what I share', 'Keep small promises', 'Show up for ordinary things', 'Keep what I tell them'],
    qualities: ['Respected a clear no, more than once', 'Consistent across settings and seasons', 'Kept a confidence I can point to', 'Stayed kind during a disagreement', 'Shows up in the mundane, not only the intense', 'Honest with me even when it was awkward'],
  },
  'ring-close': {
    timeline: 'A year or more, seen across seasons, with at least one rupture repaired well. Core is mutual choosing; it is never earned by pushing.',
    talk: 'Honest both ways, including hard truths given gently. Vulnerability met with care, never used later. My story is safe with them.',
    howOften: 'Weekly or close to it. Scheduled calls, and both of us start them.',
    hangOut: 'Regularly, one-on-one, in each other\'s homes. They know my ordinary days, not only my good ones.',
    share: ['My struggles and vulnerabilities, with detail', 'My faith journey and prayer requests', 'My home, regularly', 'My skills, labor, and gifts', 'Honest feedback both ways', 'Parts of my past, as I choose'],
    keep: ['The whole of my story on their timeline, not mine', 'Priority over John and my home life', 'Being on call for every crisis', 'Anything that still makes my body tense to say'],
    patterns: ['Reliable and honest', 'Respects my boundaries without being reminded', 'Initiates and follows up', 'Safe with my emotions and my past', 'Repairs after a rupture instead of disappearing', 'Shows up when it costs them something'],
    mine: ['Keep their confidences', 'Show up in their hard seasons', 'Tell them the truth, gently', 'Repair when I get it wrong', 'Protect the friendship from my old patterns: no fawning, no overfunctioning'],
    theirs: ['Keep my confidences', 'Show up in the ordinary and in the hard', 'Honesty, including hard truths', 'Repair after ruptures', 'Consistency over a long time'],
    qualities: ['Kept confidences over a long time', 'Repaired a real rupture with me', 'Consistent in the mundane across more than a year', 'Safe with my heart, my body, my faith, and my no', 'Chooses me the way I choose them, without keeping score', 'Good with John and my home life'],
  },
  'ring-core': {
    timeline: 'This is the innermost layer; there is nowhere closer. People stay here through time and mutual choosing, and can also step out of it with love.',
    talk: 'Anything, any time. Truth in both directions, held with care. Every part of my story is safe here.',
    howOften: 'Woven into the week. Calls at any hour when it matters.',
    hangOut: 'Often, including my home, John, and family life.',
    share: ['Everything I choose to: my story, my past, my body, my marriage, my faith, my fears', 'My time as a priority', 'My home and my family life', 'Support in their crisis', 'My honest feedback, and theirs'],
    keep: ['Only what belongs to John and me alone', 'Anything I am not ready to say; even here, the pace is mine'],
    patterns: ['Reciprocity without scorekeeping', 'Consistency in the mundane', 'Initiates both ways', 'Follows up', 'Safe with my heart', 'Repairs after ruptures', 'Present in a crisis'],
    mine: ['Priority with my time', 'Presence in their crisis', 'Repair, every time', 'Honesty, every time', 'Keep choosing them on purpose'],
    theirs: ['Priority with their time', 'Presence in my crisis', 'Repair, every time', 'Honesty, every time', 'Keep choosing me on purpose'],
    qualities: ['Already here. What keeps someone here is the same as what brought them: the ordinary, over years.'],
  },
}

/** A plain starting point for a layer she built herself, by how far in it sits. */
function fallback(ring: Ring, rings: Ring[]): LayerGuide {
  const idx = rings.indexOf(ring)
  const innermost = idx === 0
  const next = rings[idx - 1]
  return {
    timeline: innermost ? 'The innermost layer; nowhere closer.' : `Give it a season or more here before ${next?.name ?? 'the next layer in'} is a question. Time is one of the few things that can\'t be faked.`,
    talk: 'Write how you talk to each other here, and about what.',
    howOften: 'Write how often you are in touch, and whether it goes both ways.',
    hangOut: 'Write how often you see each other, and where.',
    share: ring.access,
    keep: rings[idx - 1]?.access.filter((a) => !ring.access.includes(a)) ?? [],
    patterns: ring.expectations,
    mine: [],
    theirs: ring.expectations,
    qualities: next?.entryCriteria ?? [],
  }
}

/** The guide for a ring: her own words where she wrote them, the suggested ones otherwise. */
export function guideFor(ring: Ring, rings: Ring[]): LayerGuide {
  const base = GUIDES[ring.id] ?? fallback(ring, rings)
  const own = ring.guide ?? {}
  const pick = <K extends keyof LayerGuide>(k: K): LayerGuide[K] => {
    const v = own[k]
    if (v === undefined) return base[k]
    if (Array.isArray(v)) return (v.length ? v : base[k]) as LayerGuide[K]
    return ((v as string).trim() ? v : base[k]) as LayerGuide[K]
  }
  return { timeline: pick('timeline'), talk: pick('talk'), howOften: pick('howOften'), hangOut: pick('hangOut'), share: pick('share'), keep: pick('keep'), patterns: pick('patterns'), mine: pick('mine'), theirs: pick('theirs'), qualities: pick('qualities') }
}

export const LIST_KEYS: (keyof LayerGuide)[] = ['share', 'keep', 'patterns', 'mine', 'theirs', 'qualities']
export const TEXT_KEYS: (keyof LayerGuide)[] = ['timeline', 'talk', 'howOften', 'hangOut']
