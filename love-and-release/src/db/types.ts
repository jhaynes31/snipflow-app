export type Tag =
  | 'Unreciprocated effort'
  | 'Rejection'
  | 'Being forgotten or dropped'
  | 'Words and actions not matching'
  | 'Betrayal'
  | 'Feeling alone or unsupported'
  | 'Pressure to perform or prove myself'
  | 'Needing rest'
  | 'Setting a boundary'
  | 'Letting someone walk away'
  | 'Redefining a relationship / chosen family'
  | 'Grief over someone\'s choices'
  | 'Forgiving without pretending it\'s fine'

export const UNSURE = 'unsure'
export const RELEASED = 'released'
export type Placement = string // ring id, or UNSURE / RELEASED

export interface Person {
  id: string
  name: string
  role: string
  notes: string
  createdAt: string
  ringId: Placement
  emoji?: string
  color?: string
  relationshipType?: string
  metDate?: string // YYYY-MM-DD
}

export interface Ring {
  id: string
  name: string
  order: number
  color: string
  meaning: string
  access: string[]
  expectations: string[]
  entryCriteria: string[]
  exitSignals: string[]
  softCap?: number
  minTimeKnown?: string
}

export interface RingMove {
  id: string
  personId: string
  fromRingId: Placement
  toRingId: Placement
  reason: string
  criteriaMet: string[]
  date: string
}

export interface TrustSignal {
  id: string
  personId: string
  type: string
  note: string
  date: string
}

export interface RedFlag {
  id: string
  personId: string
  patternId: string
  note: string
  date: string
  status: 'open' | 'resolved'
  resolutionNote?: string
}

export type DisclosureOutcome = 'kept-private' | 'respected' | 'shared-without-permission' | 'used-against-me' | 'dismissed' | 'not-sure'

export interface Disclosure {
  id: string
  personId: string
  whatShared: string
  dateShared: string
  outcome?: DisclosureOutcome
  outcomeDate?: string
}

export interface FlagPattern {
  id: string
  name: string
  looksLike: string
  bodyCues: string
  selfQuestion: string
  boundaryResponse: string
  isSpiritual?: boolean
}

export interface LayerBoundary {
  id: string
  ringId?: string
  personId?: string
  text: string
  why: string
  response: string
  createdAt: string
}

export type ReviewAnswer = 'yes' | 'closer' | 'out' | 'unsure'

export interface ReviewSession {
  id: string
  date: string
  results: { personId: string; answer: ReviewAnswer }[]
}

export type ReciprocityType =
  | 'they-initiated'
  | 'i-initiated'
  | 'they-followed-up'
  | 'they-dropped'
  | 'they-showed-up'
  | 'i-showed-up'

export interface ReciprocityEvent {
  id: string
  personId: string
  type: ReciprocityType
  note: string
  date: string
}

export interface CheckIn {
  id: string
  fact: string
  story: string[]
  bodyAreas: string[]
  alternatives: string[]
  mine: string
  theirs: string
  truthId?: string
  truthText?: string
  personId?: string
  tags: Tag[]
  createdAt: string
}

export type PauseMethod = 'breathing' | 'senses' | 'feelings' | 'truth'

export interface PauseSession {
  id: string
  method: PauseMethod
  feelings: string[]
  createdAt: string
}

export interface JesusCard {
  id: string
  title: string
  reference: string
  whatHappened: string
  howHeHandledIt: string
  meaningForMe: string
  prompt: string
  tags: Tag[]
}

export interface Truth {
  id: string
  text: string
  source: string
  starred: boolean
  tags: Tag[]
  createdAt: string
}

export interface BoundaryDraft {
  id: string
  title: string
  body: string
  isTemplate: boolean
  feltRating?: number
  sentAt?: string
  createdAt: string
  updatedAt: string
}

export interface ReleaseEntry {
  id: string
  personId?: string
  hurts: string
  toGod: string
  mine: string
  theirs: string
  releasing: string
  prayer: string
  createdAt: string
}

export type WinType =
  | 'said-no'
  | 'no-over-explain'
  | 'their-reaction'
  | 'asked-for-need'
  | 'rested'
  | 'told-truth'
  | 'let-it-be'
  | 'other'

export interface Win {
  id: string
  type: WinType
  note: string
  createdAt: string
}

export interface Reminder {
  id: string
  time: string // "HH:MM"
  label: string
  enabled: boolean
}

export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  id: 'settings'
  passcodeHash?: string
  passcodeSalt?: string
  reminders: Reminder[]
  theme: Theme
  textSize: 'normal' | 'large'
  reduceMotion: boolean
  circleCues?: boolean
  circleReviewEnabled?: boolean
  circleReviewDays?: number
  circleReviewLastAt?: string
  circleReviewSnoozedUntil?: string
  circlesIntroSeen?: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  reminders: [],
  theme: 'system',
  textSize: 'normal',
  reduceMotion: false,
  circleCues: true,
  circleReviewEnabled: true,
  circleReviewDays: 90,
}
