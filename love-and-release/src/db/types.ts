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
  | 'Anxiety & Uncertainty'
  | 'Scrupulosity & Grace'
  | 'Conflict & hard conversations'
  | 'Naming poor behavior'
  | 'Handling emotions'
  | 'Compassion fatigue'
  | 'Going slow & self-protection'

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
  pace?: Pace
}

/** A pacing plan for someone new: trust is earned, slowly, on purpose. */
export interface Pace {
  setAt: string
  notBefore: string // YYYY-MM-DD before which they don't move closer
  targetRingId?: string
  disclosureHold: string[] // access items I'm holding back for now
  watch: string[] // things to watch for
  note: string
  checkins: string[] // YYYY-MM-DD of pace check-ins done
}

export interface Favor {
  id: string
  personId: string
  asked: string
  saidYes: boolean
  theyGave: string
  date: string
}

export type PaceCheckKind = 'halo' | 'used' | 'review'
export interface PaceCheck {
  id: string
  personId: string
  kind: PaceCheckKind
  answers: Record<string, string>
  verdict: string
  createdAt: string
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
  threadId?: string
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
  threadId?: string
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
  threadId?: string
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
  threadId?: string
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
  | 'didnt-act'
  | 'sat-with-uncertainty'
  | 'chose-connection'
  | 'trusted-without-certainty'
  | 'values-while-anxious'

export interface Win {
  id: string
  threadId?: string
  type: WinType
  note: string
  createdAt: string
}

/* ---------- Unhooked ---------- */
export type ActedOn = 'no' | 'delayed' | 'shrunk' | 'yes'

export interface LoopEpisode {
  id: string
  threadId?: string
  triggerTags: string[]
  theme: string
  compulsionUrge: string[]
  urgeStart?: number
  urgeEnd?: number
  toolsUsed: string[]
  actedOnCompulsion?: ActedOn
  note: string
  createdAt: string
}

export interface ThoughtTheme {
  id: string
  nickname: string
  description: string
}

export interface ExposureStep {
  id: string
  description: string
  distressRating: number
  order: number
  assignedByTherapist: boolean
}

export interface ExposureSession {
  id: string
  stepId: string
  distressBefore: number
  distressPeak: number
  distressAfter: number
  durationMin: number
  note: string
  createdAt: string
}

export interface CoreValue {
  id: string
  name: string
  meaning: string
  order: number
}

export interface SelfProfile {
  id: 'self'
  answers: Record<string, string>
}

export interface BreathPrayer {
  id: string
  inhale: string
  exhale: string
  isCustom: boolean
}

export interface ReassuranceLog {
  id: string
  date: string // YYYY-MM-DD
  count: number
  note: string
}

export interface RelapsePlan {
  id: 'plan'
  warningSigns: string[]
  helps: string[]
  people: string[]
  plan: string
}

export type Skill =
  | 'breathing' | 'grounding' | 'name-it' | 'defusion' | 'urge-surfing' | 'delay' | 'shrink' | 'uncertainty'
  | 'replay-stopper' | 'send-check' | 'values-action' | 'self-compassion' | 'exposure' | 'one-prayer'

export interface SkillPractice {
  id: string
  skill: Skill
  createdAt: string
}

/* ---------- companion ---------- */
export interface Thread {
  id: string
  title: string
  personId?: string
  status: 'open' | 'resting' | 'released'
  createdAt: string
  updatedAt: string
}

export type FawnKind = 'about-to-say-yes' | 'apologizing' | 'shape-shifting' | 'over-explaining'
export type FawnOutcome = 'honest' | 'said-no' | 'fawned' | 'not-yet'

export interface FawnMoment {
  id: string
  kind: FawnKind
  situation: string
  want: string
  fears: string[]
  honest: string
  outcome?: FawnOutcome
  personId?: string
  threadId?: string
  createdAt: string
}

export interface ComfortSession {
  id: string
  kind?: 'comfort' | 'low'
  flashback: boolean
  signs: string[]
  createdAt: string
  threadId?: string
}

export interface DailyEntry {
  id: string
  date: string // YYYY-MM-DD
  kind: 'morning' | 'evening'
  answers: Record<string, string | string[]>
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
  therapistName?: string
  therapistContact?: string
  therapistNotes?: string
  reassuranceGoal?: string
  haptics?: boolean
  name?: string
  dailyMorning?: boolean
  dailyEvening?: boolean
  cycleTracking?: boolean
  cycleStart?: string // YYYY-MM-DD of the most recent period start
  cycleLength?: number
  lowDays?: number // how many days before the period tend to be hard
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  reminders: [],
  theme: 'light',
  textSize: 'normal',
  reduceMotion: false,
  circleCues: true,
  circleReviewEnabled: true,
  circleReviewDays: 90,
  haptics: true,
  dailyMorning: true,
  dailyEvening: true,
}
