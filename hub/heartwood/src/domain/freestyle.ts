import { EXERCISES } from '@/data/exercises';
import { buildPrescription, estimateMinutes } from './program';
import { isAllowed, type SafetyContext } from './safety';
import type { EquipmentProfile, Exercise, Phase, PlannedSession, Prescription, ProgressionState } from './types';

/**
 * Freestyle sessions: "I have N minutes and I want to work on these areas."
 * Every exercise still passes through the safety filter. Built for the days
 * that do not follow the plan; they count fully toward the tree and stickers.
 */

export type Side = 'left' | 'right';

export interface BodyArea {
  id: string;
  label: string;
  /** Body-model part(s) this area maps to. */
  group: 'upper' | 'trunk' | 'lower' | 'whole';
  symmetric: boolean;
  match: (ex: Exercise) => number; // relevance score, 0 = no match
}

const prim = (ex: Exercise, m: Exercise['musclesPrimary'][number]) => (ex.musclesPrimary.includes(m) ? 3 : ex.musclesSecondary.includes(m) ? 1 : 0);

export const BODY_AREAS: BodyArea[] = [
  { id: 'neck', label: 'Neck (via upper back)', group: 'upper', symmetric: false, match: (e) => (e.neckDemand === 'none' || e.neckDemand === 'low') && (prim(e, 'upper-back') || (e.lessonIds.includes('spine-neck') ? 2 : 0)) ? Math.max(prim(e, 'upper-back'), e.lessonIds.includes('spine-neck') ? 2 : 0) : 0 },
  { id: 'shoulders', label: 'Shoulders', group: 'upper', symmetric: true, match: (e) => prim(e, 'shoulders') },
  { id: 'chest', label: 'Chest', group: 'trunk', symmetric: false, match: (e) => prim(e, 'chest') },
  { id: 'upper-back', label: 'Upper back', group: 'trunk', symmetric: false, match: (e) => prim(e, 'upper-back') },
  { id: 'lower-back', label: 'Lower back', group: 'trunk', symmetric: false, match: (e) => prim(e, 'lower-back') },
  { id: 'core', label: 'Core', group: 'trunk', symmetric: false, match: (e) => prim(e, 'core') },
  { id: 'arms', label: 'Arms (biceps & triceps)', group: 'upper', symmetric: true, match: (e) => prim(e, 'arms') },
  { id: 'forearms', label: 'Forearms & grip', group: 'upper', symmetric: true, match: (e) => prim(e, 'forearms') },
  { id: 'hips', label: 'Hips', group: 'lower', symmetric: true, match: (e) => prim(e, 'hips') },
  { id: 'glutes', label: 'Glutes', group: 'lower', symmetric: true, match: (e) => prim(e, 'glutes') },
  { id: 'quads', label: 'Thighs (front)', group: 'lower', symmetric: true, match: (e) => prim(e, 'quads') },
  { id: 'hamstrings', label: 'Thighs (back)', group: 'lower', symmetric: true, match: (e) => prim(e, 'hamstrings') },
  { id: 'knees', label: 'Knees', group: 'lower', symmetric: true, match: (e) => (e.movementPatterns.includes('knee') ? 3 : 0) + (e.lessonIds.includes('knees') ? 1 : 0) },
  { id: 'calves', label: 'Calves & shins', group: 'lower', symmetric: true, match: (e) => prim(e, 'calves') },
  { id: 'ankles-feet', label: 'Ankles & feet', group: 'lower', symmetric: true, match: (e) => prim(e, 'ankles-feet') + (e.movementPatterns.includes('ankle') ? 1 : 0) },
  { id: 'balance', label: 'Balance', group: 'whole', symmetric: false, match: (e) => (e.movementPatterns.includes('balance') ? 3 : 0) },
  { id: 'mobility', label: 'Mobility & stretch', group: 'whole', symmetric: false, match: (e) => (e.movementPatterns.includes('mobility') ? 3 : 0) },
  { id: 'breathing', label: 'Breathing & calm', group: 'whole', symmetric: false, match: (e) => (e.movementPatterns.includes('breathing') ? 3 : 0) },
];

export const AREA_MAP = Object.fromEntries(BODY_AREAS.map((a) => [a.id, a])) as Record<string, BodyArea>;
export const FREESTYLE_MINUTES = [5, 10, 15, 20, 30, 45] as const;

/** A selection key is "area" or "area:left" / "area:right". */
export function parseSelection(key: string): { area: string; side?: Side } {
  const [area, side] = key.split(':');
  return { area, side: side === 'left' || side === 'right' ? side : undefined };
}

export interface FreestyleInput {
  selection: string[];
  minutes: number;
  equipment: EquipmentProfile;
  ctx: SafetyContext;
  progression: Map<string, ProgressionState>;
  phase?: Phase;
  library?: Exercise[];
  /** Deterministic variety: rotate picks by this seed (e.g. day number). */
  seed?: number;
}

export interface FreestylePlan { prescriptions: Prescription[]; areas: string[]; estimatedMinutes: number }

export function buildFreestyle(input: FreestyleInput): FreestylePlan {
  const library = (input.library ?? EXERCISES).filter((e) => isAllowed(e, input.ctx));
  const areas = [...new Set(input.selection.map((k) => parseSelection(k).area))].filter((a) => AREA_MAP[a]);
  const phase = input.phase ?? 'foundation';
  const seed = input.seed ?? 0;
  const pin = { phase, isRecoveryWeek: false, isComeback: false, equipment: input.equipment, ctx: input.ctx, progression: input.progression, templateId: 'freestyle' as const };

  // Sets scale with time: tiny sessions are one set each, and that is a real workout.
  const sets = input.minutes <= 10 ? 1 : input.minutes <= 20 ? 2 : 3;
  const mainBudget = Math.max(3, input.minutes - (input.minutes >= 15 ? 5 : 2));

  const score = (e: Exercise) => areas.reduce((acc, a) => acc + AREA_MAP[a].match(e), 0);
  const rotate = <T,>(arr: T[]) => (arr.length ? [...arr.slice(seed % arr.length), ...arr.slice(0, seed % arr.length)] : arr);

  const used = new Set<string>();
  const out: Prescription[] = [];
  const add = (e: Exercise, block: Prescription['block']) => {
    used.add(e.id);
    const p = buildPrescription(e, block, pin);
    if (block === 'main') p.sets = Math.min(p.sets, sets);
    out.push(p);
  };

  // Warm-up: one matching warm-up exercise (or a general one) when there is time.
  if (input.minutes >= 10) {
    const w = rotate(library.filter((e) => e.category === 'warmup').sort((a, b) => score(b) - score(a)))[0];
    if (w) add(w, 'warmup');
  }

  // Main: round-robin across areas so every chosen area gets attention, until the budget is spent.
  const mainPool = library.filter((e) => e.category === 'strength' || e.category === 'pt' || e.category === 'mobility' || e.category === 'somatic' || e.category === 'fascia' || e.category === 'pelvic');
  const perArea = areas.map((a) => rotate(mainPool.filter((e) => AREA_MAP[a].match(e) > 0).sort((x, y) => AREA_MAP[a].match(y) - AREA_MAP[a].match(x) + (score(y) - score(x)) * 0.1)));
  let progress = true;
  while (progress) {
    progress = false;
    for (const list of perArea) {
      const next = list.find((e) => !used.has(e.id));
      if (!next) continue;
      const trial = buildPrescription(next, 'main', pin);
      trial.sets = Math.min(trial.sets, sets);
      const est = estimateMinutes([...out.filter((p) => p.block === 'main'), trial]);
      if (est > mainBudget && out.some((p) => p.block === 'main')) continue;
      add(next, 'main');
      progress = true;
      if (estimateMinutes(out.filter((p) => p.block === 'main')) >= mainBudget) { progress = false; break; }
    }
  }
  // Nothing matched (e.g. only breathing chosen): a gentle general pick.
  if (!out.some((p) => p.block === 'main')) {
    const g = rotate(library.filter((e) => e.category === 'pt' && score(e) > 0).concat(library.filter((e) => e.category === 'pt')))[0];
    if (g) add(g, 'main');
  }

  // Cool-down: a matching stretch, then breathing when there is room.
  if (input.minutes >= 10) {
    const c = rotate(library.filter((e) => e.category === 'cooldown' && !used.has(e.id)).sort((a, b) => score(b) - score(a)))[0];
    if (c) add(c, 'cooldown');
  }
  if (input.minutes >= 20 || areas.includes('breathing')) {
    const b = library.find((e) => e.id === 'cd-breathing' && !used.has(e.id));
    if (b) add(b, 'cooldown');
  }
  return { prescriptions: out, areas, estimatedMinutes: estimateMinutes(out) };
}

export function makeFreestyleSession(plan: FreestylePlan, selection: string[], minutes: number, phase: Phase, now = new Date()): PlannedSession {
  return {
    id: `free-${now.getTime()}`,
    templateId: 'freestyle',
    sequenceIndex: -1,
    scheduledDate: now.toISOString().slice(0, 10),
    status: 'planned',
    prescriptions: plan.prescriptions,
    phase,
    weekNumber: 0,
    isRecoveryWeek: false,
    isComeback: false,
    focusAreas: selection,
    minutes,
  };
}
