import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, weekStartOf, weekdayOf } from './dates';
import { DEFAULT_PREFERRED_DAYS, assignDates, isSabbathDate, isTrainingDate, makeSabbathResolver, nextTrainingDate, trainingWeekdaysForWeek } from './schedule';
import { buildProgramSequence, gapStatus, isRecoveryWeek, phaseForWeek } from './program';

// 2026-09-14 is a Monday.
const MON = '2026-09-14';
const SAT = '2026-09-19';
const SUN = '2026-09-20';

describe('dates', () => {
  it('computes week start and weekday', () => {
    expect(weekdayOf(MON)).toBe(1);
    expect(weekStartOf(SUN)).toBe(MON);
    expect(weekStartOf(SAT)).toBe(MON);
    expect(weekStartOf(MON)).toBe(MON);
    expect(addDays(MON, 7)).toBe('2026-09-21');
    expect(daysBetween(MON, SUN)).toBe(6);
  });
});

describe('Sabbath handling (Section 8.4)', () => {
  it('Sabbath on Sunday: Mon-Sat train, Sunday never', () => {
    const r = makeSabbathResolver([], 'sun');
    expect(trainingWeekdaysForWeek(DEFAULT_PREFERRED_DAYS, 'sun')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(isSabbathDate(SUN, r)).toBe(true);
    expect(isTrainingDate(SUN, DEFAULT_PREFERRED_DAYS, r)).toBe(false);
    expect(isTrainingDate(SAT, DEFAULT_PREFERRED_DAYS, r)).toBe(true);
  });
  it('Sabbath on Saturday moves the weekend session to Sunday, weekdays unchanged', () => {
    const r = makeSabbathResolver([], 'sat');
    expect(trainingWeekdaysForWeek(DEFAULT_PREFERRED_DAYS, 'sat')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(isSabbathDate(SAT, r)).toBe(true);
    expect(isTrainingDate(SAT, DEFAULT_PREFERRED_DAYS, r)).toBe(false);
    expect(isTrainingDate(SUN, DEFAULT_PREFERRED_DAYS, r)).toBe(true);
    const dates = assignDates(6, MON, DEFAULT_PREFERRED_DAYS, r);
    expect(dates).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-20']);
  });
  it('switching Sabbath week-of rebuilds that week only', () => {
    const r = makeSabbathResolver([{ weekStart: MON, sabbathDay: 'sat' }], 'sun');
    const dates = assignDates(12, MON, DEFAULT_PREFERRED_DAYS, r);
    // Week 1: Sabbath Saturday -> Sunday trains.
    expect(dates.slice(0, 6)).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-20']);
    // Week 2 falls back to Sunday Sabbath -> Saturday trains.
    expect(dates.slice(6)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26']);
    for (const d of dates) expect(isSabbathDate(d, r), d).toBe(false);
  });
  it('"Make today my Sabbath" on Saturday moves Saturday session to Sunday', () => {
    // Before: Sunday sabbath, session scheduled Saturday.
    const before = makeSabbathResolver([], 'sun');
    expect(nextTrainingDate(SAT, DEFAULT_PREFERRED_DAYS, before)).toBe(SAT);
    // Day-of switch.
    const after = makeSabbathResolver([{ weekStart: MON, sabbathDay: 'sat' }], 'sun');
    expect(nextTrainingDate(SAT, DEFAULT_PREFERRED_DAYS, after)).toBe(SUN);
    expect(isSabbathDate(SAT, after)).toBe(true);
  });
  it('never schedules anything on a Sabbath over a long horizon, with alternating Sabbaths', () => {
    const weeks = Array.from({ length: 30 }, (_, i) => ({ weekStart: addDays(MON, i * 7), sabbathDay: (i % 3 === 0 ? 'sat' : 'sun') as 'sat' | 'sun' }));
    const r = makeSabbathResolver(weeks, 'sun');
    const dates = assignDates(150, MON, DEFAULT_PREFERRED_DAYS, r);
    for (const d of dates) expect(isSabbathDate(d, r), d).toBe(false);
    expect(new Set(dates).size).toBe(dates.length); // never two on one day
  });
  it('the Sabbath is protected even if the user lists it as a preferred day', () => {
    expect(trainingWeekdaysForWeek([0, 1, 2, 3, 4, 5, 6], 'sun')).not.toContain(0);
    expect(trainingWeekdaysForWeek([0, 1, 2, 3, 4, 5, 6], 'sat')).not.toContain(6);
  });
  it('fewer preferred days simply spread sessions over more weeks', () => {
    const r = makeSabbathResolver([], 'sun');
    const dates = assignDates(6, MON, [1, 3, 5], r);
    expect(dates).toEqual(['2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21', '2026-09-23', '2026-09-25']);
  });
});

describe('sequencing and missed sessions (Section 8.5)', () => {
  it('a missed session shifts forward without doubling up', () => {
    const r = makeSabbathResolver([], 'sun');
    // Sessions 0 and 1 done Mon/Tue. User misses Wed & Thu. Today is Friday.
    const fri = '2026-09-18';
    const remaining = assignDates(4, fri, DEFAULT_PREFERRED_DAYS, r);
    expect(remaining).toEqual(['2026-09-18', '2026-09-19', '2026-09-21', '2026-09-22']);
    expect(new Set(remaining).size).toBe(4);
  });
  it('A/B alternation: A/B/A one week, B/A/B the next', () => {
    const seq = buildProgramSequence(2);
    const strength = seq.filter((s) => s.templateId.startsWith('strength')).map((s) => s.templateId);
    expect(strength).toEqual(['strengthA', 'strengthB', 'strengthA', 'strengthB', 'strengthA', 'strengthB']);
    expect(seq.map((s) => s.templateId).slice(0, 6)).toEqual(['strengthA', 'ptAnkles', 'strengthB', 'ptKneesHips', 'strengthA', 'ptMobility']);
  });
  it('phases: foundation weeks 1-4, build after, recovery every 5th build week', () => {
    expect(phaseForWeek(1, false)).toBe('foundation');
    expect(phaseForWeek(4, false)).toBe('foundation');
    expect(phaseForWeek(5, false)).toBe('build');
    expect(isRecoveryWeek(9, false)).toBe(true);
    expect(isRecoveryWeek(14, false)).toBe(true);
    expect(isRecoveryWeek(8, false)).toBe(false);
    expect(isRecoveryWeek(4, false)).toBe(false);
  });
  it('gap detection', () => {
    expect(gapStatus(undefined, MON)).toBe('none');
    expect(gapStatus('2026-09-10', MON)).toBe('none');
    expect(gapStatus('2026-09-07', MON)).toBe('comeback');
    expect(gapStatus('2026-08-20', MON)).toBe('long-gap');
  });
});
