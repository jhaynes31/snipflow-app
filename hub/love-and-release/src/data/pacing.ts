/** Content for relationship pacing and self-protection. */

export const PACE_OPENERS = [
  "I love that you're excited. Let's keep the excitement, and let's keep you.",
  "Someone new. That's a good thing. And it's exactly the moment the old pattern likes to run.",
]

export const PACE_NAMING = "Here's what I know about you: you trust first and hope safety follows. New people get a halo. You share deep things early because it feels so safe. That's not naivety. It's a nervous system that learned to attach fast. This time, let's let them earn it."

/** Default waiting periods before someone can move into a ring, in days, by ring order. */
export const PACE_DAYS_BY_ORDER: Record<number, number> = { 0: 365, 1: 180, 2: 60, 3: 14, 4: 0 }

export const DISCLOSURE_HOLD_DEFAULT = [
  'My emotional struggles and vulnerabilities',
  'My past and my story',
  'My marriage and family details',
  'My business and money details',
  'My help and favors (skills, labor, gifts)',
  'My home',
]

export const WATCH_FOR = [
  'Do they ask about my life and remember?',
  'Do they initiate, or only respond?',
  'How do they react to a small no?',
  'How do they treat people who can\'t do anything for them?',
  'How do they talk about their exes and old friends?',
  'Do they ask for favors early?',
  'Is the closeness moving faster than the time we\'ve had?',
  'Do they give, or only receive?',
  'Do words and actions match over a few weeks?',
  'Do I feel filled or drained after time with them?',
]

export const HALO_QUESTIONS = [
  { key: 'known', q: 'How long have I actually known them?', hint: 'Days and weeks, not how it feels.' },
  { key: 'seen', q: 'What have I actually seen, versus what I\'ve assumed?', hint: 'List only things you watched happen.' },
  { key: 'no', q: 'Have I seen them handle a no, a disagreement, or an inconvenience?', hint: 'If not yet, that\'s the test that hasn\'t happened.' },
  { key: 'others', q: 'How do they treat people who can\'t do anything for them?', hint: 'Waiters, the quiet person in the group, an ex.' },
  { key: 'chosen', q: 'Am I excited about them, or about being chosen?', hint: 'Both are allowed. Only one is about them.' },
]

export const USED_QUESTIONS: { key: string; q: string; yes: string; no: string; unsure: string; scoreYes: number }[] = [
  { key: 'reach', q: 'Do they reach out when they don\'t need anything?', yes: 'Yes, just to connect', no: 'Mostly when they need something', unsure: 'Not sure', scoreYes: 0 },
  { key: 'ask', q: 'Do they ask about my life and wait for the answer?', yes: 'Yes', no: 'Not really', unsure: 'Sometimes', scoreYes: 0 },
  { key: 'no', q: 'When I\'ve said no, what happened?', yes: 'They accepted it', no: 'The temperature changed', unsure: 'I\'ve never said no', scoreYes: 0 },
  { key: 'gave', q: 'Have they done something for me without being asked?', yes: 'Yes', no: 'No', unsure: 'Can\'t think of one', scoreYes: 0 },
  { key: 'drained', q: 'After time with them, do I feel…', yes: 'Filled', no: 'Drained', unsure: 'Mixed', scoreYes: 0 },
  { key: 'stopped', q: 'If I stopped giving, would they still be around?', yes: 'I think so', no: 'Honestly, probably not', unsure: 'I don\'t know', scoreYes: 0 },
]

export const USED_READS = {
  low: 'From what you\'ve said, this looks like a relationship with real give and take. Keep watching the small things, and keep your pace, but the fear may be louder than the evidence here.',
  mid: 'It\'s mixed. Some of this is connection, and some of it flows one way. Try one small no this week and watch what happens. That single test tells you more than another month of wondering.',
  high: 'Most of what you\'ve described flows one way: toward them. That\'s the "used for what I can offer" pattern, and you\'re not imagining it. This doesn\'t have to end the relationship. It means access should match what they\'ve shown. Slow the giving, hold the pearls, and let a no be the test.',
}

export const CHECKIN_MILESTONES = [14, 42, 90, 180]

export const PACE_TRUTH = 'Trust is earned in the mundane, not declared in the intense.'
