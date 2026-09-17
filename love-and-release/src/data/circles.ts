import type { DisclosureOutcome, Ring } from '@/db/types'

export const ACCESS_ITEMS = [
  'My time: occasional',
  'My time: regular',
  'My time: priority',
  'One-on-one time',
  'My home',
  'Phone calls anytime',
  'Scheduled calls',
  'My emotional struggles and vulnerabilities',
  'My past and my story',
  'My marriage and family details',
  'My business and money details',
  'My faith journey and prayer requests',
  'My help and favors (skills, labor, gifts)',
  'Being a support person in their crisis',
  'Feedback and hard truths from them',
  'Being around John and my home life',
]

export const EXPECTATION_SUGGESTIONS = [
  'Reciprocity', 'Consistency in the mundane', 'Initiates both ways', 'Follows up', 'Safe with my heart', 'Repairs after ruptures',
  'Reliable', 'Honest', 'Initiates sometimes', 'Respects boundaries', 'Kind', 'Mutual interest', 'Respectful', 'Polite', 'Basic respect',
]

export const ENTRY_SUGGESTIONS = [
  'Kept confidences over time', 'Respected a no', 'Showed up in ordinary moments', 'Repaired after a rupture', 'Consistent across settings',
  'Initiates contact', 'Remembers what I share', 'Honest even when it costs them', 'Known for a long time', 'Treats others well too',
]

export const EXIT_SUGGESTIONS = [
  'One-sided effort for a season', 'Broken confidence', 'Boundary crossing after I said no', 'Words and actions not matching',
  'Manipulation signs', 'Contempt or mockery', 'Only reaches out when they need something', 'Growing apart', 'Values differ', 'Season changing',
]

export const DEFAULT_RINGS: Ring[] = [
  {
    id: 'ring-core', name: 'Core', order: 0, color: '#f0d3c4',
    meaning: 'Chosen family. Mutual choosing.',
    access: ['My time: priority', 'One-on-one time', 'My home', 'Phone calls anytime', 'My emotional struggles and vulnerabilities', 'My past and my story', 'My marriage and family details', 'My faith journey and prayer requests', 'My help and favors (skills, labor, gifts)', 'Being a support person in their crisis', 'Feedback and hard truths from them', 'Being around John and my home life'],
    expectations: ['Reciprocity', 'Consistency in the mundane', 'Initiates both ways', 'Follows up', 'Safe with my heart', 'Repairs after ruptures'],
    entryCriteria: ['Kept confidences over time', 'Respected a no', 'Showed up in ordinary moments', 'Repaired after a rupture', 'Consistent across settings', 'Known for a long time'],
    exitSignals: ['Broken confidence', 'Boundary crossing after I said no', 'Manipulation signs', 'Contempt or mockery'],
    softCap: 5, minTimeKnown: '1+ year',
  },
  {
    id: 'ring-close', name: 'Close Friends', order: 1, color: '#f1e3c4',
    meaning: 'Trusted, proven over time.',
    access: ['My time: regular', 'One-on-one time', 'My home', 'Scheduled calls', 'My emotional struggles and vulnerabilities', 'My faith journey and prayer requests', 'My help and favors (skills, labor, gifts)', 'Feedback and hard truths from them'],
    expectations: ['Reliable', 'Honest', 'Initiates sometimes', 'Respects boundaries'],
    entryCriteria: ['Respected a no', 'Initiates contact', 'Remembers what I share', 'Consistent across settings'],
    exitSignals: ['One-sided effort for a season', 'Broken confidence', 'Words and actions not matching', 'Only reaches out when they need something'],
    softCap: 8, minTimeKnown: '6+ months',
  },
  {
    id: 'ring-friends', name: 'Friends', order: 2, color: '#dbe6d6',
    meaning: 'Enjoyable, growing trust.',
    access: ['My time: regular', 'One-on-one time', 'Scheduled calls', 'My faith journey and prayer requests'],
    expectations: ['Kind', 'Reliable', 'Mutual interest'],
    entryCriteria: ['Initiates contact', 'Treats others well too', 'Remembers what I share'],
    exitSignals: ['One-sided effort for a season', 'Growing apart', 'Values differ'],
  },
  {
    id: 'ring-acq', name: 'Acquaintances', order: 3, color: '#e4dde9',
    meaning: 'Friendly, limited knowing.',
    access: ['My time: occasional'],
    expectations: ['Respectful', 'Polite'],
    entryCriteria: ['Treats others well too'],
    exitSignals: ['Contempt or mockery', 'Boundary crossing after I said no'],
  },
  {
    id: 'ring-outer', name: 'Outer Circle', order: 4, color: '#dfe4e8',
    meaning: 'New or casual. People I know of.',
    access: [],
    expectations: ['Basic respect'],
    entryCriteria: [],
    exitSignals: ['Manipulation signs', 'Contempt or mockery'],
  },
]

export const RING_COLORS = ['#f0d3c4', '#f1e3c4', '#dbe6d6', '#e4dde9', '#dfe4e8', '#e9dcd2', '#d9e4e3', '#ece4cf']
export const PERSON_COLORS = ['#c9836a', '#b89a4f', '#7f9a7c', '#8b7f9c', '#6f8a9a', '#a37c6b', '#5f8f8a', '#9c8a5a']
export const PERSON_EMOJIS = ['🌿', '🌸', '🌻', '🌙', '⭐', '🕊️', '🍂', '🌊', '🔥', '🎵', '📚', '☕', '🏡', '🌵', '🦋', '🐦']

export const RELATIONSHIP_TYPES = ['Friend', 'Family', 'Coworker', 'Church', 'Client', 'Neighbor', 'Mentor', 'Old friend', 'New person', 'Other']

export const TRUST_SIGNALS = [
  'Keeps their word, small promises included',
  'Words and actions match',
  'Initiates contact or plans',
  'Asks about my life and remembers details',
  'Follows up on things I\'ve shared',
  'Keeps confidences',
  'Respects my "no" the first time',
  'Communicates when plans change',
  'Apologizes and changes behavior',
  'Handles conflict with honesty and care',
  'Celebrates my wins',
  'Shows up in ordinary moments',
  'Consistent across settings and people',
  'Offers help without being asked',
  'Receives as well as gives',
  'Their faith shows in how they treat people',
]

export const DISCLOSURE_OUTCOMES: { id: DisclosureOutcome; label: string; tone: 'good' | 'hard' | 'neutral' }[] = [
  { id: 'kept-private', label: 'Kept private', tone: 'good' },
  { id: 'respected', label: 'Respected', tone: 'good' },
  { id: 'shared-without-permission', label: 'Shared without permission', tone: 'hard' },
  { id: 'used-against-me', label: 'Used against me', tone: 'hard' },
  { id: 'dismissed', label: 'Dismissed', tone: 'hard' },
  { id: 'not-sure', label: 'Not sure', tone: 'neutral' },
]

export const DEMOTION_REASONS = [
  'One-sided effort', 'Broken promises', 'Broken confidence', 'Boundary crossing', 'Manipulation signs', 'Seasons changing', 'Growing apart', 'Values differ',
]

export const RELEASE_SIGNALS = [
  'Repeated manipulation or control',
  'Repeated boundary violations after clear communication',
  'Using my vulnerabilities against me',
  'Unsafe behavior toward me or my family',
  'Ongoing contempt, mockery, or cruelty',
  'Persistent dishonesty after being addressed',
]

export const PAUSE_PROMPTS = [
  'How long have I known them?',
  'Have I seen them handle conflict or a "no"?',
  'Have I seen them be consistent, or just impressive?',
  'Am I moving them closer because of evidence, or because I want to be chosen?',
]

export const BOUNDARY_TEMPLATES = [
  { text: 'I need a heads-up if plans are changing.', why: 'Sudden changes cost me more than they look like they should.', response: 'I\'ll say it once, kindly, and step back if it keeps happening.' },
  { text: "I don't discuss my marriage outside my core circle.", why: 'That part of my life belongs to the people who have earned it.', response: 'I\'ll change the subject, and I don\'t owe an explanation.' },
  { text: 'I need a no to be accepted the first time.', why: 'Being pushed after a no tells me a lot about safety.', response: 'I\'ll repeat the no without adding reasons, and note it.' },
  { text: "I'm not available for crisis support right now.", why: 'My capacity is real, and protecting it is not unkind.', response: 'I\'ll point them to other support and stay honest about what I can give.' },
  { text: "I don't do business favors for people outside my close circle.", why: 'Mixing favors and money has cost me before.', response: 'A kind no, with a referral if I have one.' },
  { text: "Please don't share what I tell you without asking.", why: 'Confidence kept is how trust grows.', response: 'If it\'s shared, I\'ll share less, and I\'ll say why.' },
]

export const JESUS_CIRCLES = [
  { circle: 'The crowds', who: 'Thousands', ref: 'Matthew 14:13–21; John 2:24–25', what: 'Loved, taught, fed, and healed them. Did not entrust Himself to them.' },
  { circle: 'The seventy-two', who: 'Sent-out followers', ref: 'Luke 10:1–20', what: 'Trusted with a mission and responsibility.' },
  { circle: 'The twelve', who: 'Disciples', ref: 'Mark 3:13–19', what: 'Chosen to be with Him. Shared daily life and deeper teaching.' },
  { circle: 'The three', who: 'Peter, James, John', ref: 'Mark 5:37; Matthew 17:1–9; Matthew 26:37', what: 'Invited into His most sacred and vulnerable moments.' },
  { circle: 'The beloved one', who: 'John', ref: 'John 13:23; John 19:26–27', what: 'Closest friend. Trusted with His mother\'s care.' },
]

export const CIRCLE_LESSONS = [
  'Jesus loved everyone, but access and intimacy differed by circle.',
  'Even the twelve included Judas. Being close doesn\'t guarantee safety, so trust stays grounded in ongoing actions.',
  'Closeness grew through time spent together and faithfulness.',
]

export const CIRCLE_VERSES = [
  { ref: 'Proverbs 4:23', text: 'Guard your heart above all else, because everything you do flows from it.' },
  { ref: 'Proverbs 13:20', text: 'Walk with the wise and become wise. The companion of fools comes to harm.' },
  { ref: 'Proverbs 18:24', text: 'Some friends bring ruin, but there is a friend who sticks closer than a brother.' },
  { ref: 'Proverbs 27:6', text: 'Wounds from a friend can be trusted. An enemy multiplies kisses.' },
  { ref: 'Matthew 10:16', text: 'Be as wise as serpents and as innocent as doves.' },
  { ref: '1 Corinthians 15:33', text: 'The company we keep shapes our character.' },
]

export const HYPERVIGILANCE_CHECK = [
  { key: 'fact', q: 'What exactly happened?', hint: 'Just the fact. One line.' },
  { key: 'before', q: 'Has this happened before with them?', hint: 'Once is information. Twice is a pattern forming.' },
  { key: 'reminds', q: 'Does this remind me of someone from my past?', hint: 'If yes, some of the alarm might belong to then, not now.' },
  { key: 'friend', q: 'What would I tell a friend who described this?', hint: 'Say it to yourself with the same kindness.' },
] as const

export const REVIEW_OPTIONS: { id: 'yes' | 'closer' | 'out' | 'unsure'; label: string }[] = [
  { id: 'yes', label: 'Yes, feels right' },
  { id: 'closer', label: 'Maybe move closer' },
  { id: 'out', label: 'Maybe move out' },
  { id: 'unsure', label: 'Not sure' },
]
