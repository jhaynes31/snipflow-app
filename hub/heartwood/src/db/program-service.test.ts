import { beforeEach, describe, expect, it } from 'vitest';
import { HeartwoodDB, defaultProfile, exportAll, importAll } from './db';
import { completeSession, ensureProgram, getTodayState, logSet, makeTodaySabbath, notToday, setSabbathForWeek, startSession, swapExerciseInSession } from './program-service';
import { isSabbathDate, makeSabbathResolver } from '@/domain/schedule';
import { EXERCISE_MAP } from '@/data/exercises';
import { isAllowed, DEFAULT_SAFETY_CONTEXT } from '@/domain/safety';

// 2026-09-14 is a Monday.
const MON = '2026-09-14';
let n = 0;
let database: HeartwoodDB;

beforeEach(async () => {
  database = new HeartwoodDB(`test-${++n}`);
  await database.profile.put({ ...defaultProfile(), onboardingComplete: true, programStartDate: MON });
});

const at = (iso: string, h = 9) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`);

describe('program service', () => {
  it('creates the program once and schedules from today', async () => {
    await ensureProgram(database, MON);
    const before = await database.sessions.count();
    await ensureProgram(database, MON);
    expect(await database.sessions.count()).toBe(before);
    const t = await getTodayState(database, MON);
    expect(t.next?.templateId).toBe('strengthA');
    expect(t.next?.scheduledDate).toBe(MON);
    expect(t.isSabbath).toBe(false);
    expect(t.equipment.length).toBeGreaterThan(0);
  });

  it('full flow: Today -> Start -> log -> Finish, tree grows, lessons unlock, next session queued', async () => {
    const t = await getTodayState(database, MON);
    const s = await startSession(t.next!.id, {}, database, at(MON));
    expect(s.status).toBe('in-progress');
    expect(s.prescriptions.length).toBeGreaterThan(8);
    for (const p of s.prescriptions) expect(isAllowed(EXERCISE_MAP[p.exerciseId], DEFAULT_SAFETY_CONTEXT)).toBe(true);
    // Log every main set at target with low effort.
    for (const p of s.prescriptions.filter((x) => x.block === 'main')) {
      const sides = p.side === 'both' ? (['left', 'right'] as const) : [undefined];
      for (const side of sides) for (let k = 1; k <= p.sets; k++) {
        await logSet({ sessionId: s.id, exerciseId: p.exerciseId, side, setNumber: k, reps: p.reps, holdSeconds: p.holdSeconds, weight: p.weight, effort: 6, discomfort: 0, discomfortLocations: [] }, database, at(MON, 10));
      }
    }
    const done = await completeSession(s.id, {}, database, at(MON, 11));
    expect(done.session.status).toBe('completed');
    expect(done.totalSessions).toBe(1);
    expect(done.growthPoints).toBeGreaterThan(0);
    expect(done.milestones).toContain('sessions-1');
    expect(done.newLessons).toContain('welcome-body');
    expect(done.decisions.some((d) => d.decision.kind === 'progress' || d.decision.kind === 'building')).toBe(true);
    const t2 = await getTodayState(database, MON);
    expect(t2.next?.templateId).toBe('somatic');
    expect(t2.next?.scheduledDate).toBe('2026-09-15');
  });

  it('progression carries into the next matching session', async () => {
    const t = await getTodayState(database, MON);
    const s = await startSession(t.next!.id, {}, database, at(MON));
    const rdl = s.prescriptions.find((p) => p.exerciseId === 'db-rdl')!;
    expect(rdl.weight).toBe(5);
    for (let k = 1; k <= rdl.sets; k++) await logSet({ sessionId: s.id, exerciseId: 'db-rdl', setNumber: k, reps: rdl.reps, weight: 5, effort: 5, discomfort: 0, discomfortLocations: [] }, database);
    await completeSession(s.id, {}, database, at(MON, 11));
    // Skip to the next Strength A (sequence index 4) and start it.
    const nextA = (await database.sessions.where('status').equals('planned').toArray()).filter((x) => x.templateId === 'strengthA').sort((a, b) => a.sequenceIndex - b.sequenceIndex)[0];
    const s2 = await startSession(nextA.id, {}, database, at('2026-09-18'));
    expect(s2.prescriptions.find((p) => p.exerciseId === 'db-rdl')!.weight).toBe(8);
  });

  it('stopping early saves completed work and counts it', async () => {
    const t = await getTodayState(database, MON);
    const s = await startSession(t.next!.id, {}, database, at(MON));
    const first = s.prescriptions.find((p) => p.block === 'main')!;
    await logSet({ sessionId: s.id, exerciseId: first.exerciseId, setNumber: 1, reps: first.reps, effort: 6, discomfort: 0, discomfortLocations: [] }, database);
    const done = await completeSession(s.id, { early: true }, database, at(MON, 10));
    expect(done.session.status).toBe('partial');
    expect(done.totalSessions).toBe(1);
    expect(await database.setLogs.count()).toBe(1);
  });

  it('a missed session shifts forward without doubling up', async () => {
    const t = await getTodayState(database, MON);
    await startSession(t.next!.id, {}, database, at(MON));
    await completeSession(t.next!.id, {}, database, at(MON, 10));
    // Missed Tue, Wed, Thu. Today is Friday.
    const fri = '2026-09-18';
    const tf = await getTodayState(database, fri);
    expect(tf.next?.templateId).toBe('somatic');
    expect(tf.next?.sequenceIndex).toBe(1);
    expect(tf.next?.scheduledDate).toBe(fri);
    const pending = (await database.sessions.where('status').equals('planned').toArray()).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    expect(pending[0].scheduledDate).toBe(fri);
    expect(pending[1].scheduledDate).toBe('2026-09-19');
    expect(pending[2].scheduledDate).toBe('2026-09-21'); // Sunday skipped
    expect(new Set(pending.map((p) => p.scheduledDate)).size).toBe(pending.length);
  });

  it('week-of Sabbath switch moves the weekend session, never onto the Sabbath', async () => {
    await ensureProgram(database, MON);
    await setSabbathForWeek(MON, 'sat', database, MON);
    const pending = (await database.sessions.where('status').equals('planned').toArray()).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    expect(pending.slice(0, 6).map((p) => p.scheduledDate)).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-20']);
    expect(pending[5].templateId).toBe('pelvicFloor');
    const t = await getTodayState(database, '2026-09-19');
    expect(t.isSabbath).toBe(true);
    expect(t.sabbathThisWeek).toBe('sat');
    // Next week falls back to the last choice (Saturday) until asked again.
    expect(pending[11].scheduledDate).toBe('2026-09-27');
  });

  it('day-of "Make today my Sabbath" on Saturday moves that session to Sunday', async () => {
    await ensureProgram(database, MON);
    const sat = '2026-09-19';
    const before = await getTodayState(database, sat);
    expect(before.isSabbath).toBe(false);
    expect(await makeTodaySabbath(database, sat)).toBe(true);
    const after = await getTodayState(database, sat);
    expect(after.isSabbath).toBe(true);
    const pending = (await database.sessions.where('status').equals('planned').toArray()).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    expect(pending[0].scheduledDate).toBe('2026-09-20');
    const resolve = makeSabbathResolver(await database.weeks.toArray(), (await database.profile.get('me'))!.sabbathDay);
    for (const p of pending) expect(isSabbathDate(p.scheduledDate, resolve), p.scheduledDate).toBe(false);
    // Roots grew.
    expect((await database.tree.get('tree'))?.rootPoints).toBe(1);
  });

  it('"Not today" moves the date and nothing else', async () => {
    await ensureProgram(database, MON);
    await notToday(database, MON);
    const t = await getTodayState(database, MON);
    expect(t.next?.sequenceIndex).toBe(0);
    expect(t.next?.status).toBe('planned');
    expect((await database.sessions.where('status').equals('planned').sortBy('sequenceIndex'))[0].scheduledDate).toBe('2026-09-15');
  });

  it('"Make today my Sabbath" is a no-op on a weekday', async () => {
    await ensureProgram(database, MON);
    expect(await makeTodaySabbath(database, '2026-09-16')).toBe(false);
  });

  it('comeback mode after a 7+ day gap lowers load and volume, keeps the tree', async () => {
    const t = await getTodayState(database, MON);
    const s = await startSession(t.next!.id, {}, database, at(MON));
    const rdl = s.prescriptions.find((p) => p.exerciseId === 'db-rdl')!;
    for (let k = 1; k <= rdl.sets; k++) await logSet({ sessionId: s.id, exerciseId: 'db-rdl', setNumber: k, reps: rdl.reps, weight: 5, effort: 5, discomfort: 0, discomfortLocations: [] }, database);
    const done = await completeSession(s.id, {}, database, at(MON, 11));
    // Gap of 10 days.
    const later = '2026-09-24';
    const t2 = await getTodayState(database, later);
    expect(t2.gap).toBe('comeback');
    const s2 = await startSession(t2.next!.id, {}, database, at(later));
    expect(s2.isComeback).toBe(true);
    const main = s2.prescriptions.filter((p) => p.block === 'main');
    expect(main.every((p) => p.sets === 1)).toBe(true);
    expect((await database.tree.get('tree'))?.growthPoints).toBe(done.growthPoints);
  });

  it('swap keeps the session safe', async () => {
    const t = await getTodayState(database, MON);
    const s = await startSession(t.next!.id, {}, database, at(MON));
    const updated = await swapExerciseInSession(s.id, 'db-rdl', EXERCISE_MAP['band-good-morning'], database);
    const p = updated.prescriptions.find((x) => x.substitutedFor === 'db-rdl')!;
    expect(p.exerciseId).toBe('band-good-morning');
    expect(p.bandLevel).toBe('light');
  });

  it('export/import round-trips all data', async () => {
    const t = await getTodayState(database, MON);
    const s = await startSession(t.next!.id, {}, database, at(MON));
    await logSet({ sessionId: s.id, exerciseId: 'db-rdl', setNumber: 1, reps: 10, effort: 5, discomfort: 0, discomfortLocations: [] }, database);
    await completeSession(s.id, {}, database, at(MON, 11));
    const backup = await exportAll(database, false);
    const other = new HeartwoodDB(`test-import-${n}`);
    await importAll(backup, other);
    expect(await other.sessions.count()).toBe(await database.sessions.count());
    expect(await other.setLogs.count()).toBe(1);
    expect((await other.tree.get('tree'))?.totalSessions).toBe(1);
    expect((await other.profile.get('me'))?.programStartDate).toBe(MON);
  });
});
