import { describe, expect, it } from 'vitest';
import { EXERCISE_MAP } from '@/data/exercises';
import { DEFAULT_SAFETY_CONTEXT } from './safety';
import { doseFor, fiveMinuteVersion, lighterLoad, prescribeSession } from './program';
import { evaluateProgression, requiredSuccesses } from './progression';
import type { EquipmentProfile, Prescription, SetLog } from './types';

const EQUIP: EquipmentProfile = { dumbbellWeights: [5, 8, 10, 15], weightUnit: 'lb', bandLevels: ['light', 'medium', 'heavy'], yogaBlocks: true, chair: true, counter: true, wall: true, step: true };
const NOW = '2026-09-14';

function logs(sessionId: string, exerciseId: string, sets: number, reps: number, effort: number, discomfort: number, side?: 'left' | 'right'): SetLog[] {
  return Array.from({ length: sets }, (_, i) => ({ sessionId, exerciseId, setNumber: i + 1, reps, effort, discomfort, discomfortLocations: [], loggedAt: NOW, side }));
}

describe('doses', () => {
  it('foundation 2x10-12, build 3x8-12, recovery reduces volume', () => {
    expect(doseFor('foundation', { category: 'strength' })).toMatchObject({ sets: 2, repsLow: 10, repsHigh: 12 });
    expect(doseFor('build', { category: 'strength' })).toMatchObject({ sets: 3, repsLow: 8, repsHigh: 12 });
    expect(doseFor('build', { category: 'strength', recovery: true }).sets).toBe(2);
    expect(doseFor('build', { category: 'strength', comeback: true }).sets).toBe(2);
  });
  it('comeback lowers load one step', () => {
    expect(lighterLoad({ weight: 10 }, EQUIP).weight).toBe(8);
    expect(lighterLoad({ weight: 5 }, EQUIP).weight).toBe(5);
    expect(lighterLoad({ bandLevel: 'heavy' }, EQUIP).bandLevel).toBe('medium');
    expect(lighterLoad({ supportLevel: 'fingertips' }, EQUIP).supportLevel).toBe('one-hand');
  });
  it('5-minute version is short and keeps a warm-up and cool-down', () => {
    const full = prescribeSession({ templateId: 'strengthA', phase: 'foundation', isRecoveryWeek: false, isComeback: false, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, progression: new Map() });
    const five = fiveMinuteVersion(full);
    expect(five.length).toBe(5);
    expect(five[0].block).toBe('warmup');
    expect(five[five.length - 1].block).toBe('cooldown');
    expect(five.filter((p) => p.block === 'main').every((p) => p.sets === 1)).toBe(true);
  });
});

describe('double progression (Section 8.6)', () => {
  const ex = EXERCISE_MAP['db-rdl'];
  const rx: Prescription = { exerciseId: ex.id, block: 'main', sets: 2, reps: 12, weight: 5, restSeconds: 60 };
  const base = { exercise: ex, prescription: rx, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, repsTop: 12, now: NOW, prior: undefined };

  it('increases weight when all sets hit the top with effort <= 7 and discomfort <= 2', () => {
    const r = evaluateProgression({ ...base, logs: logs('s', ex.id, 2, 12, 6, 1) });
    expect(r.decision.kind).toBe('progress');
    expect(r.state.weight).toBe(8);
  });
  it('holds when effort >= 9', () => {
    const r = evaluateProgression({ ...base, logs: logs('s', ex.id, 2, 12, 9, 0) });
    expect(r.decision.kind).toBe('hold');
    expect(r.state.weight).toBe(5);
  });
  it('holds when discomfort is 3-4', () => {
    const r = evaluateProgression({ ...base, logs: logs('s', ex.id, 2, 12, 5, 4) });
    expect(r.decision.kind).toBe('hold');
  });
  it('regresses and flags for PT when discomfort >= 5', () => {
    const r = evaluateProgression({ ...base, prior: { key: ex.id, exerciseId: ex.id, weight: 10, consecutiveSuccesses: 0, flaggedForPT: false, updatedAt: NOW }, logs: logs('s', ex.id, 2, 12, 5, 6) });
    expect(r.decision.kind).toBe('regress');
    expect(r.state.flaggedForPT).toBe(true);
    expect(r.state.weight).toBe(8);
  });
  it('does not progress when reps fall short', () => {
    const r = evaluateProgression({ ...base, logs: logs('s', ex.id, 2, 10, 6, 0) });
    expect(r.decision.kind).toBe('hold');
  });
  it('caps at the heaviest dumbbell', () => {
    const r = evaluateProgression({ ...base, prior: { key: ex.id, exerciseId: ex.id, weight: 15, consecutiveSuccesses: 0, flaggedForPT: false, updatedAt: NOW }, logs: logs('s', ex.id, 2, 12, 6, 0) });
    expect(r.decision.kind).toBe('hold');
    expect(r.state.weight).toBe(15);
  });
});

describe('conservative progression for balance, ankles and the left knee', () => {
  it('balance support drops only after two consecutive successes, and never to unsupported while locked', () => {
    const ex = EXERCISE_MAP['pt-sls-two-hands'];
    expect(requiredSuccesses(ex, 'left')).toBe(2);
    const rx: Prescription = { exerciseId: ex.id, block: 'main', sets: 2, holdSeconds: 20, supportLevel: 'two-hands', restSeconds: 30, side: 'both' };
    const mk = (prior: ReturnType<typeof evaluateProgression>['state'] | undefined) => evaluateProgression({ exercise: ex, prescription: rx, prior, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, repsTop: 12, now: NOW, side: 'left',
      logs: [1, 2].map((n) => ({ sessionId: 's', exerciseId: ex.id, setNumber: n, holdSeconds: 20, effort: 5, discomfort: 0, discomfortLocations: [], loggedAt: NOW, side: 'left' as const })) });
    const first = mk(undefined);
    expect(first.decision.kind).toBe('building');
    expect(first.state.supportLevel).toBe('two-hands');
    const second = mk(first.state);
    expect(second.decision.kind).toBe('progress');
    expect(second.state.supportLevel).toBe('one-hand');
    // Walk to fingertips, then verify it will not go to "none" while locked.
    const third = mk({ ...second.state, consecutiveSuccesses: 1 });
    expect(third.state.supportLevel).toBe('fingertips');
    const fourth = mk({ ...third.state, consecutiveSuccesses: 1 });
    expect(fourth.state.supportLevel).toBe('fingertips');
    expect(fourth.decision.kind).toBe('hold');
    // Once unlocked via the PT progression, it can advance.
    const unlocked = evaluateProgression({ exercise: ex, prescription: rx, prior: { ...third.state, consecutiveSuccesses: 1 }, equipment: EQUIP, ctx: { unlockedCautions: ['unsupported-single-leg'], restrictions: [] }, repsTop: 12, now: NOW, side: 'left',
      logs: [1, 2].map((n) => ({ sessionId: 's', exerciseId: ex.id, setNumber: n, holdSeconds: 20, effort: 5, discomfort: 0, discomfortLocations: [], loggedAt: NOW, side: 'left' as const })) });
    expect(unlocked.state.supportLevel).toBe('none');
  });
  it('ankle and knee PT work needs three consecutive successes', () => {
    expect(requiredSuccesses(EXERCISE_MAP['pt-ankle-4way'], 'left')).toBe(3);
    expect(requiredSuccesses(EXERCISE_MAP['pt-tke'], 'left')).toBe(3);
    expect(requiredSuccesses(EXERCISE_MAP['pt-seated-knee-extension'], 'right')).toBe(3);
    expect(requiredSuccesses(EXERCISE_MAP['band-row'])).toBe(1);
  });
  it('tracks left and right separately', () => {
    const ex = EXERCISE_MAP['pt-seated-knee-extension-band'];
    const rx: Prescription = { exerciseId: ex.id, block: 'main', sets: 2, reps: 12, bandLevel: 'light', restSeconds: 30, side: 'both' };
    const left = evaluateProgression({ exercise: ex, prescription: rx, prior: undefined, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, repsTop: 12, now: NOW, side: 'left', logs: logs('s', ex.id, 2, 12, 5, 4, 'left') });
    const right = evaluateProgression({ exercise: ex, prescription: rx, prior: { key: `${ex.id}:right`, exerciseId: ex.id, side: 'right', bandLevel: 'light', consecutiveSuccesses: 2, flaggedForPT: false, updatedAt: NOW }, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, repsTop: 12, now: NOW, side: 'right', logs: logs('s', ex.id, 2, 12, 5, 0, 'right') });
    expect(left.state.key).toBe(`${ex.id}:left`);
    expect(left.decision.kind).toBe('hold');
    expect(right.state.key).toBe(`${ex.id}:right`);
    expect(right.decision.kind).toBe('progress');
    expect(right.state.bandLevel).toBe('medium');
  });
});
