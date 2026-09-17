import Dexie, { type EntityTable } from 'dexie'
import {
  UNSURE,
  type BoundaryDraft,
  type CheckIn,
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
  }
}

export const db = new LoveReleaseDB()

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const now = (): string => new Date().toISOString()
