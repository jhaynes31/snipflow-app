import { SUPPORT_ORDER } from './program';
import type { SafetyContext } from './safety';
import type { EquipmentProfile, Exercise, Prescription, ProgressionState, SetLog } from './types';

/**
 * Progression rules (Section 8.6). Pure functions: take the logged sets for one
 * exercise in one session and return the next state plus a decision.
 */

export type ProgressionDecision =
  | { kind: 'progress'; detail: string }
  | { kind: 'hold'; detail: string }
  | { kind: 'regress'; detail: string; flagForPT: true }
  | { kind: 'building'; detail: string; successes: number; required: number };

export function requiredSuccesses(ex: Exercise, side?: 'left' | 'right'): number {
  // Balance support progression: two consecutive sessions.
  if (ex.movementPatterns.includes('balance') && ex.supportLevel) return 2;
  // Left knee and ankles: three consecutive sessions.
  const loadsAnkle = ex.jointsLoaded.includes('ankle') && ex.movementPatterns.includes('ankle');
  const loadsKnee = ex.jointsLoaded.includes('knee');
  if (loadsAnkle) return 3;
  if (loadsKnee && (side === 'left' || (ex.category === 'pt' && ex.movementPatterns.includes('knee')))) return 3;
  if (loadsKnee && ex.movementPatterns.includes('squat')) return 2;
  return 1;
}

export function progressionKey(exerciseId: string, side?: 'left' | 'right'): string {
  return side ? `${exerciseId}:${side}` : exerciseId;
}

export function nextLoad(state: ProgressionState, ex: Exercise, equipment: EquipmentProfile, ctx: SafetyContext): { next: ProgressionState; detail: string } | null {
  if (state.weight != null && ex.equipment.includes('dumbbell')) {
    const idx = equipment.dumbbellWeights.indexOf(state.weight);
    const next = equipment.dumbbellWeights[idx + 1];
    if (next != null) return { next: { ...state, weight: next }, detail: `Weight up to ${next} ${equipment.weightUnit}` };
    return null;
  }
  if (state.bandLevel != null && ex.equipment.includes('band')) {
    const idx = equipment.bandLevels.indexOf(state.bandLevel);
    const next = equipment.bandLevels[idx + 1];
    if (next != null) return { next: { ...state, bandLevel: next }, detail: `Band up to ${next}` };
    return null;
  }
  if (state.supportLevel != null) {
    const idx = SUPPORT_ORDER.indexOf(state.supportLevel);
    const next = SUPPORT_ORDER[idx + 1];
    if (!next) return null;
    // "none" is the unsupported single-leg caution; only if unlocked.
    if (next === 'none' && !ctx.unlockedCautions.includes('unsupported-single-leg')) return null;
    return { next: { ...state, supportLevel: next }, detail: `Support down to ${next.replace('-', ' ')}` };
  }
  if (state.holdSeconds != null || ex.timerType === 'hold') {
    const cur = state.holdSeconds ?? ex.defaultHoldSeconds ?? 20;
    const next = Math.min(cur + 5, 90);
    if (next === cur) return null;
    return { next: { ...state, holdSeconds: next }, detail: `Hold up to ${next}s` };
  }
  return null;
}

export function regressLoad(state: ProgressionState, ex: Exercise, equipment: EquipmentProfile): ProgressionState {
  if (state.weight != null && ex.equipment.includes('dumbbell')) {
    const idx = equipment.dumbbellWeights.indexOf(state.weight);
    return { ...state, weight: equipment.dumbbellWeights[Math.max(0, idx - 1)] };
  }
  if (state.bandLevel != null && ex.equipment.includes('band')) {
    const idx = equipment.bandLevels.indexOf(state.bandLevel);
    return { ...state, bandLevel: equipment.bandLevels[Math.max(0, idx - 1)] };
  }
  if (state.supportLevel != null) {
    const idx = SUPPORT_ORDER.indexOf(state.supportLevel);
    return { ...state, supportLevel: SUPPORT_ORDER[Math.max(0, idx - 1)] };
  }
  if (state.holdSeconds != null) return { ...state, holdSeconds: Math.max(10, state.holdSeconds - 5) };
  return state;
}

export interface EvaluateInput {
  exercise: Exercise;
  prescription: Prescription;
  logs: SetLog[];                 // logs for this exercise (and side) in this session
  side?: 'left' | 'right';
  prior: ProgressionState | undefined;
  equipment: EquipmentProfile;
  ctx: SafetyContext;
  repsTop: number;                // top of the rep range for this phase
  now: string;
}

export function evaluateProgression(input: EvaluateInput): { state: ProgressionState; decision: ProgressionDecision } {
  const { exercise, prescription, logs, side, equipment, ctx, now } = input;
  const base: ProgressionState = input.prior ?? {
    key: progressionKey(exercise.id, side),
    exerciseId: exercise.id,
    side,
    weight: prescription.weight,
    bandLevel: prescription.bandLevel,
    supportLevel: prescription.supportLevel,
    holdSeconds: prescription.holdSeconds,
    consecutiveSuccesses: 0,
    flaggedForPT: false,
    updatedAt: now,
  };

  if (logs.length === 0) return { state: base, decision: { kind: 'hold', detail: 'Nothing logged this session.' } };

  const maxDiscomfort = Math.max(...logs.map((l) => l.discomfort));
  const maxEffort = Math.max(...logs.map((l) => l.effort));

  // Discomfort >= 5: stop, swap to regression, flag for PT.
  if (maxDiscomfort >= 5) {
    const regressed = regressLoad(base, exercise, equipment);
    return {
      state: { ...regressed, consecutiveSuccesses: 0, flaggedForPT: true, updatedAt: now },
      decision: { kind: 'regress', detail: 'Discomfort was high, so next time is an easier version. Your PT engine has a note.', flagForPT: true },
    };
  }

  // Effort >= 9 or discomfort 3-4: hold.
  if (maxEffort >= 9 || maxDiscomfort >= 3) {
    return { state: { ...base, consecutiveSuccesses: 0, updatedAt: now }, decision: { kind: 'hold', detail: 'Holding this load. Consistency is the win.' } };
  }

  // Did every set reach the target?
  const targetReached = logs.every((l) => {
    if (prescription.holdSeconds != null) return (l.holdSeconds ?? 0) >= prescription.holdSeconds;
    return (l.reps ?? 0) >= input.repsTop;
  });
  const allSetsDone = logs.length >= prescription.sets;
  const success = targetReached && allSetsDone && maxEffort <= 7 && maxDiscomfort <= 2;

  if (!success) {
    return { state: { ...base, consecutiveSuccesses: 0, updatedAt: now }, decision: { kind: 'hold', detail: 'Keep building at this level.' } };
  }

  const required = requiredSuccesses(exercise, side);
  const successes = base.consecutiveSuccesses + 1;
  if (successes < required) {
    return { state: { ...base, consecutiveSuccesses: successes, updatedAt: now }, decision: { kind: 'building', detail: `Strong session. ${required - successes} more like this and the level goes up.`, successes, required } };
  }
  const nl = nextLoad(base, exercise, equipment, ctx);
  if (!nl) {
    return { state: { ...base, consecutiveSuccesses: successes, updatedAt: now }, decision: { kind: 'hold', detail: 'Top of the ladder for this one. Nicely done.' } };
  }
  return { state: { ...nl.next, consecutiveSuccesses: 0, updatedAt: now }, decision: { kind: 'progress', detail: nl.detail } };
}
