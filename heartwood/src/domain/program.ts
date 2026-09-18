import { EXERCISE_MAP } from '@/data/exercises';
import { FIVE_MINUTE_MAIN_COUNT, SESSION_ORDER_WEEK_EVEN, SESSION_ORDER_WEEK_ODD, TEMPLATES } from '@/data/templates';
import { daysBetween } from './dates';
import { findSafeAlternative, isAllowed, type SafetyContext } from './safety';
import type {
  EquipmentProfile, Exercise, Phase, PlannedSession, Prescription, ProgressionState, SessionType, SupportLevel,
} from './types';

// ---------------------------------------------------------------------------
// Program sequence (Section 8.1 / 8.3)
// ---------------------------------------------------------------------------

export interface ProgramSlot {
  sequenceIndex: number;
  templateId: SessionType;
  weekNumber: number;      // 1-based
  phase: Phase;
  isRecoveryWeek: boolean;
}

export const FOUNDATION_WEEKS = 4;
export const RECOVERY_EVERY = 5;

export function phaseForWeek(week: number, maintain: boolean): Phase {
  if (maintain) return 'maintain';
  return week <= FOUNDATION_WEEKS ? 'foundation' : 'build';
}

export function isRecoveryWeek(week: number, maintain: boolean): boolean {
  if (maintain || week <= FOUNDATION_WEEKS) return false;
  return (week - FOUNDATION_WEEKS) % RECOVERY_EVERY === 0;
}

/** Strength A/B alternate: A/B/A one week, B/A/B the next. PT sessions are fixed. */
export function buildProgramSequence(weeks: number, maintain = false, startIndex = 0, startWeek = 1): ProgramSlot[] {
  const out: ProgramSlot[] = [];
  let idx = startIndex;
  for (let w = startWeek; w < startWeek + weeks; w++) {
    const order = w % 2 === 1 ? SESSION_ORDER_WEEK_ODD : SESSION_ORDER_WEEK_EVEN;
    const list = maintain ? order.filter((_, i) => i !== 4) : order; // maintain: drop the third strength day
    for (const templateId of list) {
      out.push({ sequenceIndex: idx++, templateId, weekNumber: w, phase: phaseForWeek(w, maintain), isRecoveryWeek: isRecoveryWeek(w, maintain) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gaps / Comeback Mode (Section 8.5, 11.5)
// ---------------------------------------------------------------------------

export type GapStatus = 'none' | 'comeback' | 'long-gap';

export function gapStatus(lastCompletedISO: string | undefined, todayISO: string): GapStatus {
  if (!lastCompletedISO) return 'none';
  const gap = daysBetween(lastCompletedISO, todayISO);
  if (gap >= 21) return 'long-gap';
  if (gap >= 7) return 'comeback';
  return 'none';
}

// ---------------------------------------------------------------------------
// Prescriptions (Section 8.3 / 8.6)
// ---------------------------------------------------------------------------

export interface DoseSpec { sets: number; repsLow: number; repsHigh: number; holdMultiplier: number; restSeconds: number }

export function doseFor(phase: Phase, opts: { recovery?: boolean; comeback?: boolean; category: Exercise['category'] }): DoseSpec {
  let d: DoseSpec;
  switch (phase) {
    case 'foundation': d = { sets: 2, repsLow: 10, repsHigh: 12, holdMultiplier: 1, restSeconds: 60 }; break;
    case 'build': d = { sets: 3, repsLow: 8, repsHigh: 12, holdMultiplier: 1.25, restSeconds: 75 }; break;
    case 'maintain': d = { sets: 2, repsLow: 8, repsHigh: 12, holdMultiplier: 1, restSeconds: 60 }; break;
  }
  if (opts.category === 'pt') d = { ...d, sets: Math.min(d.sets, 2), restSeconds: 30 };
  if (opts.category === 'warmup' || opts.category === 'cooldown') d = { ...d, sets: 1, restSeconds: 10 };
  // Recovery week: volume down ~40%.
  if (opts.recovery) d = { ...d, sets: Math.max(1, Math.round(d.sets * 0.6)), repsHigh: d.repsLow, holdMultiplier: d.holdMultiplier * 0.7 };
  // Comeback: lighter volume (load handled separately).
  if (opts.comeback) d = { ...d, sets: Math.max(1, d.sets - 1), repsHigh: d.repsLow };
  return d;
}

export const SUPPORT_ORDER: SupportLevel[] = ['two-hands', 'one-hand', 'fingertips', 'none'];

export function lighterLoad(state: Partial<ProgressionState>, equipment: EquipmentProfile): Partial<ProgressionState> {
  const out = { ...state };
  if (state.weight != null) {
    const idx = equipment.dumbbellWeights.indexOf(state.weight);
    out.weight = idx > 0 ? equipment.dumbbellWeights[idx - 1] : equipment.dumbbellWeights[0];
  }
  if (state.bandLevel != null) {
    const idx = equipment.bandLevels.indexOf(state.bandLevel);
    out.bandLevel = idx > 0 ? equipment.bandLevels[idx - 1] : equipment.bandLevels[0];
  }
  if (state.supportLevel != null) {
    const idx = SUPPORT_ORDER.indexOf(state.supportLevel);
    out.supportLevel = idx > 0 ? SUPPORT_ORDER[idx - 1] : SUPPORT_ORDER[0];
  }
  return out;
}

export interface PrescribeInput {
  templateId: SessionType;
  phase: Phase;
  isRecoveryWeek: boolean;
  isComeback: boolean;
  equipment: EquipmentProfile;
  ctx: SafetyContext;
  progression: Map<string, ProgressionState>;
  /** Custom PT exercises to append to PT sessions. */
  customExercises?: Exercise[];
  scheduleCustomInto?: SessionType[];
  library?: Exercise[];
}

/**
 * Turn a template into concrete prescriptions. Every exercise passes through the
 * safety filter; anything not allowed is swapped for a safe alternative.
 */
export function prescribeSession(input: PrescribeInput): Prescription[] {
  const library = input.library ?? Object.values(EXERCISE_MAP);
  const byId = new Map(library.map((e) => [e.id, e]));
  const template = TEMPLATES[input.templateId];
  const out: Prescription[] = [];
  const used = new Set<string>();

  const resolve = (id: string): { ex: Exercise; substitutedFor?: string } | null => {
    const ex = byId.get(id);
    if (!ex) return null;
    if (isAllowed(ex, input.ctx) && !used.has(ex.id)) return { ex };
    const alt = findSafeAlternative(ex, library, input.ctx, [...used]);
    if (!alt) return null;
    return { ex: alt, substitutedFor: ex.id };
  };

  for (const block of template.blocks) {
    for (const id of block.exerciseIds) {
      const r = resolve(id);
      if (!r) continue;
      // Guard: never allow something disallowed to slip through under any path.
      if (!isAllowed(r.ex, input.ctx)) continue;
      used.add(r.ex.id);
      out.push(buildPrescription(r.ex, block.kind, input, r.substitutedFor));
    }
  }

  // My PT's exercises (Section 4.7): appended to the main block of chosen PT sessions.
  if (input.customExercises?.length && (input.scheduleCustomInto ?? []).includes(input.templateId)) {
    for (const ex of input.customExercises) {
      if (!isAllowed(ex, input.ctx) || used.has(ex.id)) continue;
      used.add(ex.id);
      const p = buildPrescription(ex, 'main', input);
      const cdIdx = out.findIndex((x) => x.block === 'cooldown');
      if (cdIdx === -1) out.push(p); else out.splice(cdIdx, 0, p);
    }
  }
  return out;
}

export function buildPrescription(ex: Exercise, block: Prescription['block'], input: PrescribeInput, substitutedFor?: string): Prescription {
  const dose = doseFor(input.phase, { recovery: input.isRecoveryWeek, comeback: input.isComeback, category: block === 'main' ? ex.category : block });
  const stateKey = ex.id;
  const state = input.progression.get(stateKey);
  let load: Partial<ProgressionState> = state ?? startingLoad(ex, input.equipment);
  if (input.isComeback) load = lighterLoad(load, input.equipment);

  const p: Prescription = {
    exerciseId: ex.id,
    block,
    sets: dose.sets,
    restSeconds: dose.restSeconds,
    side: ex.unilateral ? 'both' : undefined,
    substitutedFor,
  };
  if (ex.timerType === 'hold' || ex.timerType === 'interval') {
    const base = state?.holdSeconds ?? ex.defaultHoldSeconds ?? 20;
    p.holdSeconds = Math.round(base * (block === 'main' ? dose.holdMultiplier : 1));
  } else {
    const base = ex.defaultReps ?? dose.repsHigh;
    p.reps = block === 'main' ? Math.min(Math.max(base, dose.repsLow), dose.repsHigh) : base;
  }
  if (load.weight != null) p.weight = load.weight;
  if (load.bandLevel != null) p.bandLevel = load.bandLevel;
  if (load.supportLevel != null) p.supportLevel = load.supportLevel;
  return p;
}

export function startingLoad(ex: Exercise, equipment: EquipmentProfile): Partial<ProgressionState> {
  const out: Partial<ProgressionState> = {};
  if (ex.equipment.includes('dumbbell') && equipment.dumbbellWeights.length) out.weight = equipment.dumbbellWeights[0];
  if (ex.equipment.includes('band') && equipment.bandLevels.length) out.bandLevel = equipment.bandLevels[0];
  if (ex.supportLevel) out.supportLevel = ex.supportLevel;
  return out;
}

/** Reduce a full session to the 5-minute version (Section 9.1, 14). */
export function fiveMinuteVersion(prescriptions: Prescription[]): Prescription[] {
  const warm = prescriptions.filter((p) => p.block === 'warmup').slice(0, 1);
  const main = prescriptions.filter((p) => p.block === 'main').slice(0, FIVE_MINUTE_MAIN_COUNT).map((p) => ({ ...p, sets: 1 }));
  const cool = prescriptions.filter((p) => p.block === 'cooldown').slice(-1);
  return [...warm, ...main, ...cool];
}

export function equipmentForSession(prescriptions: Prescription[]): string[] {
  const set = new Set<string>();
  for (const p of prescriptions) {
    const ex = EXERCISE_MAP[p.exerciseId];
    ex?.equipment.forEach((e) => { if (e !== 'bodyweight') set.add(e); });
  }
  return [...set];
}

export function estimateMinutes(prescriptions: Prescription[]): number {
  let sec = 0;
  for (const p of prescriptions) {
    const sides = p.side === 'both' ? 2 : 1;
    const perSet = p.holdSeconds ?? (p.reps ?? 10) * 4;
    sec += (perSet * sides + p.restSeconds) * p.sets + 20;
  }
  return Math.max(5, Math.round(sec / 60));
}

export function makePlannedSession(slot: ProgramSlot, prescriptions: Prescription[], scheduledDate: string, isComeback: boolean): PlannedSession {
  return {
    id: `s-${slot.sequenceIndex}`,
    templateId: slot.templateId,
    sequenceIndex: slot.sequenceIndex,
    scheduledDate,
    status: 'planned',
    prescriptions,
    phase: slot.phase,
    weekNumber: slot.weekNumber,
    isRecoveryWeek: slot.isRecoveryWeek,
    isComeback,
  };
}
