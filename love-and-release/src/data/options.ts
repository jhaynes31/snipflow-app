import type { ReciprocityType, Tag, WinType } from '@/db/types'

export interface StoryOption {
  text: string
  tags: Tag[]
}

export const STORIES: StoryOption[] = [
  { text: "They don't like me", tags: ['Rejection'] },
  { text: "I'm too much", tags: ['Rejection', 'Pressure to perform or prove myself'] },
  { text: "I'm a burden", tags: ['Feeling alone or unsupported', 'Needing rest'] },
  { text: 'I did something wrong', tags: ['Pressure to perform or prove myself', 'Rejection'] },
  { text: "I'm being taken for granted", tags: ['Unreciprocated effort'] },
  { text: "They've forgotten about me", tags: ['Being forgotten or dropped'] },
  { text: "I'm not a priority", tags: ['Being forgotten or dropped', 'Unreciprocated effort'] },
  { text: "They didn't mean what they said", tags: ['Words and actions not matching'] },
  { text: "I can't trust anyone", tags: ['Betrayal'] },
  { text: "I'm on my own", tags: ['Feeling alone or unsupported'] },
  { text: 'I have to fix this', tags: ['Setting a boundary', 'Pressure to perform or prove myself'] },
  { text: "If I say no, they'll leave", tags: ['Setting a boundary', 'Letting someone walk away'] },
  { text: "I should have tried harder", tags: ['Pressure to perform or prove myself', "Grief over someone's choices"] },
  { text: "It's my job to keep everyone okay", tags: ['Setting a boundary', 'Needing rest'] },
]

export const BODY_AREAS = [
  'Head', 'Jaw', 'Throat', 'Shoulders', 'Chest', 'Heart', 'Stomach', 'Gut', 'Hands', 'Back', 'Legs', 'Whole body', 'Numb / nowhere',
]

export const FEELINGS = [
  'Hurt', 'Rejected', 'Anxious', 'Ashamed', 'Angry', 'Sad', 'Lonely', 'Confused', 'Overwhelmed', 'Tired', 'Small', 'Invisible', 'Scared', 'Numb', 'Disappointed', 'Tender',
]

export const ALTERNATIVES = [
  'They might be overwhelmed right now',
  'They may not have the capacity today',
  "They could be scared of getting it wrong",
  'This might be their pattern, not about me',
  'They may be dealing with something I can\'t see',
  'Their brain might work differently than mine',
  'They might just have forgotten, not decided',
  'They may not know I needed that',
  'It could be about their own stuff',
  'They might be showing love in a way I don\'t recognize yet',
]

export const MINE_SUGGESTIONS = [
  'My feelings',
  'How I respond',
  'What I ask for',
  'My boundaries',
  'My rest',
  'Telling the truth kindly',
]

export const THEIRS_SUGGESTIONS = [
  'Their reaction',
  'Their choices',
  'Their capacity',
  'Their follow-through',
  'Their feelings about my no',
  'Whether they show up',
]

export const RECIPROCITY: { type: ReciprocityType; label: string; side: 'them' | 'me'; tone: 'warm' | 'neutral' }[] = [
  { type: 'they-initiated', label: 'They initiated', side: 'them', tone: 'warm' },
  { type: 'they-followed-up', label: 'They followed up', side: 'them', tone: 'warm' },
  { type: 'they-showed-up', label: 'They showed up', side: 'them', tone: 'warm' },
  { type: 'they-dropped', label: 'They forgot / dropped', side: 'them', tone: 'neutral' },
  { type: 'i-initiated', label: 'I initiated', side: 'me', tone: 'warm' },
  { type: 'i-showed-up', label: 'I showed up', side: 'me', tone: 'warm' },
]

export const RECIPROCITY_LABEL: Record<ReciprocityType, string> = Object.fromEntries(
  RECIPROCITY.map((r) => [r.type, r.label]),
) as Record<ReciprocityType, string>

export const WINS: { type: WinType; label: string }[] = [
  { type: 'said-no', label: 'I said no' },
  { type: 'no-over-explain', label: "I didn't over-explain" },
  { type: 'their-reaction', label: "I let their reaction be theirs" },
  { type: 'asked-for-need', label: 'I asked for what I need' },
  { type: 'rested', label: 'I rested without guilt' },
  { type: 'told-truth', label: 'I told the truth kindly' },
  { type: 'let-it-be', label: "I let something be unfinished" },
  { type: 'other', label: 'Something else' },
]

/** Freedom Moments: wins that belong to Unhooked. */
export const FREEDOM_WINS: { type: WinType; label: string }[] = [
  { type: 'didnt-act', label: "I didn't act on a compulsion" },
  { type: 'sat-with-uncertainty', label: 'I sat with uncertainty' },
  { type: 'chose-connection', label: 'I chose connection over reassurance' },
  { type: 'trusted-without-certainty', label: 'I trusted God without needing to feel certain' },
  { type: 'values-while-anxious', label: 'I lived by my values while anxious' },
]
export const FREEDOM_TYPES: WinType[] = FREEDOM_WINS.map((w) => w.type)

export const WIN_LABEL: Record<WinType, string> = Object.fromEntries([...WINS, ...FREEDOM_WINS].map((w) => [w.type, w.label])) as Record<
  WinType,
  string
>

export const ROLES = ['Sister', 'Brother', 'Parent', 'Spouse', 'Close friend', 'Friend', 'Friendly acquaintance', 'Church family', 'Coworker', 'Mentor', 'Other']
