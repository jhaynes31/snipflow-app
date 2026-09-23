import { EXERCISE_MAP } from '@/data/exercises';
import { TEMPLATES } from '@/data/templates';
import { addDays, todayISO, weekStartOf, isWeekend, weekdayOf } from '@/domain/dates';
import { buildProgramSequence, doseFor, equipmentForSession, estimateMinutes, fiveMinuteVersion, gapStatus, makePlannedSession, prescribeSession, type GapStatus } from '@/domain/program';
import { evaluateProgression, progressionKey, type ProgressionDecision } from '@/domain/progression';
import { contextFromProfile } from '@/domain/safety';
import { assignDates, isSabbathDate, makeSabbathResolver, type SabbathResolver } from '@/domain/schedule';
import type { Exercise, PlannedSession, ProgressionState, SabbathDay, SetLog, UserProfile, SessionType } from '@/domain/types';
import { LESSONS } from '@/learn/lessons';
import { db, getProfile, getTree, type HeartwoodDB } from './db';

/**
 * Orchestration on top of the pure domain functions. Everything here is
 * database-aware; the rules themselves live in src/domain.
 */

export const PROGRAM_WEEKS = 24;

export async function sabbathResolver(profile: UserProfile, database: HeartwoodDB = db): Promise<SabbathResolver> {
  const weeks = await database.weeks.toArray();
  return makeSabbathResolver(weeks, profile.sabbathDay);
}

/** Make sure the session sequence exists. Idempotent. */
export async function ensureProgram(database: HeartwoodDB = db, now = todayISO()): Promise<void> {
  const profile = await getProfile(database);
  const count = await database.sessions.count();
  if (count > 0) return;
  const start = profile.programStartDate ?? now;
  const slots = buildProgramSequence(PROGRAM_WEEKS, profile.maintainMode);
  const sessions = slots.map((s) => makePlannedSession(s, [], start, false));
  await database.sessions.bulkPut(sessions);
  if (!profile.programStartDate) await database.profile.update('me', { programStartDate: start });
  await rescheduleFrom(now, database);
}

/** Recompute suggested dates for all uncompleted sessions from a given day forward. Never doubles up. */
export async function rescheduleFrom(fromISO: string, database: HeartwoodDB = db): Promise<void> {
  const profile = await getProfile(database);
  const resolve = await sabbathResolver(profile, database);
  const pending = (await database.sessions.where('status').anyOf('planned', 'in-progress').toArray()).filter((x) => x.sequenceIndex >= 0).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const dates = assignDates(pending.length, fromISO, profile.preferredDays, resolve);
  await database.transaction('rw', database.sessions, async () => {
    for (let i = 0; i < pending.length; i++) await database.sessions.update(pending[i].id, { scheduledDate: dates[i] });
  });
}

export async function lastCompletedDate(database: HeartwoodDB = db): Promise<string | undefined> {
  const done = await database.sessions.where('status').anyOf('completed', 'partial').toArray();
  if (!done.length) return undefined;
  return done.map((s) => (s.completedAt ?? '').slice(0, 10)).sort().at(-1);
}

export interface TodayState {
  today: string;
  isSabbath: boolean;
  sabbathThisWeek: SabbathDay;
  weekAsked: boolean;
  next: PlannedSession | null;
  gap: GapStatus;
  equipment: string[];
  estimatedMinutes: number;
  inProgress: PlannedSession | null;
  needsReassessment: boolean;
  totalSessions: number;
}

export async function getTodayState(database: HeartwoodDB = db, now = todayISO()): Promise<TodayState> {
  await ensureProgram(database, now);
  const profile = await getProfile(database);
  const resolve = await sabbathResolver(profile, database);
  const ws = weekStartOf(now);
  const weekRow = await database.weeks.get(ws);
  const inProgress = (await database.sessions.where('status').equals('in-progress').first()) ?? null;
  let next = inProgress ?? (await database.sessions.where('status').equals('planned').sortBy('sequenceIndex')).find((x) => x.sequenceIndex >= 0) ?? null;
  // A missed session simply becomes the next one: shift suggested dates forward from today.
  if (next && !inProgress && next.scheduledDate < now) {
    await rescheduleFrom(now, database);
    next = (await database.sessions.get(next.id)) ?? next;
  }
  const gap = gapStatus(await lastCompletedDate(database), now);
  const tree = await getTree(database);
  const lastAssess = (await database.assessments.orderBy('date').last())?.date;
  const needsReassessment = !!lastAssess && (Date.parse(now) - Date.parse(lastAssess)) / 86_400_000 >= 35;
  const preview = next ? await materialize(next, profile, gap !== 'none', database, false) : [];
  return {
    today: now,
    isSabbath: isSabbathDate(now, resolve),
    sabbathThisWeek: resolve(ws),
    weekAsked: !!weekRow,
    next,
    gap,
    equipment: equipmentForSession(preview),
    estimatedMinutes: next ? (next.templateId.startsWith('pt') ? TEMPLATES[next.templateId].estimatedMinutes : estimateMinutes(preview)) : 0,
    inProgress,
    needsReassessment,
    totalSessions: tree.totalSessions,
  };
}

async function customExercises(profile: UserProfile, database: HeartwoodDB): Promise<Exercise[]> {
  if (!profile.ptPlan.customExerciseIds.length) return [];
  return (await database.customExercises.bulkGet(profile.ptPlan.customExerciseIds)).filter((e): e is Exercise => !!e);
}

/** Build (or reuse) prescriptions for a session. */
async function materialize(session: PlannedSession, profile: UserProfile, comeback: boolean, database: HeartwoodDB, persist: boolean) {
  if (session.templateId === 'freestyle') return session.prescriptions;
  if (session.prescriptions.length && session.status === 'in-progress') return session.prescriptions;
  const progression = new Map<string, ProgressionState>((await database.progression.toArray()).map((p) => [p.key, p]));
  const custom = await customExercises(profile, database);
  const library = [...Object.values(EXERCISE_MAP), ...custom];
  const ps = prescribeSession({
    templateId: session.templateId, phase: session.phase, isRecoveryWeek: session.isRecoveryWeek, isComeback: comeback,
    equipment: profile.equipment, ctx: contextFromProfile(profile), progression,
    customExercises: custom, scheduleCustomInto: profile.ptPlan.scheduleInto, library,
  });
  if (persist) await database.sessions.update(session.id, { prescriptions: ps, isComeback: comeback });
  return ps;
}

export async function startSession(sessionId: string, opts: { fiveMinute?: boolean } = {}, database: HeartwoodDB = db, now = new Date()): Promise<PlannedSession> {
  const profile = await getProfile(database);
  const s = await database.sessions.get(sessionId);
  if (!s) throw new Error('Session not found');
  const gap = gapStatus(await lastCompletedDate(database), todayISO(now));
  let ps = await materialize(s, profile, gap !== 'none', database, true);
  if (opts.fiveMinute) ps = fiveMinuteVersion(ps);
  const updated: PlannedSession = { ...s, prescriptions: ps, status: 'in-progress', startedAt: now.toISOString(), fiveMinute: !!opts.fiveMinute, isComeback: gap !== 'none' };
  await database.sessions.put(updated);
  return updated;
}

/**
 * Start a particular session today, outside the plan (The Shire asks for one
 * by name, for a path). Extra sessions have a negative sequence index so the
 * scheduler ignores them; they count like any other when completed.
 */
export async function startTemplateNow(templateId: SessionType, opts: { fiveMinute?: boolean } = {}, database: HeartwoodDB = db, now = new Date()): Promise<PlannedSession> {
  const profile = await getProfile(database);
  const state = await getTodayState(database, todayISO(now));
  const like = state.next;
  const id = `x-${now.getTime()}`;
  const planned: PlannedSession = {
    id,
    templateId,
    sequenceIndex: -1,
    scheduledDate: todayISO(now),
    status: 'planned',
    prescriptions: [],
    phase: like?.phase ?? (profile.maintainMode ? 'build' : 'foundation'),
    weekNumber: like?.weekNumber ?? 1,
    isRecoveryWeek: like?.isRecoveryWeek ?? false,
    isComeback: false,
  };
  await database.sessions.put(planned);
  return await startSession(id, opts, database, now);
}

export async function swapExerciseInSession(sessionId: string, exerciseId: string, replacement: Exercise, database: HeartwoodDB = db): Promise<PlannedSession> {
  const s = await database.sessions.get(sessionId);
  if (!s) throw new Error('Session not found');
  const profile = await getProfile(database);
  const state = await database.progression.get(replacement.id);
  const ps = s.prescriptions.map((p) => {
    if (p.exerciseId !== exerciseId) return p;
    const dose = doseFor(s.phase, { recovery: s.isRecoveryWeek, comeback: s.isComeback, category: p.block === 'main' ? replacement.category : p.block });
    const next = { ...p, exerciseId: replacement.id, substitutedFor: exerciseId, side: replacement.unilateral ? ('both' as const) : undefined, weight: undefined as number | undefined, bandLevel: undefined as string | undefined, supportLevel: replacement.supportLevel, reps: undefined as number | undefined, holdSeconds: undefined as number | undefined };
    if (replacement.timerType === 'hold') next.holdSeconds = state?.holdSeconds ?? replacement.defaultHoldSeconds ?? 20;
    else next.reps = Math.min(Math.max(replacement.defaultReps ?? dose.repsHigh, dose.repsLow), dose.repsHigh);
    if (replacement.equipment.includes('dumbbell')) next.weight = state?.weight ?? profile.equipment.dumbbellWeights[0];
    if (replacement.equipment.includes('band')) next.bandLevel = state?.bandLevel ?? profile.equipment.bandLevels[0];
    if (state?.supportLevel) next.supportLevel = state.supportLevel;
    return next;
  });
  const updated = { ...s, prescriptions: ps };
  await database.sessions.put(updated);
  return updated;
}

export async function logSet(log: Omit<SetLog, 'id' | 'loggedAt'>, database: HeartwoodDB = db, now = new Date()): Promise<number> {
  return database.setLogs.add({ ...log, loggedAt: now.toISOString() }) as Promise<number>;
}

export interface CompletionSummary {
  session: PlannedSession;
  decisions: { exerciseId: string; side?: 'left' | 'right'; decision: ProgressionDecision }[];
  newLessons: string[];
  milestones: string[];
  totalSessions: number;
  growthPoints: number;
}

/** Finish a session (fully or early). Completed work always counts (Section 9.5). */
export async function completeSession(sessionId: string, opts: { early?: boolean } = {}, database: HeartwoodDB = db, now = new Date()): Promise<CompletionSummary> {
  const profile = await getProfile(database);
  const s = await database.sessions.get(sessionId);
  if (!s) throw new Error('Session not found');
  const logs = await database.setLogs.where('sessionId').equals(sessionId).toArray();
  const ctx = contextFromProfile(profile);
  const nowISO = now.toISOString();
  const decisions: CompletionSummary['decisions'] = [];

  // Progression per exercise (per side for unilateral work).
  for (const p of s.prescriptions) {
    if (p.block !== 'main') continue;
    const ex = EXERCISE_MAP[p.exerciseId] ?? (await database.customExercises.get(p.exerciseId));
    if (!ex) continue;
    const sides: (('left' | 'right') | undefined)[] = p.side === 'both' ? ['left', 'right'] : [undefined];
    const dose = doseFor(s.phase, { recovery: s.isRecoveryWeek, comeback: s.isComeback, category: ex.category });
    for (const side of sides) {
      const exLogs = logs.filter((l) => l.exerciseId === p.exerciseId && (side ? l.side === side : true));
      if (!exLogs.length) continue;
      const key = progressionKey(p.exerciseId, side);
      const prior = await database.progression.get(key);
      const r = evaluateProgression({ exercise: ex, prescription: p, logs: exLogs, side, prior, equipment: profile.equipment, ctx, repsTop: p.reps ?? dose.repsHigh, now: nowISO });
      await database.progression.put(r.state);
      decisions.push({ exerciseId: p.exerciseId, side, decision: r.decision });
    }
  }

  // Counters that feed sticker-pack unlocks (src/data/stickers.ts).
  const progressed = decisions.filter((d) => d.decision.kind === 'progress');
  if (progressed.length) {
    await bumpCounter('progressions', progressed.length, database);
    const bal = progressed.filter((d) => EXERCISE_MAP[d.exerciseId]?.movementPatterns.includes('balance')).length;
    if (bal) await bumpCounter('balanceProgressions', bal, database);
  }

  const anyLogged = logs.length > 0;
  const status: PlannedSession['status'] = opts.early ? (anyLogged ? 'partial' : 'skipped') : 'completed';
  const updated: PlannedSession = { ...s, status, completedAt: nowISO };
  await database.sessions.put(updated);

  // Tree growth (Section 13). Never shrinks.
  const tree = await getTree(database);
  const milestones: string[] = [];
  let growthPoints = tree.growthPoints;
  let totalSessions = tree.totalSessions;
  if (status !== 'skipped') {
    growthPoints += opts.early ? 1 : 2;
    totalSessions += 1;
    for (const m of [1, 5, 10, 12, 25, 50, 100]) {
      const key = `sessions-${m}`;
      if (totalSessions >= m && !tree.milestones.includes(key)) { milestones.push(key); growthPoints += 3; }
    }
  }
  await database.tree.put({ ...tree, growthPoints, totalSessions, milestones: [...tree.milestones, ...milestones] });

  // Micro-lesson unlocks (Section 12).
  const newLessons: string[] = [];
  if (status !== 'skipped') {
    const unlocked = new Set((await database.lessons.toArray()).map((l) => l.lessonId));
    const done = new Set(s.prescriptions.map((p) => EXERCISE_MAP[p.exerciseId]).filter(Boolean).flatMap((e) => [...e!.lessonIds, ...e!.movementPatterns]));
    // Gentle pacing (Section 14): first-session lessons plus at most one more per session.
    let extra = 0;
    for (const lesson of LESSONS) {
      if (unlocked.has(lesson.id)) continue;
      const first = lesson.unlockedBy === 'first-session';
      const ok = first || done.has(lesson.unlockedBy) || (lesson.unlockedBy.startsWith('template:') && lesson.unlockedBy.slice(9) === s.templateId);
      if (!ok) continue;
      if (!first) { if (extra >= 1) continue; extra++; }
      await database.lessons.put({ lessonId: lesson.id, unlockedAt: nowISO }); newLessons.push(lesson.id);
    }
  }

  await rescheduleFrom(addDays(todayISO(now), 1), database);
  return { session: updated, decisions, newLessons, milestones, totalSessions, growthPoints };
}

export async function bumpCounter(key: string, by: number, database: HeartwoodDB = db): Promise<void> {
  const cur = (await database.kv.get(`counter:${key}`))?.value;
  await database.kv.put({ key: `counter:${key}`, value: (typeof cur === 'number' ? cur : 0) + by });
}

/** "Not today": nothing is lost; the session simply stays next. */
export async function notToday(database: HeartwoodDB = db, now = todayISO()): Promise<void> {
  await rescheduleFrom(addDays(now, 1), database);
}

// ---------------------------------------------------------------------------
// Sabbath (Section 8.4)
// ---------------------------------------------------------------------------

export async function setSabbathForWeek(weekStart: string, day: SabbathDay, database: HeartwoodDB = db, now = todayISO()): Promise<void> {
  await database.weeks.put({ weekStart, sabbathDay: day, askedAt: new Date().toISOString() });
  await database.profile.update('me', { sabbathDay: day });
  await rescheduleFrom(now, database);
}

/** Day-of: "Make today my Sabbath". Only meaningful on a weekend day. */
export async function makeTodaySabbath(database: HeartwoodDB = db, now = todayISO()): Promise<boolean> {
  if (!isWeekend(now)) return false;
  const day: SabbathDay = weekdayOf(now) === 6 ? 'sat' : 'sun';
  await setSabbathForWeek(weekStartOf(now), day, database, now);
  // Rest grows roots.
  const tree = await getTree(database);
  await database.tree.put({ ...tree, rootPoints: tree.rootPoints + 1 });
  return true;
}

export async function recordRestDay(database: HeartwoodDB = db): Promise<void> {
  const tree = await getTree(database);
  await database.tree.put({ ...tree, rootPoints: tree.rootPoints + 1 });
}

// ---------------------------------------------------------------------------
// Maintain / reset
// ---------------------------------------------------------------------------

export async function setMaintainMode(on: boolean, database: HeartwoodDB = db): Promise<void> {
  const profile = await getProfile(database);
  await database.profile.update('me', { maintainMode: on });
  const pending = (await database.sessions.where('status').equals('planned').toArray()).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const startIdx = pending[0]?.sequenceIndex ?? 0;
  const startWeek = pending[0]?.weekNumber ?? 1;
  await database.sessions.bulkDelete(pending.map((p) => p.id));
  const slots = buildProgramSequence(PROGRAM_WEEKS, on, startIdx, startWeek);
  await database.sessions.bulkPut(slots.map((s) => makePlannedSession(s, [], profile.programStartDate ?? todayISO(), false)));
  await rescheduleFrom(todayISO(), database);
}

/** After a 3+ week gap: rebuild the remaining program at a reduced version of the current phase. */
export async function applyLongGapReset(database: HeartwoodDB = db): Promise<void> {
  const pending = (await database.sessions.where('status').equals('planned').toArray()).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (!pending.length) return;
  const first = pending[0];
  // Step back one week's worth of progression: treat the next week as a recovery week.
  const week = first.weekNumber;
  await database.transaction('rw', database.sessions, database.progression, async () => {
    for (const s of pending.filter((p) => p.weekNumber === week)) await database.sessions.update(s.id, { isRecoveryWeek: true });
    // Reset consecutive successes; loads stay (Comeback lowers them one step at session start).
    const states = await database.progression.toArray();
    for (const st of states) await database.progression.update(st.key, { consecutiveSuccesses: 0 });
  });
}
