import Dexie, { type EntityTable } from 'dexie'
import type {
  BoundaryDraft,
  CheckIn,
  JesusCard,
  PauseSession,
  Person,
  ReciprocityEvent,
  ReleaseEntry,
  Settings,
  Truth,
  Win,
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
  }
}

export const db = new LoveReleaseDB()

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const now = (): string => new Date().toISOString()
