import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_MAP } from '@/data/exercises';
import { TEMPLATES } from '@/data/templates';
import { CAUTION_TAGS, DEFAULT_SAFETY_CONTEXT, exclusionReason, filterAllowed, findSafeAlternative, isAllowed, isHardExcluded, type SafetyContext } from './safety';
import { buildProgramSequence, prescribeSession } from './program';
import type { CautionTag, EquipmentProfile, Exercise } from './types';

const EQUIP: EquipmentProfile = { dumbbellWeights: [5, 8, 10, 15], weightUnit: 'lb', bandLevels: ['light', 'medium', 'heavy'], yogaBlocks: true, chair: true, counter: true, wall: true, step: true };
const EXCLUDED_IDS = EXERCISES.filter((e) => e.id.startsWith('x-') && !e.cautionTags.length).map((e) => e.id);
const ALL_UNLOCKED: SafetyContext = { unlockedCautions: [...CAUTION_TAGS], restrictions: [] };

describe('library integrity', () => {
  it('every exercise has the required safety tags', () => {
    for (const e of EXERCISES) {
      expect(Array.isArray(e.movementPatterns), e.id).toBe(true);
      expect(Array.isArray(e.jointsLoaded), e.id).toBe(true);
      expect(['none', 'low', 'high']).toContain(e.impact);
      expect(['none', 'low', 'high']).toContain(e.neckDemand);
      expect(e.stance, e.id).toBeTruthy();
      expect(e.equipment.length, e.id).toBeGreaterThan(0);
      expect(e.timerType, e.id).toBeTruthy();
    }
  });
  it('regression/progression links point at real exercises', () => {
    for (const e of EXERCISES) {
      if (e.regressionId) expect(EXERCISE_MAP[e.regressionId], `${e.id} regression`).toBeDefined();
      if (e.progressionId) expect(EXERCISE_MAP[e.progressionId], `${e.id} progression`).toBeDefined();
    }
  });
  it('all template exercises exist', () => {
    for (const t of Object.values(TEMPLATES)) for (const b of t.blocks) for (const id of b.exerciseIds) expect(EXERCISE_MAP[id], id).toBeDefined();
  });
  it('the library has hard-excluded and caution exercises to test against', () => {
    expect(EXCLUDED_IDS.length).toBeGreaterThanOrEqual(8);
    expect(EXERCISES.filter((e) => e.cautionTags.length).length).toBeGreaterThanOrEqual(4);
  });
});

describe('hard exclusions (Section 4.3)', () => {
  it('excludes every lunge, burpee, crunch, sit-up, high neck demand and high impact exercise', () => {
    for (const id of EXCLUDED_IDS) {
      expect(isAllowed(EXERCISE_MAP[id], DEFAULT_SAFETY_CONTEXT), id).toBe(false);
      expect(isHardExcluded(EXERCISE_MAP[id]), id).toBe(true);
    }
  });
  it('cannot be bypassed by unlocking every caution tag', () => {
    for (const id of EXCLUDED_IDS) expect(isAllowed(EXERCISE_MAP[id], ALL_UNLOCKED), id).toBe(false);
  });
  it('catches a lunge by name even if mis-tagged', () => {
    const sneaky: Exercise = { ...EXERCISE_MAP['sit-to-stand'], id: 'sneaky', name: 'Walking Lunge', exclusionTags: [] };
    expect(exclusionReason(sneaky, ALL_UNLOCKED)?.kind).toBe('hard');
  });
  it('catches neckDemand high and impact high without exclusion tags', () => {
    const neck: Exercise = { ...EXERCISE_MAP['dead-bug'], id: 'n', name: 'Neck thing', neckDemand: 'high' };
    const jump: Exercise = { ...EXERCISE_MAP['sit-to-stand'], id: 'j', name: 'Hop thing', impact: 'high' };
    expect(isAllowed(neck, ALL_UNLOCKED)).toBe(false);
    expect(isAllowed(jump, ALL_UNLOCKED)).toBe(false);
  });
  it('the safe library is non-trivial', () => {
    expect(filterAllowed(EXERCISES, DEFAULT_SAFETY_CONTEXT).length).toBeGreaterThanOrEqual(60);
  });
});

describe('caution list (Section 4.4)', () => {
  it('locks caution exercises by default', () => {
    for (const e of EXERCISES.filter((x) => x.cautionTags.length)) expect(isAllowed(e, DEFAULT_SAFETY_CONTEXT), e.id).toBe(false);
  });
  it('unlocks only the matching caution tag', () => {
    const ctx: SafetyContext = { unlockedCautions: ['step-up'], restrictions: [] };
    expect(isAllowed(EXERCISE_MAP['pt-step-up-supported'], ctx)).toBe(true);
    expect(isAllowed(EXERCISE_MAP['pt-sls-none'], ctx)).toBe(false);
  });
});

describe('PT restrictions (Section 4.7)', () => {
  it('excludes by joint, pattern, stance and id', () => {
    const ctx: SafetyContext = { unlockedCautions: [], restrictions: [
      { id: 'r1', label: 'No hinge', avoidPatterns: ['hinge'] },
      { id: 'r2', label: 'No wrists', avoidJoints: ['wrist'] },
      { id: 'r3', label: 'No kneeling', avoidStances: ['kneeling'] },
      { id: 'r4', label: 'No floor press', avoidExerciseIds: ['db-floor-press'] },
    ] };
    expect(isAllowed(EXERCISE_MAP['db-rdl'], ctx)).toBe(false);
    expect(isAllowed(EXERCISE_MAP['wu-cat-cow'], ctx)).toBe(false);
    expect(isAllowed(EXERCISE_MAP['cd-hip-flexor-block'], ctx)).toBe(false);
    expect(isAllowed(EXERCISE_MAP['db-floor-press'], ctx)).toBe(false);
    expect(isAllowed(EXERCISE_MAP['sit-to-stand'], ctx)).toBe(true);
  });
});

describe('swaps (Section 9.3)', () => {
  it('always returns a safe alternative for every allowed exercise', () => {
    const lib = EXERCISES;
    for (const e of filterAllowed(lib, DEFAULT_SAFETY_CONTEXT)) {
      const alt = findSafeAlternative(e, lib, DEFAULT_SAFETY_CONTEXT);
      expect(alt, e.id).not.toBeNull();
      expect(alt!.id).not.toBe(e.id);
      expect(isAllowed(alt!, DEFAULT_SAFETY_CONTEXT), `${e.id} -> ${alt!.id}`).toBe(true);
      expect(EXCLUDED_IDS).not.toContain(alt!.id);
    }
  });
  it('never swaps into an excluded exercise even when the progression link is excluded', () => {
    const lib: Exercise[] = [...EXERCISES, { ...EXERCISE_MAP['sit-to-stand'], id: 'trap', progressionId: 'x-forward-lunge', regressionId: 'x-burpee' }];
    const alt = findSafeAlternative(lib.find((e) => e.id === 'trap')!, lib, DEFAULT_SAFETY_CONTEXT);
    expect(alt).not.toBeNull();
    expect(['x-forward-lunge', 'x-burpee']).not.toContain(alt!.id);
  });
  it('chained swaps stay safe', () => {
    let cur = EXERCISE_MAP['goblet-squat-box'];
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      const alt = findSafeAlternative(cur, EXERCISES, DEFAULT_SAFETY_CONTEXT, seen);
      if (!alt) break;
      expect(isAllowed(alt, DEFAULT_SAFETY_CONTEXT)).toBe(true);
      seen.push(alt.id);
      cur = alt;
    }
    expect(seen.length).toBeGreaterThan(3);
  });
});

describe('plan generation never includes excluded exercises', () => {
  const contexts: SafetyContext[] = [
    DEFAULT_SAFETY_CONTEXT,
    ALL_UNLOCKED,
    { unlockedCautions: [], restrictions: [{ id: 'r', label: 'no dumbbells', avoidPatterns: ['hinge', 'push'] }] },
    { unlockedCautions: ['step-up'], restrictions: [{ id: 'r', label: 'no floor', avoidStances: ['supine', 'prone', 'quadruped', 'side-lying'] }] },
  ];
  it('across 24 weeks, every phase, recovery and comeback, for several contexts', () => {
    for (const ctx of contexts) {
      for (const slot of buildProgramSequence(24)) {
        for (const comeback of [false, true]) {
          const ps = prescribeSession({ templateId: slot.templateId, phase: slot.phase, isRecoveryWeek: slot.isRecoveryWeek, isComeback: comeback, equipment: EQUIP, ctx, progression: new Map() });
          expect(ps.length).toBeGreaterThan(3);
          for (const p of ps) {
            expect(EXCLUDED_IDS, `${slot.templateId} had ${p.exerciseId}`).not.toContain(p.exerciseId);
            expect(isAllowed(EXERCISE_MAP[p.exerciseId], ctx), `${slot.templateId} had ${p.exerciseId}`).toBe(true);
          }
          // No duplicates within one session.
          expect(new Set(ps.map((p) => p.exerciseId)).size).toBe(ps.length);
        }
      }
    }
  });
  it('locked step-ups are swapped out of Knees & Hips by default and included once unlocked', () => {
    const locked = prescribeSession({ templateId: 'ptKneesHips', phase: 'foundation', isRecoveryWeek: false, isComeback: false, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, progression: new Map() });
    expect(locked.map((p) => p.exerciseId)).not.toContain('pt-step-up-supported');
    expect(locked.some((p) => p.substitutedFor === 'pt-step-up-supported')).toBe(true);
    const unlocked = prescribeSession({ templateId: 'ptKneesHips', phase: 'foundation', isRecoveryWeek: false, isComeback: false, equipment: EQUIP, ctx: { unlockedCautions: ['step-up' as CautionTag], restrictions: [] }, progression: new Map() });
    expect(unlocked.map((p) => p.exerciseId)).toContain('pt-step-up-supported');
  });
  it('a template that names an excluded exercise still yields a safe session', () => {
    const ps = prescribeSession({ templateId: 'strengthA', phase: 'build', isRecoveryWeek: false, isComeback: false, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, progression: new Map(),
      library: EXERCISES.map((e) => (e.id === 'sit-to-stand' ? { ...e, exclusionTags: ['lunge'] } : e)) });
    expect(ps.map((p) => p.exerciseId)).not.toContain('sit-to-stand');
    for (const p of ps) expect(EXCLUDED_IDS).not.toContain(p.exerciseId);
  });
  it('custom PT exercises go through the filter too', () => {
    const custom: Exercise = { ...EXERCISE_MAP['x-crunch'], id: 'custom-crunch', custom: true };
    const ps = prescribeSession({ templateId: 'ptAnkles', phase: 'foundation', isRecoveryWeek: false, isComeback: false, equipment: EQUIP, ctx: DEFAULT_SAFETY_CONTEXT, progression: new Map(),
      customExercises: [custom], scheduleCustomInto: ['ptAnkles'], library: [...EXERCISES, custom] });
    expect(ps.map((p) => p.exerciseId)).not.toContain('custom-crunch');
  });
});
