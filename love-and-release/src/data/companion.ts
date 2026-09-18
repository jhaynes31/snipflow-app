import type { FawnKind } from '@/db/types'

export const GREETINGS: ((n: string) => string)[] = [(n) => `Hey${n}. I'm glad you're here.`, (n) => `Hi${n}. No catching up needed.`, (n) => `You made it here${n}. That counts.`, (n) => `Hey${n}. Whatever it is, we can go slow.`]

export const DOORS: { id: string; label: string; sub: string; to: string }[] = [
  { id: 'comfort', label: 'I need comfort', sub: 'No questions. I\'ll just be here.', to: '/comfort' },
  { id: 'stung', label: 'Something stung', sub: 'Let\'s slow down together.', to: '/pause' },
  { id: 'loop', label: 'My brain won\'t stop looping', sub: 'Step out of it, gently.', to: '/unhooked/loop' },
  { id: 'fawn', label: 'I\'m about to say yes when I mean no', sub: 'Or apologize again. Or shape-shift.', to: '/fawn' },
  { id: 'hard', label: 'I have to say something hard', sub: 'Honest and kind is enough.', to: '/boundaries/new' },
  { id: 'someone', label: 'I\'m confused about someone', sub: 'Let\'s look at what\'s actually there.', to: '/someone' },
  { id: 'low', label: 'I\'m in a low place this week', sub: 'PMS, PMDD, or just low. Lower the bar with me.', to: '/comfort?low=1' },
  { id: 'okay', label: 'I\'m okay. Just here.', sub: 'A quiet check-in.', to: '/daily' },
  { id: 'unsure', label: 'I don\'t know', sub: 'That\'s okay. Come sit.', to: '/comfort' },
]

export const COMFORT_OPENERS = [
  'I\'m here. You don\'t have to explain anything.',
  'You don\'t have to do anything right now. Just breathe with me.',
  'Whatever it is, you\'re not crazy, and you\'re not alone.',
]
export const COMFORT_LINES = [
  'You are loved before you do anything. Nothing today changed that.',
  'This feeling is allowed. It doesn\'t have to be fixed to be held.',
  'You\'re not too much. You were just too much for someone who didn\'t have enough.',
  'Being hurt by someone doesn\'t mean you did it wrong.',
  'You can put this down for tonight. It\'ll keep.',
  'Grief demands a witness. I\'m witnessing.',
  'You don\'t have to know what to do next. Just this breath.',
  'Whatever they did or didn\'t do, your worth wasn\'t in their hands.',
  'You\'ve survived every hard night so far. This one too.',
  'It\'s okay to want more than they can give. Wanting isn\'t needy.',
]
export const LOW_OPENERS = [
  'It\'s the hard stretch. I\'m here, and we\'re lowering the bar today.',
  'This week your body is asking for more and giving you less. That\'s not you failing.',
]
export const LOW_LINES = [
  'Today\'s job is smaller: eat, rest, one small true thing. That\'s the whole list.',
  'What feels unbearable this week will feel different next week. Both are real. Only one is the whole truth.',
  'No big relationship decisions this week. Not because you\'re wrong, because the volume is turned up.',
  'Rage and despair in this window are hormones talking loudly. You can listen without obeying.',
  'You\'re allowed to tell one person "it\'s that week" and let them carry a little.',
  'Being unlovable is a feeling that visits this time of the month. It isn\'t a fact that lives here.',
]

export const FLASHBACK_SIGNS = [
  'This feels far bigger than what happened',
  'I suddenly feel small or young',
  'I\'m sure I\'ve ruined something',
  'I want to disappear or apologize',
  'I can\'t find the reason for how big this is',
  'It feels like the past, not now',
]
export const FLASHBACK_STEPS = [
  'I\'m having an emotional flashback. This is CPTSD, not a verdict.',
  'I\'m an adult now. I have choices and people I didn\'t have then.',
  'I\'m allowed to feel this. I don\'t have to act on it.',
  'The critic in my head learned its lines from someone else. I can decline to take dictation.',
  'Feet on the floor. One long exhale. I\'m here, and it\'s now.',
]

export const FAWN_KINDS: { id: FawnKind; label: string; sub: string }[] = [
  { id: 'about-to-say-yes', label: 'I\'m about to say yes when I mean no', sub: 'A request, a plan, a favor.' },
  { id: 'apologizing', label: 'I\'m apologizing again', sub: 'For a need, a feeling, or nothing at all.' },
  { id: 'shape-shifting', label: 'I\'m shape-shifting to keep them comfortable', sub: 'Becoming what the room wants.' },
  { id: 'over-explaining', label: 'I\'m over-explaining', sub: 'Building a case for a simple no.' },
]
export const FAWN_FEARS = ['They\'ll be upset', 'They\'ll leave', 'I\'ll look selfish', 'There\'ll be conflict', 'I\'ll disappoint them', 'They\'ll think I\'m difficult', 'I won\'t be chosen anymore', 'I don\'t know, it just feels dangerous']
export const FAWN_REFRAMES: Record<string, string> = {
  'They\'ll be upset': 'They might be. Their upset is theirs to carry. You\'ve survived people being upset before.',
  'They\'ll leave': 'Someone who leaves over an honest no was only staying for the yes. Love and release can exist together.',
  'I\'ll look selfish': 'Having a want isn\'t selfish. Never having one is how you disappear.',
  'There\'ll be conflict': 'Conflict is information, not danger. Jesus had plenty of it and stayed kind.',
  'I\'ll disappoint them': 'Their disappointment in your no is not an emergency.',
  'They\'ll think I\'m difficult': 'Needing a heads-up or a no isn\'t difficult. It\'s knowing how you work.',
  'I won\'t be chosen anymore': 'Being chosen freely is worth more than being kept by chasing.',
  'I don\'t know, it just feels dangerous': 'That\'s the old alarm. It kept you safe once. You\'re an adult now, and you get to check whether it\'s true.',
}
export const FAWN_STARTERS: Record<FawnKind, string[]> = {
  'about-to-say-yes': ['I can\'t do that, but I hope it goes well.', 'Not this time.', 'Let me check and get back to you tomorrow.', 'I\'d rather not, thank you for asking.'],
  apologizing: ['Thank you for waiting.', 'I needed that. No apology.', 'I\'m not sorry for asking. I\'m grateful you listened.', 'That was a need, not a mistake.'],
  'shape-shifting': ['Actually, I see it differently.', 'That\'s not really me, and I\'d like to be honest about it.', 'I don\'t enjoy that, but I\'m glad you do.', 'Here\'s what I actually think.'],
  'over-explaining': ['No, I can\'t.', 'That doesn\'t work for me.', 'I\'m not able to.', 'No, thank you.'],
}

export const MORNING = {
  whose: ['Loved before anything is done today.', 'Held, not graded.', 'Beloved first. Everything else second.'],
  intentions: ['Say one honest thing', 'Rest without guilt', 'Let one reaction be theirs', 'Ask for what I need', 'Pause before saying yes', 'Notice the fawn and choose', 'Eat and drink like I matter', 'One small thing I love'],
}
export const EVENING = {
  loved: ['A kind word', 'Someone showed up', 'Time with John', 'Time with Percy', 'A prayer answered', 'Quiet', 'A friend reached out', 'Being understood', 'Nothing I can name, and that\'s okay'],
  fawned: ['Said yes when I meant no', 'Apologized for a need', 'Over-explained', 'Shape-shifted', 'Absorbed someone\'s mood', 'Not today that I noticed'],
  honored: ['Said no', 'Didn\'t over-explain', 'Let their reaction be theirs', 'Asked for what I need', 'Rested without guilt', 'Told the truth kindly', 'Let something be unfinished'],
  body: ['Rested', 'Fed', 'Overstimulated', 'Exhausted', 'Sore', 'Steady', 'It\'s the hard week'],
}

export const SOMEONE_LINES = [
  'Let\'s look at what\'s actually there, not what the fear says.',
  'Repeated doubt about how someone feels can be the loop. What they\'ve done is the evidence.',
]
