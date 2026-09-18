import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_MAP } from '@/data/exercises';
import { BODY_AREAS, FREESTYLE_MINUTES, buildFreestyle } from './freestyle';
import { DEFAULT_SAFETY_CONTEXT, isAllowed } from './safety';
import type { EquipmentProfile } from './types';

const EQUIP: EquipmentProfile = { dumbbellWeights: [5, 8, 10], weightUnit: 'lb', bandLevels: ['light', 'medium'], yogaBlocks: true, chair: true, counter: true, wall: true, step: true };
const EXCLUDED = EXERCISES.filter((e) => !isAllowed(e, DEFAULT_SAFETY_CONTEXT)).map((e) => e.id);
const base = { equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, progression: new Map() };

describe('freestyle sessions', () => {
  it('every body area has at least one safe exercise', () => {
    for (const a of BODY_AREAS) {
      const hits = EXERCISES.filter((e) => isAllowed(e, DEFAULT_SAFETY_CONTEXT) && a.match(e) > 0);
      expect(hits.length, a.id).toBeGreaterThan(0);
    }
  });
  it('never includes excluded exercises, for any area and any time budget', () => {
    for (const a of BODY_AREAS) for (const m of FREESTYLE_MINUTES) {
      const plan = buildFreestyle({ ...base, selection: [a.id, `${a.id}:left`], minutes: m });
      expect(plan.prescriptions.length, `${a.id}/${m}`).toBeGreaterThan(0);
      for (const p of plan.prescriptions) expect(EXCLUDED, `${a.id}/${m} had ${p.exerciseId}`).not.toContain(p.exerciseId);
      expect(new Set(plan.prescriptions.map((p) => p.exerciseId)).size).toBe(plan.prescriptions.length);
    }
  });
  it('respects the time budget and scales sets with minutes', () => {
    const five = buildFreestyle({ ...base, selection: ['glutes', 'core'], minutes: 5 });
    expect(five.estimatedMinutes).toBeLessThanOrEqual(8);
    expect(five.prescriptions.every((p) => p.sets === 1)).toBe(true);
    const thirty = buildFreestyle({ ...base, selection: ['glutes', 'core', 'shoulders', 'balance'], minutes: 30 });
    expect(thirty.estimatedMinutes).toBeGreaterThan(15);
    expect(thirty.estimatedMinutes).toBeLessThanOrEqual(38);
    expect(thirty.prescriptions.some((p) => p.block === 'warmup')).toBe(true);
    expect(thirty.prescriptions.some((p) => p.block === 'cooldown')).toBe(true);
  });
  it('gives every chosen area at least one exercise when time allows', () => {
    const plan = buildFreestyle({ ...base, selection: ['glutes', 'upper-back', 'ankles-feet'], minutes: 20 });
    const main = plan.prescriptions.filter((p) => p.block === 'main').map((p) => EXERCISE_MAP[p.exerciseId]);
    expect(main.some((e) => e.musclesPrimary.includes('glutes'))).toBe(true);
    expect(main.some((e) => e.musclesPrimary.includes('upper-back'))).toBe(true);
    expect(main.some((e) => e.musclesPrimary.includes('ankles-feet') || e.movementPatterns.includes('ankle'))).toBe(true);
  });
  it('varies with the seed', () => {
    const a = buildFreestyle({ ...base, selection: ['core'], minutes: 15, seed: 0 }).prescriptions.map((p) => p.exerciseId).join();
    const b = buildFreestyle({ ...base, selection: ['core'], minutes: 15, seed: 3 }).prescriptions.map((p) => p.exerciseId).join();
    expect(a).not.toBe(b);
  });
});
