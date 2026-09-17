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

export interface Person {
  id: string
  name: string
  role: string
  notes: string
  createdAt: string
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
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  reminders: [],
  theme: 'system',
  textSize: 'normal',
  reduceMotion: false,
}
