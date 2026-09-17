import Dexie, { type EntityTable } from 'dexie';
import type {
  Assessment, CustomMedia, Exercise, LessonUnlock, PlannedSession, ProgressionState, RedFlagEvent, SetLog, TreeState, UserProfile, WeekSettings,
} from '@/domain/types';
import { DEFAULT_PREFERRED_DAYS } from '@/domain/schedule';

/** All data lives on-device (Section 2). Single user, so the profile is keyed 'me'. */
export class RootedDB extends Dexie {
  profile!: EntityTable<UserProfile, 'id'>;
  weeks!: EntityTable<WeekSettings, 'weekStart'>;
  sessions!: EntityTable<PlannedSession, 'id'>;
  setLogs!: EntityTable<SetLog, 'id'>;
  progression!: EntityTable<ProgressionState, 'key'>;
  assessments!: EntityTable<Assessment, 'id'>;
  redFlags!: EntityTable<RedFlagEvent, 'id'>;
  lessons!: EntityTable<LessonUnlock, 'lessonId'>;
  tree!: EntityTable<TreeState, 'id'>;
  customExercises!: EntityTable<Exercise, 'id'>;
  customMedia!: EntityTable<CustomMedia, 'key'>;
  /** Free-form key/value for small bits of state (e.g. last readiness answer). */
  kv!: EntityTable<{ key: string; value: unknown }, 'key'>;

  constructor(name = 'rooted') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      weeks: 'weekStart',
      sessions: 'id, sequenceIndex, status, scheduledDate, completedAt',
      setLogs: '++id, sessionId, exerciseId, [exerciseId+side], loggedAt',
      progression: 'key, exerciseId',
      assessments: '++id, date, kind',
      redFlags: '++id, date',
      lessons: 'lessonId',
      tree: 'id',
      customExercises: 'id',
      customMedia: 'key',
      kv: 'key',
    });
  }
}

export const db = new RootedDB();

export function defaultProfile(now = new Date().toISOString()): UserProfile {
  return {
    id: 'me',
    name: '',
    goals: ['strength', 'balance', 'joint-health', 'feel-better'],
    sessionLength: 35,
    preferredDays: [...DEFAULT_PREFERRED_DAYS],
    sabbathDay: 'sun',
    equipment: { dumbbellWeights: [5, 8, 10, 15], weightUnit: 'lb', bandLevels: ['light', 'medium', 'heavy'], yogaBlocks: true, chair: true, counter: true, wall: true, step: true },
    bodyHistory: {
      neckIssues: true, balanceIssues: true, ankleHistory: true, leftKneeInjury: true, rightKneeInjury: false,
      painAreas: [], tightnessAreas: [], pastInjuryAreas: ['neck', 'ankles-feet', 'left-knee'], notes: '',
    },
    ptPlan: { restrictions: [], customExerciseIds: [], notes: '', scheduleInto: ['ptKneesHips'] },
    why: {},
    coachSettings: { tone: 'gentle', critique: 'light', voice: 'cues', faithTrack: false, coachDesign: 'oak', ptDesign: 'fern' },
    themeMode: 'system',
    sensorySettings: { reducedMotion: false, soundCues: true, vibrationCues: true, visualIntensity: 'normal', outdoorMode: false, keepScreenAwake: true, remindersEnabled: false },
    unlockedCautions: [],
    onboardingStep: 0,
    onboardingComplete: false,
    createdAt: now,
    maintainMode: false,
  };
}

export const DEFAULT_TREE: TreeState = { id: 'tree', growthPoints: 0, rootPoints: 0, milestones: [], totalSessions: 0 };

export async function getProfile(database: RootedDB = db): Promise<UserProfile> {
  const p = await database.profile.get('me');
  if (p) return p;
  const fresh = defaultProfile();
  await database.profile.put(fresh);
  return fresh;
}

export async function saveProfile(patch: Partial<UserProfile>, database: RootedDB = db): Promise<UserProfile> {
  const cur = await getProfile(database);
  const next = { ...cur, ...patch, id: 'me' as const };
  await database.profile.put(next);
  return next;
}

export async function getTree(database: RootedDB = db): Promise<TreeState> {
  return (await database.tree.get('tree')) ?? { ...DEFAULT_TREE };
}

// ---------------------------------------------------------------------------
// Export / import (Section 2: JSON backup)
// ---------------------------------------------------------------------------

export interface BackupFile {
  app: 'rooted';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown[]>;
  media?: { key: string; mime: string; createdAt: string; base64: string }[];
}

const TABLES = ['profile', 'weeks', 'sessions', 'setLogs', 'progression', 'assessments', 'redFlags', 'lessons', 'tree', 'customExercises', 'kv'] as const;

async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function exportAll(database: RootedDB = db, includeMedia = true): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await database.table(t).toArray();
  const out: BackupFile = { app: 'rooted', version: 1, exportedAt: new Date().toISOString(), data };
  if (includeMedia) {
    const media = await database.customMedia.toArray();
    out.media = [];
    for (const m of media) out.media.push({ key: m.key, mime: m.mime, createdAt: m.createdAt, base64: await blobToBase64(m.blob) });
  }
  return out;
}

export async function importAll(file: BackupFile, database: RootedDB = db): Promise<void> {
  if (file.app !== 'rooted') throw new Error('This file is not a Rooted backup.');
  await database.transaction('rw', database.tables, async () => {
    for (const t of TABLES) {
      await database.table(t).clear();
      const rows = file.data[t];
      if (Array.isArray(rows) && rows.length) await database.table(t).bulkPut(rows);
    }
    await database.customMedia.clear();
    for (const m of file.media ?? []) {
      await database.customMedia.put({ key: m.key, mime: m.mime, createdAt: m.createdAt, blob: base64ToBlob(m.base64, m.mime) });
    }
  });
}
