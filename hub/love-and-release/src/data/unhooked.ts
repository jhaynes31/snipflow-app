import type { BreathPrayer, Skill } from '@/db/types'

/* ---------- education ---------- */
export interface LearnCard { id: string; title: string; minute: string; kind: 'cycle' | 'list' | 'table' | 'reframe'; intro: string; items?: string[]; rows?: [string, string][] }

export const CYCLE_STEPS = ['Trigger', 'Intrusive thought', 'Anxiety / "not right" feeling', 'Compulsion', 'Short relief', 'Doubt returns, stronger']

export const LEARN: LearnCard[] = [
  { id: 'cycle', title: 'The loop', minute: 'Under a minute', kind: 'cycle', intro: 'OCD runs on a loop. Each step feeds the next. The compulsion is the part that feels like relief and is actually the fuel.', items: ['The compulsion step is the break point. This is where freedom is built.', 'Every time the compulsion is skipped, delayed, or shrunk, the loop gets a little weaker.'] },
  { id: 'relationships', title: 'How it shows up in relationships', minute: 'Under a minute', kind: 'list', intro: 'In relationships, the loop dresses up as care, conscientiousness, or "just checking."', items: ['Reassurance seeking: "Are you mad at me?" "Are we okay?"', 'Relationship doubts: "Do I really love them?" "Is this friendship right?"', 'Over-apologizing and confessing', 'Rereading texts and replaying conversations', 'Avoiding plans or situations that trigger anxiety', 'Rigidity and difficulty with changing plans', 'Exhaustion from constant mental cycles'] },
  { id: 'scrupulosity', title: 'How it shows up in faith', minute: 'Under a minute', kind: 'list', intro: 'Scrupulosity is OCD wearing religious clothes. It hijacks real love for God and turns it into fear.', items: ['Fear of having sinned, or of an unforgivable sin', 'Repeated confessing or praying "until it feels right"', 'Rigid rules and fear-driven decisions', 'Doubting salvation or God\'s love again and again', 'Intrusive, unwanted thoughts about God that bring intense guilt'] },
  { id: 'reframe', title: 'Thoughts are not sins', minute: 'Twenty seconds', kind: 'reframe', intro: 'Intrusive thoughts are not desires, character, or sin. They are noise the brain produces. What I do next is what matters.' },
  { id: 'conscience', title: 'Conscience vs. OCD', minute: 'Under a minute', kind: 'table', intro: 'The Holy Spirit\'s conviction and scrupulosity can feel similar in the moment. Over time they look very different.', rows: [['Specific and clear', 'Vague, shifting, or "what if"'], ['Leads to peace after repentance', 'Peace never lasts; doubt returns'], ['Draws me toward God', 'Drives fear, dread, and distance'], ['Settled by grace', 'Demands more rituals and certainty'], ['Invites growth', 'Demands perfection']] },
]

/* ---------- name it ---------- */
export const NAME_IT = [
  'This is an intrusive thought.',
  'This is the "not right" feeling.',
  'This is the urge to check.',
  'This is the urge to seek reassurance.',
  'This is the urge to confess.',
  'This is the urge to redo.',
]

export const TRIGGER_TAGS = ['A text or no reply', 'A conversation replaying', 'A change of plans', 'Something I said', 'A prayer that didn\'t "feel right"', 'A scripture or sermon', 'Being tired', 'Being alone', 'A decision', 'Someone\'s tone', 'Something I read', 'Not sure']

export const COMPULSIONS = ['Check', 'Ask for reassurance', 'Confess', 'Reread or replay', 'Redo or repeat', 'Apologize again', 'Research', 'Avoid', 'Mentally review', 'Pray until it feels right']

/* ---------- breathing ---------- */
export interface BreathPattern { id: string; name: string; desc: string; rounds: number; phases: { label: string; secs: number; scale: number; nose?: boolean }[] }
export const BREATH_PATTERNS: BreathPattern[] = [
  { id: 'sigh', name: 'Physiological sigh', desc: 'Two inhales through the nose, one long exhale through the mouth.', rounds: 4, phases: [{ label: 'Breathe in', secs: 2, scale: 0.85 }, { label: 'Sip in a little more', secs: 1, scale: 1 }, { label: 'Long exhale, mouth', secs: 6, scale: 0.55 }] },
  { id: 'extended', name: 'Extended exhale', desc: 'In for 4, out for 7. The long exhale tells the body it\'s safe.', rounds: 5, phases: [{ label: 'Breathe in', secs: 4, scale: 1 }, { label: 'Breathe out', secs: 7, scale: 0.55 }] },
  { id: 'box', name: 'Box breathing', desc: 'In 4, hold 4, out 4, hold 4.', rounds: 4, phases: [{ label: 'Breathe in', secs: 4, scale: 1 }, { label: 'Hold', secs: 4, scale: 1 }, { label: 'Breathe out', secs: 4, scale: 0.55 }, { label: 'Hold', secs: 4, scale: 0.55 }] },
  { id: 'prayer', name: 'Breath prayer', desc: 'A short phrase carried on the breath.', rounds: 5, phases: [{ label: 'Breathe in', secs: 4, scale: 1 }, { label: 'Breathe out', secs: 6, scale: 0.55 }] },
]

export const DEFAULT_BREATH_PRAYERS: BreathPrayer[] = [
  { id: 'bp-1', inhale: 'Jesus,', exhale: 'I rest in You.', isCustom: false },
  { id: 'bp-2', inhale: 'Be still,', exhale: 'and know.', isCustom: false },
  { id: 'bp-3', inhale: 'Your peace,', exhale: 'not my certainty.', isCustom: false },
  { id: 'bp-4', inhale: 'I am held,', exhale: 'I let go.', isCustom: false },
]

/* ---------- grounding ---------- */
export const GROUNDING = [
  { id: 'senses', title: '5-4-3-2-1 senses', steps: ['5 things you can see', '4 things you can touch', '3 things you can hear', '2 things you can smell', '1 thing you can taste'] },
  { id: 'feet', title: 'Feet on the floor', steps: ['Press both feet into the floor. Notice the floor pressing back.', 'Let your shoulders drop an inch.', 'Unclench your jaw. Let your tongue rest.', 'Scan from feet to head. Just notice, no fixing.'] },
  { id: 'cold', title: 'Cold water', steps: ['Run cold water over your hands or splash your face.', 'Notice the temperature. Nothing else for ten seconds.', 'This is care for a nervous system, not a punishment.'] },
  { id: 'colors', title: 'Three things by color', steps: ['Name something in the room that is blue.', 'Something green.', 'Something the color of warmth.'] },
  { id: 'object', title: 'Hold an object', steps: ['Pick up something within reach.', 'Describe its texture, weight, and temperature, out loud if you can.', 'Turn it over. Find one detail you hadn\'t noticed.'] },
]

/* ---------- defusion, uncertainty, delay ---------- */
export const UNCERTAINTY_PHRASES = [
  'Maybe, maybe not.',
  'I can live with not knowing.',
  "It's possible, and I'm choosing to move forward anyway.",
  "I don't need this answered to live faithfully today.",
  'Maybe, maybe not. I can live my life either way.',
]

export const DELAY_OPTIONS = [10, 30, 60]
export const SHRINK_OPTIONS = ['Once instead of three times', 'Ask once, then let it be', 'One short prayer, then done', 'Reread once, then close it']

/* ---------- send check ---------- */
export const SEND_CHECK = [
  { q: 'Is this message to connect, or to get reassurance?', hint: 'Connection says something. Reassurance asks for something back.' },
  { q: 'Have I already asked this, or something like it?', hint: 'If yes, more asking won\'t bring more certainty.' },
  { q: 'What would happen if I waited an hour?', hint: 'Not forever. Just an hour.' },
]

export const REASSURANCE_SCRIPTS = [
  { title: 'For a loved one', body: "I love you. I'm working on sitting with uncertainty, so if I ask for reassurance, you can gently remind me of that instead of answering." },
  { title: 'For a close friend', body: "I'm practicing not checking whether we're okay. If I ask, it helps me most if you say 'I think you already know' and change the subject. I'm not upset with you." },
  { title: 'For myself, before sending', body: "I've already asked this. Asking again is the loop, not love. I can wait an hour." },
]

/* ---------- who I am, values ---------- */
export const WHO_I_AM = [
  { key: 'love-doing', q: "What do I love doing when I'm not anxious?" },
  { key: 'most-myself', q: 'What makes me feel most like myself?' },
  { key: 'gifts', q: 'What gifts has God given me?' },
  { key: 'appreciated', q: 'What do people I trust say they appreciate about me?' },
  { key: 'as-a-kid', q: 'What did I love as a kid?' },
  { key: 'want-to-be', q: 'What kind of person do I want to be in my friendships and marriage?' },
]

export const VALUE_OPTIONS = ['Faithfulness', 'Creativity', 'Kindness', 'Honesty', 'Freedom', 'Family', 'Rest', 'Service', 'Growth', 'Joy', 'Courage', 'Curiosity', 'Presence', 'Generosity', 'Play']

export const VALUE_ACTIONS: Record<string, string[]> = {
  Faithfulness: ['Pray one short prayer, then go do the next thing', 'Read one verse slowly', 'Do the small faithful thing in front of me'],
  Creativity: ['Build something I love for ten minutes', 'Sketch, write, or make one small thing', 'Start the project, badly'],
  Kindness: ['Send a kind text with no question in it', 'Do one gentle thing for myself', 'Notice one thing to thank someone for'],
  Honesty: ['Say one true thing out loud', 'Write down what I actually feel', 'Stop rehearsing and say it plainly'],
  Freedom: ['Do the thing the loop said I couldn\'t', 'Leave the message unread for an hour', 'Go outside without my phone'],
  Family: ['Spend ten minutes fully present with John', 'Spend time with Percy', 'Call someone who loves me, just to talk'],
  Rest: ['Lie down for ten minutes with no task', 'Make tea and drink it slowly', 'Go to bed instead of one more check'],
  Service: ['Help someone with something small', 'Do one thing for the house', 'Pray for someone else'],
  Growth: ['Practice one skill from Unhooked', 'Log what I learned today', 'Try the next rung on my ladder'],
  Joy: ['Put on music and move', 'Watch something funny', 'Spend time with Percy'],
  Courage: ['Send the honest message, once', 'Make the plan even though it feels risky', 'Say no without over-explaining'],
  Curiosity: ['Learn one small thing', 'Ask a real question, not a checking one', 'Explore somewhere new'],
  Presence: ['Go outside and notice five things', 'Eat something slowly', 'Sit with Percy and just be'],
  Generosity: ['Give something away', 'Leave a kind note', 'Share what I made'],
  Play: ['Do something with no point', 'Play a game', 'Be silly on purpose'],
}
export const GENERIC_ACTIONS = ['Go outside for five minutes', 'Text a friend to connect, no question attached', 'Spend time with Percy', 'Pray once, then move', 'Build something I love', 'Drink water and eat something', 'Move my body for two minutes']

export const BODY_NEEDS = ['Hungry', 'Tired', 'Overstimulated', 'Lonely', 'Needing movement', 'Thirsty', 'Too much screen', 'Holding my breath']
export const BODY_NEEDS_HELP: Record<string, string> = { Hungry: 'Eat something, even small. The loop gets louder on an empty stomach.', Tired: 'Rest is allowed. Tired brains produce more noise.', Overstimulated: 'Dim the lights, lower the sound, one thing at a time.', Lonely: 'Connection over reassurance. Reach out to say hi, not to check.', 'Needing movement': 'Two minutes of walking or stretching counts.', Thirsty: 'Water first. Then see how it feels.', 'Too much screen': 'Set it down for ten minutes. The screen will still be there.', 'Holding my breath': 'One long exhale. Then another.' }

export const SELF_COMPASSION = [
  { title: 'This is hard.', body: 'Acknowledge the pain, without arguing with it. "This hurts right now." That\'s enough.' },
  { title: "I'm not alone in this.", body: 'Many people live with this exact loop. Jesus meets people in storms, not only after them.' },
  { title: 'May I be kind to myself.', body: 'Talk to yourself like you\'d talk to someone you love. What would you say to them?' },
]
export const JESUS_WOULD_SAY_HINT = 'Ask this as an expression of grace, not as a way to get certainty. One answer, held loosely, is enough.'

/* ---------- grace truths ---------- */
export const GRACE_TRUTHS = [
  "God's love for me doesn't depend on my feeling certain.",
  "I don't have to confess perfectly to be covered by grace.",
  'I can pray once and trust Him with the rest.',
  'My worth is held by Him, not by getting everything exactly right.',
  'Jesus meets me in my doubt, not only after it\'s gone.',
]

export const SUPPORT_VERSES = [
  { ref: 'Philippians 4:6–7', text: 'Don\'t be anxious about anything. Bring it to God with thanks, and His peace, which is beyond understanding, will guard your heart and mind.' },
  { ref: '1 Peter 5:7', text: 'Cast all your anxiety on Him, because He cares for you.' },
  { ref: 'Isaiah 26:3', text: 'He keeps in perfect peace the mind that stays on Him, because it trusts Him.' },
  { ref: 'Romans 8:1', text: 'There is now no condemnation for those who are in Christ Jesus.' },
  { ref: 'Romans 8:38–39', text: 'Nothing, not death or life or anything in all creation, can separate us from the love of God in Christ Jesus.' },
  { ref: '2 Timothy 1:7', text: 'God gave us a spirit not of fear, but of power, love, and a sound mind.' },
  { ref: 'Psalm 139:23–24', text: 'Search me, God, and know my heart. Test me and know my anxious thoughts. Lead me in the way everlasting.' },
  { ref: 'Lamentations 3:22–23', text: 'His mercies never end. They are new every morning. Great is His faithfulness.' },
  { ref: '1 John 1:9', text: 'If we confess our sins, He is faithful and just to forgive us and cleanse us.' },
  { ref: '1 John 3:20', text: 'Whenever our heart condemns us, God is greater than our heart, and He knows everything.' },
]

/* ---------- growth ---------- */
export const SKILL_LABEL: Record<Skill, string> = {
  breathing: 'Breathing', grounding: 'Grounding', 'name-it': 'Naming it', defusion: 'Defusion', 'urge-surfing': 'Urge surfing', delay: 'Delay', shrink: 'Shrink', uncertainty: 'Uncertainty practice',
  'replay-stopper': 'Closing the file', 'send-check': 'Before-you-send check', 'values-action': 'Values-based action', 'self-compassion': 'Self-compassion', exposure: 'Exposure step', 'one-prayer': 'One prayer, then done',
}

export const RELAPSE_SIGNS = ['Rereading texts', 'Asking "are we okay?"', 'Praying until it feels right', 'Cancelling plans', 'Skipping meals', 'Sleeping badly', 'Apologizing a lot', 'Researching late at night', 'Avoiding people', 'Confessing small things']
export const RELAPSE_HELPS = ['Physiological sigh', 'Urge surfing', 'Telling John', 'Getting outside', 'One prayer, then move', 'Naming it out loud', 'Time with Percy', 'Sleep', 'Calling my therapist', 'A Walk With Jesus card']

export const ERP_NOTE = 'ERP works best with a trained therapist, especially for harder steps. This tool is for practicing therapist-guided steps or gentle, low-level practice. Stop and reach out for support if it becomes overwhelming.'

export const CRISIS_PATTERNS = /\b(kill(ing)? myself|end (it all|my life)|suicid|hurt(ing)? myself|self.?harm|don'?t want to (be here|live|wake up)|not safe|unsafe|better off dead|want to die)\b/i
