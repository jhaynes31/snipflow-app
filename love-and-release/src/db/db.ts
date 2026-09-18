import Dexie, { type EntityTable } from 'dexie'
import {
  UNSURE,
  type BoundaryDraft,
  type BreathPrayer,
  type CheckIn,
  type ComfortSession,
  type CoreValue,
  type DailyEntry,
  type FawnMoment,
  type Thread,
  type ExposureSession,
  type ExposureStep,
  type LoopEpisode,
  type ReassuranceLog,
  type RelapsePlan,
  type SelfProfile,
  type SkillPractice,
  type ThoughtTheme,
  type Disclosure,
  type JesusCard,
  type LayerBoundary,
  type PauseSession,
  type Person,
  type ReciprocityEvent,
  type RedFlag,
  type ReleaseEntry,
  type ReviewSession,
  type Ring,
  type RingMove,
  type Settings,
  type TrustSignal,
  type Truth,
  type Win,
} from './types'

export class LoveReleaseDB extends Dexie {
  people!: EntityTable<Person, 'id'>
  reciprocity!: EntityTable<ReciprocityEvent, 'id'>
  checkIns!: EntityTable<CheckIn, 'id'>
  pauses!: EntityTable<PauseSession, 'id'>
  jesusCards!: EntityTable<JesusCard, 'id'>
  truths!: EntityTable<Truth, 'id'>
  boundaries!: EntityTable<BoundaryDraft, 'id'>
  releases!: EntityTable<ReleaseEntry, 'id'>
  wins!: EntityTable<Win, 'id'>
  settings!: EntityTable<Settings, 'id'>
  rings!: EntityTable<Ring, 'id'>
  ringMoves!: EntityTable<RingMove, 'id'>
  trustSignals!: EntityTable<TrustSignal, 'id'>
  redFlags!: EntityTable<RedFlag, 'id'>
  disclosures!: EntityTable<Disclosure, 'id'>
  layerBoundaries!: EntityTable<LayerBoundary, 'id'>
  reviewSessions!: EntityTable<ReviewSession, 'id'>
  loopEpisodes!: EntityTable<LoopEpisode, 'id'>
  thoughtThemes!: EntityTable<ThoughtTheme, 'id'>
  exposureSteps!: EntityTable<ExposureStep, 'id'>
  exposureSessions!: EntityTable<ExposureSession, 'id'>
  coreValues!: EntityTable<CoreValue, 'id'>
  selfProfile!: EntityTable<SelfProfile, 'id'>
  breathPrayers!: EntityTable<BreathPrayer, 'id'>
  reassuranceLog!: EntityTable<ReassuranceLog, 'id'>
  relapsePlan!: EntityTable<RelapsePlan, 'id'>
  skillPractices!: EntityTable<SkillPractice, 'id'>
  threads!: EntityTable<Thread, 'id'>
  fawnMoments!: EntityTable<FawnMoment, 'id'>
  comforts!: EntityTable<ComfortSession, 'id'>
  daily!: EntityTable<DailyEntry, 'id'>

  constructor() {
    super('love-and-release')
    this.version(1).stores({
      people: 'id, name, createdAt',
      reciprocity: 'id, personId, type, date',
      checkIns: 'id, personId, createdAt, *tags',
      pauses: 'id, method, createdAt',
      jesusCards: 'id, title, *tags',
      truths: 'id, starred, createdAt, *tags',
      boundaries: 'id, isTemplate, updatedAt, createdAt',
      releases: 'id, createdAt',
      wins: 'id, type, createdAt',
      settings: 'id',
    })
    this.version(2)
      .stores({
        people: 'id, name, createdAt, ringId',
        releases: 'id, createdAt, personId',
        rings: 'id, order',
        ringMoves: 'id, personId, date',
        trustSignals: 'id, personId, type, date',
        redFlags: 'id, personId, patternId, status, date',
        disclosures: 'id, personId, dateShared',
        layerBoundaries: 'id, ringId, personId',
        reviewSessions: 'id, date',
      })
      .upgrade((tx) =>
        tx.table('people').toCollection().modify((p: Person) => {
          if (!p.ringId) p.ringId = UNSURE
        }),
      )
    this.version(3).stores({
      loopEpisodes: 'id, createdAt, theme',
      thoughtThemes: 'id, nickname',
      exposureSteps: 'id, order, assignedByTherapist',
      exposureSessions: 'id, stepId, createdAt',
      coreValues: 'id, order',
      selfProfile: 'id',
      breathPrayers: 'id, isCustom',
      reassuranceLog: 'id, date',
      relapsePlan: 'id',
      skillPractices: 'id, skill, createdAt',
    })
    this.version(4).stores({
      checkIns: 'id, personId, createdAt, threadId, *tags',
      pauses: 'id, method, createdAt, threadId',
      releases: 'id, createdAt, personId, threadId',
      boundaries: 'id, isTemplate, updatedAt, createdAt, threadId',
      wins: 'id, type, createdAt, threadId',
      loopEpisodes: 'id, createdAt, theme, threadId',
      threads: 'id, personId, status, updatedAt',
      fawnMoments: 'id, createdAt, personId, threadId, kind',
      comforts: 'id, createdAt, threadId',
      daily: 'id, date, kind, createdAt',
    })
  }
}

export const db = new LoveReleaseDB()

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const now = (): string => new Date().toISOString()
